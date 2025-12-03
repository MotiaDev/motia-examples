"""
LanceDB Service for Airbnb Guest Assistant

Manages vector storage for property documents with the following schema:
- id: unique chunk identifier
- property_id: property/listing identifier
- content: text content of the chunk
- section_title: heading/section name
- doc_type: house_manual, local_guide, appliance_manual, policy
- language: document language (en, es, fr, etc.)
- is_critical: whether this is critical info (safety, rules, emergency)
- embedding: vector embedding
- source_url: original document source
- updated_at: timestamp
"""

import os
import lancedb
from datetime import datetime
from typing import Optional, List, Dict, Any
import pyarrow as pa


class LanceDBService:
    """Service for managing LanceDB vector storage for property documents."""
    
    LANCE_DB_PATH = os.getenv("LANCE_DB_PATH", "./data/lancedb")
    TABLE_NAME = "property_docs"
    
    # Schema for property documents
    SCHEMA = pa.schema([
        pa.field("id", pa.string()),
        pa.field("property_id", pa.string()),
        pa.field("content", pa.string()),
        pa.field("section_title", pa.string()),
        pa.field("doc_type", pa.string()),  # house_manual, local_guide, appliance_manual, policy
        pa.field("language", pa.string()),
        pa.field("is_critical", pa.bool_()),
        pa.field("source_url", pa.string()),
        pa.field("source_filename", pa.string()),
        pa.field("ingestion_id", pa.string()),
        pa.field("updated_at", pa.string()),
        pa.field("vector", pa.list_(pa.float32(), 1536)),  # OpenAI ada-002 embedding dimension
    ])
    
    def __init__(self):
        """Initialize LanceDB connection."""
        os.makedirs(self.LANCE_DB_PATH, exist_ok=True)
        self.db = lancedb.connect(self.LANCE_DB_PATH)
        self._ensure_table_exists()
    
    def _ensure_table_exists(self):
        """Create the property_docs table if it doesn't exist."""
        existing_tables = self.db.table_names()
        if self.TABLE_NAME not in existing_tables:
            # Create empty table with schema
            self.db.create_table(
                self.TABLE_NAME, 
                schema=self.SCHEMA,
                mode="create"
            )
    
    def get_table(self):
        """Get the property_docs table."""
        return self.db.open_table(self.TABLE_NAME)
    
    def add_documents(self, documents: List[Dict[str, Any]]) -> int:
        """
        Add documents to the vector store.
        
        Args:
            documents: List of document dicts with schema fields
            
        Returns:
            Number of documents added
        """
        if not documents:
            return 0
            
        table = self.get_table()
        
        # Ensure all documents have required fields
        processed_docs = []
        for doc in documents:
            processed_doc = {
                "id": doc.get("id", ""),
                "property_id": doc.get("property_id", ""),
                "content": doc.get("content", ""),
                "section_title": doc.get("section_title", ""),
                "doc_type": doc.get("doc_type", "house_manual"),
                "language": doc.get("language", "en"),
                "is_critical": doc.get("is_critical", False),
                "source_url": doc.get("source_url", ""),
                "source_filename": doc.get("source_filename", ""),
                "ingestion_id": doc.get("ingestion_id", ""),
                "updated_at": doc.get("updated_at", datetime.utcnow().isoformat()),
                "vector": doc.get("vector", doc.get("embedding", [])),
            }
            processed_docs.append(processed_doc)
        
        table.add(processed_docs)
        return len(processed_docs)
    
    def delete_by_property_and_source(
        self, 
        property_id: str, 
        source_url: Optional[str] = None,
        source_filename: Optional[str] = None
    ) -> int:
        """
        Soft-delete (actually delete) old chunks for a property + source.
        Used during re-ingestion to avoid stale content.
        
        Args:
            property_id: The property identifier
            source_url: Optional source URL to filter
            source_filename: Optional source filename to filter
            
        Returns:
            Number of documents deleted
        """
        table = self.get_table()
        
        # Build filter condition
        filter_expr = f"property_id = '{property_id}'"
        if source_url:
            filter_expr += f" AND source_url = '{source_url}'"
        if source_filename:
            filter_expr += f" AND source_filename = '{source_filename}'"
        
        # Count before deletion
        try:
            count_before = len(table.search().where(filter_expr).limit(10000).to_list())
        except Exception:
            count_before = 0
        
        # Delete matching documents
        table.delete(filter_expr)
        
        return count_before
    
    def delete_by_ingestion_id(self, ingestion_id: str) -> int:
        """Delete all documents from a specific ingestion job."""
        table = self.get_table()
        filter_expr = f"ingestion_id = '{ingestion_id}'"
        
        try:
            count_before = len(table.search().where(filter_expr).limit(10000).to_list())
        except Exception:
            count_before = 0
            
        table.delete(filter_expr)
        return count_before
    
    def search(
        self,
        query_embedding: List[float],
        property_id: str,
        language: Optional[str] = None,
        doc_types: Optional[List[str]] = None,
        limit: int = 10,
        include_critical_boost: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant documents for a property.
        
        Args:
            query_embedding: The query vector embedding
            property_id: Filter by property
            language: Optional language filter
            doc_types: Optional list of doc types to filter
            limit: Max results to return
            include_critical_boost: Whether to boost critical sections
            
        Returns:
            List of matching documents with scores
        """
        table = self.get_table()
        
        # Build filter
        filter_expr = f"property_id = '{property_id}'"
        if language:
            filter_expr += f" AND language = '{language}'"
        if doc_types:
            types_str = ", ".join([f"'{t}'" for t in doc_types])
            filter_expr += f" AND doc_type IN ({types_str})"
        
        # Perform vector search
        results = (
            table
            .search(query_embedding)
            .where(filter_expr)
            .limit(limit * 2 if include_critical_boost else limit)  # Get extra for re-ranking
            .to_list()
        )
        
        # Re-rank to boost critical sections
        if include_critical_boost and results:
            for result in results:
                if result.get("is_critical"):
                    # Boost critical sections by reducing distance score
                    result["_distance"] = result.get("_distance", 0) * 0.7
            
            # Re-sort by distance
            results.sort(key=lambda x: x.get("_distance", float("inf")))
        
        return results[:limit]
    
    def get_property_stats(self, property_id: str) -> Dict[str, Any]:
        """Get statistics about documents for a property."""
        table = self.get_table()
        
        filter_expr = f"property_id = '{property_id}'"
        
        try:
            docs = table.search().where(filter_expr).limit(10000).to_list()
        except Exception:
            docs = []
        
        # Calculate stats
        doc_types = {}
        languages = set()
        critical_count = 0
        
        for doc in docs:
            doc_type = doc.get("doc_type", "unknown")
            doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
            languages.add(doc.get("language", "en"))
            if doc.get("is_critical"):
                critical_count += 1
        
        return {
            "property_id": property_id,
            "total_chunks": len(docs),
            "doc_types": doc_types,
            "languages": list(languages),
            "critical_sections": critical_count
        }


# Singleton instance
_instance: Optional[LanceDBService] = None


def get_lancedb_service() -> LanceDBService:
    """Get or create the LanceDB service singleton."""
    global _instance
    if _instance is None:
        _instance = LanceDBService()
    return _instance

