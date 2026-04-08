#!/bin/bash

# SMARAG Project Stop Script
# This script stops all services for the SMARAG project

echo "🛑 Stopping SMARAG Project Services..."
echo "====================================="

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

# Function to stop process by PID
stop_process() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            print_status "Stopping $service_name (PID: $pid)..."
            kill "$pid"
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                print_warning "Force killing $service_name..."
                kill -9 "$pid"
            fi
            print_success "$service_name stopped"
        else
            print_warning "$service_name was not running"
        fi
        rm -f "$pid_file"
    else
        print_warning "PID file for $service_name not found"
    fi
}

# Function to stop processes by name
stop_process_by_name() {
    local process_pattern=$1
    local service_name=$2
    
    local pids=$(pgrep -f "$process_pattern" 2>/dev/null)
    if [ ! -z "$pids" ]; then
        print_status "Stopping $service_name processes..."
        echo "$pids" | xargs kill
        sleep 2
        # Force kill if still running
        local remaining_pids=$(pgrep -f "$process_pattern" 2>/dev/null)
        if [ ! -z "$remaining_pids" ]; then
            print_warning "Force killing remaining $service_name processes..."
            echo "$remaining_pids" | xargs kill -9
        fi
        print_success "$service_name processes stopped"
    else
        print_warning "$service_name processes were not running"
    fi
}

# Stop services using PID files
print_status "Stopping services using PID files..."
if [ -d ".pids" ]; then
    stop_process ".pids/frontend.pid" "Frontend"
    stop_process ".pids/backend.pid" "Backend"
    stop_process ".pids/celery.pid" "Celery"
    stop_process ".pids/ollama.pid" "Ollama"
else
    print_warning "No .pids directory found, stopping by process name..."
fi

# Stop processes by name (fallback)
print_status "Stopping processes by name..."
stop_process_by_name "vite" "Frontend Dev Server"
stop_process_by_name "uvicorn.*server.src.main:app" "Backend Server"
stop_process_by_name "celery.*worker" "Celery Workers"
stop_process_by_name "ollama serve" "Ollama"

# Stop Docker services
print_status "Stopping Docker services..."
if docker-compose -f docker-compose-sdmarag.yaml ps | grep -q "Up"; then
    docker-compose -f docker-compose-sdmarag.yaml down
    print_success "Docker services stopped"
else
    print_warning "Docker services were not running"
fi

# Force remove any remaining containers with smarag prefix
print_status "Cleaning up any remaining containers..."
docker ps -a --filter "name=smarag-" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true

# Clean up PID files
if [ -d ".pids" ]; then
    rm -rf .pids
    print_success "Cleaned up PID files"
fi

# Verify all services are stopped
echo ""
print_status "Verifying all services are stopped..."

# Check if any services are still running
services_still_running=false

# Check ports
for port in 11434 9092 5173 3000 5555; do
    if lsof -i :$port > /dev/null 2>&1; then
        print_warning "Service still running on port $port"
        services_still_running=true
    fi
done

# Check Docker containers
if docker ps | grep -q "smarag-"; then
    print_warning "Some Docker containers are still running"
    services_still_running=true
fi

# Check processes
if pgrep -f "uvicorn.*server.src.main:app" > /dev/null 2>&1; then
    print_warning "Backend process still running"
    services_still_running=true
fi

if pgrep -f "celery.*worker" > /dev/null 2>&1; then
    print_warning "Celery process still running"
    services_still_running=true
fi

if pgrep -f "vite" > /dev/null 2>&1; then
    print_warning "Frontend process still running"
    services_still_running=true
fi

if pgrep -f "ollama serve" > /dev/null 2>&1; then
    print_warning "Ollama process still running"
    services_still_running=true
fi

if [ "$services_still_running" = false ]; then
    print_success "All services have been stopped successfully! 🎉"
else
    print_warning "Some services may still be running. You may need to stop them manually."
    echo ""
    echo "💡 Manual cleanup commands:"
    echo "  - Kill processes on specific ports: lsof -ti:PORT | xargs kill -9"
    echo "  - Stop Docker containers: docker-compose -f docker-compose-sdmarag.yaml down"
    echo "  - Kill all Python processes: pkill -f python"
    echo "  - Kill all Node processes: pkill -f node"
fi

echo ""
echo "====================================="
echo "Use './start.sh' to start all services again"
echo "Use './verify.sh' to check service status"
