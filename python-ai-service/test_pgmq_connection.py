#!/usr/bin/env python3
"""
Test PGMQ connection and basic operations.
Run this to verify Python service can connect to PGMQ.
"""

import asyncio
import os
import sys
from datetime import datetime
import asyncpg
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_pgmq_connection():
    """Test basic PGMQ operations"""
    
    print("=== PGMQ Connection Test ===\n")
    
    # Get database URL
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL not set in environment")
        return False
    
    print(f"📡 Connecting to database...")
    
    try:
        # Create connection pool
        pool = await asyncpg.create_pool(db_url, min_size=1, max_size=2)
        print("✅ Database connection successful\n")
        
        # Test 1: Check PGMQ extension
        print("Test 1: Checking PGMQ extension...")
        async with pool.acquire() as conn:
            result = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pgmq')"
            )
            if result:
                print("✅ PGMQ extension is installed\n")
            else:
                print("❌ PGMQ extension not found\n")
                return False
        
        # Test 2: List queues
        print("Test 2: Listing existing queues...")
        async with pool.acquire() as conn:
            queues = await conn.fetch(
                "SELECT queue_name FROM pgmq.meta"
            )
            if queues:
                print(f"Found {len(queues)} queues:")
                for q in queues:
                    print(f"  - {q['queue_name']}")
            else:
                print("No queues found")
        print()
        
        # Test 3: Check file_processing queue
        print("Test 3: Checking file_processing queue...")
        async with pool.acquire() as conn:
            queue_exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM pgmq.meta WHERE queue_name = 'file_processing')"
            )
            if queue_exists:
                print("✅ file_processing queue exists")
                
                # Get queue metrics
                metrics = await conn.fetchrow(
                    """
                    SELECT 
                        queue_length,
                        oldest_msg_age_sec,
                        newest_msg_age_sec,
                        total_messages
                    FROM pgmq.metrics
                    WHERE queue_name = 'file_processing'
                    """
                )
                if metrics:
                    print(f"  Queue length: {metrics['queue_length']}")
                    print(f"  Total messages: {metrics['total_messages']}")
                    if metrics['oldest_msg_age_sec']:
                        print(f"  Oldest message age: {metrics['oldest_msg_age_sec']}s")
            else:
                print("❌ file_processing queue not found")
        print()
        
        # Test 4: Send a test message
        print("Test 4: Sending test message...")
        test_message = {
            "job_type": "test_connection",
            "test_id": f"test_{datetime.now().isoformat()}",
            "message": "Python PGMQ connection test"
        }
        
        async with pool.acquire() as conn:
            msg_id = await conn.fetchval(
                "SELECT pgmq.send('file_processing', $1::jsonb, 0)",
                test_message
            )
            print(f"✅ Test message sent (ID: {msg_id})\n")
        
        # Test 5: Read the test message
        print("Test 5: Reading test message...")
        async with pool.acquire() as conn:
            messages = await conn.fetch(
                "SELECT * FROM pgmq.read('file_processing', 30, 1)"
            )
            if messages:
                msg = messages[0]
                print(f"✅ Message read successfully")
                print(f"  Message ID: {msg['msg_id']}")
                print(f"  Read count: {msg['read_ct']}")
                print(f"  Content: {msg['message']}")
                
                # Delete the test message
                await conn.execute(
                    "SELECT pgmq.delete('file_processing', $1)",
                    msg['msg_id']
                )
                print("  Message deleted\n")
            else:
                print("⚠️  No messages found (queue might be empty)\n")
        
        # Close pool
        await pool.close()
        
        print("✅ All tests passed! Python service can work with PGMQ")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    # Run the test
    success = asyncio.run(test_pgmq_connection())
    sys.exit(0 if success else 1)