"""
Agent Event Step for Connected Car Alerts
Processes queries using stored embeddings and OpenAI chat with memory
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any

# Import services
import sys
from services.openai_service import get_openai_service

class AgentInput(BaseModel):
    """Input for agent processing"""
    session_id: str = Field(..., description="Session ID for the conversation")
    query: str = Field(..., description="Query to process")
    state_group: str = Field(..., description="State group ID where chunks are stored")

config = {
    "type": "event",
    "name": "ProcessAlertAgent",
    "description": "AI agent that processes car alerts with memory and context",
    "subscribes": ["process-alert"],
    "emits": ["log-result"],
    "input": AgentInput.model_json_schema(),
    "flows": ["connected-car-alert"]
}

async def handler(input_data, context):
    """
    Process car alert with AI agent
    - Retrieve relevant chunks from state
    - Load conversation memory
    - Use OpenAI chat to generate response
    - Store updated memory
    - Emit result for logging
    """
    try:
        agent_input = AgentInput(**input_data)
        
        context.logger.info("Agent processing started", {
            "session_id": agent_input.session_id,
            "query": agent_input.query
        })
        
        # Initialize OpenAI service
        openai_service = get_openai_service()
        
        # Retrieve all chunks from state (limit to 50 chunks max to prevent memory issues)
        stored_chunks = []
        chunk_index = 0
        max_chunks = 50
        
        while chunk_index < max_chunks:
            chunk_key = f"chunk_{chunk_index}"
            chunk_data = await context.state.get(agent_input.state_group, chunk_key)
            
            if chunk_data is None:
                break
            
            stored_chunks.append(chunk_data)
            chunk_index += 1
        
        context.logger.info("Retrieved chunks from state", {
            "num_chunks": len(stored_chunks),
            "first_chunk_type": type(stored_chunks[0]).__name__ if stored_chunks else "none",
            "first_chunk_sample": str(stored_chunks[0])[:100] if stored_chunks else "none"
        })
        
        # Use all chunks as context (simplified - no embeddings/semantic search)
        # For small/medium alerts this is efficient and avoids memory issues
        relevant_chunks = []
        for chunk in stored_chunks:
            # Motia state wraps data in {'data': actual_value}
            # Unwrap it first
            if isinstance(chunk, dict) and 'data' in chunk:
                chunk_data = chunk['data']
                if isinstance(chunk_data, dict) and 'text' in chunk_data:
                    relevant_chunks.append(chunk_data['text'])
                elif isinstance(chunk_data, str):
                    relevant_chunks.append(chunk_data)
            elif isinstance(chunk, dict) and 'text' in chunk:
                # Fallback: direct text access (if not wrapped)
                relevant_chunks.append(chunk['text'])
            elif isinstance(chunk, str):
                # If state returns string directly
                relevant_chunks.append(chunk)
            else:
                context.logger.error("Unexpected chunk format", {
                    "chunk_type": type(chunk).__name__,
                    "chunk_value": str(chunk)[:200]
                })
        
        # If too many chunks, use only first 10 to stay within token limits
        if len(relevant_chunks) > 10:
            relevant_chunks = relevant_chunks[:10]
        
        context.logger.info("Using chunks as context", {
            "num_chunks": len(relevant_chunks)
        })
        
        # Load conversation memory from state
        memory_group = f"memory_{agent_input.session_id}"
        conversation_history_raw = await context.state.get(memory_group, "history")
        
        # Unwrap Motia state format {'data': actual_value}
        if conversation_history_raw is None:
            conversation_history = []
        elif isinstance(conversation_history_raw, dict) and 'data' in conversation_history_raw:
            conversation_history = conversation_history_raw['data']
            if not isinstance(conversation_history, list):
                # This is expected on first conversation when no history exists yet
                context.logger.info("No conversation history found, starting fresh", {
                    "type": type(conversation_history).__name__
                })
                conversation_history = []
        elif isinstance(conversation_history_raw, list):
            # Direct list (if not wrapped)
            conversation_history = conversation_history_raw
        else:
            context.logger.error("Unexpected conversation history format", {
                "type": type(conversation_history_raw).__name__,
                "value": str(conversation_history_raw)[:200]
            })
            conversation_history = []
        
        # Build messages for chat completion
        messages = []
        
        # Add conversation history (last 10 messages for buffer window)
        for msg in conversation_history[-10:]:
            messages.append(msg)
        
        # Add current user query
        messages.append({
            "role": "user",
            "content": agent_input.query
        })
        
        # Get AI response with relevant chunks as context
        ai_response = await openai_service.chat_completion(
            messages=messages,
            context_chunks=relevant_chunks
        )
        
        context.logger.info("AI response generated", {
            "response_length": len(ai_response)
        })
        
        # Update conversation memory - ensure it's a list before appending
        if not isinstance(conversation_history, list):
            conversation_history = []
        
        conversation_history.append({
            "role": "user",
            "content": agent_input.query
        })
        conversation_history.append({
            "role": "assistant",
            "content": ai_response
        })
        
        # Store updated memory (keep last 20 messages for buffer window)
        try:
            await context.state.set(
                memory_group,
                "history",
                conversation_history[-20:]
            )
        except Exception as e:
            context.logger.error("Failed to store conversation history", {
                "error": str(e)
            })
        
        # Emit result for logging
        await context.emit({
            "topic": "log-result",
            "data": {
                "session_id": agent_input.session_id,
                "query": agent_input.query,
                "response": ai_response,
                "num_chunks_used": len(relevant_chunks)
            }
        })
        
        context.logger.info("Agent processing completed", {
            "session_id": agent_input.session_id
        })
        
    except Exception as e:
        context.logger.error("Agent processing failed", {
            "error": str(e),
            "session_id": input_data.get("session_id")
        })
        raise

