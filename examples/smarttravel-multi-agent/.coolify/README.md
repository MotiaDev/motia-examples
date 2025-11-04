# Coolify Configuration

This directory contains Coolify-specific configuration files for deploying SmartTravel Multi-Agent System.

## Files

- **config.json** - Main Coolify configuration
  - Application settings
  - Health check configuration
  - Environment variable requirements
  - Resource limits
  - SSL settings

## Usage

These configuration files are automatically detected by Coolify when you deploy from Git.

### Automatic Detection

When you connect this repository to Coolify:

1. Coolify reads `.coolify/config.json`
2. Pre-configures your application settings
3. Validates required environment variables
4. Sets up health checks automatically

### Manual Configuration

If deploying manually:

1. Create a new application in Coolify
2. Select **Docker Compose** as build pack
3. Point to `docker-compose.yml`
4. Add environment variables from `config.json`
5. Deploy

## Environment Variables

### Required

- `OPENAI_API_KEY` - Your OpenAI API key for AI agents

### Optional

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Node environment (default: production)

## Resource Recommendations

**Minimum:**
- CPU: 1 core
- Memory: 1GB
- Storage: 10GB

**Recommended:**
- CPU: 2 cores
- Memory: 2GB
- Storage: 20GB

## Support

For deployment help:
- Read: `COOLIFY_DEPLOYMENT.md` in the project root
- Coolify Docs: https://coolify.io/docs
- Discord: https://discord.gg/coolify

