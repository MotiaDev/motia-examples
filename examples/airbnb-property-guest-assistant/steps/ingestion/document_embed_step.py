"""
Document Embed Event Step

Subscribes to: document-embed
Embeds document chunks and stores them in LanceDB.
On re-ingest for same property_id + source, soft-deletes old chunks.
"""

from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))


class EmbedInput(BaseModel):
    """Input for document embedding."""
    ingestion_id: str
    property_id: str
    chunks: List[Dict[str, Any]]
    overwrite_existing: bool = True


# Motia Configuration
config = {
    "name": "DocumentEmbed",
    "type": "event",
    "description": "Embed chunks and store in LanceDB vector database",
    "subscribes": ["document-embed"],
    "emits": [
        {"topic": "ingestion-complete", "label": "Ingestion completed"},
        {"topic": "send-notification", "label": "Send completion notification"},
        {"topic": "ingestion-error", "label": "Report embedding errors", "conditional": True}
    ],
    "flows": ["document-ingestion"],
    "input": EmbedInput.model_json_schema()
}


async def handler(input_data, context):
    """Handle document embedding and storage."""
    try:
        ingestion_id = input_data.get("ingestion_id")
        property_id = input_data.get("property_id")
        chunks = input_data.get("chunks", [])
        overwrite_existing = input_data.get("overwrite_existing", True)
        
        context.logger.info("Starting document embedding", {
            "ingestion_id": ingestion_id,
            "chunk_count": len(chunks)
        })
        
        # Import services
        from services.embeddings_service import get_embeddings_service
        from services.lancedb_service import get_lancedb_service
        
        embeddings_service = get_embeddings_service()
        lancedb_service = get_lancedb_service()
        
        errors = []
        
        # Delete existing documents if overwriting
        if overwrite_existing:
            try:
                # Group chunks by source
                sources = set()
                for chunk in chunks:
                    source_url = chunk.get("source_url")
                    source_filename = chunk.get("source_filename")
                    if source_url:
                        sources.add(("url", source_url))
                    if source_filename:
                        sources.add(("file", source_filename))
                
                deleted_count = 0
                for source_type, source_value in sources:
                    if source_type == "url":
                        count = lancedb_service.delete_by_property_and_source(
                            property_id=property_id,
                            source_url=source_value
                        )
                    else:
                        count = lancedb_service.delete_by_property_and_source(
                            property_id=property_id,
                            source_filename=source_value
                        )
                    deleted_count += count
                
                context.logger.info("Deleted existing documents", {
                    "property_id": property_id,
                    "deleted_count": deleted_count
                })
            except Exception as e:
                context.logger.warn("Failed to delete existing documents", {
                    "error": str(e)
                })
        
        # Generate embeddings for all chunks
        context.logger.info("Generating embeddings", {"chunk_count": len(chunks)})
        
        texts = [chunk.get("content", "") for chunk in chunks]
        
        try:
            embeddings = embeddings_service.embed_texts(texts)
        except Exception as e:
            error_msg = f"Failed to generate embeddings: {str(e)}"
            errors.append(error_msg)
            context.logger.error(error_msg)
            
            # Update job status with error
            await _update_job_error(context, ingestion_id, errors)
            
            await context.emit({
                "topic": "ingestion-error",
                "data": {
                    "ingestion_id": ingestion_id,
                    "property_id": property_id,
                    "stage": "embedding",
                    "errors": errors
                }
            })
            return
        
        # Prepare documents for storage
        documents = []
        current_time = datetime.utcnow().isoformat()
        
        for i, chunk in enumerate(chunks):
            documents.append({
                "id": chunk.get("id"),
                "property_id": property_id,
                "content": chunk.get("content", ""),
                "section_title": chunk.get("section_title", ""),
                "doc_type": chunk.get("doc_type", "house_manual"),
                "language": chunk.get("language", "en"),
                "is_critical": chunk.get("is_critical", False),
                "source_url": chunk.get("source_url", ""),
                "source_filename": chunk.get("source_filename", ""),
                "ingestion_id": ingestion_id,
                "updated_at": current_time,
                "vector": embeddings[i]
            })
        
        # Store in LanceDB
        context.logger.info("Storing documents in LanceDB", {
            "document_count": len(documents)
        })
        
        try:
            stored_count = lancedb_service.add_documents(documents)
        except Exception as e:
            error_msg = f"Failed to store documents: {str(e)}"
            errors.append(error_msg)
            context.logger.error(error_msg)
            
            await _update_job_error(context, ingestion_id, errors)
            
            await context.emit({
                "topic": "ingestion-error",
                "data": {
                    "ingestion_id": ingestion_id,
                    "property_id": property_id,
                    "stage": "storage",
                    "errors": errors
                }
            })
            return
        
        # Update job status - completed!
        job_state = await context.state.get("ingestion_jobs", ingestion_id)
        # Handle nested data structure from Motia state
        job = job_state.get("data", job_state) if isinstance(job_state, dict) else job_state
        if job:
            job["documents_embedded"] = len(chunks)
            job["chunks_created"] = stored_count
            job["status"] = "completed"
            job["errors"] = job.get("errors", []) + errors
            job["updated_at"] = current_time
            await context.state.set("ingestion_jobs", ingestion_id, job)
        
        context.logger.info("Document embedding complete", {
            "ingestion_id": ingestion_id,
            "stored_count": stored_count
        })
        
        # Emit completion events
        await context.emit({
            "topic": "ingestion-complete",
            "data": {
                "ingestion_id": ingestion_id,
                "property_id": property_id,
                "chunks_created": stored_count,
                "documents_processed": job.get("total_documents", 0) if job else 0
            }
        })
        
        # Send notification - job already extracted from nested structure above
        notify_email = job.get("notify_email") if job and isinstance(job, dict) else None
        recipients = [notify_email] if notify_email else None
        
        await context.emit({
            "topic": "send-notification",
            "data": {
                "type": "ingestion_complete",
                "property_id": property_id,
                "ingestion_id": ingestion_id,
                "recipients": recipients,
                "chunks_created": stored_count,
                "documents_processed": job.get("total_documents", 0) if job else 0,
                "errors": job.get("errors", []) if job else []
            }
        })
        
    except Exception as e:
        context.logger.error("Document embedding failed", {
            "error": str(e),
            "ingestion_id": input_data.get("ingestion_id")
        })
        raise


async def _update_job_error(context, ingestion_id: str, errors: List[str]):
    """Update job status with errors."""
    job_state = await context.state.get("ingestion_jobs", ingestion_id)
    # Handle nested data structure from Motia state
    job = job_state.get("data", job_state) if isinstance(job_state, dict) else job_state
    if job:
        job["status"] = "failed"
        job["errors"] = job.get("errors", []) + errors
        job["updated_at"] = datetime.utcnow().isoformat()
        await context.state.set("ingestion_jobs", ingestion_id, job)

