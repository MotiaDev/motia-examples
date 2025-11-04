#!/bin/bash
# SmartTravel - Deployment Testing Script
# Tests the deployed application's endpoints and functionality

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo "🧪 SmartTravel Deployment Testing"
echo "=================================="
echo ""

# Get deployment URL
if [ -z "$1" ]; then
    print_info "No URL provided, using localhost:3000"
    BASE_URL="http://localhost:3000"
else
    BASE_URL="$1"
    print_info "Testing deployment at: $BASE_URL"
fi

echo ""
print_info "Starting tests..."
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: Root endpoint
print_info "Test 1: Checking root endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    print_success "Root endpoint responding (HTTP $HTTP_CODE)"
    ((TESTS_PASSED++))
else
    print_error "Root endpoint failed (HTTP $HTTP_CODE)"
    ((TESTS_FAILED++))
fi

# Test 2: API Health
print_info "Test 2: Checking API health..."
RESPONSE=$(curl -s "$BASE_URL/api/travel-plan/status/test" || echo "ERROR")

if [ "$RESPONSE" != "ERROR" ]; then
    print_success "API is responding"
    ((TESTS_PASSED++))
else
    print_error "API is not responding"
    ((TESTS_FAILED++))
fi

# Test 3: Frontend assets
print_info "Test 3: Checking frontend assets..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/index.html" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Frontend assets accessible (HTTP $HTTP_CODE)"
    ((TESTS_PASSED++))
else
    print_warning "Frontend may not be loaded (HTTP $HTTP_CODE)"
    ((TESTS_FAILED++))
fi

# Test 4: Response time
print_info "Test 4: Measuring response time..."
START_TIME=$(date +%s%N)
curl -s "$BASE_URL/" > /dev/null 2>&1
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$RESPONSE_TIME" -lt 3000 ]; then
    print_success "Response time: ${RESPONSE_TIME}ms (Good)"
    ((TESTS_PASSED++))
elif [ "$RESPONSE_TIME" -lt 5000 ]; then
    print_warning "Response time: ${RESPONSE_TIME}ms (Acceptable)"
    ((TESTS_PASSED++))
else
    print_warning "Response time: ${RESPONSE_TIME}ms (Slow)"
    ((TESTS_FAILED++))
fi

# Test 5: SSL Certificate (if HTTPS)
if [[ $BASE_URL == https://* ]]; then
    print_info "Test 5: Checking SSL certificate..."
    DOMAIN=$(echo $BASE_URL | sed -e 's|https://||' -e 's|/.*||')
    
    if echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | grep -q "Verify return code: 0"; then
        print_success "SSL certificate is valid"
        ((TESTS_PASSED++))
    else
        print_error "SSL certificate validation failed"
        ((TESTS_FAILED++))
    fi
else
    print_info "Test 5: Skipped (not HTTPS)"
fi

# Test 6: Docker container status (if local)
if [ "$BASE_URL" = "http://localhost:3000" ]; then
    print_info "Test 6: Checking Docker container status..."
    
    if docker ps | grep -q "smarttravel"; then
        CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' $(docker ps -q -f name=smarttravel) 2>/dev/null || echo "unknown")
        
        if [ "$CONTAINER_STATUS" = "running" ]; then
            print_success "Docker container is running"
            ((TESTS_PASSED++))
        else
            print_error "Docker container status: $CONTAINER_STATUS"
            ((TESTS_FAILED++))
        fi
    else
        print_warning "No Docker container named 'smarttravel' found"
    fi
else
    print_info "Test 6: Skipped (not local deployment)"
fi

# Test 7: Create travel plan (API test)
print_info "Test 7: Testing travel plan API..."

PAYLOAD='{
  "request": {
    "name": "Test User",
    "destination": "Paris",
    "startingLocation": "New York",
    "duration": 5,
    "travelDates": {
      "start": "2024-12-01"
    },
    "adults": 2,
    "budget": 2000,
    "budgetCurrency": "USD",
    "travelStyle": "comfort"
  }
}'

API_RESPONSE=$(curl -s -X POST "$BASE_URL/api/travel-plan/trigger" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" 2>&1 || echo "ERROR")

if [[ $API_RESPONSE == *"planId"* ]] || [[ $API_RESPONSE == *"success"* ]]; then
    print_success "Travel plan API is functional"
    ((TESTS_PASSED++))
    
    # Extract plan ID if available
    PLAN_ID=$(echo $API_RESPONSE | grep -o '"planId":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$PLAN_ID" ]; then
        print_info "Generated plan ID: $PLAN_ID"
    fi
elif [[ $API_RESPONSE == *"OPENAI_API_KEY"* ]]; then
    print_warning "API is working but OPENAI_API_KEY may not be configured"
    ((TESTS_PASSED++))
else
    print_error "Travel plan API failed"
    print_info "Response: $API_RESPONSE"
    ((TESTS_FAILED++))
fi

echo ""
echo "=================================="
echo "📊 Test Results Summary"
echo "=================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "🎉 All tests passed! Deployment is healthy."
    echo ""
    echo "✅ Your SmartTravel application is ready to use!"
    echo "🌐 Access at: $BASE_URL"
    exit 0
else
    print_warning "⚠️  Some tests failed. Review the results above."
    echo ""
    echo "Common fixes:"
    echo "1. Check if OPENAI_API_KEY is set"
    echo "2. Verify all containers are running"
    echo "3. Check application logs for errors"
    echo "4. Ensure all dependencies are installed"
    exit 1
fi

