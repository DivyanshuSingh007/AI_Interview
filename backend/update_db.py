#!/usr/bin/env python3
"""Script to add subscription columns to the users table."""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def main():
    # Get connection params from .env or use provided defaults
    db_url = os.getenv("DATABASE_URL", "")
    
    # Parse the DATABASE_URL
    # Format: postgresql://user:password@host:port/dbname
    if "postgresql://" in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Connect directly
    conn = psycopg2.connect(
        host='localhost',
        user='divya',
        password='Divmeen007*',
        database='ai_interview'
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    # Check existing columns
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
    existing_cols = [row[0] for row in cur.fetchall()]
    print(f"Existing columns: {existing_cols}")
    
    # New columns to add
    new_columns = [
        ("google_id", "VARCHAR(255)"),
        ("tavus_user_id", "VARCHAR(255)"),
        ("subscription_status", "VARCHAR(50) DEFAULT 'free'"),
        ("usage_time_seconds", "INTEGER DEFAULT 0"),
        ("video_time_seconds", "INTEGER DEFAULT 0"),
        ("free_video_limit_seconds", "INTEGER DEFAULT 300"),
        ("subscription_expires_at", "TIMESTAMP")
    ]
    
    # Add each column if it doesn't exist
    for col_name, col_type in new_columns:
        if col_name not in existing_cols:
            try:
                cur.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                print(f"Added column: {col_name}")
            except Exception as e:
                print(f"Error adding {col_name}: {e}")
        else:
            print(f"Column already exists: {col_name}")
    
    # Verify final columns
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")
    final_cols = [row[0] for row in cur.fetchall()]
    print(f"\nFinal columns: {final_cols}")
    
    cur.close()
    conn.close()
    print("\nDatabase update complete!")

if __name__ == "__main__":
    main()
