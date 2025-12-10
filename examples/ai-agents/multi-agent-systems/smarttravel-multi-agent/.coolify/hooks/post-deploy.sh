#!/bin/bash
# Post-deployment hook for SmartTravel on Coolify
# This script runs after successful deployment

set -e

echo "🎉 SmartTravel deployment completed successfully!"
echo "=================================="

# Get deployment info
DEPLOYMENT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
echo "Deployment time: $DEPLOYMENT_TIME"

# Health check
echo ""
echo "Running health check..."
sleep 5

if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo "✓ Application is healthy and responding"
else
    echo "⚠ Warning: Application not responding yet (may still be starting)"
fi

# Log deployment
echo "$DEPLOYMENT_TIME - SmartTravel deployed successfully" >> /var/log/smarttravel-deployments.log

echo ""
echo "✅ Post-deployment tasks completed"
echo "🌐 Application available at the configured domain"

