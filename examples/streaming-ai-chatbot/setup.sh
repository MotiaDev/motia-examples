#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Streaming AI Chatbot${NC}"
echo -e "${YELLOW}This will install all dependencies for both backend and frontend${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${GREEN}📦 Installing backend dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}📦 Installing frontend dependencies...${NC}"
cd frontend && npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
    exit 1
fi

cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚙️  Creating .env file...${NC}"
    cat > .env << EOL
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1

# Optional: Azure OpenAI Configuration
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_OPENAI_API_KEY=your-azure-openai-key

# Development
NODE_ENV=development
EOL
    echo -e "${GREEN}✅ Created .env file${NC}"
    echo -e "${YELLOW}⚠️  Don't forget to add your OpenAI API key to the .env file!${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "${YELLOW}1. Add your OpenAI API key to .env file${NC}"
echo -e "${YELLOW}2. Start the development servers:${NC}"
echo -e "   ${BLUE}./start-dev.sh${NC}"
echo ""
echo -e "${BLUE}🌐 Access points:${NC}"
echo -e "${BLUE}💬 Chat Interface: ${NC}http://localhost:3000"
echo -e "${BLUE}🔧 Motia Backend:  ${NC}http://localhost:3001"
echo ""
