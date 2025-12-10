#!/bin/bash

# Quick Test Script for Room Renovate
# Tests the complete workflow including AI rendering generation

set -e

echo "🏚️  Room Renovate - Quick Test"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "❌ Server not running. Start it with: npm run dev"
    exit 1
fi

echo -e "${BLUE}📝 Step 1: Starting renovation request...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3000/renovation/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Please help me renovate my 10x12 kitchen to modern farmhouse style with white shaker cabinets, butcher block countertops, and subway tile backsplash. The current space has outdated oak cabinets.",
    "budget": 30000,
    "roomType": "kitchen",
    "style": "modern farmhouse"
  }')

SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')
echo -e "${GREEN}✅ Session created: $SESSION_ID${NC}"
echo ""

# Wait for processing
echo -e "${YELLOW}⏳ Step 2: Processing renovation plan (3 seconds)...${NC}"
sleep 3

# Get results
echo -e "${BLUE}📋 Step 3: Fetching renovation plan...${NC}"
RESULT=$(curl -s http://localhost:3000/renovation/$SESSION_ID/result)
COMPLETED=$(echo $RESULT | jq -r '.completed')

if [ "$COMPLETED" = "true" ]; then
    # Check if this is an info response or a roadmap response
    HAS_ROADMAP=$(echo $RESULT | jq 'has("roadmap")')
    HAS_INFO=$(echo $RESULT | jq 'has("infoResponse")')
    
    if [ "$HAS_INFO" = "true" ]; then
        echo -e "${YELLOW}⚠️  Got info response instead of renovation plan${NC}"
        echo ""
        echo $RESULT | jq -r '.infoResponse'
        echo ""
        echo -e "${BLUE}💡 Tip: Your message might have been too vague. Try running the test again or send a more detailed renovation request.${NC}"
        exit 0
    elif [ "$HAS_ROADMAP" = "true" ]; then
        echo -e "${GREEN}✅ Renovation plan ready!${NC}"
        echo ""
        echo "Budget Breakdown:"
        echo $RESULT | jq '.roadmap.budget // "Not available"'
        echo ""
        echo "Timeline:"
        echo $RESULT | jq -r '.roadmap.timeline.description // "Not available"'
        echo ""
        echo "Key Materials (first 5):"
        echo $RESULT | jq -r '.roadmap.designPlan.materials[0:5][]? // empty' | sed 's/^/  - /' || echo "  No materials listed"
    fi
else
    echo "⏳ Still processing..."
fi

# Wait for rendering (skip if we got info response)
if [ "$HAS_ROADMAP" != "true" ]; then
    exit 0
fi

echo ""
echo -e "${YELLOW}⏳ Step 4: Waiting for AI rendering generation (15 seconds)...${NC}"
echo "   (Gemini 2.5 Flash Image is creating your photorealistic rendering)"
sleep 15

# Get rendering
echo -e "${BLUE}🖼️  Step 5: Fetching AI-generated rendering...${NC}"
RENDERING_RESPONSE=$(curl -s http://localhost:3000/renovation/$SESSION_ID/rendering)
RENDERING_STATUS=$(echo $RENDERING_RESPONSE | jq -r '.renderingCompleted')

if [ "$RENDERING_STATUS" = "true" ]; then
    echo -e "${GREEN}✅ Rendering completed!${NC}"
    
    # Save the image
    OUTPUT_FILE="kitchen_rendering_${SESSION_ID##*_}.png"
    echo $RENDERING_RESPONSE | jq -r '.rendering.imageBase64' | base64 -d > $OUTPUT_FILE
    
    echo -e "${GREEN}📸 Image saved as: $OUTPUT_FILE${NC}"
    echo ""
    
    # Try to open it
    if command -v open &> /dev/null; then
        echo "🖼️  Opening image..."
        open $OUTPUT_FILE
    elif command -v xdg-open &> /dev/null; then
        xdg-open $OUTPUT_FILE
    else
        echo "View your image: $OUTPUT_FILE"
    fi
    
    echo ""
    echo -e "${GREEN}✨ Success! Your renovation plan and rendering are ready!${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. View full plan:"
    echo "   curl http://localhost:3000/renovation/$SESSION_ID/result | jq"
    echo ""
    echo "2. Edit the rendering:"
    echo "   curl -X POST http://localhost:3000/renovation/$SESSION_ID/edit \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"editPrompt\": \"Make the cabinets cream instead of white\"}'"
    echo ""
    echo "3. After editing, get updated image (wait 8 seconds):"
    echo "   curl http://localhost:3000/renovation/$SESSION_ID/rendering \\"
    echo "     | jq -r '.rendering.imageBase64' | base64 -d > kitchen_v2.png"
    echo ""
else
    echo -e "${YELLOW}⏳ Rendering still in progress...${NC}"
    echo "   Try again in a few seconds:"
    echo "   curl http://localhost:3000/renovation/$SESSION_ID/rendering"
    
    RENDERING_ERROR=$(echo $RENDERING_RESPONSE | jq -r '.renderingError // empty')
    if [ ! -z "$RENDERING_ERROR" ]; then
        echo ""
        echo "❌ Error: $RENDERING_ERROR"
        echo ""
        echo "Make sure GOOGLE_API_KEY is set in .env file:"
        echo "   echo 'GOOGLE_API_KEY=your_key' > .env"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

