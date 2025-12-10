"""
Ingestion Error Event Step

Subscribes to: ingestion-error
Handles errors during the ingestion pipeline.
Updates job status and optionally sends error notifications.
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os


class ErrorInput(BaseModel):
    """Input for ingestion errors."""
    ingestion_id: str
    property_id: str
    stage: str  # discovery, parsing, chunking, embedding, storage
    errors: List[str]


# Motia Configuration
config = {
    "name": "IngestionError",
    "type": "event",
    "description": "Handle ingestion pipeline errors",
    "subscribes": ["ingestion-error"],
    "emits": [
        {"topic": "send-notification", "label": "Send error notification"}
    ],
    "flows": ["document-ingestion"],
    "input": ErrorInput.model_json_schema()
}


async def handler(input_data, context):
    """Handle ingestion errors."""
    try:
        ingestion_id = input_data.get("ingestion_id")
        property_id = input_data.get("property_id")
        stage = input_data.get("stage", "unknown")
        errors = input_data.get("errors", [])
        
        context.logger.error("Ingestion pipeline error", {
            "ingestion_id": ingestion_id,
            "property_id": property_id,
            "stage": stage,
            "error_count": len(errors)
        })
        
        # Log each error
        for error in errors:
            context.logger.error(f"Pipeline error in {stage}", {
                "error": error,
                "ingestion_id": ingestion_id
            })
        
        # Update job status
        job_state = await context.state.get("ingestion_jobs", ingestion_id)
        # Handle nested data structure from Motia state
        job = job_state.get("data", job_state) if isinstance(job_state, dict) else job_state
        if job:
            job["status"] = "failed"
            job["errors"] = job.get("errors", []) + errors
            job["failed_stage"] = stage
            job["updated_at"] = datetime.utcnow().isoformat()
            await context.state.set("ingestion_jobs", ingestion_id, job)
            
            # Send notification about failure
            notify_email = job.get("notify_email")
            if notify_email:
                await context.emit({
                    "topic": "send-notification",
                    "data": {
                        "type": "ingestion_complete",  # Reuse completion template with errors
                        "property_id": property_id,
                        "ingestion_id": ingestion_id,
                        "recipients": [notify_email],
                        "chunks_created": 0,
                        "documents_processed": job.get("documents_parsed", 0),
                        "errors": job.get("errors", [])
                    }
                })
        
        context.logger.info("Error handling complete", {
            "ingestion_id": ingestion_id,
            "stage": stage
        })
        
    except Exception as e:
        context.logger.error("Failed to handle ingestion error", {
            "error": str(e),
            "ingestion_id": input_data.get("ingestion_id")
        })

