import os
import time
import re
import json
from typing import Dict, Any

from docling.document_converter import DocumentConverter
from docling.chunking import HybridChunker
from transformers import AutoTokenizer

# Set environment variable to avoid tokenizer parallelism warning
os.environ["TOKENIZERS_PARALLELISM"] = "false"

config = {
    "type": "event",
    "name": "process-documents-chromadb",
    "flows": ["rag-workflow"],
    "subscribes": ["rag.process.documents.chromadb"],
    "emits": [{ "topic": "rag.chunks.ready.chromadb", "label": "Document chunks ready for ChromaDB" }],
    "input": None # No schema validation for Python right now
}

async def handler(input, context):
    for file in input['files']:
        # Get file info from input
        file_path = file['filePath']
        filename = file['fileName']
        file_type = file['fileType']
        
        context.logger.info(f"Processing document for ChromaDB: {filename} (type: {file_type})")
        
        # Check memory usage before processing
        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_percent = process.memory_percent()
            context.logger.info(f"Memory usage before processing {filename}: RSS={memory_info.rss / 1024 / 1024:.1f}MB, VMS={memory_info.vms / 1024 / 1024:.1f}MB, Percent={memory_percent:.1f}%")
            
            # Skip processing if memory usage is too high
            if memory_percent > 90:
                context.logger.warning(f"Skipping {filename} due to high memory usage: {memory_percent:.1f}%")
                # Force garbage collection
                import gc
                gc.collect()
                # Wait a bit for memory cleanup
                import asyncio
                await asyncio.sleep(2)
                continue
            elif memory_percent > 80:
                context.logger.warning(f"High memory usage detected: {memory_percent:.1f}% - processing may be slow or fail")
        except ImportError:
            # psutil not available, skip memory logging
            pass

        # Initialize components
        EMBED_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
        MAX_TOKENS = 512  # Reduced to match model's maximum sequence length

        tokenizer = AutoTokenizer.from_pretrained(EMBED_MODEL_ID)
        chunker = HybridChunker(
            tokenizer=tokenizer,
            max_tokens=MAX_TOKENS,
        )

        chunks = []
        try:
            if file_type == '.txt':
                # Handle TXT files with custom processing
                chunks = await process_txt_file(file_path, filename, chunker, context)
            elif file_type == '.md' and is_json_file(file_path):
                # Handle JSON files with .md extension
                chunks = await process_json_file(file_path, filename, chunker, context)
            else:
                # Handle other formats with Docling
                chunks = await process_docling_file(file_path, filename, file_type, chunker, context)
                
        except Exception as e:
            context.logger.error(f"Error processing {filename}: {str(e)}", exc_info=True)
            # Log additional context for debugging
            context.logger.error(f"File path: {file_path}, File type: {file_type}")
            raise e

        context.logger.info(f"Processed {len(chunks)} chunks from {filename} for ChromaDB")
        
        # Log memory usage after processing
        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()
            context.logger.info(f"Memory usage after processing {filename}: RSS={memory_info.rss / 1024 / 1024:.1f}MB, VMS={memory_info.vms / 1024 / 1024:.1f}MB")
        except ImportError:
            # psutil not available, skip memory logging
            pass

        # Generate a unique state key using the filename (without extension) and timestamp
        base_name = os.path.splitext(filename)[0]
        # Remove any non-alphanumeric characters and replace spaces with underscores
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', base_name)
        chunks_state_key = f"chunks_{safe_name}_{int(time.time())}"

        # Save chunks to state
        try:
            # Final sanitization of all chunks before saving to state
            sanitized_chunks = [sanitize_chunk_for_ipc(chunk) for chunk in chunks]
            await context.state.set('rag-workflow', chunks_state_key, sanitized_chunks)
            context.logger.info(f"Saved {len(sanitized_chunks)} sanitized chunks to state with key: {chunks_state_key}")
        except Exception as e:
            context.logger.error(f"Error saving chunks to state: {str(e)}", exc_info=True)
            raise e

        try:
            await context.emit({
                "topic": "rag.chunks.ready.chromadb",
                "data": {
                    "stateKey": chunks_state_key
                }
            })
            context.logger.info(f"Successfully emitted chunks ready event for {len(sanitized_chunks)} chunks")
            
            # Add a small delay between files to allow system recovery
            import asyncio
            await asyncio.sleep(1)
            
        except Exception as e:
            context.logger.error(f"Error emitting chunks ready event: {str(e)}", exc_info=True)
            # Don't raise the error for EPIPE issues - they're often transient
            if "EPIPE" in str(e) or "broken pipe" in str(e).lower():
                context.logger.warning("EPIPE error detected - this is often transient and may resolve on retry")
            else:
                raise e

async def process_txt_file(file_path: str, filename: str, chunker, context):
    """Process TXT files with custom text processing."""
    context.logger.info(f"Processing TXT file with custom text processor: {filename}")
    
    # Read the text file
    with open(file_path, 'r', encoding='utf-8') as f:
        text_content = f.read()
    
    # Create a simple document-like object for chunking
    # We'll split the text into paragraphs and process each as a chunk
    paragraphs = [p.strip() for p in text_content.split('\n\n') if p.strip()]
    
    chunks = []
    for i, paragraph in enumerate(paragraphs):
        if len(paragraph) > 10:  # Only process non-empty paragraphs
            # Use the chunker to split long paragraphs if needed
            # For simplicity, we'll create chunks directly
            chunks.append({
                "text": paragraph,
                "title": os.path.splitext(filename)[0],
                "metadata": {
                    "source": filename,
                    "file_type": "txt",
                    "paragraph": i + 1
                }
            })
    
    return chunks

async def process_docling_file(file_path: str, filename: str, file_type: str, chunker, context):
    """Process files using Docling DocumentConverter."""
    context.logger.info(f"Processing {file_type} file with Docling: {filename}")
    
    # Initialize Docling converter
    converter = DocumentConverter()
    
    # Convert document to Docling document
    result = converter.convert(file_path)
    doc = result.document

    # Get chunks using the chunker
    chunks = []
    for chunk in chunker.chunk(dl_doc=doc):
        chunks.append({
            "text": chunk.text,
            "title": os.path.splitext(filename)[0],
            "metadata": {
                "source": filename,
                "file_type": file_type,
                "page": chunk.page_number if hasattr(chunk, 'page_number') else 1
            }
        })
    
    return chunks

def is_json_file(file_path: str) -> bool:
    """Check if a file contains valid JSON content."""
    try:
        # Try multiple encodings to handle various file encodings
        encodings_to_try = ['utf-8', 'utf-8-sig', 'latin1', 'cp1252', 'iso-8859-1']
        
        for encoding in encodings_to_try:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read().strip()
                # Try to parse as JSON
                json.loads(content)
                return True
            except (UnicodeDecodeError, json.JSONDecodeError):
                continue
        
        return False
    except FileNotFoundError:
        return False

async def process_json_file(file_path: str, filename: str, chunker, context):
    """Process JSON files with proper encoding and chunking."""
    context.logger.info(f"Processing JSON file: {filename}")
    
    try:
        # Try multiple encodings to handle various file encodings
        content = None
        encodings_to_try = ['utf-8', 'utf-8-sig', 'latin1', 'cp1252', 'iso-8859-1']
        
        for encoding in encodings_to_try:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read().strip()
                context.logger.debug(f"Successfully read file with encoding: {encoding}")
                break
            except UnicodeDecodeError as e:
                context.logger.debug(f"Failed to read with encoding {encoding}: {e}")
                continue
        
        if content is None:
            raise ValueError(f"Could not read file {filename} with any of the attempted encodings: {encodings_to_try}")
        
        # Parse JSON
        data = json.loads(content)
        
        chunks = []
        
        # Handle different JSON structures
        if isinstance(data, dict):
            if 'item' in data and isinstance(data['item'], list):
                # Handle knowledge items structure
                for i, item in enumerate(data['item']):
                    if isinstance(item, dict):
                        # Extract relevant text content
                        text_parts = []
                        
                        # Add title if available
                        if 'translation' in item and 'content' in item['translation']:
                            content_obj = item['translation']['content']
                            if 'title' in content_obj and content_obj['title']:
                                title = sanitize_text_for_ipc(content_obj['title'])
                                text_parts.append(f"Title: {title}")
                            
                            # Add description if available
                            if 'description' in content_obj and content_obj['description']:
                                # Clean HTML tags for better text processing
                                description = re.sub(r'<[^>]+>', '', content_obj['description'])
                                # Sanitize text for IPC compatibility
                                description = sanitize_text_for_ipc(description)
                                if description.strip():
                                    text_parts.append(f"Description: {description.strip()}")
                            
                            # Add main content if available
                            if 'content' in content_obj and content_obj['content']:
                                # Clean HTML tags for better text processing
                                main_content = re.sub(r'<[^>]+>', '', content_obj['content'])
                                # Sanitize text for IPC compatibility
                                main_content = sanitize_text_for_ipc(main_content)
                                if main_content.strip():
                                    text_parts.append(f"Content: {main_content.strip()}")
                        
                        # Combine all text parts
                        combined_text = "\n\n".join(text_parts)
                        
                        if combined_text.strip():
                            # Use chunker to ensure proper token limits
                            chunk_texts = chunk_text_by_tokens(combined_text, chunker)
                            
                            for j, chunk_text in enumerate(chunk_texts):
                                chunk = {
                                    "text": chunk_text,
                                    "title": f"{os.path.splitext(filename)[0]} - Item {i+1}",
                                    "metadata": {
                                        "source": filename,
                                        "file_type": "json",
                                        "item_id": item.get('id', f'item_{i+1}'),
                                        "item_number": item.get('number', ''),
                                        "chunk_index": j + 1,
                                        "total_chunks": len(chunk_texts)
                                    }
                                }
                                chunks.append(sanitize_chunk_for_ipc(chunk))
            else:
                # Handle other JSON structures
                text_content = json.dumps(data, ensure_ascii=False, indent=2)
                chunk_texts = chunk_text_by_tokens(text_content, chunker)
                
                for i, chunk_text in enumerate(chunk_texts):
                    chunk = {
                        "text": chunk_text,
                        "title": os.path.splitext(filename)[0],
                        "metadata": {
                            "source": filename,
                            "file_type": "json",
                            "chunk_index": i + 1,
                            "total_chunks": len(chunk_texts)
                        }
                    }
                    chunks.append(sanitize_chunk_for_ipc(chunk))
        elif isinstance(data, list):
            # Handle JSON arrays
            for i, item in enumerate(data):
                if isinstance(item, (dict, str)):
                    text_content = json.dumps(item, ensure_ascii=False, indent=2)
                    chunk_texts = chunk_text_by_tokens(text_content, chunker)
                    
                    for j, chunk_text in enumerate(chunk_texts):
                        chunk = {
                            "text": chunk_text,
                            "title": f"{os.path.splitext(filename)[0]} - Item {i+1}",
                            "metadata": {
                                "source": filename,
                                "file_type": "json",
                                "item_index": i + 1,
                                "chunk_index": j + 1,
                                "total_chunks": len(chunk_texts)
                            }
                        }
                        chunks.append(sanitize_chunk_for_ipc(chunk))
        
        return chunks
        
    except Exception as e:
        context.logger.error(f"Error processing JSON file {filename}: {str(e)}")
        raise e

def chunk_text_by_tokens(text: str, chunker) -> list:
    """Split text into chunks that respect token limits."""
    # Simple chunking by splitting on sentences and ensuring token limits
    sentences = re.split(r'[.!?]\s+', text)
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        # Add sentence to current chunk
        test_chunk = current_chunk + (" " if current_chunk else "") + sentence
        
        # Check if adding this sentence would exceed token limit
        # Use the tokenizer's tokenize method instead of encode
        try:
            tokens = chunker.tokenizer.tokenize(test_chunk)
            # Add 2 for special tokens (CLS and SEP)
            token_count = len(tokens) + 2
        except AttributeError:
            # Fallback: estimate tokens by word count (rough approximation)
            token_count = len(test_chunk.split()) * 1.3  # Rough estimate
        
        if token_count > chunker.max_tokens:
            # If current chunk is not empty, save it
            if current_chunk.strip():
                chunks.append(current_chunk.strip())
            # Start new chunk with current sentence
            current_chunk = sentence
        else:
            current_chunk = test_chunk
    
    # Add the last chunk if it's not empty
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    # If no chunks were created (text is very short), return the original text
    if not chunks:
        chunks = [text]
    
    return chunks

def sanitize_text_for_ipc(text: str) -> str:
    """Sanitize text to ensure IPC compatibility by handling problematic characters."""
    if not text:
        return text
    
    try:
        # First, ensure the text is properly encoded as UTF-8
        if isinstance(text, bytes):
            text = text.decode('utf-8', errors='replace')
        
        # More aggressive sanitization for IPC compatibility
        # Replace all non-ASCII characters that might cause issues
        import unicodedata
        
        # Normalize the text first
        text = unicodedata.normalize('NFKD', text)
        
        # Replace problematic characters that can cause IPC issues
        # Replace non-printable characters except common whitespace
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
        
        # Replace problematic Unicode characters that can cause encoding issues
        text = re.sub(r'[\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000]', ' ', text)
        
        # Replace Swedish characters with ASCII equivalents to avoid IPC issues
        replacements = {
            'å': 'a', 'ä': 'a', 'ö': 'o',
            'Å': 'A', 'Ä': 'A', 'Ö': 'O',
            'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
            'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
            'ü': 'u', 'Ü': 'U',
            'ç': 'c', 'Ç': 'C',
            'ñ': 'n', 'Ñ': 'N',
            'ß': 'ss',
            '–': '-', '—': '-', '…': '...',
            '"': '"', '"': '"', ''': "'", ''': "'",
            '«': '"', '»': '"', '‹': "'", '›': "'"
        }
        
        for old, new in replacements.items():
            text = text.replace(old, new)
        
        # Remove any remaining non-ASCII characters
        text = ''.join(c for c in text if ord(c) < 128)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Ensure the text can be encoded as UTF-8
        text.encode('utf-8')
        
        return text.strip()
        
    except (UnicodeEncodeError, UnicodeDecodeError) as e:
        # Final fallback: replace everything with safe characters
        text = ''.join(c if c.isalnum() or c.isspace() or c in '.,!?;:-()[]{}' else ' ' for c in str(text))
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

def sanitize_chunk_for_ipc(chunk: dict) -> dict:
    """Sanitize an entire chunk object for IPC compatibility."""
    try:
        # Create a deep copy to avoid modifying the original
        import copy
        sanitized_chunk = copy.deepcopy(chunk)
        
        # Sanitize all string fields
        if 'text' in sanitized_chunk:
            sanitized_chunk['text'] = sanitize_text_for_ipc(sanitized_chunk['text'])
        
        if 'title' in sanitized_chunk:
            sanitized_chunk['title'] = sanitize_text_for_ipc(sanitized_chunk['title'])
        
        if 'metadata' in sanitized_chunk and isinstance(sanitized_chunk['metadata'], dict):
            for key, value in sanitized_chunk['metadata'].items():
                if isinstance(value, str):
                    sanitized_chunk['metadata'][key] = sanitize_text_for_ipc(value)
        
        return sanitized_chunk
        
    except Exception as e:
        # If sanitization fails, return a minimal safe chunk
        return {
            "text": "Content processing error",
            "title": "Error",
            "metadata": {
                "source": "unknown",
                "file_type": "error",
                "error": "sanitization_failed"
            }
        }
