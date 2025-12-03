"""
OpenAI Embeddings Service for Airbnb Guest Assistant

Handles text embedding generation using OpenAI's embedding models.
"""

import os
from typing import List, Optional
from openai import OpenAI


class EmbeddingsService:
    """Service for generating text embeddings using OpenAI."""
    
    EMBEDDING_MODEL = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS = 1536
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the embeddings service.
        
        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not found. Set OPENAI_API_KEY environment variable.")
        
        self.client = OpenAI(api_key=self.api_key)
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        
        Args:
            text: The text to embed
            
        Returns:
            Vector embedding as list of floats
        """
        if not text or not text.strip():
            return [0.0] * self.EMBEDDING_DIMENSIONS
        
        response = self.client.embeddings.create(
            model=self.EMBEDDING_MODEL,
            input=text,
            dimensions=self.EMBEDDING_DIMENSIONS
        )
        
        return response.data[0].embedding
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in batch.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of vector embeddings
        """
        if not texts:
            return []
        
        # Filter empty texts and track indices
        valid_texts = []
        valid_indices = []
        
        for i, text in enumerate(texts):
            if text and text.strip():
                valid_texts.append(text)
                valid_indices.append(i)
        
        if not valid_texts:
            return [[0.0] * self.EMBEDDING_DIMENSIONS for _ in texts]
        
        # Batch embed (OpenAI supports up to ~8000 tokens per batch)
        # Split into chunks of 100 texts for safety
        all_embeddings = [None] * len(texts)
        
        batch_size = 100
        for batch_start in range(0, len(valid_texts), batch_size):
            batch_end = min(batch_start + batch_size, len(valid_texts))
            batch_texts = valid_texts[batch_start:batch_end]
            batch_indices = valid_indices[batch_start:batch_end]
            
            response = self.client.embeddings.create(
                model=self.EMBEDDING_MODEL,
                input=batch_texts,
                dimensions=self.EMBEDDING_DIMENSIONS
            )
            
            for j, embedding_data in enumerate(response.data):
                original_index = batch_indices[j]
                all_embeddings[original_index] = embedding_data.embedding
        
        # Fill in empty embeddings for empty texts
        for i in range(len(all_embeddings)):
            if all_embeddings[i] is None:
                all_embeddings[i] = [0.0] * self.EMBEDDING_DIMENSIONS
        
        return all_embeddings


# Singleton instance
_instance: Optional[EmbeddingsService] = None


def get_embeddings_service() -> EmbeddingsService:
    """Get or create the embeddings service singleton."""
    global _instance
    if _instance is None:
        _instance = EmbeddingsService()
    return _instance

