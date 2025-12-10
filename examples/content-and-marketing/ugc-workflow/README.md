# UGC Video Generation Workflow

An AI-powered pipeline built with Motia that automatically transforms product images into professional user-generated content (UGC) videos for social media marketing.

## Overview

This workflow demonstrates the power of combining multiple AI models in a single automated pipeline. Upload a product image, and the system will:

1. **Analyze** the product using GPT-4o Vision to extract brand, colors, and styling
2. **Generate** multiple content variants with different camera angles and lighting
3. **Create** UGC-style images using Google Gemini 2.5 Flash
4. **Produce** realistic UGC videos with Google Veo 3
5. **Store** all generated content in Box cloud storage

Perfect for marketing teams, e-commerce platforms, and content creators who need to scale UGC content production.

## 🎥 Demo

The workflow generates vertical (9:16) UGC videos optimized for:

- Instagram Reels
- TikTok
- YouTube Shorts
- Facebook Stories

## 🚀 Features

- **Multi-AI Pipeline**: Combines GPT-4o, Gemini 2.5 Flash, and Veo 3
- **Parallel Processing**: Generates multiple variants concurrently
- **Brand Consistency**: Maintains brand colors, fonts, and styling
- **Authentic UGC Style**: Creates realistic user-generated content
- **Cloud Storage**: Automatic upload to Box for team collaboration
- **Event-Driven**: Fully asynchronous, scalable architecture

## 🛠️ Technologies

| Component            | Technology              | Purpose                             |
| -------------------- | ----------------------- | ----------------------------------- |
| **Vision Analysis**  | OpenAI GPT-4o           | Product and brand analysis          |
| **Image Generation** | Google Gemini 2.5 Flash | UGC-style image creation            |
| **Video Generation** | Google Vertex AI Veo 3  | Image-to-video conversion           |
| **Image CDN**        | ImageKit                | Fast image delivery                 |
| **Cloud Storage**    | Box                     | File storage and sharing            |
| **Framework**        | Motia                   | Event-driven workflow orchestration |

## 📋 Prerequisites

- Google Cloud account (for Veo 3)
- OpenAI API key
- Google Gemini API key
- ImageKit account
- Box account (optional, for storage)

## 🔧 Installation

1. **Clone the repository**

```bash
git clone https://github.com/MotiaDev/motia-examples.git
cd motia-examples/examples/ugc-workflow
```

2. **Install dependencies**

```bash
npm install
# or
pnpm install
```

3. **Install Python dependencies**

```bash
npm run postinstall
# This creates python_modules virtual environment and installs packages
```

4. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# OpenAI (for vision analysis)
OPENAI_API_KEY=sk-...

# Google Gemini (for image generation)
GOOGLE_GEMINI_API_KEY=...

# Google Vertex AI (for video generation)
VERTEX_PROJECT_ID=your-gcp-project-id
VERTEX_ACCESS_TOKEN=... # Get with: gcloud auth print-access-token

# ImageKit (for image CDN)
IMAGEKIT_PRIVATE_KEY=...
IMAGEKIT_PASSWORD=...

# Box Storage (optional)
BOX_ACCESS_TOKEN=...
BOX_ROOT_FOLDER_ID=...
```

## 🎯 Quick Start

1. **Start the development server**

```bash
npm run dev
```

2. **Open the Workbench UI**
   Navigate to `http://localhost:8080`

3. **Submit a product image**
   Use the API endpoint or Workbench UI:

```bash
curl -X POST http://localhost:8080/ugc/upload \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/product.jpg",
    "numVariations": 2
  }'
```

4. **Track the workflow**
   Watch in the Workbench Tracing view as your image flows through:

- Vision Analysis → Variant Generation → Image Generation → Video Generation → Storage

## 📊 Workflow Architecture

```
Product Image URL
    ↓
[Vision Analysis - GPT-4o]
    ↓
[Variant Generation]
    ↓
[Image Generation - Gemini] → ImageKit CDN
    ↓
[Video Generation - Veo 3] → Local MP4 Files
    ↓
[Cloud Storage - Box] → Final Storage
    ↓
Workflow Complete ✓
```

### Parallel Processing

The workflow uses event-driven architecture to process multiple variants concurrently:

```
Variant 1 → [Image Gen] → [Video Gen] → [Storage]
Variant 2 → [Image Gen] → [Video Gen] → [Storage]  ← All parallel
Variant 3 → [Image Gen] → [Video Gen] → [Storage]
```

## 📁 Project Structure

```
ugc-workflow/
├── steps/
│   ├── 01-image-upload.step.ts          # API endpoint for image submission
│   ├── 02-vision-analysis_step.py       # GPT-4o product analysis (Python)
│   ├── 03-variant-generation.step.ts    # Create multiple variants
│   ├── 04-image-generation.step.ts      # Gemini image generation
│   ├── 05-video-generation.step.ts      # Veo 3 video creation
│   └── 06-file-storage.step.ts          # Box cloud storage
├── assets/                               # Sample product images
├── python_modules/                       # Python virtual environment
├── tutorial.tsx                          # Interactive tutorial
└── motia-workbench.json                 # Workbench configuration
```

## 🎨 Customization

### Variation Options

Customize the content variations in `03-variant-generation.step.ts`:

```typescript
const CAMERA_ANGLES = [
  "Top-down flat lay",
  "Three-quarter product angle (30°)",
  "Angled overhead (15° tilt)",
  "Eye-level hero shot",
];

const LIGHTING_STYLES = [
  "Soft natural daylight",
  "Bright, even daylight",
  "Diffused window light",
  "Soft studio light with diffuser",
];
```

### Video Prompts

Customize video style in `05-video-generation.step.ts`:

```typescript
const videoPrompt = `A confident person in a casual kitchen setting 
presenting the ${brandName} ${product} package prominently toward the camera. 
They smile naturally while presenting the product with enthusiasm...`;
```

## 🧪 Testing

### Using the Motia Workbench

1. **Open the Workbench** at `http://localhost:8080`
2. **Navigate to the ugc-generation flow**
3. **Select the POST /ugc/upload endpoint**
4. **Enter your image URL and number of variations in the request body**:

```json
{
  "imageUrl": "https://example.com/product.jpg",
  "numVariations": 2
}
```

5. **Click Play icon** and watch the workflow execute in real-time
6. **Monitor progress** in the Tracing, Logs, and States tabs

### Using cURL

```bash
curl -X POST http://localhost:8080/ugc/upload \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://images.unsplash.com/photo-1example",
    "numVariations": 1
  }'
```

Sample product images are included in the `assets/` directory.

## 📚 Learn More

- [Motia Documentation](https://motia.dev/docs)
- [Motia Examples](https://github.com/MotiaDev/motia-examples)
- [Tutorial Walkthrough](./tutorial.tsx)

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

---

**Need help?** Join our [Discord community](https://discord.com/invite/nJFfsH5d6v)
