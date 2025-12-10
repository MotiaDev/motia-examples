import os
import json
import aiohttp

config = {
    "type": "event",
    "name": "VisionAnalysisStep",
    "description": "Analyze image with OpenAI Vision",
    "subscribes": ["image.uploaded"],
    "emits": ["vision.analyzed"],
    "input": {
        "type": "object",
        "properties": {
            "requestId": {"type": "string"},
            "imageUrl": {"type": "string"},
            "numVariations": {"type": "number"},
            "timestamp": {"type": "string"},
        },
        "required": ["requestId", "imageUrl", "numVariations", "timestamp"],
    },
    "flows": ["ugc-generation"],
}


async def handler(input_data, ctx):
    """Analyze product image with OpenAI Vision API"""

    request_id = input_data["requestId"]
    image_url = input_data["imageUrl"]
    num_variations = input_data["numVariations"]

    try:
        ctx.logger.info(
            f"Starting vision analysis",
            {"requestId": request_id, "imageUrl": image_url},
        )

        vision_prompt = """Analyze the given image and return ONLY a compact JSON object (no markdown code fences, no explanations). Use this exact schema and keys:

{
  "brand_name": string,                 // Visible on packaging, or infer
  "product": string,                    // Name/type of product; infer if unclear
  "character": string,                  // If absent, default to "Minimalist beauty muse"
  "ad_copy": string,                    // Short slogan, 20–35 characters
  "visual_guide": string,               // 1–2 sentences on camera angle, lighting, style
  "text_watermark": string,             // Default to brand_name
  "palette": [                          // 3–4 prominent colors
    { "hex": string, "name": string }
  ],
  "font_style": string,                 // e.g., "Bold sans-serif"
  "reference_image_summary": string     // Objective description of what is seen, ignoring background
}

RULES:
- brand_name: Output exactly as printed (case-sensitive) if visible; otherwise infer.
- product: Be specific (e.g., "Miracle Balm" not just "cosmetic").
- character: If not depicted, return "Minimalist beauty muse".
- ad_copy: Must be original, concise, brand-aligned (20–35 characters).
- visual_guide: Describe camera angle, lighting, and style clearly, avoid fluff.
- text_watermark: Use brand_name unless an alternate watermark is explicitly visible.
- palette: Pick 3–4 dominant colors; always use valid 6-digit hex (e.g. "#e6a5a1").
- font_style: Infer from logo text (e.g., serif/sans-serif, bold/thin, modern/classic).
- reference_image_summary: Single objective sentence about the product image.

Return only the JSON. Do not include markdown, YAML, comments, or extra text."""

        # Prepare OpenAI Vision API request
        payload = {
            "model": "gpt-4o",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": vision_prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
            "max_tokens": 1000,
        }

        # Call OpenAI Vision API
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise Exception("OPENAI_API_KEY environment variable not set")

        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.openai.com/v1/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/json",
                },
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"OpenAI API error: {error_text}")

                response_data = await response.json()

        # Extract analysis text
        analysis_text = response_data["choices"][0]["message"]["content"]

        # Clean and parse JSON response
        cleaned_analysis = analysis_text.strip()

        # Remove markdown code fences if present
        if cleaned_analysis.startswith("```"):
            cleaned_analysis = cleaned_analysis.split("\n", 1)[1]  # Remove first line
        if cleaned_analysis.endswith("```"):
            cleaned_analysis = cleaned_analysis.rsplit("\n", 1)[0]  # Remove last line

        cleaned_analysis = cleaned_analysis.strip()

        # Parse JSON
        try:
            vision_analysis = json.loads(cleaned_analysis)
        except json.JSONDecodeError as e:
            ctx.logger.error(
                f"Failed to parse vision analysis JSON",
                {
                    "requestId": request_id,
                    "rawResponse": analysis_text,
                    "error": str(e),
                },
            )
            raise Exception("Invalid JSON response from vision analysis")

        # Normalize and add defaults
        normalized_data = {
            "brand_name": vision_analysis.get("brand_name", "Unknown Brand"),
            "product": vision_analysis.get("product", "Unknown Product"),
            "character": vision_analysis.get("character", "Minimalist beauty muse"),
            "ad_copy": vision_analysis.get("ad_copy", "Glow your own way"),
            "visual_guide": vision_analysis.get(
                "visual_guide",
                "Top-down, soft daylight, neutral backdrop, minimal editorial styling.",
            ),
            "text_watermark": vision_analysis.get("text_watermark")
            or vision_analysis.get("brand_name", "Brand"),
            "font_style": vision_analysis.get("font_style", "Bold sans-serif"),
            "reference_image_summary": vision_analysis.get(
                "reference_image_summary", "Product image on neutral background."
            ),
            "palette": vision_analysis.get(
                "palette",
                [
                    {"hex": "#d89c94", "name": "Rosewood"},
                    {"hex": "#f2e9e1", "name": "Pale Ivory"},
                    {"hex": "#ffffff", "name": "White"},
                ],
            ),
        }

        # Extract primary colors
        palette = normalized_data["palette"]
        normalized_data["primary_color"] = (
            palette[0]["hex"] if len(palette) > 0 else "#d89c94"
        )
        normalized_data["secondary_color"] = (
            palette[1]["hex"] if len(palette) > 1 else "#f2e9e1"
        )
        normalized_data["tertiary_color"] = (
            palette[2]["hex"] if len(palette) > 2 else "#ffffff"
        )

        ctx.logger.info(
            f"Vision analysis completed",
            {
                "requestId": request_id,
                "brand": normalized_data["brand_name"],
                "product": normalized_data["product"],
            },
        )

        # Emit to next step
        await ctx.emit(
            {
                "topic": "vision.analyzed",
                "data": {
                    "requestId": request_id,
                    "imageUrl": image_url,
                    "originalImagePath": image_url,
                    "numVariations": num_variations,
                    "visionAnalysis": normalized_data,
                    "timestamp": input_data["timestamp"],
                },
            }
        )

    except Exception as error:
        ctx.logger.error(
            f"Vision analysis failed", {"requestId": request_id, "error": str(error)}
        )
        raise
