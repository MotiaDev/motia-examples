#!/bin/bash

# Install uv if not already installed
if ! command -v uv &> /dev/null; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    uv venv
fi

# Install dependencies using uv
uv pip install -e . 