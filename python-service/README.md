# LEARN-X Python AI/ML Service

A high-performance Python service for CPU-intensive document processing and AI/ML tasks, designed to complement the Node.js backend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Python AI/ML Service                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   FastAPI App   │  │  PGMQ Consumer  │  │  AI Interfaces  │ │
│  │  - Health API   │  │  - Long Polling │  │  - OpenAI       │ │
│  │  - Metrics API  │  │  - Job Tracking │  │  - Local Models │ │
│  │  - Debug API    │  │  - Retries      │  │  - Embeddings   │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                     │           │
│  ┌────────┴──────────────────────────────────────────┴────────┐ │
│  │                    Core Processing Engine                   │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │ │
│  │  │  Document   │  │   Advanced   │  │    Embedding    │   │ │
│  │  │ Extractors  │  │   Chunking   │  │   Generator     │   │ │
│  │  │ - PyMuPDF   │  │  - spaCy     │  │  - Batching     │   │ │
│  │  │ - docx2txt  │  │  - NLTK      │  │  - Caching      │   │ │
│  │  │ - PDFPlumber│  │  - Semantic  │  │  - Multi-model  │   │ │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Infrastructure Layer                      │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  Database: PostgreSQL + pgvector  │  Cache: Redis           │ │
│  │  Storage: Supabase Storage        │  Monitoring: Prometheus │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Enhanced Document Processing
- **PyMuPDF**: Advanced PDF text extraction with layout preservation
- **python-docx**: Better DOCX handling with style and structure preservation
- **PDFPlumber**: Fallback for complex PDFs with tables and figures
- **Tesseract OCR**: For scanned documents (future enhancement)

### 2. Intelligent Chunking
- **spaCy**: NLP-based sentence segmentation and entity recognition
- **NLTK**: Academic text analysis and topic modeling
- **Semantic Chunking**: Context-aware splitting based on document structure
- **Adaptive Sizing**: Dynamic chunk sizes based on content type

### 3. Flexible AI Integration
- **Abstract AI Interface**: Support for multiple embedding/completion providers
- **OpenAI Integration**: Direct compatibility with existing system
- **Local Model Support**: Ready for Llama, Mistral, and other local models
- **Batch Processing**: Optimized API calls with intelligent batching

### 4. PGMQ Integration
- **Native PostgreSQL**: Direct connection using asyncpg
- **Long Polling**: Efficient queue consumption
- **Job Tracking**: Comprehensive job lifecycle management
- **Error Handling**: Intelligent retry logic and poison message handling

## Implementation Benefits

1. **Performance**: 3-5x faster document processing using native Python libraries
2. **Accuracy**: Better text extraction and chunking with NLP tools
3. **Flexibility**: Easy to add new AI models and processing capabilities
4. **Scalability**: Async architecture with worker pool management
5. **Cost Efficiency**: Batched API calls and optional local model support