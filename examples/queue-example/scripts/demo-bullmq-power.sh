#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# 🚀 MOTIA + BULLMQ QUEUE SYSTEM DEMO
# ═══════════════════════════════════════════════════════════════════════════════
# This script demonstrates the production-ready queue capabilities of Motia
# with the BullMQ adapter. Watch your terminal AND Workbench for live updates!
# ═══════════════════════════════════════════════════════════════════════════════

BASE_URL="${BASE_URL:-http://localhost:3000}"
DELAY=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}▶ $1${NC}"
}

print_info() {
    echo -e "${BLUE}  ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}  ⚠️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

print_error() {
    echo -e "${RED}  ❌ $1${NC}"
}

wait_for_user() {
    echo ""
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read
}

# ═══════════════════════════════════════════════════════════════════════════════
# INTRODUCTION
# ═══════════════════════════════════════════════════════════════════════════════

clear
print_header "🚀 MOTIA + BULLMQ: PRODUCTION-READY QUEUE SYSTEM DEMO"

echo -e "${CYAN}Welcome to the Motia Queue System Demonstration!${NC}"
echo ""
echo "This demo showcases why Motia's BullMQ adapter is essential for"
echo "production systems that need to scale beyond simple prototypes."
echo ""
echo -e "${YELLOW}What you'll see:${NC}"
echo "  1. 📥 Simple Queue Processing - Basic event handling"
echo "  2. 🔗 Event Chaining - Multi-step workflow processing"
echo "  3. 🔀 Parallel Processing - Concurrent job execution"
echo "  4. 🔄 Retry Mechanisms - Automatic failure recovery"
echo "  5. ☠️  Dead Letter Queue - Handling unrecoverable failures"
echo "  6. 🏥 DLQ Recovery - Manual intervention and retry"
echo ""
echo -e "${PURPLE}Why this matters for production:${NC}"
echo "  • Prototypes don't handle failures - production must"
echo "  • API calls can timeout, webhooks can fail"
echo "  • You need visibility into what's happening"
echo "  • Manual recovery options are critical"
echo ""

wait_for_user

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Clear Previous Test Results
# ═══════════════════════════════════════════════════════════════════════════════

print_header "🧹 STEP 1: Clearing Previous Test Results"

print_info "First, let's clear any existing test results for a fresh demo."
echo ""

response=$(curl -s -X DELETE "$BASE_URL/queue-tests/results")
echo "$response" | jq . 2>/dev/null || echo "$response"

print_success "Test results cleared!"
sleep 2

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Simple Queue Processing
# ═══════════════════════════════════════════════════════════════════════════════

print_header "📥 STEP 2: Simple Queue Processing"

echo "The most basic queue operation - emit an event and process it."
echo ""
echo -e "${CYAN}What happens:${NC}"
echo "  1. API receives request → emits 'queue-test.simple' event"
echo "  2. BullMQ queues the job"
echo "  3. SimpleQueueTest handler processes it"
echo "  4. Emits completion event"
echo ""
print_info "This is what most people start with - but production needs more..."
echo ""

print_step "Triggering simple queue test..."
response=$(curl -s -X POST "$BASE_URL/queue-tests/trigger" \
  -H "Content-Type: application/json" \
  -d '{"testType": "simple"}')
echo "$response" | jq . 2>/dev/null || echo "$response"

print_success "Event emitted! Check Workbench logs to see it process."
sleep $DELAY

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: Event Chaining (Multi-step Workflows)
# ═══════════════════════════════════════════════════════════════════════════════

print_header "🔗 STEP 3: Event Chaining - Multi-Step Workflows"

echo "Real workflows have multiple steps. Motia chains them automatically."
echo ""
echo -e "${CYAN}The chain:${NC}"
echo "  API → chain-start → chain-middle → chain-end"
echo ""
echo -e "${YELLOW}Why this matters:${NC}"
echo "  • Each step can have its own retry policy"
echo "  • Failures are isolated to the failed step"
echo "  • You can resume from any point in the chain"
echo ""

print_step "Triggering chain queue test (3 steps)..."
response=$(curl -s -X POST "$BASE_URL/queue-tests/trigger" \
  -H "Content-Type: application/json" \
  -d '{"testType": "chain"}')
echo "$response" | jq . 2>/dev/null || echo "$response"

print_success "Chain started! Watch Workbench to see events flow through all 3 steps."
sleep $DELAY

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: Parallel Processing
# ═══════════════════════════════════════════════════════════════════════════════

print_header "🔀 STEP 4: Parallel Processing - Concurrent Execution"

echo "Processing multiple jobs simultaneously is key to performance."
echo ""
echo -e "${CYAN}Configuration:${NC}"
cat << 'EOF'
  infrastructure: {
    queue: {
      concurrency: 5,  // Process 5 jobs at once
      maxRetries: 3,
    },
  }
EOF
echo ""
echo -e "${YELLOW}Why this matters:${NC}"
echo "  • Don't process 1000 emails one at a time"
echo "  • Balance throughput vs. resource usage"
echo "  • BullMQ handles the coordination"
echo ""

print_step "Triggering 5 parallel jobs..."
response=$(curl -s -X POST "$BASE_URL/queue-tests/trigger" \
  -H "Content-Type: application/json" \
  -d '{"testType": "parallel", "count": 5}')
echo "$response" | jq . 2>/dev/null || echo "$response"

print_success "5 parallel jobs queued! They'll process simultaneously."
sleep $DELAY

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: Retry Mechanism - Transient Failures
# ═══════════════════════════════════════════════════════════════════════════════

print_header "🔄 STEP 5: Retry Mechanism - Handling Transient Failures"

echo "THIS IS WHERE PRODUCTION DIFFERS FROM PROTOTYPES!"
echo ""
echo -e "${CYAN}Configuration:${NC}"
cat << 'EOF'
  infrastructure: {
    queue: {
      maxRetries: 3,           // Try 3 times
      retryDelay: 1000,        // Wait 1 second initially
      backoffMultiplier: 2,    // Exponential: 1s → 2s → 4s
      maxRetryDelay: 10000,    // Cap at 10 seconds
    },
  }
EOF
echo ""
echo -e "${YELLOW}Scenario: Job fails twice, then succeeds on attempt 3${NC}"
echo ""
echo "This simulates:"
echo "  • Temporary network issues"
echo "  • Rate limiting from external APIs"
echo "  • Database connection timeouts"
echo ""

print_step "Triggering error test (will fail 2 times, then succeed)..."
response=$(curl -s -X POST "$BASE_URL/queue-tests/trigger" \
  -H "Content-Type: application/json" \
  -d '{"testType": "error", "failureCount": 2}')
echo "$response" | jq . 2>/dev/null || echo "$response"

print_warning "Watch the logs! You'll see:"
echo "         💥 Attempt 1: FAIL (retry in 1s)"
echo "         💥 Attempt 2: FAIL (retry in 2s)"  
echo "         ✅ Attempt 3: SUCCESS (recovered!)"
echo ""
print_success "This is automatic recovery - no manual intervention needed!"
sleep 8

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: Dead Letter Queue - Permanent Failures
# ═══════════════════════════════════════════════════════════════════════════════

print_header "☠️  STEP 6: Dead Letter Queue - Permanent Failures"

echo "Some failures can't be retried. They need human attention."
echo ""
echo -e "${CYAN}Examples of permanent failures:${NC}"
echo "  • Invalid data that will never pass validation"
echo "  • Missing required configuration"
echo "  • External service permanently unavailable"
echo ""
echo -e "${YELLOW}What happens:${NC}"
echo "  1. Job is identified as permanently failed"
echo "  2. Routed to Dead Letter Queue (DLQ)"
echo "  3. Stored for review and manual action"
echo "  4. Alerts can be configured (Slack, PagerDuty, etc.)"
echo ""

print_step "Triggering permanent failure test..."
response=$(curl -s -X POST "$BASE_URL/queue-tests/trigger" \
  -H "Content-Type: application/json" \
  -d '{"testType": "error-permanent"}')
echo "$response" | jq . 2>/dev/null || echo "$response"

print_warning "This message will go DIRECTLY to the Dead Letter Queue!"
sleep $DELAY

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7: View Dead Letter Queue
# ═══════════════════════════════════════════════════════════════════════════════

print_header "📋 STEP 7: Viewing the Dead Letter Queue"

echo "In production, you need visibility into failed jobs."
echo ""

print_step "Fetching DLQ entries..."
response=$(curl -s "$BASE_URL/queue-tests/dlq")
echo "$response" | jq . 2>/dev/null || echo "$response"

echo ""
print_info "The DLQ shows:"
echo "        • Original topic and data"
echo "        • Failure reason"
echo "        • Attempt count"
echo "        • When it arrived"
echo "        • Whether it can be retried"

sleep 2

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 8: DLQ Recovery
# ═══════════════════════════════════════════════════════════════════════════════

print_header "🏥 STEP 8: DLQ Recovery - Manual Intervention"

echo "After fixing the root cause, you can retry DLQ entries."
echo ""
echo -e "${CYAN}Recovery options:${NC}"
echo "  • Retry with original data"
echo "  • Retry with modified data (fix the payload)"
echo "  • Discard if no longer relevant"
echo ""
echo -e "${YELLOW}Production workflow:${NC}"
echo "  1. Alert fires (Slack/PagerDuty)"
echo "  2. Engineer investigates"
echo "  3. Fixes root cause"
echo "  4. Retries via API or dashboard"
echo ""

print_info "Use POST /queue-tests/dlq/retry/:id to retry entries"
print_info "Use DELETE /queue-tests/dlq/:id to discard entries"

sleep 2

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 9: View All Test Results
# ═══════════════════════════════════════════════════════════════════════════════

print_header "📊 STEP 9: Viewing All Test Results"

print_step "Fetching all queue test results..."
response=$(curl -s "$BASE_URL/queue-tests/results")
echo "$response" | jq . 2>/dev/null || echo "$response"

sleep 2

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

print_header "🎯 DEMO COMPLETE - KEY TAKEAWAYS"

echo -e "${GREEN}What you just saw:${NC}"
echo ""
echo "  1. ✅ Simple event processing through queues"
echo "  2. ✅ Multi-step workflow chaining"
echo "  3. ✅ Parallel job processing with concurrency control"
echo "  4. ✅ Automatic retry with exponential backoff"
echo "  5. ✅ Dead Letter Queue for permanent failures"
echo "  6. ✅ Manual recovery options via API"
echo ""
echo -e "${YELLOW}Why this matters for production:${NC}"
echo ""
echo "  📌 Prototypes assume everything works - production knows it won't"
echo "  📌 Retry logic prevents 3am wakeup calls for transient issues"
echo "  📌 DLQ captures what can't be fixed automatically"
echo "  📌 Visibility into queue state enables debugging"
echo "  📌 Manual recovery means you can fix issues without reprocessing"
echo ""
echo -e "${PURPLE}Motia + BullMQ gives you enterprise-grade job processing${NC}"
echo -e "${PURPLE}without writing enterprise-grade boilerplate!${NC}"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "🔗 Learn more: https://motia.dev/docs"
echo "📺 View in Workbench: http://localhost:9090"
echo ""

