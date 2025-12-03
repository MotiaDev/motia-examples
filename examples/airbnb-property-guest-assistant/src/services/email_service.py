"""
Resend Email Service for Airbnb Guest Assistant

Handles sending email notifications using Resend API.
"""

import os
from typing import List, Optional, Dict, Any
import resend


class EmailService:
    """Service for sending emails via Resend."""
    
    def __init__(
        self, 
        api_key: Optional[str] = None,
        from_email: Optional[str] = None
    ):
        """
        Initialize the email service.
        
        Args:
            api_key: Resend API key (defaults to RESEND_API_KEY env var)
            from_email: Default sender email (defaults to FROM_EMAIL env var)
        """
        self.api_key = api_key or os.getenv("RESEND_API_KEY")
        # Always use Resend's test address for development - can send to any recipient
        # Override FROM_EMAIL env var since onboarding@resend.dev is required for testing
        self.from_email = "onboarding@resend.dev"
        
        if not self.api_key:
            raise ValueError("Resend API key not found. Set RESEND_API_KEY environment variable.")
        
        resend.api_key = self.api_key
    
    def send_email(
        self,
        to: List[str],
        subject: str,
        html: str,
        text: Optional[str] = None,
        from_email: Optional[str] = None,
        reply_to: Optional[str] = None,
        tags: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Send an email.
        
        Args:
            to: List of recipient email addresses
            subject: Email subject
            html: HTML content
            text: Plain text content (optional)
            from_email: Override sender email
            reply_to: Reply-to address
            tags: Email tags for tracking
            
        Returns:
            Response from Resend API
        """
        params = {
            "from": from_email or self.from_email,
            "to": to,
            "subject": subject,
            "html": html
        }
        
        if text:
            params["text"] = text
        if reply_to:
            params["reply_to"] = reply_to
        if tags:
            params["tags"] = tags
        
        response = resend.Emails.send(params)
        return response
    
    def send_ingestion_started(
        self,
        property_id: str,
        ingestion_id: str,
        document_count: int,
        recipients: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Send notification that ingestion has started."""
        to = recipients or self._get_alert_recipients()
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a73e8;">📥 Document Ingestion Started</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Property ID:</strong> {property_id}</p>
                <p><strong>Ingestion ID:</strong> {ingestion_id}</p>
                <p><strong>Documents to process:</strong> {document_count}</p>
            </div>
            <p style="color: #5f6368;">You will receive another notification when processing is complete.</p>
        </div>
        """
        
        return self.send_email(
            to=to,
            subject=f"🏠 Ingestion Started - Property {property_id}",
            html=html,
            tags=[
                {"name": "type", "value": "ingestion_started"},
                {"name": "property_id", "value": property_id}
            ]
        )
    
    def send_ingestion_complete(
        self,
        property_id: str,
        ingestion_id: str,
        chunks_created: int,
        documents_processed: int,
        errors: List[str],
        recipients: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Send notification that ingestion is complete."""
        to = recipients or self._get_alert_recipients()
        
        status_color = "#34a853" if not errors else "#ea4335"
        status_text = "✅ Completed Successfully" if not errors else "⚠️ Completed with Errors"
        
        errors_html = ""
        if errors:
            errors_list = "".join([f"<li>{e}</li>" for e in errors[:10]])
            errors_html = f"""
            <div style="background: #fce8e6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong style="color: #c5221f;">Errors:</strong>
                <ul style="color: #c5221f;">{errors_list}</ul>
                {f'<p><em>...and {len(errors) - 10} more errors</em></p>' if len(errors) > 10 else ''}
            </div>
            """
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: {status_color};">{status_text}</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Property ID:</strong> {property_id}</p>
                <p><strong>Ingestion ID:</strong> {ingestion_id}</p>
                <p><strong>Documents processed:</strong> {documents_processed}</p>
                <p><strong>Knowledge chunks created:</strong> {chunks_created}</p>
            </div>
            {errors_html}
            <p style="color: #5f6368;">The property knowledge base is now ready for guest Q&A.</p>
        </div>
        """
        
        return self.send_email(
            to=to,
            subject=f"🏠 Ingestion Complete - Property {property_id}",
            html=html,
            tags=[
                {"name": "type", "value": "ingestion_complete"},
                {"name": "property_id", "value": property_id}
            ]
        )
    
    def send_guest_query_answer(
        self,
        guest_email: str,
        property_id: str,
        question: str,
        answer: str,
        sources: List[str]
    ) -> Dict[str, Any]:
        """Send an answer to a guest's question."""
        sources_html = ""
        if sources:
            sources_list = "".join([f"<li>{s}</li>" for s in sources])
            sources_html = f"""
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                <p style="color: #5f6368; font-size: 12px;"><strong>Sources:</strong></p>
                <ul style="color: #5f6368; font-size: 12px;">{sources_list}</ul>
            </div>
            """
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a73e8;">Your Question Answered</h2>
            
            <div style="background: #e8f0fe; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="color: #1967d2;"><strong>Your question:</strong></p>
                <p style="color: #202124;">{question}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #202124; line-height: 1.6;">{answer}</p>
            </div>
            
            {sources_html}
            
            <p style="color: #5f6368; font-size: 12px; margin-top: 30px;">
                If you have more questions, feel free to reply or ask our assistant.
            </p>
        </div>
        """
        
        return self.send_email(
            to=[guest_email],
            subject=f"🏠 Answer to your question",
            html=html,
            tags=[
                {"name": "type", "value": "guest_answer"},
                {"name": "property_id", "value": property_id}
            ]
        )
    
    def _get_alert_recipients(self) -> List[str]:
        """Get alert recipients from environment variable."""
        recipients_str = os.getenv("ALERT_RECIPIENTS", "")
        if not recipients_str:
            return []
        return [email.strip() for email in recipients_str.split(",") if email.strip()]


# Singleton instance
_instance: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get or create the email service singleton."""
    global _instance
    if _instance is None:
        _instance = EmailService()
    return _instance

