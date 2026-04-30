"""
Vercel Serverless Function entry point for FastAPI backend.
"""
import sys
import os

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Add server/src directory to path
server_src_path = os.path.join(project_root, "server", "src")
sys.path.insert(0, server_src_path)

# Set environment for the app
os.environ.setdefault("APP_ENV", "production")

# Import the FastAPI app from server/src/main.py
from server.src.main import app

# Export for Vercel
handler = app
