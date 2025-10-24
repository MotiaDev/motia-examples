"""
OpenAI service for text processing and embeddings
"""
from openai import AsyncOpenAI
import os
from typing import List, Dict, Any

class OpenAIService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.client = AsyncOpenAI(api_key=api_key)
    
    async def create_embedding(self, text: str) -> List[float]:
        """Create embedding for text"""
        response = await self.client.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        return response.data[0].embedding
    
    async def create_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Create embeddings for multiple texts"""
        response = await self.client.embeddings.create(
            model="text-embedding-ada-002",
            input=texts
        )
        return [item.embedding for item in response.data]
    
    def chunk_text(self, text: str, chunk_size: int = 400, overlap: int = 40) -> List[str]:
        """Split text into overlapping chunks"""
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap
            
            # Prevent infinite loop
            if start <= 0 or chunk_size <= overlap:
                break
        
        return chunks
    
    async def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        context_chunks: List[str] = None
    ) -> str:
        """
        Generate chat completion with optional context from stored chunks
        """
        # If we have context chunks, add them to the system message
        if context_chunks:
            context_text = "\n\n".join([f"Context {i+1}: {chunk}" for i, chunk in enumerate(context_chunks)])
            system_message = {
                "role": "system",
                "content": f"You are a helpful assistant for connected car alerts. Use the following context to answer questions:\n\n{context_text}"
            }
            messages = [system_message] + messages
        
        response = await self.client.chat.completions.create(
            model="gpt-4",
            messages=messages
        )
        
        return response.choices[0].message.content
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    async def find_relevant_chunks(
        self, 
        query: str, 
        stored_chunks: List[Dict[str, Any]], 
        top_k: int = 5
    ) -> List[str]:
        """
        Find most relevant chunks for a query using embeddings
        stored_chunks should be a list of dicts with 'text' and 'embedding' keys
        """
        # Create embedding for query
        query_embedding = await self.create_embedding(query)
        
        # Calculate similarity scores
        similarities = []
        for chunk_data in stored_chunks:
            similarity = self.cosine_similarity(query_embedding, chunk_data['embedding'])
            similarities.append({
                'text': chunk_data['text'],
                'similarity': similarity
            })
        
        # Sort by similarity and return top k
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        return [item['text'] for item in similarities[:top_k]]

# Singleton instance
_openai_service = None

def get_openai_service() -> OpenAIService:
    """Get or create OpenAI service instance"""
    global _openai_service
    if _openai_service is None:
        _openai_service = OpenAIService()
    return _openai_service

