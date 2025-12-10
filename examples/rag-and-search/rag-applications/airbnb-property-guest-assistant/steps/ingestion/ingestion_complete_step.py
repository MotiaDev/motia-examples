"""
Ingestion Complete Event Step

Subscribes to: ingestion-complete
Handles successful completion of the ingestion pipeline.
Can trigger follow-up actions if needed.
"""

from pydantic import BaseModel
from typing import Optional


class CompleteInput(BaseModel):
    """Input for ingestion completion."""
    ingestion_id: str
    property_id: str
    chunks_created: int
    documents_processed: int


# Motia Configuration
config = {
    "name": "IngestionComplete",
    "type": "event",
    "description": "Handle successful ingestion completion",
    "subscribes": ["ingestion-complete"],
    "emits": [],
    "flows": ["document-ingestion"],
    "input": CompleteInput.model_json_schema()
}


async def handler(input_data, context):
    """Handle ingestion completion."""
    try:
        ingestion_id = input_data.get("ingestion_id")
        property_id = input_data.get("property_id")
        chunks_created = input_data.get("chunks_created", 0)
        documents_processed = input_data.get("documents_processed", 0)
        
        context.logger.info("Ingestion completed successfully", {
            "ingestion_id": ingestion_id,
            "property_id": property_id,
            "chunks_created": chunks_created,
            "documents_processed": documents_processed
        })
        
        # Log final statistics
        try:
            import sys
            import os
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))
            
            from services.lancedb_service import get_lancedb_service
            
            lancedb_service = get_lancedb_service()
            stats = lancedb_service.get_property_stats(property_id)
            
            context.logger.info("Property knowledge base stats", {
                "property_id": property_id,
                "total_chunks": stats.get("total_chunks", 0),
                "doc_types": stats.get("doc_types", {}),
                "languages": stats.get("languages", []),
                "critical_sections": stats.get("critical_sections", 0)
            })
        except Exception as e:
            context.logger.warn("Failed to get property stats", {"error": str(e)})
        
    except Exception as e:
        context.logger.error("Failed to handle ingestion completion", {
            "error": str(e),
            "ingestion_id": input_data.get("ingestion_id")
        })

