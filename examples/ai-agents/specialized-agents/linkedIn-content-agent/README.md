# LinkedIn Content Agent

<div align="center">

**Built with Motia**

[![Website](https://img.shields.io/badge/Website-motia.dev-blue?style=flat&logo=globe&logoColor=white&labelColor=000000)](https://www.motia.dev)
[![Documentation](https://img.shields.io/badge/Docs-docs.motia.dev-green?style=flat&logo=gitbook&logoColor=white&labelColor=000000)](https://www.motia.dev/docs)
[![npm](https://img.shields.io/npm/v/motia?style=flat&logo=npm&logoColor=white&color=CB3837&labelColor=000000)](https://www.npmjs.com/package/motia)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat&logo=opensourceinitiative&logoColor=white&labelColor=000000)](LICENSE)

[![GitHub Stars](https://img.shields.io/github/stars/MotiaDev/motia?style=flat&logo=github&logoColor=white&color=yellow&labelColor=000000)](https://github.com/MotiaDev/motia)
[![Discord](https://img.shields.io/discord/1322278831184281721?style=flat&logo=discord&logoColor=white&color=5865F2&label=Discord&labelColor=000000)](https://discord.gg/motia)
[![Twitter Follow](https://img.shields.io/badge/Follow-@motiadev-1DA1F2?style=flat&logo=twitter&logoColor=white&labelColor=000000)](https://twitter.com/motiadev)

---

</div>

> **Transform your LinkedIn presence with AI-powered content creation and automated posting**

An intelligent agent that generates engaging LinkedIn posts, creates accompanying visuals, optimizes for SEO, and automatically publishes content—all powered by cutting-edge AI and seamlessly orchestrated through Motia's workflow engine.

![LinkedIn content agent](./assets/output.gif)

## ✨ Features

🧠 **AI-Powered Content Creation**
- Generates original, high-engagement LinkedIn post ideas
- Creates professional, thoughtful posts tailored for software engineers
- Automatically adapts tone and style for maximum engagement

🎨 **Visual Content Generation**
- Creates relevant images using DALL-E 3
- Automatically generates visual content that complements your posts
- High-quality 1024x1024 images optimized for LinkedIn

🔍 **SEO Optimization**
- Extracts and generates 7-10 high-quality SEO keywords
- Converts keywords to trending hashtags
- Maximizes post discoverability and reach

📱 **Automated Publishing**
- Direct integration with LinkedIn API
- Supports both text and image posts
- Handles media uploads and formatting automatically

⚡ **Event-Driven Architecture**
- Built on Motia's robust workflow engine
- Parallel processing for optimal performance
- Real-time state management and error handling

### Project Structure

```
backup-linkedIn-content-agent/
├── steps/                          # Workflow steps
│   ├── api.step.js                 # API endpoint configuration
│   ├── create-idea.step.js         # AI idea generation
│   ├── generate-content-using-idea.step.js  # Content creation
│   ├── generate-image.step.js      # Visual generation
│   ├── generate-seo-keywords.step.js # SEO optimization
│   ├── merge-everything.step.js    # Content assembly
│   └── final.step.js              # LinkedIn publishing
├── motia-workbench.json           # Motia workflow configuration
├── package.json                   # Node.js dependencies
└── types.d.ts                     # TypeScript definitions
```

### Workflow Steps

1. **API Trigger** (`api.step.js`) - Initiates the content creation process
2. **Idea Generation** (`create-idea.step.js`) - AI generates original post concepts
3. **Content Creation** (`generate-content-using-idea.step.js`) - Transforms ideas into engaging posts
4. **Visual Generation** (`generate-image.step.js`) - Creates accompanying imagery
5. **SEO Optimization** (`generate-seo-keywords.step.js`) - Extracts relevant keywords
6. **Content Assembly** (`merge-everything.step.js`) - Combines all elements
7. **Publication** (`final.step.js`) - Posts to LinkedIn with media

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API account
- LinkedIn Developer Account
- Motia CLI installed globally

### Installation

1. **Clone the repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
   LINKEDIN_URN=urn:li:person:YOUR_LINKEDIN_ID
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Trigger content generation**
   Trigger the `/linkedin-post-agent` API endpoint from the Motia workbench.

## ⚙️ Configuration

### Environment Variables

| Variable                | Description                                         | Required |
| ----------------------- | --------------------------------------------------- | -------- |
| `OPENAI_API_KEY`        | Your OpenAI API key for GPT-4 and DALL-E access     | ✅        |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn API access token for posting               | ✅        |
| `LINKEDIN_URN`          | Your LinkedIn URN (e.g., `urn:li:person:123456789`) | ✅        |

### LinkedIn API Setup

1. **Create a LinkedIn App**
   - Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
   - Create a new app with your company page
   - Request access to the Marketing API

2. **Generate Access Token**
   - Use LinkedIn's OAuth 2.0 flow
   - Required scopes: `w_member_social`, `r_liteprofile`

3. **Get Your LinkedIn URN**
   - Call LinkedIn's Profile API: `https://api.linkedin.com/v2/people/(id=~)`
   - Extract your URN from the response

### OpenAI API Setup

1. **Get API Key**
   - Sign up at [OpenAI Platform](https://platform.openai.com/)
   - Generate an API key from your dashboard
   - Ensure you have access to GPT-4 and DALL-E 3

## 📖 Usage

### Basic Usage

1. Start the agent and trigger content generation:

```bash
# Start the development server
npm run dev
```

2. Trigger content generation via API. You can trigger APIs from the Motia Workbench that was fired up in the previous step.


### Advanced Configuration

Customize the content generation by modifying the step files:

**Content Style** (`steps/create-idea.step.js`):
```javascript
const prompt = `
You are a content strategist for developers.
Generate ideas focused on [YOUR_NICHE_HERE]...
`;
```

**Post Tone** (`steps/generate-content-using-idea.step.js`):
```javascript
const prompt = `
Write a LinkedIn post that:
- Has a [PROFESSIONAL/CASUAL/TECHNICAL] tone
- Targets [YOUR_AUDIENCE]
- Includes [SPECIFIC_ELEMENTS]
`;
```

### Adding Custom Steps

**Create a new step file**
   ```javascript
   // steps/your-custom.step.js
   const { z } = require('zod');
   
   const config = {
     type: 'event',
     name: 'yourCustomStep',
     subscribes: ['input-event'],
     emits: ['output-event'],
     input: z.object({ /* your schema */ }),
     flows: ['LinkedIn-content-agent']
   };
   
   const handler = async (input, { emit, logger }) => {
     // Your custom logic here
   };
   
   module.exports = { config, handler };
   ```


### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Submit a pull request

### Code Style

- Use ESLint configuration provided
- Follow conventional commit messages
- Add tests for new features
- Update documentation as needed

Key metrics tracked:
- Content generation success rate
- LinkedIn posting status
- Image generation performance
- Error rates and types

## 🛡️ Security & Privacy

- **API Keys**: Never commit API keys to version control
- **Rate Limiting**: Respects OpenAI and LinkedIn API rate limits
- **Data Privacy**: No content is stored permanently
- **Error Handling**: Graceful failure handling for all external APIs

## 📋 Troubleshooting

### Common Issues

**LinkedIn API Authentication**
```bash
Error: Invalid LinkedIn access token
```
- Verify your access token is valid
- Check required scopes are granted
- Ensure your LinkedIn app has proper permissions

**OpenAI API Limits**
```bash
Error: Rate limit exceeded
```
- Check your OpenAI usage limits
- Implement exponential backoff
- Consider upgrading your OpenAI plan

**Image Upload Failures**
```bash
Error: Failed to upload image
```
- Posts will continue with text-only
- Check LinkedIn media upload requirements
- Verify image format and size constraints

## 🙏 Acknowledgments

- [Motia](https://motia.dev) for the incredible workflow engine
- [OpenAI](https://openai.com) for GPT-4 and DALL-E 3 APIs
- [LinkedIn](https://linkedin.com) for the comprehensive Developer API
- The open-source community for inspiration and support

## 📞 Support

- 📖 [Documentation](https://motia.dev/docs)
- 💬 [Discord Community](https://discord.gg/motia)

---

<div align="center">

**[⭐ Star this repo](https://github.com/motiadev/motia-examples)** if you found it helpful!

Built with ❤️ using [Motia](https://github.com/MotiaDev/motia)

</div> 