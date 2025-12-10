# AWS Lightsail Container Deployment Makefile

# Configuration variables - override these as needed
AWS_REGION ?= us-east-1
AWS_PROFILE ?= default
SERVICE_NAME ?= motia-docker-example
IMAGE_NAME ?= motia-docker-example
IMAGE_TAG ?= latest
CONTAINER_NAME ?= motia-docker-example
CONTAINER_PORT ?= 3000
PUBLIC_PORT ?= 80

# Docker image full name
FULL_IMAGE_NAME = $(IMAGE_NAME):$(IMAGE_TAG)

# AWS CLI command prefix with profile
AWS_CMD = aws --profile $(AWS_PROFILE)

# Help target
.PHONY: help
help:
	@echo "AWS Lightsail Container Deployment Commands:"
	@echo ""
	@echo "  make build              - Build Docker image"
	@echo "  make dev                - Build and run Docker container locally"
	@echo "  make push               - Push container image to Lightsail"
	@echo "  make deploy             - Deploy container service"
	@echo "  make full-deploy        - Build, push, and deploy in sequence"
	@echo "  make deploy-only        - Push and deploy (skip build, use existing image)"
	@echo "  make create-configs     - Create required JSON configuration files"
	@echo "  make clean-configs      - Remove JSON configuration files"
	@echo "  make troubleshoot       - Diagnose common deployment issues"
	@echo ""
	@echo "Configuration variables (override with make VAR=value):"
	@echo "  AWS_REGION=$(AWS_REGION)"
	@echo "  AWS_PROFILE=$(AWS_PROFILE)"
	@echo "  SERVICE_NAME=$(SERVICE_NAME)"
	@echo "  IMAGE_NAME=$(IMAGE_NAME)"
	@echo "  IMAGE_TAG=$(IMAGE_TAG)"
	@echo "  CONTAINER_NAME=$(CONTAINER_NAME)"
	@echo "  CONTAINER_PORT=$(CONTAINER_PORT)"
	@echo "  PUBLIC_PORT=$(PUBLIC_PORT)"

# Build Docker image
.PHONY: build
build:
	@echo "Building Docker image: $(FULL_IMAGE_NAME)"
	docker build -t $(FULL_IMAGE_NAME) .

# Create required JSON configuration files (basic version, will be updated by push)
.PHONY: create-configs
create-configs:
	@echo "Creating basic containers.json (will be updated after push)..."
	@echo '{' > containers.json
	@echo '  "$(CONTAINER_NAME)": {' >> containers.json
	@echo '    "image": ":$(SERVICE_NAME).$(IMAGE_NAME).$(IMAGE_TAG)",' >> containers.json
	@echo '    "ports": {' >> containers.json
	@echo '      "$(CONTAINER_PORT)": "HTTP"' >> containers.json
	@echo '    },' >> containers.json
	@echo '    "environment": {}' >> containers.json
	@echo '  }' >> containers.json
	@echo '}' >> containers.json
	@echo "Creating public-endpoint.json..."
	@echo '{' > public-endpoint.json
	@echo '  "containerName": "$(CONTAINER_NAME)",' >> public-endpoint.json
	@echo '  "containerPort": $(CONTAINER_PORT),' >> public-endpoint.json
	@echo '  "healthCheck": {' >> public-endpoint.json
	@echo '    "healthyThreshold": 2,' >> public-endpoint.json
	@echo '    "unhealthyThreshold": 2,' >> public-endpoint.json
	@echo '    "timeoutSeconds": 5,' >> public-endpoint.json
	@echo '    "intervalSeconds": 30,' >> public-endpoint.json
	@echo '    "path": "/",' >> public-endpoint.json
	@echo '    "successCodes": "200-499"' >> public-endpoint.json
	@echo '  }' >> public-endpoint.json
	@echo '}' >> public-endpoint.json
	@echo "Configuration files created successfully!"

# Run Docker container locally for development
.PHONY: dev
dev: build
	@echo "Running Docker container locally: $(CONTAINER_NAME) on port $(CONTAINER_PORT)"
	docker run -it --rm -p $(CONTAINER_PORT):$(CONTAINER_PORT) $(CONTAINER_NAME)

# Push container image to AWS Lightsail
.PHONY: push
push: create-configs create-service
	@echo "Pushing container image to AWS Lightsail..."
	@echo "Verifying Docker image exists: $(FULL_IMAGE_NAME)"
	@if ! docker image inspect $(FULL_IMAGE_NAME) >/dev/null 2>&1; then \
		echo "Error: Docker image $(FULL_IMAGE_NAME) not found. Please run 'make build' first."; \
		exit 1; \
	fi
	@echo "Docker image verified. Starting push to Lightsail..."
	@echo "Service: $(SERVICE_NAME), Region: $(AWS_REGION), Tag: $(IMAGE_TAG)"
	@echo "Capturing image reference from push output..."
	@PUSH_OUTPUT=$$($(AWS_CMD) lightsail push-container-image \
		--region $(AWS_REGION) \
		--service-name $(SERVICE_NAME) \
		--label $(IMAGE_TAG) \
		--image $(FULL_IMAGE_NAME) \
		--no-cli-pager); \
	echo "Push output: $$PUSH_OUTPUT"; \
	IMAGE_REF=$$(echo "$$PUSH_OUTPUT" | grep -o 'Refer to this image as "[^"]*"' | sed 's/Refer to this image as "//; s/"//'); \
	if [ -z "$$IMAGE_REF" ]; then \
		echo "Error: Failed to capture image reference from push output"; \
		exit 1; \
	fi; \
	echo "Captured image reference: $$IMAGE_REF"; \
	echo "Updating containers.json with actual image reference..."; \
	echo '{' > containers.json; \
	echo "  \"$(CONTAINER_NAME)\": {" >> containers.json; \
	echo "    \"image\": \"$$IMAGE_REF\"," >> containers.json; \
	echo "    \"ports\": {" >> containers.json; \
	echo "      \"$(CONTAINER_PORT)\": \"HTTP\"" >> containers.json; \
	echo "    }," >> containers.json; \
	echo "    \"environment\": {}" >> containers.json; \
	echo "  }" >> containers.json; \
	echo '}' >> containers.json; \
	echo "containers.json updated with image reference: $$IMAGE_REF"
	@echo "Verifying image was pushed successfully..."
	@if ! $(AWS_CMD) lightsail get-container-images --service-name $(SERVICE_NAME) --region $(AWS_REGION) --no-cli-pager | grep -q "$(IMAGE_TAG)"; then \
		echo "Error: Image push failed or image not found in registry"; \
		echo "Please check the push output above for errors"; \
		exit 1; \
	fi
	@echo "Image push verified successfully!"

# Deploy container service
.PHONY: deploy
deploy:
	@echo "Deploying container service..."
	@echo "Verifying image exists in Lightsail registry..."
	@if ! $(AWS_CMD) lightsail get-container-images --service-name $(SERVICE_NAME) --region $(AWS_REGION) --no-cli-pager | grep -q "$(IMAGE_TAG)"; then \
		echo "Error: Image with tag '$(IMAGE_TAG)' not found in registry"; \
		echo "Please run 'make push' first to upload the image"; \
		exit 1; \
	fi
	@echo "Image verified in registry. Proceeding with deployment..."
	$(AWS_CMD) lightsail create-container-service-deployment \
		--service-name $(SERVICE_NAME) \
		--containers file://containers.json \
		--public-endpoint file://public-endpoint.json \
		--region $(AWS_REGION) \
		--no-cli-pager
	@echo "Deployment completed successfully! Run 'make status' to check the status of the service."
	

# Full deployment pipeline
.PHONY: full-deploy
full-deploy: build create-service push deploy
	@echo "Full deployment completed!"

# Deploy without building (use existing image)
.PHONY: deploy-only
deploy-only: create-service push deploy
	@echo "Deployment completed using existing image!"

# Clean up configuration files
.PHONY: clean-configs
clean-configs:
	@echo "Removing configuration files..."
	@rm -f containers.json public-endpoint.json

# Check AWS CLI configuration
.PHONY: check-aws
check-aws:
	@echo "Checking AWS CLI configuration..."
	$(AWS_CMD) sts get-caller-identity --no-cli-pager
	$(AWS_CMD) lightsail get-regions --include-availability-zones --no-cli-pager

# Create Lightsail container service (if it doesn't exist)
.PHONY: create-service
create-service:
	@echo "Checking if Lightsail container service exists: $(SERVICE_NAME)"
	@if ! $(AWS_CMD) lightsail get-container-services --service-name $(SERVICE_NAME) --region $(AWS_REGION) >/dev/null 2>&1; then \
		echo "Creating Lightsail container service: $(SERVICE_NAME)"; \
		$(AWS_CMD) lightsail create-container-service \
			--service-name $(SERVICE_NAME) \
			--power nano \
			--scale 1 \
			--region $(AWS_REGION) \
			--no-cli-pager; \
		echo "Waiting for service to be ready..."; \
		while true; do \
			STATUS=$$($(AWS_CMD) lightsail get-container-services \
				--service-name $(SERVICE_NAME) \
				--query 'containerServices[0].state' \
				--output text \
				--region $(AWS_REGION) \
				--no-cli-pager); \
			if [ "$$STATUS" = "READY" ]; then \
				echo "Lightsail container service '$(SERVICE_NAME)' is READY!"; \
				break; \
			elif [ "$$STATUS" = "FAILED" ]; then \
				echo "Lightsail container service '$(SERVICE_NAME)' creation FAILED. Check logs for details."; \
				exit 1; \
			else \
				echo "Current status: $$STATUS. Waiting 10 seconds..."; \
				sleep 10; \
			fi; \
		done; \
		echo "Service is ready for use"; \
	else \
		echo "Container service $(SERVICE_NAME) already exists"; \
	fi

# Get service status
.PHONY: status
status:
	@echo "Getting service status for: $(SERVICE_NAME)"
	$(AWS_CMD) lightsail get-container-services \
		--service-name $(SERVICE_NAME) \
		--region $(AWS_REGION) \
		--no-cli-pager

# View service logs
.PHONY: logs
logs:
	@echo "Getting logs for service: $(SERVICE_NAME)"
	$(AWS_CMD) lightsail get-container-log \
		--service-name $(SERVICE_NAME) \
		--container-name $(CONTAINER_NAME) \
		--region $(AWS_REGION) \
		--no-cli-pager

# Delete the service (use with caution)
.PHONY: delete-service
delete-service:
	@echo "WARNING: This will delete the service $(SERVICE_NAME)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(AWS_CMD) lightsail delete-container-service \
			--service-name $(SERVICE_NAME) \
			--region $(AWS_REGION); \
	fi

# Troubleshoot common deployment issues
.PHONY: troubleshoot
troubleshoot:
	@echo "=== Troubleshooting AWS Lightsail Deployment ==="
	@echo ""
	@echo "1. Checking Docker installation and images..."
	@docker --version || echo "ERROR: Docker not installed or not running"
	@echo "Available Docker images:"
	@docker images | grep -E "(REPOSITORY|$(IMAGE_NAME))" || echo "No matching images found"
	@echo ""
	@echo "2. Checking AWS CLI configuration..."
	@$(AWS_CMD) --version || echo "ERROR: AWS CLI not installed"
	@echo "Current AWS identity:"
	@$(AWS_CMD) sts get-caller-identity --no-cli-pager || echo "ERROR: AWS credentials not configured"
	@echo ""
	@echo "3. Checking Lightsail service status..."
	@echo "Service: $(SERVICE_NAME), Region: $(AWS_REGION)"
	@$(AWS_CMD) lightsail get-container-services --service-name $(SERVICE_NAME) --region $(AWS_REGION) --no-cli-pager | grep -E "(serviceName|state)" || echo "Service not found or not accessible"
	@echo ""
	@echo "4. Configuration summary:"
	@echo "  IMAGE_NAME: $(IMAGE_NAME)"
	@echo "  IMAGE_TAG: $(IMAGE_TAG)"
	@echo "  FULL_IMAGE_NAME: $(FULL_IMAGE_NAME)"
	@echo "  SERVICE_NAME: $(SERVICE_NAME)"
	@echo "  AWS_REGION: $(AWS_REGION)"
	@echo "  AWS_PROFILE: $(AWS_PROFILE)"
	@echo ""
	@echo "If issues persist, try:"
	@echo "  - make build (to ensure Docker image exists)"
	@echo "  - make create-service (to ensure Lightsail service exists)"
	@echo "  - Check AWS credentials: aws sts get-caller-identity"
