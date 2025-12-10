import ultraimport
from vision_agent.lmm import AnthropicLMM
import os
import json

download_image = ultraimport('__dir__/download_image.py', 'download_image')

config = {
    "type": "event",
    "name": "Vision agent - evaluate vision result",
    "description": "evaluate an image using a vision agent",
    "subscribes": ["eval-image-result"], 
    "emits": ["eval-report"],
    "flows": ["generate-image"],
    "input": None,  # No schema validation in Python version
}

async def handler(args, ctx):
    ctx.logger.info('evaluate vision result', args)
    
    try:
        lmm = AnthropicLMM()
        prompt = """Evaluate if the image is a good representation of the following prompt:

{args.original_prompt}

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
        
        raw_response = lmm(prompt, media=[args.image])
        # Extract just the numeric value from the response
        score = float(raw_response.strip())
        
        # Ensure score is within valid range
        score = max(0, min(100, score))
        
        # Write score to a file in tmp directory with trace ID
        score_file = f'{os.path.dirname(os.path.dirname(__file__))}/tmp/{ctx.trace_id}_report.txt'
        with open(score_file, 'a') as f:
            report = {
                "original_prompt": args.original_prompt,
                "prompt": args.prompt,
                "score": score,
                "image_path": args.image
            }
            f.write(json.dumps(report, indent=2) + "\n")
        
        if score > 90:
            ctx.logger.info('image is a good representation, do something with it', score)
        else:
            ctx.logger.info('image is not a good representation, try again or use a different prompt', score)
        
    except ValueError:
        ctx.logger.error('Invalid response from vision agent', raw_response)