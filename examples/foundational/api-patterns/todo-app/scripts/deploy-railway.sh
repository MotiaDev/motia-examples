#!/bin/bash
set -e

echo "🚀 Motia Production Deployment to Railway"
echo "=========================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "📝 Please login to Railway..."
    railway login
fi

echo "✅ Logged in as: $(railway whoami)"

# Check if project exists
if ! railway status &> /dev/null; then
    echo "📦 Initializing new Railway project..."
    railway init
    
    echo "🔴 Adding Redis service..."
    railway add
    echo "⚠️  Select 'Redis' from the list above"
fi

# Set environment variables
echo "⚙️  Setting environment variables..."
railway variables set NODE_ENV=production USE_REDIS=true 2>/dev/null || true

# Deploy
echo "🚀 Deploying to Railway..."
railway up

# Get domain
echo "🌐 Generating public domain..."
railway domain 2>/dev/null || echo "Domain already exists or run 'railway domain' manually"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Run 'railway status' to see your deployment"
echo "   2. Run 'railway logs' to view logs"
echo "   3. Test: curl \$(railway domain)/todos"
