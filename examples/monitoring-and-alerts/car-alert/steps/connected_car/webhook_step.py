"""
Webhook API Step for Connected Car Alerts
Receives car alert data, chunks text, creates embeddings, and stores in state
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import uuid
from datetime import datetime

# Import services
import sys
from services.openai_service import get_openai_service

class CarAlertRequest(BaseModel):
    """Request body for car alert webhook"""
    text: str = Field(..., description="The car alert text to process")
    query: Optional[str] = Field(None, description="Optional query to ask about the alert")
    session_id: Optional[str] = Field(None, description="Optional session ID for conversation continuity")

class CarAlertResponse(BaseModel):
    """Response for car alert webhook"""
    message: str
    session_id: str
    chunks_stored: int

config = {
    "type": "api",
    "name": "ConnectedCarWebhook",
    "description": "Receives connected car alerts, processes and stores them",
    "path": "/connected_car_alert",
    "method": "POST",
    "emits": ["process-alert"],
    "flows": ["connected-car-alert"],
    "bodySchema": CarAlertRequest.model_json_schema(),
    "responseSchema": {
        200: CarAlertResponse.model_json_schema(),
        500: {"type": "object", "properties": {"error": {"type": "string"}}}
    }
}

async def handler(req, context):
    """
    Handle incoming car alert webhook
    - Chunk the text
    - Create embeddings
    - Store in Motia state
    - Trigger agent processing
    """
    try:
        body = req.get("body", {})
        car_alert = CarAlertRequest(**body)
        
        context.logger.info("Received car alert", {
            "text_length": len(car_alert.text),
            "has_query": car_alert.query is not None
        })
        
        # Get or create session ID
        session_id = car_alert.session_id or str(uuid.uuid4())
        
        # Initialize OpenAI service
        openai_service = get_openai_service()
        
        # Chunk the text (400 chars, 40 overlap - matching n8n config)
        chunks = openai_service.chunk_text(car_alert.text, chunk_size=400, overlap=40)
        
        context.logger.info("Text chunked", {"num_chunks": len(chunks)})
        
        # Store chunks (text only) in state - no embeddings to save memory
        # We'll use simple text context instead of semantic search
        state_group = f"car_alerts_{session_id}"
        
        # Store each chunk (just text, no embeddings)
        for i, chunk in enumerate(chunks):
            await context.state.set(state_group, f"chunk_{i}", {
                "text": chunk,
                "index": i,
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # Store metadata
        await context.state.set(state_group, "metadata", {
            "session_id": session_id,
            "total_chunks": len(chunks),
            "created_at": datetime.utcnow().isoformat(),
            "original_text": car_alert.text
        })
        
        context.logger.info("Chunks stored in state", {
            "session_id": session_id,
            "state_group": state_group,
            "num_chunks": len(chunks)
        })
        
        # Emit event to process with agent
        await context.emit({
            "topic": "process-alert",
            "data": {
                "session_id": session_id,
                "query": car_alert.query or "Analyze this car alert and provide insights.",
                "state_group": state_group
            }
        })
        
        return {
            "status": 200,
            "body": {
                "message": "Car alert received and processed",
                "session_id": session_id,
                "chunks_stored": len(chunks)
            }
        }
        
    except Exception as e:
        context.logger.error("Failed to process car alert", {"error": str(e)})
        return {
            "status": 500,
            "body": {"error": str(e)}
        }

