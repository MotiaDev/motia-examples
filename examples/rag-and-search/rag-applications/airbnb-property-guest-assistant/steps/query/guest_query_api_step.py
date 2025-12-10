"""
Guest Query API Step

POST /query - Answer guest questions using the property knowledge base.
Retrieves from property-specific documents in LanceDB and returns precise,
policy-aligned answers.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))


class QueryRequest(BaseModel):
    """Request body for guest query."""
    property_id: str = Field(..., min_length=1, description="Property/listing identifier")
    question: str = Field(..., min_length=1, max_length=1000, description="Guest's question")
    language: str = Field("en", description="Preferred response language (ISO 639-1)")
    guest_email: Optional[str] = Field(None, description="Guest email to send answer to")
    doc_types: Optional[List[str]] = Field(
        None,
        description="Filter by doc types: house_manual, local_guide, appliance_manual, policy"
    )


class QuerySource(BaseModel):
    """A source used to answer the question."""
    document: str
    section: str


class QueryResponse(BaseModel):
    """Response for guest query."""
    answer: str
    confidence: str  # high, medium, low
    sources: List[str]
    property_id: str


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    details: Optional[Dict[str, Any]] = None


# Motia Configuration
config = {
    "name": "GuestQuery",
    "type": "api",
    "description": "Answer guest questions using the property knowledge base",
    "path": "/query",
    "method": "POST",
    "emits": [
        {"topic": "send-notification", "label": "Email answer to guest", "conditional": True}
    ],
    "flows": ["guest-assistant"],
    "bodySchema": QueryRequest.model_json_schema(),
    "responseSchema": {
        200: QueryResponse.model_json_schema(),
        400: ErrorResponse.model_json_schema(),
        404: ErrorResponse.model_json_schema(),
        500: ErrorResponse.model_json_schema()
    }
}


async def handler(req, context):
    """Handle guest query request."""
    try:
        body = req.get("body", {})
        
        # Validate request
        try:
            query_req = QueryRequest(**body)
        except Exception as e:
            context.logger.error("Validation failed", {"error": str(e)})
            return {
                "status": 400,
                "body": {"error": "Validation failed", "details": {"message": str(e)}}
            }
        
        context.logger.info("Processing guest query", {
            "property_id": query_req.property_id,
            "question_length": len(query_req.question)
        })
        
        # Import services
        try:
            from services.embeddings_service import get_embeddings_service
            from services.lancedb_service import get_lancedb_service
            from services.llm_service import get_llm_service
        except ImportError as e:
            context.logger.error("Failed to import services", {"error": str(e)})
            return {
                "status": 500,
                "body": {"error": "Service initialization failed", "details": {"message": str(e)}}
            }
        
        # Initialize services
        embeddings_service = get_embeddings_service()
        lancedb_service = get_lancedb_service()
        llm_service = get_llm_service()
        
        # Generate query embedding
        context.logger.info("Generating query embedding")
        query_embedding = embeddings_service.embed_text(query_req.question)
        
        # Search for relevant documents
        context.logger.info("Searching knowledge base", {
            "property_id": query_req.property_id,
            "doc_types": query_req.doc_types
        })
        
        results = lancedb_service.search(
            query_embedding=query_embedding,
            property_id=query_req.property_id,
            language=query_req.language,
            doc_types=query_req.doc_types,
            limit=5,
            include_critical_boost=True
        )
        
        if not results:
            context.logger.warn("No documents found for property", {
                "property_id": query_req.property_id
            })
            return {
                "status": 404,
                "body": {
                    "error": "No property documents found",
                    "details": {
                        "message": f"No documents have been ingested for property {query_req.property_id}. Please ingest documents first."
                    }
                }
            }
        
        # Generate answer using LLM
        context.logger.info("Generating answer with LLM", {
            "context_chunks": len(results)
        })
        
        answer_result = llm_service.answer_question(
            question=query_req.question,
            context_chunks=results,
            property_id=query_req.property_id,
            language=query_req.language
        )
        
        # Optionally email the answer to guest
        if query_req.guest_email:
            await context.emit({
                "topic": "send-notification",
                "data": {
                    "type": "guest_answer",
                    "guest_email": query_req.guest_email,
                    "property_id": query_req.property_id,
                    "question": query_req.question,
                    "answer": answer_result["answer"],
                    "sources": answer_result["sources"]
                }
            })
        
        context.logger.info("Query answered successfully", {
            "property_id": query_req.property_id,
            "confidence": answer_result["confidence"],
            "sources_count": len(answer_result["sources"])
        })
        
        return {
            "status": 200,
            "body": {
                "answer": answer_result["answer"],
                "confidence": answer_result["confidence"],
                "sources": answer_result["sources"],
                "property_id": query_req.property_id
            }
        }
        
    except Exception as e:
        context.logger.error("Failed to process query", {"error": str(e)})
        return {
            "status": 500,
            "body": {"error": "Failed to process query", "details": {"message": str(e)}}
        }

