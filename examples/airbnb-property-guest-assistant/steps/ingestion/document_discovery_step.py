"""
Document Discovery Event Step

Subscribes to: document-discovery
Discovers and fetches documents from URLs/files for a property.
Validates size, format, and content-type before passing to parsing.
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import sys
import httpx
import base64

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))


class DocumentSourceInput(BaseModel):
    """Input document source."""
    url: Optional[str] = None
    file_path: Optional[str] = None
    doc_type: str = "house_manual"
    language: str = "en"


class DiscoveryInput(BaseModel):
    """Input for document discovery."""
    ingestion_id: str
    property_id: str
    sources: List[DocumentSourceInput]
    overwrite_existing: bool = True


# Motia Configuration
config = {
    "name": "DocumentDiscovery",
    "type": "event",
    "description": "Discover and validate documents from URLs/files",
    "subscribes": ["document-discovery"],
    "emits": [
        {"topic": "document-parse", "label": "Parse discovered documents"},
        {"topic": "ingestion-error", "label": "Report discovery errors", "conditional": True}
    ],
    "flows": ["document-ingestion"],
    "input": DiscoveryInput.model_json_schema()
}


# Configuration
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md", ".markdown", ".html", ".htm"}
SUPPORTED_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "text/html"
}


async def handler(input_data, context):
    """Handle document discovery."""
    try:
        # Parse input
        discovery_input = DiscoveryInput(**input_data)
        
        context.logger.info("Starting document discovery", {
            "ingestion_id": discovery_input.ingestion_id,
            "property_id": discovery_input.property_id,
            "source_count": len(discovery_input.sources)
        })
        
        discovered_docs = []
        errors = []
        
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            for i, source in enumerate(discovery_input.sources):
                try:
                    doc_info = await _discover_source(
                        source=source,
                        client=client,
                        context=context
                    )
                    if doc_info:
                        discovered_docs.append(doc_info)
                except Exception as e:
                    error_msg = f"Failed to discover source {i}: {str(e)}"
                    errors.append(error_msg)
                    context.logger.error(error_msg, {
                        "source_url": source.url,
                        "source_file": source.file_path
                    })
        
        # Update job status
        job_state = await context.state.get("ingestion_jobs", discovery_input.ingestion_id)
        # Handle nested data structure from Motia state
        job = job_state.get("data", job_state) if isinstance(job_state, dict) else job_state
        if job:
            job["documents_discovered"] = len(discovered_docs)
            job["errors"] = job.get("errors", []) + errors
            job["updated_at"] = datetime.utcnow().isoformat()
            await context.state.set("ingestion_jobs", discovery_input.ingestion_id, job)
        
        context.logger.info("Document discovery complete", {
            "ingestion_id": discovery_input.ingestion_id,
            "discovered": len(discovered_docs),
            "errors": len(errors)
        })
        
        # Emit for parsing if we have documents
        if discovered_docs:
            await context.emit({
                "topic": "document-parse",
                "data": {
                    "ingestion_id": discovery_input.ingestion_id,
                    "property_id": discovery_input.property_id,
                    "documents": discovered_docs,
                    "overwrite_existing": discovery_input.overwrite_existing
                }
            })
        elif errors:
            # All documents failed - emit error
            await context.emit({
                "topic": "ingestion-error",
                "data": {
                    "ingestion_id": discovery_input.ingestion_id,
                    "property_id": discovery_input.property_id,
                    "stage": "discovery",
                    "errors": errors
                }
            })
            
    except Exception as e:
        context.logger.error("Document discovery failed", {
            "error": str(e),
            "ingestion_id": input_data.get("ingestion_id")
        })
        raise


async def _discover_source(
    source: DocumentSourceInput,
    client: httpx.AsyncClient,
    context
) -> Optional[Dict[str, Any]]:
    """Discover a single document source."""
    
    if source.url:
        return await _discover_url(source, client, context)
    elif source.file_path:
        return await _discover_file(source, context)
    else:
        return None


async def _discover_url(
    source: DocumentSourceInput,
    client: httpx.AsyncClient,
    context
) -> Optional[Dict[str, Any]]:
    """Discover a document from URL."""
    url = source.url
    
    context.logger.info("Discovering URL", {"url": url})
    
    # First, do a HEAD request to check size and content type
    try:
        head_response = await client.head(url)
        head_response.raise_for_status()
    except Exception:
        # Some servers don't support HEAD, try GET
        head_response = None
    
    # Check content type
    content_type = ""
    content_length = 0
    
    if head_response:
        content_type = head_response.headers.get("content-type", "").lower()
        content_length = int(head_response.headers.get("content-length", 0))
    
    # Validate file size if known
    if content_length > MAX_FILE_SIZE:
        raise ValueError(f"File too large: {content_length} bytes (max {MAX_FILE_SIZE})")
    
    # Check extension from URL
    ext = _get_extension_from_url(url)
    
    # Validate content type or extension
    content_type_valid = any(ct in content_type for ct in SUPPORTED_CONTENT_TYPES)
    extension_valid = ext in SUPPORTED_EXTENSIONS
    
    if not content_type_valid and not extension_valid:
        raise ValueError(f"Unsupported format: content-type={content_type}, extension={ext}")
    
    # Fetch the content
    response = await client.get(url)
    response.raise_for_status()
    
    content = response.content
    
    # Final size check
    if len(content) > MAX_FILE_SIZE:
        raise ValueError(f"File too large: {len(content)} bytes (max {MAX_FILE_SIZE})")
    
    # Determine format
    actual_content_type = response.headers.get("content-type", "").lower()
    file_format = _determine_format(actual_content_type, ext)
    
    # Encode bytes to base64 string for JSON serialization
    content_b64 = base64.b64encode(content).decode('utf-8')
    
    return {
        "source_type": "url",
        "url": url,
        "content_b64": content_b64,  # base64 encoded string
        "content_type": actual_content_type,
        "format": file_format,
        "doc_type": source.doc_type,
        "language": source.language,
        "size": len(content)
    }


async def _discover_file(
    source: DocumentSourceInput,
    context
) -> Optional[Dict[str, Any]]:
    """Discover a local file."""
    file_path = source.file_path
    
    context.logger.info("Discovering file", {"file_path": file_path})
    
    # Check if file exists
    if not os.path.exists(file_path):
        raise ValueError(f"File not found: {file_path}")
    
    # Check file size
    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE:
        raise ValueError(f"File too large: {file_size} bytes (max {MAX_FILE_SIZE})")
    
    # Check extension
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file extension: {ext}")
    
    # Read file content
    with open(file_path, "rb") as f:
        content = f.read()
    
    file_format = _determine_format_from_extension(ext)
    
    # Encode bytes to base64 string for JSON serialization
    content_b64 = base64.b64encode(content).decode('utf-8')
    
    return {
        "source_type": "file",
        "file_path": file_path,
        "filename": os.path.basename(file_path),
        "content_b64": content_b64,  # base64 encoded string
        "format": file_format,
        "doc_type": source.doc_type,
        "language": source.language,
        "size": len(content)
    }


def _get_extension_from_url(url: str) -> str:
    """Extract file extension from URL."""
    # Remove query params
    clean_url = url.split("?")[0]
    ext = os.path.splitext(clean_url)[1].lower()
    return ext


def _determine_format(content_type: str, extension: str) -> str:
    """Determine document format from content type and extension."""
    if "pdf" in content_type or extension == ".pdf":
        return "pdf"
    elif "msword" in content_type or extension in [".doc", ".docx"]:
        return "docx"
    elif "html" in content_type or extension in [".html", ".htm"]:
        return "html"
    elif extension in [".md", ".markdown"]:
        return "markdown"
    else:
        return "text"


def _determine_format_from_extension(extension: str) -> str:
    """Determine format from extension only."""
    format_map = {
        ".pdf": "pdf",
        ".doc": "docx",
        ".docx": "docx",
        ".html": "html",
        ".htm": "html",
        ".md": "markdown",
        ".markdown": "markdown",
        ".txt": "text"
    }
    return format_map.get(extension, "text")

