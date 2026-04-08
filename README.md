# SMARAG (Self-decisive Multi-Agentic Retrieval Augmented Generation) — Frontend and Backend Setup Guide

This repository contains the frontend and backend components for the **MARAG** project. The application includes a React-based frontend, a FastAPI-based backend, and supporting services managed via Docker.

## 🎯 Quick Start Guide

Choose your setup mode:

- **[🆕 First Time Setup](#-first-time-setup)** - For new users setting up the project for the first time
- **[🔄 Returning User Setup](#-returning-user-setup)** - For users who have already set up the project and need to restart it

---

## 🆕 First Time Setup

### Prerequisites

Before starting, ensure you have the following installed:
- **Docker & Docker Compose** - For database and vector services
- **Node.js (v16+)** - For the frontend
- **Python 3.12** - For the backend
- **Poetry** - For Python dependency management
- **Ollama** - For local LLM inference (optional but recommended)

### Step 1: Clone and Setup Environment

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd MARAG
   ```

2. **Create Python virtual environment**:
   ```bash
   conda create -n smarag python=3.12
   conda activate smarag
   ```

3. **Install Python dependencies**:
   ```bash
   poetry install
   ```

### Step 2: Start Docker Services

1. **Start all required services**:
   ```bash
   docker-compose -f docker-compose-sdmarag.yaml up -d
   ```

   This will start:
   - MongoDB (port 27017)
   - Milvus Vector Database (port 19530)
   - Milvus Attu UI (port 8000)
   - Redis (port 6379)
   - MinIO (port 9000-9001)
   - etcd (port 2379)

### Step 3: Setup Ollama (Recommended)

1. **Install Ollama**:
   ```bash
   # macOS
   brew install Ollama/tap/ollama
   
   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Download and start the model**:
   ```bash
   ollama pull llama3:latest
   ollama serve --host 0.0.0.0 --port 11434
   ```

### Step 4: Start Backend Services

1. **Start the FastAPI backend**:
   ```bash
   export APP_ENV=local
   export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
   poetry run uvicorn server.src.main:app --host 0.0.0.0 --port 9092 --workers 1 --timeout-keep-alive 1000000
   ```

2. **In a new terminal, start Celery workers**:
   ```bash
   export APP_ENV=local
   export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
   poetry run celery -A server.src.main.celery_app worker -l info --pool=threads
   ```

### Step 5: Start Frontend

1. **Install frontend dependencies**:
   ```bash
   cd client
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

### Step 6: Access the Application

- **Frontend**: http://localhost:5173/
- **Backend API**: http://localhost:9092/
- **Milvus UI**: http://localhost:8000/
- **Celery Flower**: http://localhost:5555/

---

## 🔄 Returning User Setup

If you've already set up the project and just need to restart it:

### Quick Restart (All Services)

1. **Start Docker services**:
   ```bash
   docker-compose -f docker-compose-sdmarag.yaml up -d
   ```

2. **Start Ollama** (if using local LLM):
   ```bash
   ollama serve --host 0.0.0.0 --port 11434
   ```

3. **Start backend** (Terminal 1):
   ```bash
   conda activate smarag
   export APP_ENV=local
   export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
   poetry run uvicorn server.src.main:app --host 0.0.0.0 --port 9092 --workers 1 --timeout-keep-alive 1000000
   ```

4. **Start Celery workers** (Terminal 2):
   ```bash
   conda activate smarag
   export APP_ENV=local
   export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
   poetry run celery -A server.src.main.celery_app worker -l info --pool=threads
   ```

5. **Start frontend** (Terminal 3):
   ```bash
   cd client
   npm run dev
   ```

### Using the Start Script (Alternative)

You can also use the provided start script:
```bash
conda activate smarag
sh start.sh
```

---

## 🚀 How to Use the Application

### Carbon Report Generation Workflow

1. **Register/Login**: Create an account or login to the system
2. **Fill Form**: Enter your carbon report details:
   - Report Name
   - Carbon Standard (e.g., GHG)
   - Carbon Goal
   - Carbon Plan
   - Carbon Action
3. **Generate Plan**: Click Submit to generate an AI-powered plan
4. **Review & Approve**: Review the generated plan and approve it
5. **Generate Report**: The system will generate the full carbon report
6. **Edit & Download**: Edit sections as needed and download the final report

### Key Features

- **AI-Powered Planning**: Uses Ollama with LLaMA3 for intelligent plan generation
- **Multi-Agent System**: Different AI agents handle different aspects of report generation
- **Real-time Updates**: WebSocket-based real-time communication
- **Interactive Editing**: Edit generated content with AI assistance
- **PDF Export**: Download reports in PDF format

---

## 🛠️ Detailed Setup Instructions

### Prerequisites Installation

#### Docker & Docker Compose
- **macOS**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: 
  ```bash
  sudo apt-get update
  sudo apt-get install docker.io docker-compose
  sudo usermod -aG docker $USER
  ```

#### Node.js
- **macOS**: `brew install node`
- **Linux**: 
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

#### Python & Poetry
- **Install Poetry**:
  ```bash
  curl -sSL https://install.python-poetry.org | python3 -
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
  source ~/.bashrc
  ```

- **Install Anaconda**:
  ```bash
  # macOS
  brew install --cask anaconda
  
  # Linux
  mkdir -p ~/miniconda3
  wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda3/miniconda.sh
  bash ~/miniconda3/miniconda.sh -b -u -p ~/miniconda3
  rm ~/miniconda3/miniconda.sh
  source ~/miniconda3/bin/activate
  conda init --all
  ```

#### Ollama Setup

**macOS Installation**:
```bash
brew install Ollama/tap/ollama
ollama pull llama3:latest
ollama serve --host 0.0.0.0 --port 11434
```

**Linux Installation**:
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3:latest
ollama serve --host 0.0.0.0 --port 11434
```

**Optional: Auto-start Ollama Service (Linux)**:
```bash
sudo useradd -r -s /bin/false -U -m -d /usr/share/ollama ollama
sudo usermod -a -G ollama $(whoami)

sudo nano /etc/systemd/system/ollama.service
```

Add this content:
```ini
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
```

---

## 🌐 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173/ | React application UI |
| **Backend API** | http://localhost:9092/ | FastAPI backend with Swagger docs |
| **Milvus UI** | http://localhost:8000/ | Vector database management |
| **Celery Flower** | http://localhost:5555/ | Task queue monitoring |
| **MongoDB** | mongodb://localhost:27017 | Database connection |

---

## 📊 Monitoring & Debugging

### MongoDB Monitoring
1. Install [MongoDB Compass](https://www.mongodb.com/products/tools/compass)
2. Connect using: `mongodb://localhost:27017`
3. No authentication required (development setup)

### Service Status Check
```bash
# Check Docker services
docker ps

# Check if ports are in use
lsof -i :5173  # Frontend
lsof -i :9092  # Backend
lsof -i :11434 # Ollama
lsof -i :27017 # MongoDB
lsof -i :19530 # Milvus
```

### Common Issues & Solutions

1. **Port already in use**: Kill processes using the ports
2. **Docker services not starting**: Check Docker daemon is running
3. **Ollama model not found**: Run `ollama pull llama3:latest`
4. **Backend connection issues**: Ensure all environment variables are set

---

## 🔧 Development

### Project Structure
```
MARAG/
├── client/                 # React frontend
├── server/                 # FastAPI backend
│   ├── src/
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Core configuration
│   │   ├── services/      # Business logic
│   │   └── db/            # Database models
├── docker-compose-sdmarag.yaml  # Docker services
└── start.sh               # Startup script
```

### Environment Variables
The application uses these key environment variables:
- `APP_ENV=local`
- `MILVUS_URI=http://localhost:19530`
- `MONGO_HOST=localhost`
- `MONGO_PORT=27017`
- `CELERY_BROKER=redis://localhost:6379/0`
