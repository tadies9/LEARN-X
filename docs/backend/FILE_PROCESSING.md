# File Processing Pipeline

## Overview

The LEARN-X file processing pipeline handles uploaded course materials and prepares them for AI-powered personalized learning. The pipeline uses Bull queues with Redis for reliable background processing.

## Architecture

### Components

1. **File Upload Service** (`fileService.ts`)
   - Handles file uploads to Supabase Storage
   - Creates database records
   - Queues files for processing

2. **Processing Queue** (`fileProcessingWorker.ts`)
   - Extracts text from PDFs, Word docs, and text files
   - Chunks content for optimal AI processing
   - Extracts metadata (title, author, topics)
   - Handles errors and retries

3. **Notification System** (`notificationWorker.ts`)
   - Sends processing status updates
   - Notifies users when files are ready
   - Handles batch notifications

4. **Embedding Worker** (`embeddingWorker.ts`)
   - Placeholder for Phase 5 AI integration
   - Will generate embeddings for semantic search

## Supported File Types

- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)
- PowerPoint (`.ppt`, `.pptx`)
- Plain Text (`.txt`)
- Markdown (`.md`)

## Processing Flow

1. User uploads file through the UI
2. File is stored in Supabase Storage
3. File record created in database with status `uploaded`
4. Processing job queued with file ID
5. Worker processes file:
   - Downloads from storage
   - Extracts text based on file type
   - Chunks content (default 1000 chars with overlap)
   - Extracts metadata
   - Stores chunks in database
   - Updates file status to `processed`
6. Notification sent to user
7. Embedding generation queued (Phase 5)

## Running the Workers

### Development

```bash
# Terminal 1: Start Redis
docker-compose up redis

# Terminal 2: Start API server
npm run dev

# Terminal 3: Start workers
npm run dev:worker
```

### Production

```bash
# Start workers as separate process
npm run start:worker
```

## Queue Configuration

Queues are configured with:
- 3 retry attempts with exponential backoff
- Completed jobs kept for debugging (100 most recent)
- Failed jobs kept for analysis (500 most recent)

## Error Handling

- Files that fail processing are marked with status `failed`
- Error details stored in file metadata
- Users notified of failures
- Automatic cleanup of partial data

## Monitoring

Monitor queue health:
- Check Redis for queue sizes
- Monitor worker logs for errors
- Track processing times in file metadata
- Review failed jobs in Bull dashboard

## Database Schema

### file_chunks
- Stores processed content chunks
- Indexed by file_id and position
- Contains extracted text and metadata

### notifications
- Stores user notifications
- Tracks read status
- Supports multiple notification types

### chunk_embeddings (Phase 5)
- Will store vector embeddings
- Enables semantic search
- Uses pgvector extension

## Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password-here

# Processing Options
DEFAULT_CHUNK_SIZE=1000
MAX_FILE_SIZE=52428800  # 50MB
```

## Future Enhancements (Phase 5)

1. **OpenAI Integration**
   - Generate embeddings for each chunk
   - Enable semantic search
   - Power AI chat assistant

2. **Advanced Processing**
   - OCR for scanned PDFs
   - Table and diagram extraction
   - Multi-language support

3. **Optimization**
   - Parallel chunk processing
   - Caching frequently accessed content
   - CDN integration for processed content

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Ensure Redis is running
   - Check connection settings
   - Verify firewall rules

2. **File Processing Stuck**
   - Check worker logs
   - Verify file exists in storage
   - Check file size limits

3. **Memory Issues**
   - Process large files in streams
   - Increase worker memory allocation
   - Implement file size limits

### Debug Commands

```bash
# Check queue status
redis-cli
> KEYS bull:*
> LLEN bull:file-processing:wait

# Clear stuck jobs
> DEL bull:file-processing:stalled
```