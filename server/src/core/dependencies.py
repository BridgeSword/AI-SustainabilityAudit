"""
Dependency injection module for shared resources.
This module contains all the shared clients and resources to avoid circular imports.
"""
import os
from celery import Celery

from ..db.postgres.database import SessionLocal

# Global variables to store clients
_milvus_client = None

# Initialize Celery app immediately since it's needed for decorators
celery_app = Celery(
    "smarag-celery",
    broker=os.getenv("CELERY_BROKER", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_BACKEND", "redis://localhost:6379/0"),
    broker_connection_retry_on_startup=True
)

def get_db():
    """Get Postgres DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_milvus_client():
    """Get or create Milvus client with lazy initialization."""
    global _milvus_client
    if _milvus_client is None:
        try:
            from pymilvus import MilvusClient
            milvus_uri = os.getenv("MILVUS_URI", "http://localhost:19530")
            milvus_token = os.getenv("MILVUS_TOKEN")
            _milvus_client = MilvusClient(
                uri=milvus_uri,
                token=milvus_token,
            )
        except Exception as e:
            print(f"Failed to initialize Milvus client: {e}")
            _milvus_client = None
    return _milvus_client

class LazyMilvusClient:
    def __init__(self):
        self._instance = None

    def __getattr__(self, name):
        if self._instance is None:
            self._instance = get_milvus_client()
        return getattr(self._instance, name)

milvus_client = LazyMilvusClient()