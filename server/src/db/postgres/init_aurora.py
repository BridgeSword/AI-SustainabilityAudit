#!/usr/bin/env python3
"""
Initialize Aurora PostgreSQL database schema.
Run this script once to set up the database tables.

Usage:
    python -m server.src.db.postgres.init_aurora
"""
import os
import sys

# Ensure project root is in path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
sys.path.insert(0, project_root)

from server.src.db.postgres.database import engine, Base, init_db
from server.src.db.postgres import models  # noqa: F401 - Import to register models


def main():
    print("[v0] Initializing Aurora PostgreSQL database...")
    
    try:
        # Test connection
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            print(f"[v0] Database connection successful: {result.scalar()}")
        
        # Initialize database (create extension + tables)
        init_db()
        print("[v0] Database tables created successfully!")
        
        # List created tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"[v0] Created tables: {tables}")
        
    except Exception as e:
        print(f"[v0] Error initializing database: {e}")
        raise


if __name__ == "__main__":
    main()
