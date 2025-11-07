"""
Edit Renovation Rendering - Uses Gemini 2.5 Flash Image to regenerate with edits
Editing works by regenerating the image with modified prompts, not direct image editing
"""

import os
import base64
import logging
from datetime import datetime
from typing import Any, Dict
from pydantic import BaseModel

# Google Generative AI imports
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

logger = logging.getLogger(__name__)

class EditRenderingInput(BaseModel):
    session_id: str
    edit_prompt: str

# Event Step Configuration
config = {
    "type": "event",
    "name": "EditRendering",
    "description": "Edits existing renovation renderings by regenerating with modified prompts",
    "subscribes": ["renovation.edit"],
    "emits": [],
    "input": EditRenderingInput.model_json_schema(),
    "flows": ["home-renovation"]
}

async def handler(input_data, context):
    """
    Edit a rendering by regenerating it with modified prompts.
    
    Image editing in Gemini works by regenerating, not direct pixel manipulation.
    """
    session_id = input_data.get("session_id")
    edit_prompt = input_data.get("edit_prompt")
    
    context.logger.info("Starting rendering edit with Gemini 2.5 Flash", {
        "session_id": session_id,
        "edit_prompt": edit_prompt
    })
    
    # Check if SDK is available
    if not GENAI_AVAILABLE:
        error_msg = "google-genai SDK not installed"
        context.logger.error("SDK not available", {"session_id": session_id})
        await context.state.set(session_id, "editError", error_msg)
        return
    
    # Get API key
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        error_msg = "GOOGLE_API_KEY not found"
        context.logger.error("API key missing", {"session_id": session_id})
        await context.state.set(session_id, "editError", error_msg)
        return
    
    # Get the original roadmap to get the base rendering prompt
    roadmap = await context.state.get(session_id, "roadmap")
    if not roadmap:
        context.logger.error("No roadmap found", {"session_id": session_id})
        await context.state.set(session_id, "editError", "No roadmap found")
        return
    
    # Unwrap data if needed
    if isinstance(roadmap, dict) and "data" in roadmap:
        roadmap = roadmap["data"]
    
    original_prompt = roadmap.get("renderingPrompt", "") if isinstance(roadmap, dict) else ""
    
    if not original_prompt:
        context.logger.error("No original prompt found", {"session_id": session_id})
        await context.state.set(session_id, "editError", "Cannot edit without original prompt")
        return
    
    context.logger.info("Original prompt retrieved", {
        "session_id": session_id,
        "original_length": len(original_prompt)
    })
    
    try:
        # Initialize client
        client = genai.Client(api_key=api_key)
        
        # Build enhanced edit prompt
        combined_prompt = f"""{original_prompt}

**CRITICAL MODIFICATION REQUEST**:
{edit_prompt}

**IMPORTANT**: Apply ONLY the modification requested above. Keep ALL other elements exactly the same:
- Same layout and perspective
- Same materials (except what was changed)
- Same lighting and time of day
- Same camera angle
- Same overall style
- Only change what was explicitly requested in the modification

This is an edited version, ID: edit_{datetime.now().timestamp()}"""
        
        context.logger.info("Building enhanced edit prompt", {
            "session_id": session_id,
            "combined_length": len(combined_prompt)
        })
        
        # Enhance the edit prompt with Gemini
        rewrite_prompt = f"""
        Create a photorealistic interior rendering prompt that incorporates a modification.
        
        Original specifications: {combined_prompt}
        
        Output a single detailed paragraph optimized for image generation that:
        1. Incorporates the requested modification
        2. Preserves all other original specifications
        3. Maintains the same style, layout, and quality
        
        Be specific and detailed.
        """
        
        rewritten_response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=rewrite_prompt
        )
        enhanced_edit_prompt = rewritten_response.text
        
        context.logger.info("Edit prompt enhanced, generating image", {
            "session_id": session_id,
            "enhanced_length": len(enhanced_edit_prompt)
        })
        
        # Generate the edited image using gemini-2.5-flash-image
        model = "gemini-2.5-flash-image"
        
        content_parts = [types.Part.from_text(text=enhanced_edit_prompt)]
        contents = [types.Content(role="user", parts=content_parts)]
        
        generate_config = types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        )
        
        context.logger.info("Calling Gemini 2.5 Flash Image for edit", {
            "session_id": session_id,
            "model": model
        })
        
        # Generate the edited image
        image_generated = False
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_config,
        ):
            if (
                chunk.candidates is None
                or chunk.candidates[0].content is None
                or chunk.candidates[0].content.parts is None
            ):
                continue
            
            # Check for image data
            if chunk.candidates[0].content.parts[0].inline_data and chunk.candidates[0].content.parts[0].inline_data.data:
                inline_data = chunk.candidates[0].content.parts[0].inline_data
                
                # Extract image bytes
                edited_image_bytes = inline_data.data
                mime_type = inline_data.mime_type or "image/png"
                
                # Convert to base64
                edited_image_base64 = base64.b64encode(edited_image_bytes).decode('utf-8')
                
                # Get current rendering to track version
                existing_rendering = await context.state.get(session_id, "rendering")
                if isinstance(existing_rendering, dict) and "data" in existing_rendering:
                    existing_rendering = existing_rendering["data"]
                
                current_version = existing_rendering.get("version", 1) if existing_rendering else 1
                new_version = current_version + 1
                
                # Store the edited image
                edited_rendering_data = {
                    "imageBase64": edited_image_base64,
                    "mimeType": mime_type,
                    "generatedAt": datetime.now().isoformat(),
                    "model": model,
                    "prompt": enhanced_edit_prompt,  # Store full prompt
                    "editPrompt": edit_prompt,
                    "version": new_version
                }
                
                await context.state.set(session_id, "rendering", edited_rendering_data)
                await context.state.set(session_id, "renderingCompleted", True)
                
                # Store edit history
                edit_history = await context.state.get(session_id, "editHistory")
                if not edit_history or not isinstance(edit_history, list):
                    edit_history = []
                
                # If it's wrapped in data, unwrap it
                if isinstance(edit_history, dict) and "data" in edit_history:
                    edit_history = edit_history["data"]
                    if not isinstance(edit_history, list):
                        edit_history = []
                
                edit_history.append({
                    "editPrompt": edit_prompt,
                    "version": new_version,
                    "editedAt": datetime.now().isoformat()
                })
                await context.state.set(session_id, "editHistory", edit_history)
                
                context.logger.info("Rendering edited successfully", {
                    "session_id": session_id,
                    "version": new_version,
                    "image_size_bytes": len(edited_image_bytes),
                    "image_size_base64": len(edited_image_base64)
                })
                
                image_generated = True
                break
            else:
                # Log text responses
                if hasattr(chunk.candidates[0].content.parts[0], 'text') and chunk.candidates[0].content.parts[0].text:
                    text_response = chunk.candidates[0].content.parts[0].text
                    context.logger.info("Model text response during edit", {
                        "session_id": session_id,
                        "response": text_response[:100]
                    })
        
        if not image_generated:
            error_msg = "No edited image was generated"
            context.logger.error("Edit failed", {"session_id": session_id})
            await context.state.set(session_id, "editError", error_msg)
        
    except Exception as e:
        error_msg = str(e)
        context.logger.error("Error editing rendering", {
            "session_id": session_id,
            "error": error_msg
        })
        await context.state.set(session_id, "editError", error_msg)


"""
Notes on Image Editing:

Gemini 2.5 Flash Image doesn't support direct image-to-image editing.
Instead, we regenerate the image with the edit instructions incorporated into the original prompt.

This approach:
1. Gets the original rendering prompt from the roadmap
2. Appends the edit instructions
3. Enhances the combined prompt
4. Regenerates using gemini-2.5-flash-image

This matches how most AI image editing works - regeneration with modified prompts.
"""
