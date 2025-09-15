#!/usr/bin/env python3
"""
Cleanup script for stuck populations in Synthea Studio.
This script resets populations that are stuck in 'generating' or 'pending' states.
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from app.core.config import settings

def cleanup_stuck_populations():
    """Reset stuck populations to failed state or delete old pending ones."""
    
    # Create database connection
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # First, get current stuck populations
        result = conn.execute(text("""
            SELECT id, name, status, created_at, 
                   EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_old
            FROM populations 
            WHERE status IN ('generating', 'pending')
            ORDER BY created_at DESC
        """))
        
        stuck_populations = result.fetchall()
        
        if not stuck_populations:
            print("No stuck populations found.")
            return
        
        print(f"Found {len(stuck_populations)} stuck populations:")
        print("-" * 80)
        
        for pop in stuck_populations:
            print(f"ID: {pop.id}")
            print(f"Name: {pop.name}")
            print(f"Status: {pop.status}")
            print(f"Created: {pop.created_at}")
            print(f"Hours old: {pop.hours_old:.1f}")
            print("-" * 40)
        
        # Ask for confirmation
        response = input("\nDo you want to clean up these populations? (yes/no): ")
        if response.lower() != 'yes':
            print("Cleanup cancelled.")
            return
        
        # Update stuck 'generating' populations to 'failed'
        conn.execute(text("""
            UPDATE populations 
            SET status = 'failed',
                completed_at = NOW()
            WHERE status = 'generating'
            AND created_at < NOW() - INTERVAL '1 hour'
        """))
        conn.commit()
        
        # Delete very old pending populations (> 24 hours)
        conn.execute(text("""
            DELETE FROM populations 
            WHERE status = 'pending'
            AND created_at < NOW() - INTERVAL '24 hours'
        """))
        conn.commit()
        
        # Reset recent pending populations that might be legitimate
        conn.execute(text("""
            UPDATE populations 
            SET status = 'pending'
            WHERE status = 'pending'
            AND created_at >= NOW() - INTERVAL '24 hours'
        """))
        conn.commit()
        
        print("\nCleanup completed!")
        print("- Populations stuck in 'generating' for > 1 hour: marked as 'failed'")
        print("- Pending populations > 24 hours old: deleted")
        print("- Recent pending populations: kept for retry")

if __name__ == "__main__":
    cleanup_stuck_populations()