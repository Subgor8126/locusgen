# LocusGen Agents System Dockerfile - ARM64 for AgentCore
FROM --platform=linux/arm64 python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including Node.js
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Build Sketchfab MCP server
WORKDIR /app/tools/sketchfab-mcp-server
RUN npm install && npm run build

# Return to main working directory
WORKDIR /app

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash agent && \
    chown -R agent:agent /app
USER agent

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV LOCUSGEN_ENVIRONMENT=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "from main import get_orchestrator; print(get_orchestrator().get_health_status())"

# Expose port 8080 (required by AgentCore)
EXPOSE 8080

# Default command - run FastAPI server for AgentCore
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]