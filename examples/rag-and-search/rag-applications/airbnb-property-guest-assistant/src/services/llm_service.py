"""
LLM Service for Airbnb Guest Assistant

Handles GPT-based question answering using retrieved context.
"""

import os
from typing import List, Dict, Any, Optional
from openai import OpenAI


class LLMService:
    """Service for GPT-based question answering."""
    
    MODEL = "gpt-4o"  # Using GPT-4o for best results
    MAX_CONTEXT_TOKENS = 6000
    
    SYSTEM_PROMPT = """You are a helpful property assistant for an Airbnb/vacation rental. 
Your role is to answer guest questions accurately based on the property information provided.

Guidelines:
1. ONLY answer based on the provided context. Do not make up information.
2. If the information isn't in the context, say "I don't have that specific information in the property documents. Please contact your host directly."
3. For safety-critical questions (emergency, security, medical), always recommend contacting emergency services if urgent.
4. Be concise but thorough. Include specific details like times, codes, or steps when relevant.
5. If mentioning checkout/checkin times, house rules, or policies, be precise about what's stated.
6. Use a friendly, helpful tone appropriate for a guest experience.

Property Context will be provided with each question."""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the LLM service.
        
        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not found. Set OPENAI_API_KEY environment variable.")
        
        self.client = OpenAI(api_key=self.api_key)
    
    def answer_question(
        self,
        question: str,
        context_chunks: List[Dict[str, Any]],
        property_id: str,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Answer a guest question using retrieved context.
        
        Args:
            question: The guest's question
            context_chunks: Retrieved document chunks from LanceDB
            property_id: Property identifier
            language: Response language
            
        Returns:
            Dict with answer, confidence, and sources
        """
        # Format context from chunks
        context = self._format_context(context_chunks)
        
        # Build the prompt
        user_message = f"""Property ID: {property_id}

PROPERTY CONTEXT:
{context}

GUEST QUESTION:
{question}

Please provide a helpful answer based on the property context above."""

        # Add language instruction if not English
        if language != "en":
            user_message += f"\n\nPlease respond in {self._get_language_name(language)}."
        
        # Call GPT
        response = self.client.chat.completions.create(
            model=self.MODEL,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            temperature=0.3,  # Lower temperature for more factual responses
            max_tokens=1000
        )
        
        answer = response.choices[0].message.content
        
        # Extract sources from context
        sources = self._extract_sources(context_chunks)
        
        # Calculate confidence based on retrieval scores
        confidence = self._calculate_confidence(context_chunks)
        
        return {
            "answer": answer,
            "confidence": confidence,
            "sources": sources,
            "context_chunks_used": len(context_chunks),
            "model": self.MODEL
        }
    
    def _format_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Format context chunks for the prompt."""
        if not chunks:
            return "No relevant information found in property documents."
        
        formatted_parts = []
        
        for i, chunk in enumerate(chunks, 1):
            section = chunk.get("section_title", "General")
            content = chunk.get("content", "")
            doc_type = chunk.get("doc_type", "")
            is_critical = chunk.get("is_critical", False)
            
            # Add critical marker
            critical_marker = "⚠️ IMPORTANT: " if is_critical else ""
            
            formatted_parts.append(
                f"[Source {i}: {doc_type} - {section}]\n{critical_marker}{content}"
            )
        
        return "\n\n---\n\n".join(formatted_parts)
    
    def _extract_sources(self, chunks: List[Dict[str, Any]]) -> List[str]:
        """Extract source references from chunks."""
        sources = []
        seen = set()
        
        for chunk in chunks:
            source = chunk.get("source_filename") or chunk.get("source_url")
            section = chunk.get("section_title", "")
            
            if source and source not in seen:
                seen.add(source)
                source_ref = f"{source}"
                if section:
                    source_ref += f" ({section})"
                sources.append(source_ref)
        
        return sources
    
    def _calculate_confidence(self, chunks: List[Dict[str, Any]]) -> str:
        """Calculate confidence level based on retrieval."""
        if not chunks:
            return "low"
        
        # Check distances (lower is better)
        avg_distance = sum(c.get("_distance", 1.0) for c in chunks) / len(chunks)
        
        # Check if we have critical/policy info
        has_critical = any(c.get("is_critical") for c in chunks)
        
        if avg_distance < 0.3 or (has_critical and avg_distance < 0.5):
            return "high"
        elif avg_distance < 0.5:
            return "medium"
        else:
            return "low"
    
    def _get_language_name(self, code: str) -> str:
        """Get language name from code."""
        languages = {
            "en": "English",
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "it": "Italian",
            "pt": "Portuguese",
            "ja": "Japanese",
            "ko": "Korean",
            "zh": "Chinese",
            "ar": "Arabic"
        }
        return languages.get(code, "English")


# Singleton instance
_instance: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get or create the LLM service singleton."""
    global _instance
    if _instance is None:
        _instance = LLMService()
    return _instance

