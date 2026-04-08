#!/bin/bash

# SMARAG Project Startup Script
# This script starts all required services for the SMARAG project

set -e  # Exit on any error

echo "🚀 Starting SMARAG Project..."
echo "=================================="

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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    print_error "Poetry is not installed. Please install Poetry first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    print_warning "Ollama is not installed. Please install Ollama first."
    exit 1
fi

print_status "Starting Docker services..."
# Stop and remove existing containers to avoid conflicts
docker-compose -f docker-compose-sdmarag.yaml down 2>/dev/null || true
docker-compose -f docker-compose-sdmarag.yaml up -d

# Wait for services to be ready
print_status "Waiting for Docker services to be ready..."
sleep 15

# Check if Docker services are running
if ! docker ps | grep -q "smarag-mongodb"; then
    print_error "MongoDB container failed to start"
    exit 1
fi

if ! docker ps | grep -q "milvus-standalone"; then
    print_error "Milvus container failed to start"
    exit 1
fi

print_success "Docker services started successfully"

# Start Ollama
print_status "Starting Ollama..."
ollama serve &
OLLAMA_PID=$!
sleep 5

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    print_error "Ollama failed to start"
    exit 1
fi

print_success "Ollama started successfully"

# Set environment variables
export APP_ENV=local
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES

# Start Backend
print_status "Starting Backend..."
poetry run uvicorn server.src.main:app --host 0.0.0.0 --port 9092 --workers 1 --timeout-keep-alive 1000000 &
BACKEND_PID=$!
sleep 10

# Check if backend is running
if ! curl -s http://localhost:9092/ > /dev/null 2>&1; then
    print_error "Backend failed to start"
    exit 1
fi

print_success "Backend started successfully"

# Start Celery
print_status "Starting Celery workers..."
poetry run celery -A server.src.main.celery_app worker -l info --pool=threads &
CELERY_PID=$!
sleep 5

print_success "Celery workers started successfully"

# Start Frontend
print_status "Starting Frontend..."
cd client && npm run dev &
FRONTEND_PID=$!
cd ..
sleep 5

# Check if frontend is running
if ! curl -s http://localhost:5173/ > /dev/null 2>&1; then
    print_error "Frontend failed to start"
    exit 1
fi

print_success "Frontend started successfully"

# Create .pids directory if it doesn't exist
mkdir -p .pids

# Save PIDs to file for stop script
echo "$OLLAMA_PID" > .pids/ollama.pid
echo "$BACKEND_PID" > .pids/backend.pid
echo "$CELERY_PID" > .pids/celery.pid
echo "$FRONTEND_PID" > .pids/frontend.pid

print_success "All services started successfully!"
echo "=================================="
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:9092"
echo "📊 Milvus Attu: http://localhost:3000"
echo "🌸 Flower: http://localhost:5555"
echo "🤖 Ollama: http://localhost:11434"
echo "=================================="
echo "Use './stop.sh' to stop all services"
echo "Use './verify.sh' to check service status"