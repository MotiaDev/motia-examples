#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Streaming AI Chatbot Development Environment${NC}"
echo -e "${YELLOW}This will start both the Motia backend and Next.js frontend${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating example...${NC}"
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
    echo -e "${GREEN}✅ Created .env file. Please add your OpenAI API key!${NC}"
    echo ""
fi

# Function to run backend
run_backend() {
    echo -e "${GREEN}🔧 Starting Motia Backend (Port 3001)...${NC}"
    npm run dev &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ Backend started with PID: $BACKEND_PID${NC}"
}

# Function to run frontend
run_frontend() {
    echo -e "${GREEN}🎨 Starting Next.js Frontend (Port 3000)...${NC}"
    cd frontend && npm run dev &
    FRONTEND_PID=$!
    cd ..
    echo -e "${GREEN}✅ Frontend started with PID: $FRONTEND_PID${NC}"
}

# Function to cleanup processes
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}✅ Backend stopped${NC}"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Start services
run_backend
sleep 3
run_frontend
sleep 2

echo ""
echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo -e "${BLUE}📱 Frontend: ${NC}http://localhost:3000"
echo -e "${BLUE}🔧 Backend:  ${NC}http://localhost:3001"
echo -e "${BLUE}📊 Workbench:${NC}http://localhost:3001 (Motia dashboard)"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Keep script running
wait
