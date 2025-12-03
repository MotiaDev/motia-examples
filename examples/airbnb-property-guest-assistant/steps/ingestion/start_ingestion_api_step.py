"""
Start Ingestion API Step

POST /ingest - Starts document ingestion for a property.
Accepts a list of URLs and/or files for a specific property_id.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

# Request Schema
class DocumentSource(BaseModel):
    """A document source (URL or file reference)."""
    url: Optional[str] = Field(None, description="URL to fetch document from")
    file_path: Optional[str] = Field(None, description="Local file path")
    doc_type: str = Field(
        "house_manual",
        description="Document type: house_manual, local_guide, appliance_manual, policy"
    )
    language: str = Field("en", description="Document language (ISO 639-1)")


class IngestionRequest(BaseModel):
    """Request body for starting ingestion."""
    property_id: str = Field(..., min_length=1, description="Property/listing identifier")
    sources: List[DocumentSource] = Field(..., min_length=1, description="Documents to ingest")
    notify_email: Optional[str] = Field(None, description="Email to notify on completion")
    overwrite_existing: bool = Field(
        True,
        description="Whether to replace existing documents for same source"
    )


class IngestionStartedResponse(BaseModel):
    """Response when ingestion starts."""
    ingestion_id: str
    property_id: str
    status: str
    documents_queued: int
    created_at: str


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    details: Optional[Dict[str, Any]] = None


# Motia Configuration
config = {
    "name": "StartIngestion",
    "type": "api",
    "description": "Start document ingestion pipeline for a property",
    "path": "/ingest",
    "method": "POST",
    "emits": [
        {"topic": "document-discovery", "label": "Process documents"},
        {"topic": "send-notification", "label": "Send started notification"}
    ],
    "flows": ["document-ingestion"],
    "bodySchema": IngestionRequest.model_json_schema(),
    "responseSchema": {
        202: IngestionStartedResponse.model_json_schema(),
        400: ErrorResponse.model_json_schema(),
        500: ErrorResponse.model_json_schema()
    }
}


async def handler(req, context):
    """Handle ingestion start request."""
    try:
        body = req.get("body", {})
        
        # Validate request
        try:
            ingestion_req = IngestionRequest(**body)
        except Exception as e:
            context.logger.error("Validation failed", {"error": str(e)})
            return {
                "status": 400,
                "body": {"error": "Validation failed", "details": {"message": str(e)}}
            }
        
        # Generate ingestion ID
        ingestion_id = f"ing_{uuid.uuid4().hex[:12]}"
        created_at = datetime.utcnow().isoformat()
        
        context.logger.info("Starting ingestion", {
            "ingestion_id": ingestion_id,
            "property_id": ingestion_req.property_id,
            "document_count": len(ingestion_req.sources)
        })
        
        # Validate sources
        valid_sources = []
        for source in ingestion_req.sources:
            if source.url or source.file_path:
                valid_sources.append({
                    "url": source.url,
                    "file_path": source.file_path,
                    "doc_type": source.doc_type,
                    "language": source.language
                })
        
        if not valid_sources:
            return {
                "status": 400,
                "body": {"error": "No valid sources provided. Each source must have url or file_path."}
            }
        
        # Store ingestion job status in state
        await context.state.set("ingestion_jobs", ingestion_id, {
            "ingestion_id": ingestion_id,
            "property_id": ingestion_req.property_id,
            "status": "processing",
            "created_at": created_at,
            "notify_email": ingestion_req.notify_email,
            "overwrite_existing": ingestion_req.overwrite_existing,
            "total_documents": len(valid_sources),
            "documents_discovered": 0,
            "documents_parsed": 0,
            "documents_chunked": 0,
            "documents_embedded": 0,
            "chunks_created": 0,
            "errors": [],
            "updated_at": created_at
        })
        
        # Emit document discovery event for processing
        await context.emit({
            "topic": "document-discovery",
            "data": {
                "ingestion_id": ingestion_id,
                "property_id": ingestion_req.property_id,
                "sources": valid_sources,
                "overwrite_existing": ingestion_req.overwrite_existing
            }
        })
        
        # Optionally send notification that ingestion started
        if ingestion_req.notify_email:
            await context.emit({
                "topic": "send-notification",
                "data": {
                    "type": "ingestion_started",
                    "property_id": ingestion_req.property_id,
                    "ingestion_id": ingestion_id,
                    "recipients": [ingestion_req.notify_email],
                    "document_count": len(valid_sources)
                }
            })
        
        context.logger.info("Ingestion job created", {
            "ingestion_id": ingestion_id,
            "documents_queued": len(valid_sources)
        })
        
        return {
            "status": 202,
            "body": {
                "ingestion_id": ingestion_id,
                "property_id": ingestion_req.property_id,
                "status": "processing",
                "documents_queued": len(valid_sources),
                "created_at": created_at
            }
        }
        
    except Exception as e:
        context.logger.error("Failed to start ingestion", {"error": str(e)})
        return {
            "status": 500,
            "body": {"error": "Failed to start ingestion", "details": {"message": str(e)}}
        }

