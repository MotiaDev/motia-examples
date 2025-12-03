"""
Chunking Service for Airbnb Guest Assistant

Chunks parsed documents into optimal sizes for Q&A retrieval.
Preserves section context and handles overlapping for better results.
"""

import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from .document_parser import ParsedDocument, ParsedSection


@dataclass
class DocumentChunk:
    """A chunk of document content ready for embedding."""
    id: str
    content: str
    section_title: str
    doc_type: str
    language: str
    is_critical: bool
    source_url: str
    source_filename: str
    property_id: str
    chunk_index: int
    total_chunks: int
    metadata: Dict[str, Any]


class ChunkingService:
    """Service for chunking documents for Q&A retrieval."""
    
    # Default chunking parameters
    DEFAULT_CHUNK_SIZE = 500  # Characters
    DEFAULT_CHUNK_OVERLAP = 50  # Characters
    MIN_CHUNK_SIZE = 100
    MAX_CHUNK_SIZE = 2000
    
    def __init__(
        self,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
    ):
        """
        Initialize the chunking service.
        
        Args:
            chunk_size: Target chunk size in characters
            chunk_overlap: Overlap between chunks
        """
        self.chunk_size = max(self.MIN_CHUNK_SIZE, min(chunk_size, self.MAX_CHUNK_SIZE))
        self.chunk_overlap = min(chunk_overlap, chunk_size // 2)
    
    def chunk_document(
        self,
        document: ParsedDocument,
        property_id: str,
        ingestion_id: str
    ) -> List[DocumentChunk]:
        """
        Chunk a parsed document into retrieval-friendly pieces.
        
        Args:
            document: The parsed document
            property_id: Property identifier
            ingestion_id: Ingestion job identifier
            
        Returns:
            List of DocumentChunk objects
        """
        chunks = []
        chunk_counter = 0
        
        for section in document.sections:
            section_chunks = self._chunk_section(
                section=section,
                document=document,
                property_id=property_id,
                ingestion_id=ingestion_id,
                start_index=chunk_counter
            )
            chunks.extend(section_chunks)
            chunk_counter += len(section_chunks)
        
        # Update total chunks count
        for chunk in chunks:
            chunk.total_chunks = len(chunks)
        
        return chunks
    
    def _chunk_section(
        self,
        section: ParsedSection,
        document: ParsedDocument,
        property_id: str,
        ingestion_id: str,
        start_index: int
    ) -> List[DocumentChunk]:
        """Chunk a single section."""
        content = section.content.strip()
        
        if not content:
            return []
        
        # If section is small enough, keep as single chunk
        if len(content) <= self.chunk_size:
            chunk_id = f"{property_id}_{ingestion_id}_{start_index:04d}"
            
            return [DocumentChunk(
                id=chunk_id,
                content=self._format_chunk_content(section.title, content),
                section_title=section.title,
                doc_type=document.doc_type.value if hasattr(document.doc_type, 'value') else str(document.doc_type),
                language=document.language,
                is_critical=section.is_critical,
                source_url=document.source_url,
                source_filename=document.source_filename,
                property_id=property_id,
                chunk_index=start_index,
                total_chunks=0,  # Will be updated later
                metadata={
                    "ingestion_id": ingestion_id,
                    "document_title": document.title,
                    "section_level": section.level
                }
            )]
        
        # Split into smaller chunks
        text_chunks = self._split_text(content)
        chunks = []
        
        for i, text_chunk in enumerate(text_chunks):
            chunk_id = f"{property_id}_{ingestion_id}_{start_index + i:04d}"
            
            chunks.append(DocumentChunk(
                id=chunk_id,
                content=self._format_chunk_content(section.title, text_chunk),
                section_title=section.title,
                doc_type=document.doc_type.value if hasattr(document.doc_type, 'value') else str(document.doc_type),
                language=document.language,
                is_critical=section.is_critical,
                source_url=document.source_url,
                source_filename=document.source_filename,
                property_id=property_id,
                chunk_index=start_index + i,
                total_chunks=0,
                metadata={
                    "ingestion_id": ingestion_id,
                    "document_title": document.title,
                    "section_level": section.level,
                    "chunk_part": i + 1,
                    "section_parts": len(text_chunks)
                }
            ))
        
        return chunks
    
    def _split_text(self, text: str) -> List[str]:
        """Split text into chunks with overlap."""
        chunks = []
        
        # First, try to split on paragraph boundaries
        paragraphs = re.split(r'\n\n+', text)
        
        current_chunk = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # If adding this paragraph would exceed chunk size
            if len(current_chunk) + len(para) + 2 > self.chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                
                # If paragraph itself is too long, split further
                if len(para) > self.chunk_size:
                    para_chunks = self._split_long_paragraph(para)
                    chunks.extend(para_chunks[:-1])
                    current_chunk = para_chunks[-1] if para_chunks else ""
                else:
                    current_chunk = para
            else:
                if current_chunk:
                    current_chunk += "\n\n" + para
                else:
                    current_chunk = para
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        # Add overlap between chunks
        if self.chunk_overlap > 0 and len(chunks) > 1:
            chunks = self._add_overlap(chunks)
        
        return chunks
    
    def _split_long_paragraph(self, paragraph: str) -> List[str]:
        """Split a long paragraph on sentence boundaries."""
        # Split on sentence boundaries
        sentences = re.split(r'(?<=[.!?])\s+', paragraph)
        
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) + 1 > self.chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                
                # If sentence is still too long, split on words
                if len(sentence) > self.chunk_size:
                    word_chunks = self._split_on_words(sentence)
                    chunks.extend(word_chunks[:-1])
                    current_chunk = word_chunks[-1] if word_chunks else ""
                else:
                    current_chunk = sentence
            else:
                if current_chunk:
                    current_chunk += " " + sentence
                else:
                    current_chunk = sentence
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def _split_on_words(self, text: str) -> List[str]:
        """Split text on word boundaries as last resort."""
        words = text.split()
        chunks = []
        current_chunk = ""
        
        for word in words:
            if len(current_chunk) + len(word) + 1 > self.chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = word
            else:
                if current_chunk:
                    current_chunk += " " + word
                else:
                    current_chunk = word
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def _add_overlap(self, chunks: List[str]) -> List[str]:
        """Add overlapping context between chunks."""
        overlapped = []
        
        for i, chunk in enumerate(chunks):
            if i == 0:
                overlapped.append(chunk)
            else:
                # Get end of previous chunk
                prev_chunk = chunks[i - 1]
                overlap_text = prev_chunk[-self.chunk_overlap:] if len(prev_chunk) > self.chunk_overlap else prev_chunk
                
                # Find word boundary in overlap
                space_idx = overlap_text.find(" ")
                if space_idx > 0:
                    overlap_text = overlap_text[space_idx + 1:]
                
                overlapped.append(f"...{overlap_text} {chunk}")
        
        return overlapped
    
    def _format_chunk_content(self, section_title: str, content: str) -> str:
        """Format chunk content with section context."""
        if section_title and section_title.lower() not in content.lower()[:100]:
            return f"[{section_title}]\n{content}"
        return content


# Singleton instance
_instance: Optional[ChunkingService] = None


def get_chunking_service(
    chunk_size: int = ChunkingService.DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = ChunkingService.DEFAULT_CHUNK_OVERLAP
) -> ChunkingService:
    """Get or create the chunking service singleton."""
    global _instance
    if _instance is None:
        _instance = ChunkingService(chunk_size, chunk_overlap)
    return _instance

