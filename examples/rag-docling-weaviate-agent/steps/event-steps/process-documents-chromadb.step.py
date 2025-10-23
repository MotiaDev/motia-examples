import os
import time
import re
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

        # Initialize components
        EMBED_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
        MAX_TOKENS = 1024

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
            else:
                # Handle other formats with Docling
                chunks = await process_docling_file(file_path, filename, file_type, chunker, context)
                
        except Exception as e:
            context.logger.error(f"Error processing {filename}: {str(e)}")
            raise e

        context.logger.info(f"Processed {len(chunks)} chunks from {filename} for ChromaDB")

        # Generate a unique state key using the filename (without extension) and timestamp
        base_name = os.path.splitext(filename)[0]
        # Remove any non-alphanumeric characters and replace spaces with underscores
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', base_name)
        chunks_state_key = f"chunks_{safe_name}_{int(time.time())}"

        # Save chunks to state
        await context.state.set('rag-workflow', chunks_state_key, chunks)
        context.logger.info(f"Saved chunks to state with key: {chunks_state_key}")

        await context.emit({
            "topic": "rag.chunks.ready.chromadb",
            "data": {
                "stateKey": chunks_state_key
            }
        })

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
