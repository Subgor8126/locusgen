#!/bin/bash

# EC2 User Data Script for ARM64 Container Debugging
# For Ubuntu on a1.xlarge instance

set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install essential packages
apt-get install -y \
    curl \
    wget \
    unzip \
    jq \
    htop \
    vim \
    git \
    python3 \
    python3-pip \
    awscli

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create debugging directory
mkdir -p /home/ubuntu/debug
chown ubuntu:ubuntu /home/ubuntu/debug

# Create helper scripts
cat > /home/ubuntu/debug/pull-and-run.sh << 'EOF'
#!/bin/bash

# Configuration
ECR_REGISTRY="975050380826.dkr.ecr.us-east-1.amazonaws.com"
REPOSITORY="locusgen-dev-agents"
IMAGE_TAG="latest"
CONTAINER_NAME="locusgen-debug"

echo "=== LocusGen Container Debug Script ==="
echo "Registry: $ECR_REGISTRY"
echo "Repository: $REPOSITORY"
echo "Tag: $IMAGE_TAG"
echo

# Login to ECR
echo "1. Logging into ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY

# Pull the image
echo "2. Pulling image..."
docker pull $ECR_REGISTRY/$REPOSITORY:$IMAGE_TAG

# Stop and remove existing container if it exists
echo "3. Cleaning up existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Run the container with debugging
echo "4. Running container with debugging..."
docker run -d \
    --name $CONTAINER_NAME \
    -p 8080:8080 \
    -e LOCUSGEN_DEBUG_MODE=true \
    -e LOCUSGEN_ENVIRONMENT=debug \
    -e AWS_REGION=us-east-1 \
    -e PYTHONUNBUFFERED=1 \
    $ECR_REGISTRY/$REPOSITORY:$IMAGE_TAG

echo "5. Container started! Waiting 5 seconds for startup..."
sleep 5

echo "6. Container status:"
docker ps | grep $CONTAINER_NAME || echo "Container not running!"

echo "7. Container logs:"
docker logs $CONTAINER_NAME

echo
echo "=== Debug Commands ==="
echo "View logs: docker logs -f $CONTAINER_NAME"
echo "Enter container: docker exec -it $CONTAINER_NAME /bin/bash"
echo "Test endpoint: curl http://localhost:8080/"
echo "Test invocations: curl -X POST http://localhost:8080/invocations -H 'Content-Type: application/json' -d '{\"input\":{\"prompt\":\"hello\"}}'"
echo "Stop container: docker stop $CONTAINER_NAME"
EOF

cat > /home/ubuntu/debug/test-endpoints.sh << 'EOF'
#!/bin/bash

CONTAINER_NAME="locusgen-debug"

echo "=== Testing Container Endpoints ==="

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "❌ Container $CONTAINER_NAME is not running!"
    echo "Run ./pull-and-run.sh first"
    exit 1
fi

echo "✅ Container is running"
echo

# Test root endpoint
echo "1. Testing root endpoint (GET /)..."
curl -s http://localhost:8080/ | jq . || echo "Failed to connect or parse JSON"
echo

# Test ping endpoint
echo "2. Testing ping endpoint (GET /ping)..."
curl -s http://localhost:8080/ping | jq . || echo "Failed to connect or parse JSON"
echo

# Test invocations endpoint with minimal payload
echo "3. Testing invocations endpoint (POST /invocations)..."
curl -s -X POST http://localhost:8080/invocations \
    -H "Content-Type: application/json" \
    -d '{"input":{"prompt":"hello world"}}' | jq . || echo "Failed to connect or parse JSON"
echo

# Test with different payload format
echo "4. Testing with direct prompt format..."
curl -s -X POST http://localhost:8080/invocations \
    -H "Content-Type: application/json" \
    -d '{"prompt":"hello world"}' | jq . || echo "Failed to connect or parse JSON"
echo

echo "=== Container Logs (last 20 lines) ==="
docker logs --tail 20 $CONTAINER_NAME
EOF

cat > /home/ubuntu/debug/inspect-container.sh << 'EOF'
#!/bin/bash

CONTAINER_NAME="locusgen-debug"

echo "=== Container Inspection ==="

# Check if container exists
if ! docker ps -a | grep -q $CONTAINER_NAME; then
    echo "❌ Container $CONTAINER_NAME does not exist!"
    echo "Run ./pull-and-run.sh first"
    exit 1
fi

echo "1. Container Status:"
docker ps -a | grep $CONTAINER_NAME

echo
echo "2. Container Details:"
docker inspect $CONTAINER_NAME | jq '.[] | {State, Config: {Env, ExposedPorts, Cmd}, NetworkSettings: {Ports}}'

echo
echo "3. Container Processes:"
docker exec $CONTAINER_NAME ps aux 2>/dev/null || echo "Container not running or no ps command"

echo
echo "4. Container Environment:"
docker exec $CONTAINER_NAME env 2>/dev/null | sort || echo "Container not running"

echo
echo "5. Container Port Check:"
docker exec $CONTAINER_NAME netstat -tlnp 2>/dev/null | grep :8080 || echo "Port 8080 not listening or netstat not available"

echo
echo "6. Python Process Check:"
docker exec $CONTAINER_NAME pgrep -f python 2>/dev/null || echo "No Python processes found"

echo
echo "7. FastAPI/Uvicorn Process Check:"
docker exec $CONTAINER_NAME pgrep -f uvicorn 2>/dev/null || echo "No Uvicorn processes found"
EOF

# Make scripts executable
chmod +x /home/ubuntu/debug/*.sh
chown ubuntu:ubuntu /home/ubuntu/debug/*.sh

# Create a simple test script for manual debugging
cat > /home/ubuntu/debug/manual-debug.sh << 'EOF'
#!/bin/bash

echo "=== Manual Debug Session ==="
echo "This will start an interactive session inside the container"
echo

CONTAINER_NAME="locusgen-debug"

if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "❌ Container $CONTAINER_NAME is not running!"
    echo "Run ./pull-and-run.sh first"
    exit 1
fi

echo "Starting interactive session..."
echo "Inside the container, you can:"
echo "  - Check logs: tail -f /var/log/* (if any)"
echo "  - Test Python: python3 -c 'import main; print(main.get_orchestrator().get_health_status())'"
echo "  - Check processes: ps aux"
echo "  - Check ports: netstat -tlnp"
echo "  - Exit with: exit"
echo

docker exec -it $CONTAINER_NAME /bin/bash
EOF

chmod +x /home/ubuntu/debug/manual-debug.sh
chown ubuntu:ubuntu /home/ubuntu/debug/manual-debug.sh

# Create a README
cat > /home/ubuntu/debug/README.md << 'EOF'
# LocusGen Container Debug Environment

This EC2 instance is set up to debug the LocusGen agents container.

## Quick Start

1. **Pull and run the container:**
   ```bash
   cd ~/debug
   ./pull-and-run.sh
   ```

2. **Test the endpoints:**
   ```bash
   ./test-endpoints.sh
   ```

3. **Inspect the container:**
   ```bash
   ./inspect-container.sh
   ```

4. **Manual debugging:**
   ```bash
   ./manual-debug.sh
   ```

## Manual Commands

- **View container logs:** `docker logs -f locusgen-debug`
- **Enter container:** `docker exec -it locusgen-debug /bin/bash`
- **Stop container:** `docker stop locusgen-debug`
- **Remove container:** `docker rm locusgen-debug`

## Troubleshooting

If the container fails to start:
1. Check logs: `docker logs locusgen-debug`
2. Try running interactively: `docker run -it --rm -p 8080:8080 975050380826.dkr.ecr.us-east-1.amazonaws.com/locusgen-dev-agents:latest /bin/bash`
3. Inside container, manually start: `uvicorn main:app --host 0.0.0.0 --port 8080`

## Expected Behavior

- Container should start and listen on port 8080
- GET / should return service info
- GET /ping should return health status
- POST /invocations should process agent requests
EOF

chown ubuntu:ubuntu /home/ubuntu/debug/README.md

# Set up AWS CLI for ubuntu user (if credentials are available via IAM role)
sudo -u ubuntu aws configure set region us-east-1

# Final setup message
cat > /home/ubuntu/debug/SETUP_COMPLETE << 'EOF'
EC2 Debug Environment Setup Complete!

Next steps:
1. SSH into the instance as ubuntu user
2. cd ~/debug
3. Read README.md for instructions
4. Run ./pull-and-run.sh to start debugging

The instance has:
- Docker installed and configured
- AWS CLI configured for us-east-1
- Debug scripts ready to use
- All tools needed for container debugging
EOF

echo "User data script completed successfully!" > /var/log/userdata.log