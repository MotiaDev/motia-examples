# 🎨 Motia Ad Generator

AI-powered ad generation from any landing page URL. Generate scroll-stopping Instagram images and cinematic TikTok videos in seconds.

Built with [Motia](https://motia.dev) - the unified backend framework for APIs, workflows, and event-driven systems.

## ✨ Features

- **URL-to-Ad Pipeline** - Just paste a landing page URL and get professional ads
- **Multi-Platform Support** - Generate for Instagram (1:1 images) and TikTok (9:16 videos)
- **AI-Powered Brand Analysis** - Automatically extracts brand colors, tone, and style
- **Smart Image Filtering** - Uses Gemini AI to select the best product images
- **Cinematic Video Generation** - Creates professional videos with Kling AI or Veo 3.1
- **Workbench UI** - Beautiful interface to generate and track ad jobs
- **Real-time Progress Tracking** - Monitor generation progress step-by-step

## 🏗️ Architecture

```
┌─────────────────┐
│  API Request    │  POST /api/generate-ad
│  (URL + Type)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Scrape Landing  │  Firecrawl: Extract images, screenshot, content
│     Page        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Filter Images   │  Gemini AI: Select best product images
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Analyze Brand   │  Gemini AI: Extract brand identity
│                 │  (colors, tone, USPs, visual style)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌────────┐
│ Image │ │ Video  │  Parallel generation based on selected platforms
│  Gen  │ │  Gen   │
└───┬───┘ └───┬────┘
    │         │
    │  Nano   │  Kling AI / Veo 3.1
    │ Banana  │
    │  Pro    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│   Aggregate     │  Combine results, upload to ImageKit
│    Results      │
└─────────────────┘
```

## 🛠️ Tech Stack

| Component        | Technology                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Framework        | [Motia](https://motia.dev)                                                                                       |
| Web Scraping     | [Firecrawl](https://firecrawl.dev)                                                                               |
| AI/LLM           | [Google Gemini](https://ai.google.dev) (2.0 Flash, 3 Pro Image)                                                  |
| Image Generation | Gemini 3 Pro Image (Nano Banana Pro)                                                                             |
| Video Generation | [Kling AI](https://klingai.com) / [Veo 3.1](https://deepmind.google/technologies/veo/) via [FAL](https://fal.ai) |
| Media Storage    | [ImageKit](https://imagekit.io)                                                                                  |
| Validation       | [Zod](https://zod.dev) v4                                                                                        |

## 📋 Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Redis (for BullMQ job queue)

## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
# Required
GOOGLE_CLOUD_API_KEY=your_gemini_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key

# For Video Generation
FAL_API_KEY=your_fal_api_key

# For Media Upload (optional)
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_PASSWORD=your_imagekit_password
```

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

This starts the Motia runtime and **Workbench** at [`http://localhost:3000`](http://localhost:3000).

## 📡 API Usage

### Generate Ad

```bash
POST /api/generate-ad
Content-Type: application/json

{
  "url": "https://example.com/product",
  "type": ["instagram", "tiktok"],
  "videoProvider": "auto"
}
```

**Parameters:**

| Field           | Type   | Description                                                            |
| --------------- | ------ | ---------------------------------------------------------------------- |
| `url`           | string | Landing page URL to generate ads from                                  |
| `type`          | array  | Platforms: `["instagram"]`, `["tiktok"]`, or `["instagram", "tiktok"]` |
| `videoProvider` | string | Video AI: `"kling"`, `"veo"`, or `"auto"` (default)                    |

**Response:**

```json
{
  "success": true,
  "jobId": "job_1234567890_abc123def",
  "message": "Ad generation started. Use jobId to track progress.",
  "type": ["instagram", "tiktok"],
  "output": "both",
  "videoProvider": "auto"
}
```

### Check Job Status

```bash
GET /api/job-status/:jobId
```

**Response:**

```json
{
  "jobId": "job_1234567890_abc123def",
  "url": "https://example.com/product",
  "status": "completed",
  "brandAnalysis": {
    "brandName": "Example Brand",
    "tagline": "Your tagline here",
    "tone": "professional",
    "visualStyle": "modern minimalist"
  },
  "generatedImage": {
    "imagePath": "/outputs/ad_1x1_123456.jpg",
    "adFormat": "1:1"
  },
  "generatedVideo": {
    "videoPath": "/outputs/video_kling_123456.mp4",
    "provider": "kling",
    "duration": 10
  }
}
```

## 🖥️ Workbench UI

The project includes a custom Workbench plugin with a beautiful UI for generating ads:

1. Open the Workbench at `http://localhost:3000`
2. Click on the **"Ad Generator"** tab (✨ icon)
3. Enter your landing page URL
4. Select target platforms (Instagram/TikTok)
5. Click **Generate AI Ads**
6. Track progress in real-time

## 📁 Project Structure

```
motia-ad-generator/
├── src/
│   ├── adgenerator/           # Workflow steps
│   │   ├── api-generate-ad.step.ts      # API entry point
│   │   ├── api-job-status.step.ts       # Status polling
│   │   ├── scrape-landing-page.step.ts  # Web scraping
│   │   ├── filter-images.step.ts        # AI image filtering
│   │   ├── analyze-brand.step.ts        # Brand analysis
│   │   ├── generate-image-prompt.step.ts
│   │   ├── generate-image.step.ts       # Image generation
│   │   ├── generate-video-prompt.step.ts
│   │   ├── generate-video.step.ts       # Video generation
│   │   └── aggregate-results.step.ts    # Final aggregation
│   └── services/              # AI service wrappers
│       ├── firecrawl.service.ts
│       ├── gemini.service.ts
│       ├── nanoBananaPro.service.ts
│       ├── prompt-generator.service.ts
│       ├── videoGenerator.service.ts
│       └── videoPromptGenerator.service.ts
├── plugins/
│   └── ad-generator-ui/       # Workbench UI plugin
│       ├── index.ts
│       └── components/
│           └── ad-generator-panel.tsx
├── outputs/                   # Generated media files
├── motia.config.ts            # Motia configuration
└── package.json
```

## 🎬 Output Examples

Generated ads are saved to the `outputs/` folder:

- **Images**: `ad_1x1_{timestamp}_{index}.jpg`
- **Videos**: `video_{provider}_{timestamp}.mp4`

## 🔧 Configuration

### Video Provider Selection

- **`kling`** - 10-second videos, fast generation, native audio
- **`veo`** - 8-second videos, higher quality, supports multiple reference images
- **`auto`** - Smart selection based on brand analysis (premium brands → Veo)

### Customization

Edit `motia.config.ts` to customize:

- Plugins and middleware
- Redis configuration
- Express settings

## 📚 Learn More

- [Motia Documentation](https://motia.dev/docs)
- [Step Concepts](https://motia.dev/docs/concepts/steps)
- [Event-Driven Architecture](https://motia.dev/docs/concepts/events)
- [Workbench Plugins](https://motia.dev/docs/workbench/plugins)

## 📄 License

MIT
