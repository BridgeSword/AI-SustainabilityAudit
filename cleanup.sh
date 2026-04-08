#!/bin/bash

# SMARAG Project Cleanup Script
# This script forcefully cleans up any remaining containers and processes

echo "🧹 SMARAG Project Cleanup"
echo "========================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Force stop all Docker containers
print_status "Force stopping all Docker containers..."
docker-compose -f docker-compose-sdmarag.yaml down --remove-orphans 2>/dev/null || true

# Force remove containers with smarag prefix
print_status "Force removing smarag containers..."
docker ps -a --filter "name=smarag-" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true

# Force remove containers with milvus prefix
print_status "Force removing milvus containers..."
docker ps -a --filter "name=milvus-" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true

# Kill processes on specific ports
print_status "Killing processes on SMARAG ports..."
for port in 11434 9092 5173 3000 5555 27017 19530 6379 9000 2379; do
    if lsof -ti:$port > /dev/null 2>&1; then
        print_status "Killing process on port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

# Kill specific processes
print_status "Killing SMARAG-related processes..."
pkill -f "uvicorn.*server.src.main:app" 2>/dev/null || true
pkill -f "celery.*worker" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "ollama serve" 2>/dev/null || true

# Clean up PID files
print_status "Cleaning up PID files..."
rm -rf .pids 2>/dev/null || true

# Clean up Docker networks and volumes (optional)
read -p "Do you want to remove Docker networks and volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Removing Docker networks..."
    docker network prune -f 2>/dev/null || true
    
    print_status "Removing Docker volumes..."
    docker volume prune -f 2>/dev/null || true
fi

print_success "Cleanup completed!"
echo ""
echo "💡 You can now run './start.sh' to start fresh"
