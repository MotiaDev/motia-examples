# Generate Images and Evaluate Results - Vision Example

This example demonstrates how to generate images and evaluate the results as a dataset using Claude's vision and prompt generation capabilities, Flux image generation model, and openAI for evaluating the generated content (prompt and image).

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up your Anthropic API key:
   - Create an account at [Anthropic's website](https://www.anthropic.com/)
   - Get your API key from the dashboard
   - Set it as a global environment variable:
```bash
export ANTHROPIC_API_KEY='your-api-key'
```

3. Set up your Flux API key:
   - Create an account at [Flux's website](https://flux.com/)
   - Get your API key from the dashboard
   - Copy the .env.example file to .env and set the FLUX_API_KEY environment variable:
```bash
cp .env.example .env
```

> This third step is optional, you can skip it if you don't want to execute the evaluation flow.

4. Set up your OpenAI API key:
   - Create an account at [OpenAI's website](https://platform.openai.com/)
   - Get your API key from the dashboard
   - Set it as a global environment variable:
```bash
export OPENAI_API_KEY='your-api-key'
```

## Available Flows
### 1. Generate Image
Generates an images based on a prompt, the prompt is enhanced to make it more specific and detailed. The enhanced prompt is then used to generate an image, followed by an evaluation step to check if the image is a good representation of the prompt, finally a report is generated with the results and an evaluation score. The generated image and the generated evaluation report are saved in the `tmp` directory.

You can trigger the flow by sending a POST request to the `generate-image` endpoint, provide a prompt in the request body as shown below:

```bash
curl -X POST http://localhost:3000/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "create an image of a couple backpacking through a trail in the easter sierras. use a black and white image style. sketch style."}'
```

### 2. Evaluate Image Generation Dataset
Evaluates the generated images and prompts as a dataset (collection of reports from the `generate-image` flow). Uses OpenAI to assess both the generated content and prompt-to-image relationship, producing a comprehensive evaluation report that includes:
- Original prompt integrity score
- Prompt-to-image parity analysis
- Overall confidence percentage for the whole dataset

The evaluation results are saved in the `eval-reports` folder under the name of the `traceId` of the evaluation flow execution.

You can trigger the flow by sending a POST request to the `evaluate-image-generation-dataset` endpoint, provide an empty body as shown below:

```bash
curl -X POST http://localhost:3000/evaluate-image-generation-dataset \
  -H "Content-Type: application/json" \
  -d '{}'
```

❗ You will need to have at least 10 reports in the `tmp` directory to trigger the evaluation flow. You can generate the reports by running the `generate-image` flow at least 10 times. There's a script to help you with that, simply run the command:

```bash
pnpm run generate:dataset
```

> 💡 This will generate 10 image generation jobs and save them in the `tmp` directory. You can modify the script to generate more than 10 jobs and modify the prompt. 

## License

This example is provided under the MIT License. See [LICENSE](LICENSE) file for details.

🚨 **Cost Disclaimer** 🚨

Please note that executing the flows in this example will incur API costs:
- Claude is used for image analysis and prompt generation
- Flux is used for image generation
- OpenAI is used for evaluating the generated content (prompt and image)
Make sure to monitor your usage and costs through your respective API dashboards.
