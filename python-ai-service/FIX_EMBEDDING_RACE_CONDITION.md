# Fix for Embedding Generation Race Condition

## Problem Summary

The Python AI service is experiencing database constraint violations with two main issues:

1. **Foreign Key Constraint Violations**: 
   - Error: "insert or update on table 'file_embeddings' violates foreign key constraint 'file_embeddings_chunk_id_fkey'"
   - Chunk IDs referenced in embedding jobs no longer exist in the `file_chunks` table

2. **PGMQ Archive Function Type Casting Error**:
   - Error with type casting when archiving failed messages to dead letter queue

## Root Cause Analysis

### Race Condition in File Processing Pipeline

The race condition occurs in the following scenario:

1. A file is uploaded and processed
2. File processing handler:
   - Deletes all existing chunks for the file (`DELETE FROM file_chunks WHERE file_id = $1`)
   - Inserts new chunks
   - Queues embedding generation jobs
3. If the same file is reprocessed (re-upload, retry, etc.):
   - The DELETE cascades to remove embeddings (due to `ON DELETE CASCADE`)
   - But embedding jobs from the previous processing might still be in the queue
4. When these orphaned embedding jobs execute, they fail because the chunks no longer exist

### PGMQ Archive Type Issue

The PGMQ archive function expects a BIGINT parameter, but Python's int type might not be interpreted correctly by asyncpg, causing type casting errors.

## Solution

### 1. Fix Embedding Handler Race Condition

Replace the existing embedding handler with the enhanced version that:
- Checks if the chunk exists before processing
- Verifies the chunk belongs to the expected file
- Handles foreign key violations gracefully
- Uses database transactions for atomic operations

```bash
# Backup existing handler
cp services/queue/handlers/embedding.py services/queue/handlers/embedding.py.backup

# Replace with fixed version
cp services/queue/handlers/embedding_fix.py services/queue/handlers/embedding.py
```

### 2. Fix PGMQ Client Archive Function

Replace the PGMQ client with the enhanced version that:
- Explicitly casts msg_id to BIGINT
- Handles type casting errors with fallback approaches
- Improves error logging for debugging

```bash
# Backup existing client
cp services/queue/pgmq_client.py services/queue/pgmq_client.backup

# Replace with fixed version
cp services/queue/pgmq_client_fix.py services/queue/pgmq_client.py
```

### 3. Alternative Solution: Modify File Processing Handler

For a more comprehensive fix, consider modifying the file processing handler to:
- Use soft deletes for chunks (mark as inactive instead of DELETE)
- Cancel pending embedding jobs before reprocessing
- Use file versioning to avoid conflicts

```python
# In file_processing.py, replace the DELETE with:
async with self.db_pool.acquire() as conn:
    # Cancel any pending embedding jobs for this file
    await conn.execute("""
        UPDATE pgmq.embeddings_queue 
        SET archived = true 
        WHERE message->>'file_id' = $1 
        AND vt > NOW()
    """, file_id)
    
    # Soft delete existing chunks
    await conn.execute("""
        UPDATE file_chunks 
        SET is_active = false, archived_at = NOW() 
        WHERE file_id = $1 AND is_active = true
    """, file_id)
```

### 4. Database Schema Enhancement (Optional)

Add versioning support to prevent race conditions:

```sql
-- Add version tracking to file_chunks
ALTER TABLE file_chunks ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE file_chunks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE file_chunks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for active chunks
CREATE INDEX IF NOT EXISTS idx_file_chunks_active 
ON file_chunks(file_id, is_active) 
WHERE is_active = true;

-- Modify foreign key to only reference active chunks
ALTER TABLE file_embeddings 
DROP CONSTRAINT IF EXISTS file_embeddings_chunk_id_fkey;

ALTER TABLE file_embeddings 
ADD CONSTRAINT file_embeddings_chunk_id_fkey 
FOREIGN KEY (chunk_id) 
REFERENCES file_chunks(id) 
ON DELETE RESTRICT;  -- Change from CASCADE to RESTRICT
```

## Implementation Steps

1. **Immediate Fix** (Minimal disruption):
   ```bash
   # Apply the handler fixes
   cp services/queue/handlers/embedding_fix.py services/queue/handlers/embedding.py
   cp services/queue/pgmq_client_fix.py services/queue/pgmq_client.py
   
   # Restart the service
   docker-compose restart python-ai-service
   ```

2. **Clear Stuck Jobs** (If needed):
   ```sql
   -- Archive all failed embedding jobs
   SELECT pgmq.archive('embeddings', msg_id)
   FROM pgmq.embeddings_queue
   WHERE read_ct >= 3;
   
   -- Or delete orphaned embedding jobs
   DELETE FROM pgmq.embeddings_queue
   WHERE message->>'chunk_id' NOT IN (
       SELECT id::text FROM file_chunks
   );
   ```

3. **Monitor Results**:
   ```bash
   # Watch for foreign key errors
   docker-compose logs -f python-ai-service | grep -i "foreign key"
   
   # Check queue metrics
   docker-compose exec postgres psql -U postgres -d postgres -c "
   SELECT * FROM pgmq.metrics WHERE queue_name = 'embeddings';
   "
   ```

## Testing

Test the fix by:
1. Upload a file and wait for processing
2. Re-upload the same file immediately
3. Verify no foreign key constraint errors in logs
4. Check that embeddings are generated successfully

## Long-term Recommendations

1. **Implement Idempotent Processing**: Make embedding generation idempotent by checking if an embedding already exists before processing
2. **Add Circuit Breakers**: Implement circuit breakers for database operations to prevent cascade failures
3. **Queue Deduplication**: Add message deduplication to prevent processing the same chunk multiple times
4. **Monitoring**: Add metrics for race condition occurrences and foreign key violations

## References

- Original embedding handler: `services/queue/handlers/embedding.py`
- Original PGMQ client: `services/queue/pgmq_client.py`
- File processing handler: `services/queue/handlers/file_processing.py`
- Database schema: `docs/database/schema/CURRENT_SCHEMA.sql`