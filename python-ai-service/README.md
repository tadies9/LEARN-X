# LEARN-X Python AI/ML Service

## Overview

This Python service handles CPU-intensive AI/ML tasks for the LEARN-X platform, providing:

- **Advanced document processing** with PyMuPDF and python-docx
- **Intelligent NLP-based chunking** using spaCy
- **Efficient batch embedding generation**
- **Abstracted AI interfaces** for provider flexibility
- **Persona-based content transformation**

## Architecture

The service integrates with the existing Node.js backend through PGMQ (PostgreSQL Message Queue):

```
Node.js API → PGMQ → Python Worker → PostgreSQL
```

### Key Components

1. **Document Processing**
   - PDF extraction with PyMuPDF (better than pdf-parse)
   - DOCX extraction with python-docx
   - Structure-aware text extraction

2. **Semantic Chunking**
   - spaCy-based NLP analysis
   - Intelligent boundary detection
   - Concept and entity extraction
   - Adaptive chunk sizing

3. **AI Abstraction Layer**
   - Provider-agnostic interfaces
   - Support for OpenAI, local LLMs, and future providers
   - Unified embedding and generation APIs

4. **Queue Processing**
   - PGMQ integration for job management
   - Concurrent processing with proper error handling
   - Long-polling for efficient resource usage

## Installation

### Prerequisites

- Python 3.11+
- PostgreSQL with PGMQ extension
- Redis (optional, for caching)

### Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Download spaCy model:
```bash
python -m spacy download en_core_web_sm
```

4. Create `.env` file:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/learnx

# OpenAI
OPENAI_API_KEY=your-api-key

# Service Configuration
ENVIRONMENT=development
LOG_LEVEL=INFO
WORKER_COUNT=4
```

## Running the Service

### Development

```bash
python -m app.main
```

Or with auto-reload:
```bash
uvicorn app.main:app --reload --port 8001
```

### Production

Use the provided Dockerfile:
```bash
docker build -t learnx-python-ai .
docker run -p 8001:8001 --env-file .env learnx-python-ai
```

## API Endpoints

### Health Check
```
GET /api/v1/health
```

### Metrics (Prometheus)
```
GET /metrics
```

### Debug (Development Only)
```
GET /api/v1/debug/queues
GET /api/v1/debug/jobs/{job_id}
```

## Queue Integration

The service processes jobs from three main queues:

### 1. File Processing Queue
Handles document extraction and chunking:
```json
{
  "job_type": "process_file",
  "file_id": "uuid",
  "user_id": "uuid",
  "processing_options": {
    "chunk_size": 1500,
    "min_chunk_size": 200
  }
}
```

### 2. Embeddings Queue
Generates embeddings for chunks:
```json
{
  "job_type": "generate_embedding",
  "chunk_id": "uuid",
  "content": "text to embed",
  "user_id": "uuid"
}
```

### 3. Content Generation Queue
Handles AI content generation:
```json
{
  "job_type": "generate_content",
  "module_id": "uuid",
  "content_type": "explanation",
  "user_id": "uuid",
  "persona_id": "uuid"
}
```

## Adding New AI Providers

1. Create provider class in `services/ai/providers/`:
```python
from services.ai.interfaces.base import BaseAIInterface

class MyProvider(BaseAIInterface):
    async def generate_embedding(self, text: str) -> List[float]:
        # Implementation
        pass
```

2. Register in AI factory:
```python
AI_PROVIDERS = {
    AIProvider.MY_PROVIDER: MyProvider
}
```

## Testing

Run tests with pytest:
```bash
# All tests
pytest

# With coverage
pytest --cov=app --cov=services

# Specific test file
pytest tests/unit/test_semantic_chunker.py
```

## Monitoring

- **Logs**: Structured JSON logs via structlog
- **Metrics**: Prometheus metrics at `/metrics`
- **Health**: Health check endpoint at `/api/v1/health`
- **Sentry**: Error tracking (configure `SENTRY_DSN`)

## Performance Tuning

### Environment Variables

- `WORKER_COUNT`: Number of concurrent workers (default: 4)
- `MAX_CONCURRENT_JOBS`: Max jobs per worker (default: 10)
- `PGMQ_BATCH_SIZE`: Messages per batch (default: 10)
- `PGMQ_POLL_INTERVAL`: Poll interval in ms (default: 5000)

### Database Pool

- `DATABASE_POOL_SIZE`: Connection pool size (default: 10)
- `DATABASE_MAX_OVERFLOW`: Max overflow connections (default: 20)

## Migration from Node.js

To migrate file processing from Node.js to Python:

1. Update Node.js to queue jobs to PGMQ instead of processing directly
2. Ensure Python service is running and processing queues
3. Monitor queue metrics to verify processing
4. Gradually migrate other CPU-intensive tasks

## Future Enhancements

1. **Local LLM Support**
   - Ollama integration
   - Llama.cpp bindings
   - Model management API

2. **Advanced Chunking**
   - Multi-language support
   - Domain-specific chunkers
   - Visual content handling

3. **Caching Layer**
   - Redis integration
   - Embedding cache
   - Content cache

4. **Performance**
   - GPU acceleration
   - Batch processing optimization
   - Distributed processing