"""
Document Chunk Event Step

Subscribes to: document-chunk
Chunks documents around headings and sections with small overlaps.
Marks critical sections (safety, house rules, emergency contacts) for higher retrieval weight.
"""

from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))


class ChunkInput(BaseModel):
    """Input for document chunking."""
    ingestion_id: str
    property_id: str
    parsed_documents: List[Dict[str, Any]]
    overwrite_existing: bool = True


# Motia Configuration
config = {
    "name": "DocumentChunk",
    "type": "event",
    "description": "Chunk documents for optimal Q&A retrieval",
    "subscribes": ["document-chunk"],
    "emits": [
        {"topic": "document-embed", "label": "Embed document chunks"},
        {"topic": "ingestion-error", "label": "Report chunking errors", "conditional": True}
    ],
    "flows": ["document-ingestion"],
    "input": ChunkInput.model_json_schema()
}


async def handler(input_data, context):
    """Handle document chunking."""
    try:
        ingestion_id = input_data.get("ingestion_id")
        property_id = input_data.get("property_id")
        parsed_documents = input_data.get("parsed_documents", [])
        overwrite_existing = input_data.get("overwrite_existing", True)
        
        context.logger.info("Starting document chunking", {
            "ingestion_id": ingestion_id,
            "document_count": len(parsed_documents)
        })
        
        # Import chunking service
        from services.chunking_service import ChunkingService
        from services.document_parser import ParsedDocument, ParsedSection, DocType
        
        chunker = ChunkingService(chunk_size=500, chunk_overlap=50)
        
        all_chunks = []
        errors = []
        
        for i, doc_data in enumerate(parsed_documents):
            try:
                # Reconstruct ParsedDocument from dict
                sections = []
                for section_data in doc_data.get("sections", []):
                    sections.append(ParsedSection(
                        title=section_data.get("title", ""),
                        content=section_data.get("content", ""),
                        level=section_data.get("level", 1),
                        is_critical=section_data.get("is_critical", False)
                    ))
                
                # Get doc_type
                doc_type_str = doc_data.get("doc_type", "house_manual")
                try:
                    doc_type = DocType(doc_type_str)
                except ValueError:
                    doc_type = DocType.UNKNOWN
                
                parsed_doc = ParsedDocument(
                    title=doc_data.get("title", ""),
                    sections=sections,
                    doc_type=doc_type,
                    language=doc_data.get("language", "en"),
                    source_url=doc_data.get("source_url", ""),
                    source_filename=doc_data.get("source_filename", ""),
                    raw_text=doc_data.get("raw_text", ""),
                    metadata=doc_data.get("metadata", {})
                )
                
                # Chunk the document
                chunks = chunker.chunk_document(
                    document=parsed_doc,
                    property_id=property_id,
                    ingestion_id=ingestion_id
                )
                
                # Convert chunks to dicts
                for chunk in chunks:
                    all_chunks.append({
                        "id": chunk.id,
                        "content": chunk.content,
                        "section_title": chunk.section_title,
                        "doc_type": chunk.doc_type,
                        "language": chunk.language,
                        "is_critical": chunk.is_critical,
                        "source_url": chunk.source_url,
                        "source_filename": chunk.source_filename,
                        "property_id": chunk.property_id,
                        "chunk_index": chunk.chunk_index,
                        "metadata": chunk.metadata
                    })
                
                context.logger.info("Chunked document", {
                    "document": doc_data.get("title", f"doc_{i}"),
                    "chunks_created": len(chunks)
                })
                
            except Exception as e:
                source = doc_data.get("source_url") or doc_data.get("source_filename") or f"document_{i}"
                error_msg = f"Failed to chunk {source}: {str(e)}"
                errors.append(error_msg)
                context.logger.error(error_msg)
        
        # Update job status
        job_state = await context.state.get("ingestion_jobs", ingestion_id)
        # Handle nested data structure from Motia state
        job = job_state.get("data", job_state) if isinstance(job_state, dict) else job_state
        if job:
            job["documents_chunked"] = len(parsed_documents) - len(errors)
            job["errors"] = job.get("errors", []) + errors
            job["updated_at"] = datetime.utcnow().isoformat()
            await context.state.set("ingestion_jobs", ingestion_id, job)
        
        context.logger.info("Document chunking complete", {
            "ingestion_id": ingestion_id,
            "total_chunks": len(all_chunks),
            "errors": len(errors)
        })
        
        # Emit for embedding if we have chunks
        if all_chunks:
            await context.emit({
                "topic": "document-embed",
                "data": {
                    "ingestion_id": ingestion_id,
                    "property_id": property_id,
                    "chunks": all_chunks,
                    "overwrite_existing": overwrite_existing
                }
            })
        elif errors:
            await context.emit({
                "topic": "ingestion-error",
                "data": {
                    "ingestion_id": ingestion_id,
                    "property_id": property_id,
                    "stage": "chunking",
                    "errors": errors
                }
            })
            
    except Exception as e:
        context.logger.error("Document chunking failed", {
            "error": str(e),
            "ingestion_id": input_data.get("ingestion_id")
        })
        raise

