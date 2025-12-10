#!/bin/bash

# Test webhook script for Public Form Auto Triage

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
HOST="${HOST:-localhost:3000}"
ENDPOINT="/public-form-auto-triage"
URL="http://${HOST}${ENDPOINT}"

echo -e "${YELLOW}Testing Public Form Auto Triage Webhook${NC}"
echo "URL: $URL"
echo ""

# Test 1: Valid submission
echo -e "${YELLOW}Test 1: Valid form submission${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I need help with my account. I cannot access my dashboard and the password reset is not working. I have tried multiple times.",
    "metadata": {
      "source": "contact-form",
      "page": "/support",
      "priority": "high"
    },
    "userInfo": {
      "email": "user@example.com",
      "name": "John Doe",
      "id": "user_123"
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Test 1 Passed${NC}"
  echo "Response: $BODY"
else
  echo -e "${RED}✗ Test 1 Failed (HTTP $HTTP_CODE)${NC}"
  echo "Response: $BODY"
fi

echo ""
sleep 2

# Test 2: Minimal valid submission
echo -e "${YELLOW}Test 2: Minimal valid submission${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Short test message"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Test 2 Passed${NC}"
  echo "Response: $BODY"
else
  echo -e "${RED}✗ Test 2 Failed (HTTP $HTTP_CODE)${NC}"
  echo "Response: $BODY"
fi

echo ""
sleep 2

# Test 3: Invalid submission (empty content)
echo -e "${YELLOW}Test 3: Invalid submission (empty content - should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "",
    "metadata": {}
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✓ Test 3 Passed (correctly rejected)${NC}"
  echo "Response: $BODY"
else
  echo -e "${RED}✗ Test 3 Failed (should return 400, got $HTTP_CODE)${NC}"
  echo "Response: $BODY"
fi

echo ""
sleep 2

# Test 4: Invalid submission (missing content field)
echo -e "${YELLOW}Test 4: Invalid submission (missing content - should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "test": true
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✓ Test 4 Passed (correctly rejected)${NC}"
  echo "Response: $BODY"
else
  echo -e "${RED}✗ Test 4 Failed (should return 400, got $HTTP_CODE)${NC}"
  echo "Response: $BODY"
fi

echo ""
echo -e "${YELLOW}Testing complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Check logs to see processing pipeline"
echo "2. Verify vectors in Supabase"
echo "3. Check Google Sheets for log entries"
echo "4. Monitor Slack for any error alerts"

