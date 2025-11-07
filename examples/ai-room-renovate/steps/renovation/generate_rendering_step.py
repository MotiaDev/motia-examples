"""
Generate Renovation Rendering - Uses Gemini 2.5 Flash Image for generation
This matches the original ADK implementation from awesome-llm-apps
https://github.com/Shubhamsaboo/awesome-llm-apps/tree/main/advanced_ai_agents/multi_agent_apps/ai_home_renovation_agent
"""

import os
import base64
import logging
from datetime import datetime
from typing import Any, Dict
from pydantic import BaseModel

# Google Generative AI imports (ADK-style SDK)
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

logger = logging.getLogger(__name__)

class RenderingInput(BaseModel):
    session_id: str

# Event Step Configuration
config = {
    "type": "event",
    "name": "GenerateRendering",
    "description": "Generates photorealistic renovation renderings using Gemini 2.5 Flash Image",
    "subscribes": ["renovation.render"],
    "emits": [],
    "input": RenderingInput.model_json_schema(),
    "flows": ["home-renovation"]
}

async def handler(input_data, context):
    """
    Generate a photorealistic rendering using Gemini 2.5 Flash Image model.
    
    This matches the original implementation from awesome-llm-apps repo:
    https://github.com/Shubhamsaboo/awesome-llm-apps/blob/main/advanced_ai_agents/multi_agent_apps/ai_home_renovation_agent/tools.py
    """
    session_id = input_data.get("session_id")
    
    context.logger.info("Starting rendering generation with Gemini 2.5 Flash Image", {
        "session_id": session_id
    })
    
    # Check if SDK is available
    if not GENAI_AVAILABLE:
        error_msg = "google-genai SDK not installed. Run: pip install google-genai"
        context.logger.error("SDK not available", {"session_id": session_id, "error": error_msg})
        await context.state.set(session_id, "renderingError", error_msg)
        return
    
    # Get API key
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        error_msg = "GOOGLE_API_KEY not found in environment"
        context.logger.error("API key missing", {"session_id": session_id})
        await context.state.set(session_id, "renderingError", error_msg)
        return
    
    # Get the rendering prompt from roadmap
    roadmap = await context.state.get(session_id, "roadmap")
    if not roadmap:
        context.logger.error("No roadmap found in state", {"session_id": session_id})
        await context.state.set(session_id, "renderingError", "No roadmap found")
        return
    
    context.logger.info("Roadmap retrieved", {
        "session_id": session_id,
        "roadmap_keys": list(roadmap.keys()) if isinstance(roadmap, dict) else "not a dict"
    })
    
    # Motia state wraps data in a 'data' object
    actual_roadmap = roadmap.get("data", roadmap) if isinstance(roadmap, dict) else roadmap
    
    rendering_prompt = actual_roadmap.get("renderingPrompt", "") if isinstance(actual_roadmap, dict) else ""
    
    if not rendering_prompt:
        context.logger.error("No rendering prompt in roadmap", {
            "session_id": session_id,
            "roadmap_structure": str(roadmap)[:300],
            "actual_roadmap_keys": list(actual_roadmap.keys()) if isinstance(actual_roadmap, dict) else "not a dict"
        })
        await context.state.set(session_id, "renderingError", "No rendering prompt found in roadmap")
        return
    
    context.logger.info("Rendering prompt found", {
        "session_id": session_id,
        "prompt_length": len(rendering_prompt)
    })
    
    try:
        # Initialize the ADK-style client
        client = genai.Client(api_key=api_key)
        
        # CRITICAL: Use gemini-2.5-flash-image model (from original repo)
        model = "gemini-2.5-flash-image"
        
        context.logger.info("Enhancing prompt with Gemini", {
            "session_id": session_id
        })
        
        # Enhance the prompt (like in original tools.py)
        base_rewrite_prompt = f"""
        Create a highly detailed, photorealistic prompt for generating an interior design image.

        Original description: {rendering_prompt}

        Enhance this to be a professional interior photography prompt that includes:
        - Specific camera angle (wide-angle, eye-level perspective)
        - Exact colors and materials mentioned
        - Realistic lighting (natural light from windows, fixture types)
        - Spatial layout and dimensions
        - Texture and finish details
        - Professional interior design photography quality

        **Important:** Output your prompt as a single detailed paragraph optimized for photorealistic interior rendering.
        """
        
        # Get enhanced prompt
        rewritten_prompt_response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=base_rewrite_prompt
        )
        enhanced_prompt = rewritten_prompt_response.text
        
        context.logger.info("Prompt enhanced, generating image", {
            "session_id": session_id,
            "enhanced_prompt_length": len(enhanced_prompt)
        })
        
        # Build content for image generation
        content_parts = [types.Part.from_text(text=enhanced_prompt)]
        
        contents = [
            types.Content(
                role="user",
                parts=content_parts,
            ),
        ]
        
        # CRITICAL: Set response_modalities to include IMAGE (from original repo)
        generate_content_config = types.GenerateContentConfig(
            response_modalities=[
                "IMAGE",  # This is what makes it return images!
                "TEXT",
            ],
        )
        
        context.logger.info("Calling Gemini 2.5 Flash Image API", {
            "session_id": session_id,
            "model": model
        })
        
        # Generate the image (streaming like in original)
        image_generated = False
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            if (
                chunk.candidates is None
                or chunk.candidates[0].content is None
                or chunk.candidates[0].content.parts is None
            ):
                continue
            
            # Check for image data in the response
            if chunk.candidates[0].content.parts[0].inline_data and chunk.candidates[0].content.parts[0].inline_data.data:
                inline_data = chunk.candidates[0].content.parts[0].inline_data
                
                # Extract image bytes
                image_bytes = inline_data.data
                mime_type = inline_data.mime_type or "image/png"
                
                # Convert to base64
                image_base64 = base64.b64encode(image_bytes).decode('utf-8')
                
                # Store the generated image
                rendering_data = {
                    "imageBase64": image_base64,
                    "mimeType": mime_type,
                    "generatedAt": datetime.now().isoformat(),
                    "model": model,
                    "prompt": enhanced_prompt,  # Store full prompt
                    "version": 1
                }
                
                await context.state.set(session_id, "rendering", rendering_data)
                await context.state.set(session_id, "renderingCompleted", True)
                
                context.logger.info("Image generated successfully", {
                    "session_id": session_id,
                    "image_size_bytes": len(image_bytes),
                    "image_size_base64": len(image_base64),
                    "mime_type": mime_type,
                    "model": model
                })
                
                image_generated = True
                break
            else:
                # Log any text responses
                if hasattr(chunk.candidates[0].content.parts[0], 'text') and chunk.candidates[0].content.parts[0].text:
                    text_response = chunk.candidates[0].content.parts[0].text
                    context.logger.info("Model text response", {
                        "session_id": session_id,
                        "response": text_response[:200]
                    })
        
        if not image_generated:
            error_msg = "No image was generated in the response"
            context.logger.error("Image generation failed", {
                "session_id": session_id,
                "error": error_msg
            })
            await context.state.set(session_id, "renderingError", error_msg)
            await context.state.set(session_id, "renderingNote", 
                "The model returned a text response instead of an image. The detailed prompt has been saved.")
            await context.state.set(session_id, "renderingPrompt", enhanced_prompt)
        
    except Exception as e:
        error_msg = str(e)
        context.logger.error("Error generating rendering", {
            "session_id": session_id,
            "error": error_msg
        })
        await context.state.set(session_id, "renderingError", error_msg)


"""
Alternative implementation notes:

The original ADK implementation uses:
1. google.genai.Client() - ADK SDK client
2. gemini-2.5-flash-image model
3. response_modalities=["IMAGE", "TEXT"]
4. Streaming with generate_content_stream
5. Extract inline_data.data for image bytes

This is different from google.generativeai (standard SDK) which uses:
- genai.GenerativeModel()
- gemini-2.0-flash-exp (text/understanding only)
- generate_content() (no response_modalities)

The key is using the ADK-style SDK with the image generation model.
"""
