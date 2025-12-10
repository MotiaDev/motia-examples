"""
Document Parse Event Step

Subscribes to: document-parse
Parses and normalizes documents, preserving headings and sections.
Normalizes into a common schema with title, section, body_text, etc.
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))


class DocumentInfo(BaseModel):
    """Info about a discovered document."""
    source_type: str  # url or file
    url: Optional[str] = None
    file_path: Optional[str] = None
    filename: Optional[str] = None
    content: Any  # bytes as base64 or raw
    content_type: Optional[str] = None
    format: str  # pdf, docx, html, markdown, text
    doc_type: str
    language: str
    size: int


class ParseInput(BaseModel):
    """Input for document parsing."""
    ingestion_id: str
    property_id: str
    documents: List[Dict[str, Any]]
    overwrite_existing: bool = True


# Motia Configuration
config = {
    "name": "DocumentParse",
    "type": "event",
    "description": "Parse and normalize documents into structured format",
    "subscribes": ["document-parse"],
    "emits": [
        {"topic": "document-chunk", "label": "Chunk parsed documents"},
        {"topic": "ingestion-error", "label": "Report parse errors", "conditional": True}
    ],
    "flows": ["document-ingestion"],
    "input": ParseInput.model_json_schema()
}


async def handler(input_data, context):
    """Handle document parsing."""
    try:
        ingestion_id = input_data.get("ingestion_id")
        property_id = input_data.get("property_id")
        documents = input_data.get("documents", [])
        overwrite_existing = input_data.get("overwrite_existing", True)
        
        context.logger.info("Starting document parsing", {
            "ingestion_id": ingestion_id,
            "document_count": len(documents)
        })
        
        # Import parser service
        from services.document_parser import DocumentParser
        
        parser = DocumentParser()
        
        parsed_docs = []
        errors = []
        
        try:
            for i, doc in enumerate(documents):
                try:
                    parsed = await _parse_document(doc, property_id, parser, context)
                    if parsed:
                        parsed_docs.append(parsed)
                except Exception as e:
                    source = doc.get("url") or doc.get("file_path") or f"document_{i}"
                    error_msg = f"Failed to parse {source}: {str(e)}"
                    errors.append(error_msg)
                    context.logger.error(error_msg)
        finally:
            await parser.close()
        
        # Update job status
        job_state = await context.state.get("ingestion_jobs", ingestion_id)
        # Handle nested data structure from Motia state
        job = job_state.get("data", job_state) if isinstance(job_state, dict) else job_state
        if job:
            job["documents_parsed"] = len(parsed_docs)
            job["errors"] = job.get("errors", []) + errors
            job["updated_at"] = datetime.utcnow().isoformat()
            await context.state.set("ingestion_jobs", ingestion_id, job)
        
        context.logger.info("Document parsing complete", {
            "ingestion_id": ingestion_id,
            "parsed": len(parsed_docs),
            "errors": len(errors)
        })
        
        # Emit for chunking if we have parsed documents
        if parsed_docs:
            await context.emit({
                "topic": "document-chunk",
                "data": {
                    "ingestion_id": ingestion_id,
                    "property_id": property_id,
                    "parsed_documents": parsed_docs,
                    "overwrite_existing": overwrite_existing
                }
            })
        elif errors and not parsed_docs:
            # All documents failed
            await context.emit({
                "topic": "ingestion-error",
                "data": {
                    "ingestion_id": ingestion_id,
                    "property_id": property_id,
                    "stage": "parsing",
                    "errors": errors
                }
            })
            
    except Exception as e:
        context.logger.error("Document parsing failed", {
            "error": str(e),
            "ingestion_id": input_data.get("ingestion_id")
        })
        raise


async def _parse_document(
    doc: Dict[str, Any],
    property_id: str,
    parser,
    context
) -> Optional[Dict[str, Any]]:
    """Parse a single document."""
    import base64
    
    # Content is now base64 encoded as content_b64
    content_b64 = doc.get("content_b64")
    doc_format = doc.get("format", "text")
    language = doc.get("language", "en")
    doc_type = doc.get("doc_type", "house_manual")
    source_url = doc.get("url", "")
    source_filename = doc.get("filename", "")
    
    # Decode base64 content to bytes
    if content_b64:
        try:
            content_bytes = base64.b64decode(content_b64)
        except Exception as e:
            context.logger.error(f"Failed to decode base64 content: {e}")
            content_bytes = content_b64.encode("utf-8") if isinstance(content_b64, str) else b""
    else:
        content_bytes = b""
    
    context.logger.info("Parsing document", {
        "format": doc_format,
        "source": source_url or source_filename,
        "size": len(content_bytes)
    })
    
    # Use parser based on format
    if doc_format == "pdf":
        parsed = await parser._parse_pdf(
            content_bytes, source_url, source_filename, property_id, language
        )
    elif doc_format == "docx":
        parsed = await parser._parse_docx(
            content_bytes, source_url, source_filename, property_id, language
        )
    elif doc_format == "html":
        text = content_bytes.decode(parser.detect_encoding(content_bytes), errors="replace")
        parsed = parser._parse_html(text, source_url, source_filename, property_id, language)
    elif doc_format == "markdown":
        text = content_bytes.decode(parser.detect_encoding(content_bytes), errors="replace")
        parsed = parser._parse_markdown(text, source_url, source_filename, property_id, language)
    else:
        text = content_bytes.decode(parser.detect_encoding(content_bytes), errors="replace")
        parsed = parser._parse_plain_text(text, source_url, source_filename, property_id, language)
    
    # Override doc_type with what was specified in the source
    if doc_type:
        from services.document_parser import DocType
        try:
            parsed.doc_type = DocType(doc_type)
        except ValueError:
            pass  # Keep the auto-detected type
    
    # Convert to dict for serialization
    sections_data = []
    for section in parsed.sections:
        sections_data.append({
            "title": section.title,
            "content": section.content,
            "level": section.level,
            "is_critical": section.is_critical
        })
    
    return {
        "title": parsed.title,
        "sections": sections_data,
        "doc_type": parsed.doc_type.value if hasattr(parsed.doc_type, 'value') else str(parsed.doc_type),
        "language": parsed.language,
        "source_url": parsed.source_url,
        "source_filename": parsed.source_filename,
        "raw_text": parsed.raw_text[:5000] if len(parsed.raw_text) > 5000 else parsed.raw_text,
        "metadata": parsed.metadata
    }

