"""
Queue message models for PGMQ integration.
Defines message structures for different job types.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class BaseJob(BaseModel):
    """Base job model for all queue messages"""
    job_id: Optional[str] = Field(default=None, description="Unique job ID")
    job_type: str = Field(description="Type of job to process")
    user_id: str = Field(description="User who initiated the job")
    queued_at: datetime = Field(default_factory=datetime.utcnow)
    retry_count: int = Field(default=0, description="Number of retry attempts")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class FileProcessingJob(BaseJob):
    """File processing job message"""
    job_type: str = Field(default="process_file")
    file_id: str = Field(description="ID of file to process")
    processing_options: Dict[str, Any] = Field(
        default_factory=dict,
        description="Processing configuration"
    )


class EmbeddingJob(BaseJob):
    """Embedding generation job message"""
    job_type: str = Field(default="generate_embedding")
    chunk_id: str = Field(description="ID of chunk to embed")
    content: str = Field(description="Text content to embed")
    file_id: Optional[str] = Field(default=None, description="Parent file ID")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BatchEmbeddingJob(BaseJob):
    """Batch embedding generation job message"""
    job_type: str = Field(default="generate_embeddings_batch")
    file_id: str = Field(description="File ID for all chunks")
    chunks: List[Dict[str, Any]] = Field(
        description="List of chunks to embed"
    )


class ContentGenerationJob(BaseJob):
    """Content generation job message"""
    job_type: str = Field(default="generate_content")
    module_id: str = Field(description="Module to generate content for")
    content_type: str = Field(description="Type of content to generate")
    persona_id: Optional[str] = Field(default=None)
    parameters: Dict[str, Any] = Field(default_factory=dict)