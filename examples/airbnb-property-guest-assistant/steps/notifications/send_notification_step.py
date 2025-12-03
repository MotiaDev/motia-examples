"""
Send Notification Event Step

Subscribes to: send-notification
Sends email notifications via Resend for various events:
- Ingestion started
- Ingestion completed
- Guest query answered
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))


class NotificationInput(BaseModel):
    """Input for notification."""
    type: str  # ingestion_started, ingestion_complete, guest_answer
    property_id: str
    recipients: Optional[List[str]] = None
    # For ingestion_started
    ingestion_id: Optional[str] = None
    document_count: Optional[int] = None
    # For ingestion_complete
    chunks_created: Optional[int] = None
    documents_processed: Optional[int] = None
    errors: Optional[List[str]] = None
    # For guest_answer
    guest_email: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    sources: Optional[List[str]] = None


# Motia Configuration
config = {
    "name": "SendNotification",
    "type": "event",
    "description": "Send email notifications via Resend",
    "subscribes": ["send-notification"],
    "emits": [],
    "flows": ["document-ingestion", "guest-assistant"],
    "input": NotificationInput.model_json_schema()
}


async def handler(input_data, context):
    """Handle sending notifications."""
    try:
        notification_type = input_data.get("type")
        property_id = input_data.get("property_id", "")
        
        context.logger.info("Sending notification", {
            "type": notification_type,
            "property_id": property_id
        })
        
        # Check if Resend API key is configured
        resend_api_key = os.getenv("RESEND_API_KEY")
        if not resend_api_key:
            context.logger.warn("RESEND_API_KEY not configured, skipping notification")
            return
        
        # Import email service
        try:
            from services.email_service import get_email_service
            email_service = get_email_service()
        except Exception as e:
            context.logger.error("Failed to initialize email service", {"error": str(e)})
            return
        
        # Handle different notification types
        if notification_type == "ingestion_started":
            await _send_ingestion_started(input_data, email_service, context)
        elif notification_type == "ingestion_complete":
            await _send_ingestion_complete(input_data, email_service, context)
        elif notification_type == "guest_answer":
            await _send_guest_answer(input_data, email_service, context)
        else:
            context.logger.warn("Unknown notification type", {"type": notification_type})
            
    except Exception as e:
        context.logger.error("Failed to send notification", {
            "error": str(e),
            "type": input_data.get("type")
        })
        # Don't raise - notifications failing shouldn't break the pipeline


async def _send_ingestion_started(input_data: Dict[str, Any], email_service, context):
    """Send ingestion started notification."""
    property_id = input_data.get("property_id", "")
    ingestion_id = input_data.get("ingestion_id", "")
    document_count = input_data.get("document_count", 0)
    recipients = input_data.get("recipients")
    
    try:
        result = email_service.send_ingestion_started(
            property_id=property_id,
            ingestion_id=ingestion_id,
            document_count=document_count,
            recipients=recipients
        )
        context.logger.info("Ingestion started notification sent", {
            "property_id": property_id,
            "email_id": result.get("id") if isinstance(result, dict) else str(result)
        })
    except Exception as e:
        context.logger.error("Failed to send ingestion started notification", {
            "error": str(e)
        })


async def _send_ingestion_complete(input_data: Dict[str, Any], email_service, context):
    """Send ingestion complete notification."""
    property_id = input_data.get("property_id", "")
    ingestion_id = input_data.get("ingestion_id", "")
    chunks_created = input_data.get("chunks_created", 0)
    documents_processed = input_data.get("documents_processed", 0)
    errors = input_data.get("errors", [])
    recipients = input_data.get("recipients")
    
    try:
        result = email_service.send_ingestion_complete(
            property_id=property_id,
            ingestion_id=ingestion_id,
            chunks_created=chunks_created,
            documents_processed=documents_processed,
            errors=errors,
            recipients=recipients
        )
        context.logger.info("Ingestion complete notification sent", {
            "property_id": property_id,
            "email_id": result.get("id") if isinstance(result, dict) else str(result)
        })
    except Exception as e:
        context.logger.error("Failed to send ingestion complete notification", {
            "error": str(e)
        })


async def _send_guest_answer(input_data: Dict[str, Any], email_service, context):
    """Send guest query answer notification."""
    guest_email = input_data.get("guest_email")
    property_id = input_data.get("property_id", "")
    question = input_data.get("question", "")
    answer = input_data.get("answer", "")
    sources = input_data.get("sources", [])
    
    if not guest_email:
        context.logger.warn("No guest email provided for answer notification")
        return
    
    try:
        result = email_service.send_guest_query_answer(
            guest_email=guest_email,
            property_id=property_id,
            question=question,
            answer=answer,
            sources=sources
        )
        context.logger.info("Guest answer notification sent", {
            "guest_email": guest_email,
            "email_id": result.get("id") if isinstance(result, dict) else str(result)
        })
    except Exception as e:
        context.logger.error("Failed to send guest answer notification", {
            "error": str(e),
            "guest_email": guest_email
        })

