from anthropic import Anthropic
import base64
import os
import json
from typing import Any

from motia import queue, FlowContext

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

config = {
    "name": "Vision agent - evaluate vision result",
    "description": "evaluate an image using a vision agent",
    "triggers": [
        queue("eval-image-result")
    ],
    "enqueues": ["eval-report"],
    "flows": ["generate-image"],
}

async def handler(input_data: dict[str, Any], ctx: FlowContext[Any]) -> None:
    ctx.logger.info('evaluate vision result', input_data)

    original_prompt = input_data.get('original_prompt', '')
    image = input_data.get('image', '')
    prompt_text = input_data.get('prompt', '')

    try:
        # Read and base64 encode the image
        with open(image, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")

        prompt = f"""Evaluate if the image is a good representation of the following prompt:

{original_prompt}

Take into account the following considerations for your evaluation:

- Verify that the EXACT number of subjects/objects mentioned in the prompt appear in the image:
  * If the prompt mentions "a couple", there must be exactly 2 people
  * If the prompt mentions "three cats", there must be exactly 3 cats
  * Count and verify every specified quantity in the prompt
- All specific items, objects, or elements mentioned in the prompt must be present
- The scene, setting, and actions must precisely match the prompt description
- The relationships and positioning between elements should be exactly as described

Return ONLY a numeric score between 0 and 100, where 100 means the image perfectly matches the prompt.
Do not include any other text or explanation in your response - just the number."""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=100,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": prompt,
                    },
                ],
            }],
        )

        raw_response = response.content[0].text
        # Extract just the numeric value from the response
        score = float(raw_response.strip())

        # Ensure score is within valid range
        score = max(0, min(100, score))

        # Write score to a file in tmp directory with trace ID
        score_file = f'{os.path.dirname(os.path.dirname(__file__))}/tmp/{ctx.trace_id}_report.txt'
        with open(score_file, 'a') as f:
            report = {
                "original_prompt": original_prompt,
                "prompt": prompt_text,
                "score": score,
                "image_path": image
            }
            f.write(json.dumps(report, indent=2) + "\n")

        if score > 90:
            ctx.logger.info('image is a good representation, do something with it', score)
        else:
            ctx.logger.info('image is not a good representation, try again or use a different prompt', score)

    except ValueError:
        ctx.logger.error('Invalid response from vision agent', raw_response)
