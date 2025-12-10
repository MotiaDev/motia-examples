# Multi-stage build for RAG Docling Vector Agent (ChromaDB)
FROM node:22-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY requirements.txt ./

# Install Node.js dependencies 
RUN npm install --omit=dev

# Create symlink for python command (required by some tools)
RUN ln -s /usr/bin/python3 /usr/bin/python

# Create Python virtual environment and install Python dependencies
RUN python3 -m venv python_modules && \
    /bin/bash -c "source python_modules/bin/activate && pip install --no-cache-dir -r requirements.txt"

# Copy source code
COPY . .

# Generate types and build the application (with Python environment activated)
RUN /bin/bash -c "source python_modules/bin/activate && npx motia generate-types"
RUN /bin/bash -c "source python_modules/bin/activate && npx motia build"

# Production stage
FROM node:22-slim AS production

# Install system dependencies for production
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python command (required by some tools)
RUN ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Copy built application from base stage
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/python_modules ./python_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/package*.json ./
COPY --from=base /app/requirements.txt ./
COPY --from=base /app/motia-workbench.json ./
COPY --from=base /app/tsconfig.json ./
COPY --from=base /app/types ./types
COPY --from=base /app/utils ./utils
COPY --from=base /app/steps ./steps
COPY --from=base /app/docs ./docs

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -m appuser
RUN chown -R appuser:appuser /app

# Create and set permissions for Hugging Face cache directory
RUN mkdir -p /app/.cache/huggingface && chown -R appuser:appuser /app/.cache

# Set Hugging Face environment variables to use our cache directory
ENV HF_HOME=/app/.cache/huggingface
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
ENV HF_HUB_CACHE=/app/.cache/huggingface

USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["/bin/bash", "-c", "source python_modules/bin/activate && npm start"]
