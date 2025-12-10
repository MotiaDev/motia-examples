# API Tester - Quick Start Guide 🚀

## What You Just Got

A complete Postman-like API testing interface inside your Motia workbench!

## Start Using It Now

### 1. Start Your Motia Dev Server

```bash
pnpm dev
```

### 2. Open Your Workbench

Navigate to: `http://localhost:3333` (or your configured port)

### 3. Find the API Tester Tab

Look for **"API Tester"** in the top tabs of your workbench (it has a bug-play icon 🐛)

## Your First Request in 30 Seconds

### Option A: Use a Preset (Easiest!)

1. Open API Tester tab
2. Look at the left sidebar under "Presets"
3. Click **"Trigger Travel Plan"**
4. Click the blue **"Send"** button
5. Watch the response appear! 🎉

### Option B: Build Your Own

1. Select HTTP method (e.g., `GET`)
2. Enter URL: `/api/v1/travel-plan/test123`
3. Click **"Send"**
4. View the response!

## What You Can Do

### 🎯 Test Your Travel APIs
```
✓ Trigger Travel Plan
✓ Get Plan Status  
✓ Search Flights
✓ Search Hotels
✓ Any custom endpoint you create!
```

### ✅ Run Automated Tests
```javascript
// Add tests like:
Status equals 200
Response time < 1000ms
Body contains "Paris"
```

### 💾 Save & Reuse Requests
- Click the 💾 Save button
- Give it a name
- Find it in "Saved Requests" sidebar

### 📊 View Beautiful Responses
- JSON with syntax highlighting
- Response headers
- Status codes with colors
- Response time metrics

## Example: Test Your Travel Planning

### Step 1: Trigger a Plan
```
Method: POST
URL: /api/v1/travel-plan

Body:
{
  "destination": "Tokyo",
  "startDate": "2025-12-15",
  "endDate": "2025-12-22",
  "budget": 8000,
  "travelers": 2
}
```

### Step 2: Check the Status
```
Method: GET
URL: /api/v1/travel-plan/{planId from response}
```

### Step 3: Add Tests
```
✓ Status equals 200
✓ Response time < 2000ms
✓ Body contains "Tokyo"
```

## Pro Tips

### 💡 Speed Hacks
- **Keyboard**: Just start typing in URL field
- **Presets**: One click loads everything
- **Save often**: Don't retype common requests
- **Tests**: Write once, run every time

### 🎨 UI Navigation
- **Top Tabs**: Switch between Body/Headers/Tests
- **Bottom Tabs**: View Body/Headers/Test Results
- **Sidebar**: Access saved requests & presets
- **Status Badge**: Green=success, Red=error

### 🔥 Power Features
- Test external APIs (paste full URLs)
- Chain requests (copy IDs from responses)
- Monitor performance (response times)
- Debug errors (detailed error messages)

## Common Workflows

### Workflow 1: End-to-End Testing
1. Trigger travel plan
2. Copy `planId` from response
3. Check plan status with that ID
4. Verify all agents completed

### Workflow 2: Performance Testing
1. Add "Response time < 500ms" test
2. Run request multiple times
3. Monitor timing consistency
4. Optimize slow endpoints

### Workflow 3: API Documentation
1. Build request for each endpoint
2. Add descriptive name
3. Save to collection
4. Share with team

## Next Steps

1. ✅ Start Motia dev server (`pnpm dev`)
2. ✅ Open workbench in browser
3. ✅ Click "API Tester" tab
4. ✅ Try a preset request
5. ✅ Customize and explore!

## Need Help?

- Check `README.md` for full documentation
- Look at preset requests for examples
- Browser console shows detailed errors
- Response tab shows actual data

---

**Ready to test some APIs?** 🚀

Just run `pnpm dev` and look for the API Tester tab!

