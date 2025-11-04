#!/bin/bash
# SmartTravel - Coolify Deployment Helper Script

set -e

echo "🚀 SmartTravel Coolify Deployment Helper"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found!"
    print_info "Creating .env from .env.example..."
    
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success ".env file created"
        print_warning "Please edit .env and add your OPENAI_API_KEY before deploying!"
        echo ""
        print_info "Run: nano .env"
        echo ""
        exit 1
    else
        print_error ".env.example not found!"
        exit 1
    fi
fi

# Check if OPENAI_API_KEY is set
source .env
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-your-openai-api-key-here" ]; then
    print_error "OPENAI_API_KEY is not set in .env file!"
    print_info "Please edit .env and add your OpenAI API key"
    echo ""
    print_info "Run: nano .env"
    echo ""
    exit 1
fi

print_success "Environment configuration validated"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    print_info "Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

print_success "Docker is installed"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed!"
    print_info "Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

print_success "Docker Compose is installed"
echo ""

# Deployment options
echo "Select deployment option:"
echo "1) Local test deployment (docker-compose)"
echo "2) Build Docker image only"
echo "3) Validate Coolify configuration"
echo "4) Show Coolify deployment instructions"
echo ""
read -p "Enter option (1-4): " option

case $option in
    1)
        print_info "Starting local deployment with docker-compose..."
        echo ""
        
        # Build and start containers
        docker-compose build
        docker-compose up -d
        
        print_success "Containers started!"
        echo ""
        print_info "Application is starting..."
        print_info "This may take 30-60 seconds"
        echo ""
        
        # Wait for health check
        print_info "Waiting for application to be ready..."
        sleep 10
        
        for i in {1..12}; do
            if curl -s http://localhost:3000 > /dev/null 2>&1; then
                print_success "Application is ready!"
                echo ""
                print_success "🎉 SmartTravel is running at: http://localhost:3000"
                echo ""
                print_info "View logs: docker-compose logs -f"
                print_info "Stop application: docker-compose down"
                exit 0
            fi
            echo -n "."
            sleep 5
        done
        
        print_warning "Application is taking longer than expected to start"
        print_info "Check logs: docker-compose logs -f smarttravel"
        ;;
        
    2)
        print_info "Building Docker image..."
        echo ""
        docker build -f Dockerfile.coolify -t smarttravel:latest .
        print_success "Docker image built successfully!"
        echo ""
        print_info "Image: smarttravel:latest"
        print_info "Run with: docker run -p 3000:3000 -e OPENAI_API_KEY=your_key smarttravel:latest"
        ;;
        
    3)
        print_info "Validating Coolify configuration..."
        echo ""
        
        # Check required files
        files=("docker-compose.yml" "Dockerfile.coolify" ".dockerignore" ".coolify/config.json")
        for file in "${files[@]}"; do
            if [ -f "$file" ]; then
                print_success "$file exists"
            else
                print_error "$file not found!"
            fi
        done
        
        echo ""
        print_info "Checking docker-compose.yml syntax..."
        if docker-compose config > /dev/null 2>&1; then
            print_success "docker-compose.yml is valid"
        else
            print_error "docker-compose.yml has syntax errors"
            docker-compose config
        fi
        
        echo ""
        print_success "Configuration validation complete!"
        ;;
        
    4)
        echo ""
        print_info "=== Coolify Deployment Instructions ==="
        echo ""
        echo "1. Install Coolify on your server:"
        echo "   ${BLUE}curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash${NC}"
        echo ""
        echo "2. Access Coolify dashboard:"
        echo "   ${BLUE}http://your-server-ip:8000${NC}"
        echo ""
        echo "3. In Coolify dashboard:"
        echo "   • Click '+ New' → 'Application'"
        echo "   • Connect your Git repository"
        echo "   • Coolify will auto-detect docker-compose.yml"
        echo ""
        echo "4. Set environment variables:"
        echo "   • OPENAI_API_KEY = ${YELLOW}your_actual_api_key${NC}"
        echo "   • PORT = 3000"
        echo "   • NODE_ENV = production"
        echo ""
        echo "5. Click 'Deploy' and wait for deployment to complete!"
        echo ""
        print_success "📖 Full guide: COOLIFY_DEPLOYMENT.md"
        echo ""
        ;;
        
    *)
        print_error "Invalid option!"
        exit 1
        ;;
esac

