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
    "name": "process-pdfs",
    "flows": ["rag-workflow"],
    "subscribes": ["rag.process.pdfs"],
    "emits": [{ "topic": "rag.chunks.ready", "label": "PDF chunks ready" }],
    "input": None # No schema validation for Python right now
    # input.stateKey: str
}

async def handler(input, context):
    for file in input['files']:
        # Get file info from input
        file_path = file['filePath']
        filename = file['fileName']
        
        context.logger.info(f"Processing PDF file: {filename}")

        # Initialize Docling converter and chunker
        converter = DocumentConverter()
        EMBED_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
        MAX_TOKENS = 1024

        tokenizer = AutoTokenizer.from_pretrained(EMBED_MODEL_ID)
        chunker = HybridChunker(
            tokenizer=tokenizer,
            max_tokens=MAX_TOKENS,
        )

        # In case of the warning:
        #  Token indices sequence length is longer than the specified maximum sequence length for this model (554 > 512).
        #  Running this sequence through the model will result in indexing errors
        #  https://docling-project.github.io/docling/faq/#hybridchunker-triggers-warning-token-indices-sequence-length-is-longer-than-the-specified-maximum-sequence-length-for-this-model

        # Process the PDF
        chunks = []
        try:
            # Convert PDF to Docling document
            result = converter.convert(file_path)
            doc = result.document

            # Get chunks using the chunker
            for chunk in chunker.chunk(dl_doc=doc):
                chunks.append({
                    "text": chunk.text,
                    "title": os.path.splitext(filename)[0],
                    "metadata": {
                        "source": filename,
                        "page": chunk.page_number if hasattr(chunk, 'page_number') else 1
                    }
                })

        except Exception as e:
            context.logger.error(f"Error processing {filename}: {str(e)}")
            raise e

        context.logger.info(f"Processed {len(chunks)} chunks from PDF")

        # Generate a unique state key using the filename (without extension) and timestamp
        base_name = os.path.splitext(filename)[0]
        # Remove any non-alphanumeric characters and replace spaces with underscores
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', base_name)
        chunks_state_key = f"chunks_{safe_name}_{int(time.time())}"

        # Save chunks to state
        await context.state.set('rag-workflow', chunks_state_key, chunks)
        context.logger.info(f"Saved chunks to state with key: {chunks_state_key}")

        await context.emit({
            "topic": "rag.chunks.ready",
            "data": {
                "stateKey": chunks_state_key
            }
        })