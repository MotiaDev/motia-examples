# Testing Guide - Room Renovate Workflow

Complete guide to test the AI Home Renovation Planner with example payloads and image handling.

## Prerequisites

1. **Start the server:**
```bash
npm run dev
```

2. **Set up API key (for image generation):**
```bash
# Create .env file
echo "GOOGLE_API_KEY=your_actual_gemini_api_key" > .env
```

Get your key from: https://aistudio.google.com/app/apikey

## Test 1: Basic Renovation Request (No Images)

### Request

```bash
curl -X POST http://localhost:3000/renovation/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to renovate my 10x12 kitchen. It has oak cabinets from the 90s and laminate counters. I love modern farmhouse style.",
    "budget": 30000,
    "roomType": "kitchen",
    "style": "modern farmhouse"
  }'
```

### Payload Breakdown

```json
{
  "message": "Full description of your renovation project",
  "budget": 30000,           // Optional: Budget in dollars
  "roomType": "kitchen",     // Optional: kitchen, bathroom, bedroom, living_room
  "style": "modern farmhouse" // Optional: modern, farmhouse, industrial, minimalist, etc.
}
```

### Response

```json
{
  "sessionId": "session_1699123456789_abc123",
  "message": "Your renovation request has been received and routed to assessment. Processing...",
  "routedTo": "assessment"
}
```

### Save the sessionId for next steps!

```bash
# Save it to a variable
SESSION_ID="session_1699123456789_abc123"
```

## Test 2: Get Renovation Plan

Wait 2-3 seconds for processing, then:

```bash
curl http://localhost:3000/renovation/$SESSION_ID/result | jq
```

### Expected Response

```json
{
  "sessionId": "session_1699123456789_abc123",
  "completed": true,
  "roadmap": {
    "projectSummary": {
      "roomType": "kitchen",
      "style": "modern farmhouse",
      "scope": "moderate",
      "squareFootage": 120
    },
    "budget": {
      "materials": 13500,
      "labor": 12000,
      "permits": 1500,
      "contingency": 3000,
      "total": 30000
    },
    "timeline": {
      "duration": "3-6 weeks (includes some structural work)",
      "scope": "moderate",
      "roomType": "kitchen"
    },
    "designPlan": {
      "approach": "preserve_layout",
      "materials": [
        "shaker with beadboard style cabinets in cream white",
        "butcher block countertops",
        "white subway tile backsplash",
        "Luxury vinyl plank flooring in natural oak",
        "oil-rubbed bronze hardware and fixtures",
        "Stainless steel appliances",
        "Recessed LED lighting with pendant lights"
      ],
      "colors": {
        "cabinets": "cream white",
        "walls": "Soft white",
        "accents": "Natural wood tones"
      },
      "features": [
        "New shaker with beadboard cabinets with soft-close hardware",
        "butcher block countertops with waterfall edge",
        "Full-height white subway tile",
        "Integrated sink with pull-down faucet",
        "Smart lighting with dimmer controls"
      ]
    },
    "contractors": [
      "General Contractor",
      "Electrician",
      "Plumber",
      "Cabinet Installer",
      "Tile/Flooring Specialist",
      "Countertop Installer"
    ],
    "actionChecklist": [
      "Get 3-5 contractor quotes",
      "Apply for necessary permits",
      "Order materials and finishes",
      "Schedule contractors in proper sequence",
      "Set up temporary accommodations if needed",
      "Final walkthrough and punch list"
    ],
    "renderingPrompt": "Professional interior photography of a renovated kitchen..."
  },
  "assessmentSummary": {
    "roomType": "kitchen",
    "estimatedSize": "120 sq ft",
    "budget": 30000,
    "style": "modern farmhouse",
    "keyIssues": ["Outdated fixtures and finishes"],
    "opportunities": ["Modernize with contemporary materials"]
  }
}
```

## Test 3: Get AI-Generated Rendering (Gemini 2.5 Flash)

Wait 5-10 seconds for Gemini to generate the image, then:

```bash
curl http://localhost:3000/renovation/$SESSION_ID/rendering | jq
```

### Expected Response

```json
{
  "sessionId": "session_1699123456789_abc123",
  "renderingCompleted": true,
  "rendering": {
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...[very long base64 string]",
    "mimeType": "image/png",
    "prompt": "Professional interior photography of a renovated kitchen...",
    "generatedAt": "trace_id_1699123456789",
    "model": "gemini-2.0-flash-exp"
  },
  "message": "Rendering completed successfully"
}
```

### Save the Image

```bash
# Save base64 image to file
curl http://localhost:3000/renovation/$SESSION_ID/rendering \
  | jq -r '.rendering.imageBase64' \
  | base64 -d > kitchen_rendering.png

# Open the image
open kitchen_rendering.png
```

## Test 4: Edit the Rendering

```bash
curl -X POST http://localhost:3000/renovation/$SESSION_ID/edit \
  -H "Content-Type: application/json" \
  -d '{
    "editPrompt": "Make the cabinets cream color instead of white"
  }'
```

### Response

```json
{
  "sessionId": "session_1699123456789_abc123",
  "message": "Rendering edit in progress. Check back shortly for the updated image."
}
```

### Get the Updated Rendering

Wait 5-8 seconds, then:

```bash
curl http://localhost:3000/renovation/$SESSION_ID/rendering \
  | jq -r '.rendering.imageBase64' \
  | base64 -d > kitchen_rendering_v2.png

open kitchen_rendering_v2.png
```

## More Edit Examples

```bash
# Add pendant lights
curl -X POST http://localhost:3000/renovation/$SESSION_ID/edit \
  -H "Content-Type: application/json" \
  -d '{"editPrompt": "Add modern pendant lights over the island"}'

# Change flooring
curl -X POST http://localhost:3000/renovation/$SESSION_ID/edit \
  -H "Content-Type: application/json" \
  -d '{"editPrompt": "Change the flooring to darker oak hardwood"}'

# Update backsplash
curl -X POST http://localhost:3000/renovation/$SESSION_ID/edit \
  -H "Content-Type: application/json" \
  -d '{"editPrompt": "Change backsplash to herringbone pattern subway tile"}'
```

## Test 5: General Questions (Fast Response)

```bash
curl -X POST http://localhost:3000/renovation/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How much does a kitchen renovation typically cost?"
  }'
```

This returns immediately with cost information, no processing needed.

## Test 6: Bathroom Renovation

```bash
curl -X POST http://localhost:3000/renovation/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My master bathroom is tiny (5x8 feet) with a cramped tub. I want a spa-like retreat with walk-in shower.",
    "budget": 15000,
    "roomType": "bathroom",
    "style": "modern spa"
  }'
```

## Test 7: Budget-Conscious Bedroom

```bash
curl -X POST http://localhost:3000/renovation/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Transform my small, dark bedroom into a cozy modern retreat. The room feels cramped and has poor lighting.",
    "budget": 12000,
    "roomType": "bedroom",
    "style": "modern"
  }'
```

## How to Add Images (Current Implementation)

### Option 1: Image URLs (Current Support)

The workflow currently accepts image URLs:

```bash
curl -X POST http://localhost:3000/renovation/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Renovate my kitchen in modern farmhouse style",
    "budget": 30000,
    "roomType": "kitchen",
    "style": "modern farmhouse",
    "hasImages": true,
    "imageUrls": [
      "https://example.com/my-current-kitchen.jpg",
      "https://example.com/inspiration-image.jpg"
    ]
  }'
```

**Note:** The current implementation stores these URLs in state but doesn't yet process them for image analysis. This is a placeholder for future enhancement.

### Option 2: Base64 Image Upload (Future Enhancement)

To fully support image uploads, you would send base64-encoded images:

```bash
# First, encode your image
IMAGE_BASE64=$(base64 -i my-kitchen-photo.jpg)

# Send with request
curl -X POST http://localhost:3000/renovation/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Renovate my kitchen",
    "budget": 30000,
    "images": [{
      "data": "'"$IMAGE_BASE64"'",
      "type": "current_room",
      "mimeType": "image/jpeg"
    }]
  }'
```

### Option 3: Multipart Form Upload (Future Enhancement)

For a more user-friendly approach:

```bash
curl -X POST http://localhost:3000/renovation/start-with-images \
  -F "message=Renovate my kitchen in modern style" \
  -F "budget=30000" \
  -F "roomType=kitchen" \
  -F "currentRoom=@my-kitchen-photo.jpg" \
  -F "inspiration=@pinterest-inspiration.jpg"
```

## Complete Testing Script

Save this as `test-workflow.sh`:

```bash
#!/bin/bash

echo "🏚️ Testing Room Renovate Workflow"
echo "=================================="

# Test 1: Start renovation
echo "📝 Step 1: Starting renovation request..."
RESPONSE=$(curl -s -X POST http://localhost:3000/renovation/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Modern farmhouse kitchen renovation with white shaker cabinets and butcher block counters",
    "budget": 30000,
    "roomType": "kitchen",
    "style": "modern farmhouse"
  }')

SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')
echo "✅ Session created: $SESSION_ID"

# Wait for processing
echo ""
echo "⏳ Step 2: Waiting for renovation plan (3 seconds)..."
sleep 3

# Get results
echo "📋 Step 3: Fetching renovation plan..."
curl -s http://localhost:3000/renovation/$SESSION_ID/result | jq '{
  completed: .completed,
  roomType: .roadmap.projectSummary.roomType,
  budget: .roadmap.budget.total,
  timeline: .roadmap.timeline.duration,
  materials: .roadmap.designPlan.materials[0:3]
}'

# Wait for rendering
echo ""
echo "⏳ Step 4: Waiting for AI rendering generation (8 seconds)..."
sleep 8

# Get rendering
echo "🖼️  Step 5: Fetching AI-generated rendering..."
RENDERING_STATUS=$(curl -s http://localhost:3000/renovation/$SESSION_ID/rendering | jq -r '.renderingCompleted')

if [ "$RENDERING_STATUS" = "true" ]; then
  echo "✅ Rendering completed! Saving image..."
  curl -s http://localhost:3000/renovation/$SESSION_ID/rendering \
    | jq -r '.rendering.imageBase64' \
    | base64 -d > kitchen_rendering_test.png
  echo "📸 Image saved as kitchen_rendering_test.png"
  
  # Try to open it
  if command -v open &> /dev/null; then
    open kitchen_rendering_test.png
  elif command -v xdg-open &> /dev/null; then
    xdg-open kitchen_rendering_test.png
  fi
else
  echo "⏳ Rendering still in progress..."
fi

echo ""
echo "✨ Testing complete!"
echo "Session ID: $SESSION_ID"
echo ""
echo "Try editing the rendering:"
echo "curl -X POST http://localhost:3000/renovation/$SESSION_ID/edit \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"editPrompt\": \"Make the cabinets cream instead of white\"}'"
```

Run it:
```bash
chmod +x test-workflow.sh
./test-workflow.sh
```

## Testing with Postman

### 1. Start Renovation

**Method:** POST  
**URL:** `http://localhost:3000/renovation/start`  
**Headers:**
- `Content-Type: application/json`

**Body (raw JSON):**
```json
{
  "message": "Modern farmhouse kitchen with white shaker cabinets",
  "budget": 30000,
  "roomType": "kitchen",
  "style": "modern farmhouse"
}
```

### 2. Get Results

**Method:** GET  
**URL:** `http://localhost:3000/renovation/{{sessionId}}/result`

### 3. Get Rendering

**Method:** GET  
**URL:** `http://localhost:3000/renovation/{{sessionId}}/rendering`

### 4. Edit Rendering

**Method:** POST  
**URL:** `http://localhost:3000/renovation/{{sessionId}}/edit`  
**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "editPrompt": "Make the cabinets cream color"
}
```

## Testing in Browser

Create `test.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Room Renovate Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        button { padding: 10px 20px; margin: 10px 0; cursor: pointer; }
        #result { white-space: pre-wrap; background: #f4f4f4; padding: 15px; margin: 10px 0; }
        img { max-width: 100%; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>🏚️ Room Renovate Tester</h1>
    
    <button onclick="startRenovation()">1. Start Renovation</button>
    <button onclick="getResults()">2. Get Results</button>
    <button onclick="getRendering()">3. Get Rendering</button>
    <button onclick="editRendering()">4. Edit Rendering</button>
    
    <div id="result"></div>
    <div id="imageContainer"></div>
    
    <script>
        let sessionId = null;
        
        async function startRenovation() {
            const response = await fetch('http://localhost:3000/renovation/start', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    message: "Modern farmhouse kitchen with white shaker cabinets",
                    budget: 30000,
                    roomType: "kitchen",
                    style: "modern farmhouse"
                })
            });
            const data = await response.json();
            sessionId = data.sessionId;
            document.getElementById('result').textContent = 
                `✅ Session created: ${sessionId}\n\nWait 3 seconds then click "Get Results"`;
        }
        
        async function getResults() {
            if (!sessionId) return alert('Start renovation first!');
            const response = await fetch(`http://localhost:3000/renovation/${sessionId}/result`);
            const data = await response.json();
            document.getElementById('result').textContent = 
                JSON.stringify(data, null, 2);
        }
        
        async function getRendering() {
            if (!sessionId) return alert('Start renovation first!');
            const response = await fetch(`http://localhost:3000/renovation/${sessionId}/rendering`);
            const data = await response.json();
            
            if (data.rendering) {
                const img = document.createElement('img');
                img.src = `data:${data.rendering.mimeType};base64,${data.rendering.imageBase64}`;
                document.getElementById('imageContainer').innerHTML = '';
                document.getElementById('imageContainer').appendChild(img);
                document.getElementById('result').textContent = '✅ Rendering loaded!';
            } else {
                document.getElementById('result').textContent = 
                    '⏳ Rendering still processing... Wait 5 more seconds and try again.';
            }
        }
        
        async function editRendering() {
            if (!sessionId) return alert('Start renovation first!');
            const editPrompt = prompt('Enter edit instruction:', 'Make the cabinets cream color');
            if (!editPrompt) return;
            
            await fetch(`http://localhost:3000/renovation/${sessionId}/edit`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ editPrompt })
            });
            
            document.getElementById('result').textContent = 
                '⏳ Editing in progress... Wait 8 seconds then click "Get Rendering" again';
        }
    </script>
</body>
</html>
```

Open in browser: `open test.html`

## Troubleshooting

### "Rendering not yet completed"
- Wait longer (8-10 seconds)
- Check if `GOOGLE_API_KEY` is set in `.env`
- Check server logs for Gemini API errors

### "API key not configured"
```bash
echo "GOOGLE_API_KEY=your_actual_key" > .env
# Restart server
npm run dev
```

### Images not working
The current implementation stores image URLs in state but doesn't process them for visual analysis yet. To add full image support, you'd need to:
1. Modify `visual_assessor.step.ts` to fetch and analyze images
2. Add Gemini vision API calls to analyze uploaded images
3. Pass image analysis results to the design planner

## Summary

**Basic flow:**
1. POST to `/renovation/start` with your request
2. Wait 3 seconds
3. GET `/renovation/:sessionId/result` for the plan
4. Wait 8 seconds  
5. GET `/renovation/:sessionId/rendering` for the AI image
6. POST to `/renovation/:sessionId/edit` to refine the image
7. Repeat steps 4-6 as needed

**All tests should work without images - just use text descriptions!** The AI will generate renderings based on your text descriptions.

