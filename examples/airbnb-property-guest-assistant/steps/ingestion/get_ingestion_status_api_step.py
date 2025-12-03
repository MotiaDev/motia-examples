"""
Get Ingestion Status API Step

GET /ingest/:ingestion_id - Check status of an ingestion job.
Returns progress: documents discovered, parsed, chunked, stored; errors by file/URL.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class IngestionProgress(BaseModel):
    """Progress details for an ingestion job."""
    documents_discovered: int
    documents_parsed: int
    documents_chunked: int
    documents_embedded: int
    total_documents: int


class IngestionStatusResponse(BaseModel):
    """Response for ingestion status."""
    ingestion_id: str
    property_id: str
    status: str  # processing, completed, failed
    progress: IngestionProgress
    chunks_created: int
    errors: List[str]
    created_at: str
    updated_at: str


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    details: Optional[Dict[str, Any]] = None


# Motia Configuration
config = {
    "name": "GetIngestionStatus",
    "type": "api",
    "description": "Get status of an ingestion job",
    "path": "/ingest/:ingestion_id",
    "method": "GET",
    "emits": [],
    "flows": ["document-ingestion"],
    "responseSchema": {
        200: IngestionStatusResponse.model_json_schema(),
        404: ErrorResponse.model_json_schema(),
        500: ErrorResponse.model_json_schema()
    },
    "queryParams": []
}


async def handler(req, context):
    """Handle ingestion status request."""
    try:
        ingestion_id = req.get("pathParams", {}).get("ingestion_id")
        
        if not ingestion_id:
            return {
                "status": 400,
                "body": {"error": "Missing ingestion_id parameter"}
            }
        
        context.logger.info("Fetching ingestion status", {"ingestion_id": ingestion_id})
        
        # Get job from state
        job_state = await context.state.get("ingestion_jobs", ingestion_id)
        
        if not job_state:
            return {
                "status": 404,
                "body": {"error": f"Ingestion job not found: {ingestion_id}"}
            }
        
        # Handle nested data structure from Motia state
        job = job_state.get("data", job_state) if isinstance(job_state, dict) else job_state
        
        # Build response
        progress = {
            "documents_discovered": job.get("documents_discovered", 0),
            "documents_parsed": job.get("documents_parsed", 0),
            "documents_chunked": job.get("documents_chunked", 0),
            "documents_embedded": job.get("documents_embedded", 0),
            "total_documents": job.get("total_documents", 0)
        }
        
        return {
            "status": 200,
            "body": {
                "ingestion_id": job.get("ingestion_id"),
                "property_id": job.get("property_id"),
                "status": job.get("status", "unknown"),
                "progress": progress,
                "chunks_created": job.get("chunks_created", 0),
                "errors": job.get("errors", []),
                "created_at": job.get("created_at", ""),
                "updated_at": job.get("updated_at", "")
            }
        }
        
    except Exception as e:
        context.logger.error("Failed to get ingestion status", {"error": str(e)})
        return {
            "status": 500,
            "body": {"error": "Failed to get ingestion status", "details": {"message": str(e)}}
        }

