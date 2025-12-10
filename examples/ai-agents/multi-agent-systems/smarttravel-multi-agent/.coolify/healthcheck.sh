#!/bin/sh
# Health check script for SmartTravel Multi-Agent System

# Check if the application is responding
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")

if [ "$response" = "200" ] || [ "$response" = "301" ] || [ "$response" = "302" ]; then
    echo "Health check passed: HTTP $response"
    exit 0
else
    echo "Health check failed: HTTP $response"
    exit 1
fi

