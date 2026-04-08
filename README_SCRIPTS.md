# SMARAG Project Scripts Guide

This directory contains several scripts to help you manage the SMARAG project easily.

## 📋 Available Scripts

### 🚀 `start.sh` - Complete Startup
Starts all services for the SMARAG project from scratch.

**Usage:**
```bash
./start.sh
```

**What it does:**
- Checks prerequisites (Docker, Poetry, Node.js, Ollama)
- Starts Docker services (MongoDB, Milvus, Redis, MinIO, etcd)
- Starts Ollama server
- Starts Backend (FastAPI with uvicorn)
- Starts Celery workers
- Starts Frontend (React with Vite)
- Verifies all services are running
- Saves process IDs for easy stopping

### ⚡ `quick_start.sh` - Fast Startup
Quick start for returning users who have already set up the project.

**Usage:**
```bash
./quick_start.sh
```

**What it does:**
- Checks if services are already running
- If not running, calls `start.sh` to start everything
- Provides quick access URLs

### 🔍 `verify.sh` - Service Verification
Comprehensive verification of all services and their connectivity.

**Usage:**
```bash
./verify.sh
```

**What it checks:**
- Docker containers status
- Application services on ports
- Process status
- Service connectivity tests
- MongoDB connection test
- WebSocket endpoint test
- Ollama API test

### 🛑 `stop.sh` - Complete Shutdown
Stops all services and cleans up.

**Usage:**
```bash
./stop.sh
```

**What it does:**
- Stops all application processes
- Stops Docker services
- Cleans up PID files
- Verifies all services are stopped
- Provides manual cleanup commands if needed

## 🎯 Quick Commands

### For First-Time Users:
```bash
./start.sh
```

### For Returning Users:
```bash
./quick_start.sh
```

### Check Status:
```bash
./verify.sh
```

### Stop Everything:
```bash
./stop.sh
```

## 🌐 Service URLs

When all services are running, you can access:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:9092
- **Milvus Attu (Vector DB UI)**: http://localhost:3000
- **Flower (Celery Monitor)**: http://localhost:5555
- **Ollama API**: http://localhost:11434

## 🔧 Troubleshooting

### If services fail to start:
1. Run `./verify.sh` to check what's not working
2. Check Docker: `docker ps`
3. Check ports: `lsof -i :PORT_NUMBER`
4. Check logs: `docker logs CONTAINER_NAME`

### If services won't stop:
1. Run `./stop.sh` first
2. If some services persist, use manual cleanup:
   ```bash
   # Kill processes on specific ports
   lsof -ti:5173 | xargs kill -9
   lsof -ti:9092 | xargs kill -9
   
   # Stop Docker containers
   docker-compose -f docker-compose-sdmarag.yaml down
   
   # Kill all Python/Node processes
   pkill -f python
   pkill -f node
   ```

### Common Issues:

1. **Port already in use**: Another process is using the port
   - Solution: Stop the conflicting process or change ports

2. **Docker not running**: Docker Desktop is not started
   - Solution: Start Docker Desktop

3. **Poetry not found**: Poetry is not installed
   - Solution: Install Poetry: `curl -sSL https://install.python-poetry.org | python3 -`

4. **Node.js not found**: Node.js is not installed
   - Solution: Install Node.js from https://nodejs.org/

5. **Ollama not found**: Ollama is not installed
   - Solution: Install Ollama: `brew install ollama` (macOS) or visit https://ollama.com/

## 📁 File Structure

```
MARAG/
├── start.sh              # Complete startup script
├── quick_start.sh        # Quick startup for returning users
├── verify.sh             # Service verification script
├── stop.sh               # Complete shutdown script
├── .pids/                # Directory for process ID files (created automatically)
│   ├── frontend.pid
│   ├── backend.pid
│   ├── celery.pid
│   └── ollama.pid
└── README_SCRIPTS.md     # This file
```

## 🎉 Success Indicators

When everything is working correctly, you should see:

- ✅ All Docker containers running
- ✅ All application services responding
- ✅ Frontend accessible at http://localhost:5173
- ✅ Backend API responding at http://localhost:9092
- ✅ WebSocket connections working
- ✅ Carbon report generation functional

## 📞 Support

If you encounter issues:

1. Run `./verify.sh` to diagnose problems
2. Check the logs in the terminal where services are running
3. Ensure all prerequisites are installed
4. Try stopping and starting again with `./stop.sh` then `./start.sh`
