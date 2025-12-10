from anthropic import Anthropic
import os

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

config = {
  "type": "event",
  "name": "enhance image prompt",
  "description": "enhance a given image prompt",
  "subscribes": ["enhance-image-prompt"], 
  "emits": ["generate-image"],
  "flows": ["generate-image"],
  "input": None,  # No schema validation in Python
}

async def handler(args, ctx):
  ctx.logger.info('enhance image prompt', args)

  prompt = args.prompt

  prompt_enhancement_prompt = f"""
  You are a helpful assistant that can enhance a given image prompt.
  The original prompt is: {prompt}
  Please enhance the prompt to make it more specific and detailed.
  Include artistic details and style to the prompt to make the image more creative and unique.
  Make sure the prompt is not too long. Only return the enhanced prompt, no other text.
  """

  response = client.messages.create(
    model="claude-3-sonnet-20240229",
    messages=[{
      "role": "user",
      "content": prompt_enhancement_prompt
    }],
    max_tokens=1000
  )

  enhanced_prompt = response.content[0].text

  ctx.logger.info('enhanced prompt', enhanced_prompt)

  await ctx.emit({
    "type": 'generate-image',
    "data": {"prompt": enhanced_prompt, "original_prompt": prompt },
  })