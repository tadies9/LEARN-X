# Python AI Service - Stub Implementations

This document describes the stub implementations created to get the Python AI service running without full functionality.

## Created Stub Modules

### 1. Utils Module
- **File**: `/utils/file_utils.py`
- **Functions**:
  - `download_from_storage()` - Creates temporary files instead of downloading from storage
  - `get_mime_type()` - Basic MIME type detection

### 2. Queue Handlers
- **File**: `/services/queue/handlers/embedding.py`
  - `EmbeddingHandler` - Logs embedding jobs without processing
  
- **File**: `/services/queue/handlers/content_gen.py`
  - `ContentGenerationHandler` - Logs content generation jobs without processing

### 3. Document Extractors
- **File**: `/services/document/extractors/docx.py`
  - `DocxExtractor` - Returns stub text for DOCX files
  
- **File**: `/services/document/extractors/text.py`
  - `TextExtractor` - Attempts to read actual text files, falls back to stub

### 4. Startup Handling
- **File**: `/startup.py`
  - Checks database connectivity and falls back to minimal mode if unavailable
  
- **File**: `/app/main_minimal.py`
  - Minimal FastAPI app without database dependencies

## Running the Service

The service now starts in two modes:

1. **Full Mode** - When database is available
   - All features enabled
   - Queue processing active
   - AI endpoints available

2. **Minimal Mode** - When database is unavailable
   - Health check endpoint working
   - Basic service info available
   - No queue processing or AI features

## Health Check

The health check endpoint is available at:
```
GET http://localhost:8001/api/v1/health
```

## Next Steps

To enable full functionality:

1. **Database Connection**
   - Ensure PostgreSQL is running and accessible
   - Configure proper database URL in `.env`

2. **Storage Integration**
   - Implement actual file storage (S3, local, etc.)
   - Update `file_utils.download_from_storage()`

3. **AI Models**
   - Configure OpenAI API keys
   - Implement actual embedding generation
   - Implement content generation

4. **Document Extraction**
   - Install and configure PDF extraction libraries
   - Implement DOCX extraction with python-docx
   - Add support for more file types

5. **Queue Processing**
   - Implement actual job processing logic
   - Add error handling and retries
   - Configure dead letter queues

## Environment Variables

Required environment variables (create `.env` file):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/learnx

# OpenAI
OPENAI_API_KEY=your-api-key

# Redis (if using for caching)
REDIS_URL=redis://localhost:6379

# Application
ENVIRONMENT=development
LOG_LEVEL=INFO
```

## Testing

To test the service:

```bash
# Check if service is running
curl http://localhost:8001/api/v1/health

# View API documentation (in development mode)
open http://localhost:8001/docs
```