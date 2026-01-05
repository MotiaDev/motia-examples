#!/bin/bash

# Test script for Human-in-the-Loop Order Approval Workflow

echo "🚀 Testing HTL Order Approval Workflow"
echo "======================================="
echo ""

# Test 1: Low risk order (auto-approved)
echo "Test 1: Submitting low-risk order..."
RESPONSE1=$(curl -s -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"name": "Widget", "price": 10, "quantity": 1}
    ],
    "customerEmail": "test@example.com",
    "total": 10
  }')

ORDER_ID_1=$(echo $RESPONSE1 | grep -o '"orderId":"[^"]*"' | cut -d'"' -f4)
echo "✅ Order submitted: $ORDER_ID_1"
echo "   Expected: Auto-approved (low risk)"
echo ""

sleep 2

# Test 2: High risk order (requires approval)
echo "Test 2: Submitting high-risk order..."
RESPONSE2=$(curl -s -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"name": "Expensive Item", "price": 500, "quantity": 3},
      {"name": "Another Item", "price": 200, "quantity": 5}
    ],
    "customerEmail": "highvalue@example.com",
    "total": 2500
  }')

ORDER_ID_2=$(echo $RESPONSE2 | grep -o '"orderId":"[^"]*"' | cut -d'"' -f4)
echo "✅ Order submitted: $ORDER_ID_2"
echo "   Expected: Requires human approval (high risk)"
echo ""

sleep 3

echo "Test 3: Approving the high-risk order via webhook..."
curl -s -X POST "http://localhost:3000/webhooks/orders/$ORDER_ID_2/approve" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "approvedBy": "manager@company.com",
    "notes": "Verified customer identity and payment method"
  }' | jq

echo ""
echo "✅ Approval webhook called"
echo ""

sleep 2

echo "📊 Final Status:"
echo "================"
echo ""
echo "🔍 Check Workbench at http://localhost:3000 to see the flow"
echo ""
echo "🎯 What happened:"
echo "  1. Order 1 (low risk) → Auto-approved → Completed"
echo "  2. Order 2 (high risk) → Awaited approval → Approved via webhook → Completed"
echo ""
echo "💡 Try rejecting an order:"
echo "   curl -X POST http://localhost:3000/webhooks/orders/{ORDER_ID}/approve \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"approved\": false, \"approvedBy\": \"manager\", \"notes\": \"Suspicious activity\"}'"
echo ""

