#!/bin/bash

# SMARAG Project Verification Script
# This script checks the status of all services

echo "🔍 Verifying SMARAG Project Services..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to check if a service is running on a port
check_port() {
    local port=$1
    local service_name=$2
    local url=$3
    
    if lsof -i :$port > /dev/null 2>&1; then
        print_success "$service_name is running on port $port"
        if [ ! -z "$url" ]; then
            if curl -s "$url" > /dev/null 2>&1; then
                print_success "$service_name is responding at $url"
            else
                print_warning "$service_name is running but not responding at $url"
            fi
        fi
        return 0
    else
        print_error "$service_name is not running on port $port"
        return 1
    fi
}

# Function to check Docker containers
check_docker_container() {
    local container_name=$1
    local service_name=$2
    
    if docker ps | grep -q "$container_name"; then
        print_success "$service_name container is running"
        return 0
    else
        print_error "$service_name container is not running"
        return 1
    fi
}

# Function to check process by name
check_process() {
    local process_name=$1
    local service_name=$2
    
    if pgrep -f "$process_name" > /dev/null 2>&1; then
        print_success "$service_name process is running"
        return 0
    else
        print_error "$service_name process is not running"
        return 1
    fi
}

echo ""
print_status "Checking Docker Services..."
echo "--------------------------------"

# Check Docker containers
check_docker_container "smarag-mongodb" "MongoDB"
check_docker_container "milvus-standalone" "Milvus"
check_docker_container "smarag-redis" "Redis"
check_docker_container "milvus-minio" "MinIO"
check_docker_container "milvus-etcd" "etcd"

echo ""
print_status "Checking Application Services..."
echo "-------------------------------------"

# Check Ollama
check_port 11434 "Ollama" "http://localhost:11434/api/tags"

# Check Backend
check_port 9092 "Backend" "http://localhost:9092/"

# Check Frontend
check_port 5173 "Frontend" "http://localhost:5173/"

# Check Milvus Attu
check_port 3000 "Milvus Attu" "http://localhost:3000/"

# Check Flower
check_port 5555 "Flower" "http://localhost:5555/"

echo ""
print_status "Checking Process Status..."
echo "-------------------------------"

# Check Celery workers
check_process "celery.*worker" "Celery Workers"

# Check uvicorn
check_process "uvicorn.*server.src.main:app" "Backend Server"

# Check npm/vite
check_process "vite" "Frontend Dev Server"

echo ""
print_status "Testing Service Connectivity..."
echo "------------------------------------"

# Test MongoDB connection
if curl -s -X POST http://localhost:9092/sign-up \
  -H "Content-Type: application/json" \
  -d '{"user_email": "test@example.com", "password": "testpass", "company_name": "Test Company"}' \
  > /dev/null 2>&1; then
    print_success "MongoDB connection test passed"
else
    print_error "MongoDB connection test failed"
fi

# Test WebSocket endpoint
if curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
  http://localhost:9092/sdmarag/v1/ws/plan_generate 2>/dev/null | grep -q "101 Switching Protocols"; then
    print_success "WebSocket endpoint test passed"
else
    print_error "WebSocket endpoint test failed"
fi

# Test Ollama API
if curl -s http://localhost:11434/api/tags | grep -q "llama3"; then
    print_success "Ollama API test passed (llama3 model available)"
else
    print_warning "Ollama API test failed or llama3 model not available"
fi

echo ""
print_status "Service Summary..."
echo "====================="

# Count running services
total_services=0
running_services=0

# Docker services
for container in "smarag-mongodb" "smarag-milvus" "smarag-redis" "smarag-minio" "smarag-etcd"; do
    total_services=$((total_services + 1))
    if docker ps | grep -q "$container"; then
        running_services=$((running_services + 1))
    fi
done

# Application services
for port in 11434 9092 5173 3000 5555; do
    total_services=$((total_services + 1))
    if lsof -i :$port > /dev/null 2>&1; then
        running_services=$((running_services + 1))
    fi
done

echo "Running services: $running_services/$total_services"

if [ $running_services -eq $total_services ]; then
    print_success "All services are running! 🎉"
    echo ""
    echo "🌐 Access URLs:"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend: http://localhost:9092"
    echo "  Milvus Attu: http://localhost:3000"
    echo "  Flower: http://localhost:5555"
    echo "  Ollama: http://localhost:11434"
else
    print_warning "Some services are not running. Check the output above for details."
    echo ""
    echo "💡 Troubleshooting tips:"
    echo "  - Run './start.sh' to start all services"
    echo "  - Check Docker: docker ps"
    echo "  - Check ports: lsof -i :PORT_NUMBER"
    echo "  - Check logs: docker logs CONTAINER_NAME"
fi

echo ""
echo "======================================"
