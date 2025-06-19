"""
File processing job handler for PGMQ.
Processes files with better extraction and chunking.
"""

import os
import json
from typing import Dict, Any, List
from datetime import datetime

from core.logging import get_logger
from models.queue import FileProcessingJob
from services.document.extractors.pdf import PDFExtractor
from services.document.extractors.docx import DocxExtractor
from services.document.extractors.text import TextExtractor
from services.document.chunkers.semantic import SemanticChunker
from services.document.chunkers.base import ChunkingOptions
from services.queue.pgmq_client import PGMQClient, PGMQMessage
from utils.file_utils import download_from_storage, get_mime_type

logger = get_logger(__name__)


class FileProcessingHandler:
    """
    Handles file processing jobs from PGMQ.
    Extracts text and creates semantic chunks.
    """
    
    def __init__(self, pgmq_client: PGMQClient, db_pool):
        self.pgmq = pgmq_client
        self.db_pool = db_pool
        
        # Initialize extractors
        self.extractors = {
            'application/pdf': PDFExtractor(),
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': DocxExtractor(),
            'text/plain': TextExtractor(),
            'text/markdown': TextExtractor(),
        }
        
        # Initialize chunker
        self.chunker = SemanticChunker()
        
    async def process(self, message: PGMQMessage) -> None:
        """
        Process a file processing job.
        
        Args:
            message: PGMQ message containing job details
        """
        job = FileProcessingJob(**message.message)
        file_id = job.file_id
        user_id = job.user_id
        
        logger.info(
            "Processing file",
            file_id=file_id,
            user_id=user_id,
            attempt=message.read_ct
        )
        
        try:
            # Update file status
            await self._update_file_status(file_id, 'processing')
            
            # Get file details
            file_info = await self._get_file_info(file_id)
            
            # Download file from storage
            local_path = await download_from_storage(
                file_info['storage_path']
            )
            
            # Extract content
            mime_type = file_info.get('mime_type') or get_mime_type(local_path)
            extraction_result = await self._extract_content(
                local_path,
                mime_type
            )
            
            if not extraction_result.success:
                raise Exception(f"Extraction failed: {extraction_result.error}")
            
            # Chunk content
            chunks = await self._chunk_content(
                extraction_result.text,
                job.processing_options
            )
            
            # Save chunks to database
            saved_chunks = await self._save_chunks(file_id, chunks)
            
            # Queue embeddings generation
            await self._queue_embeddings(file_id, saved_chunks, user_id)
            
            # Update file status
            # Sanitize metadata - remove null bytes and non-serializable data
            sanitized_metadata = {}
            if extraction_result.metadata:
                for key, value in extraction_result.metadata.items():
                    if isinstance(value, str):
                        # Remove null bytes
                        sanitized_metadata[key] = value.replace('\x00', '')
                    elif isinstance(value, (int, float, bool, list, dict)):
                        sanitized_metadata[key] = value
                    else:
                        # Convert other types to string
                        sanitized_metadata[key] = str(value)
            
            await self._update_file_status(
                file_id,
                'completed',
                {
                    'processed_at': datetime.utcnow().isoformat(),
                    'chunk_count': len(saved_chunks),
                    'content_length': len(extraction_result.text),
                    'extraction_metadata': sanitized_metadata
                }
            )
            
            # Clean up downloaded file
            os.remove(local_path)
            
            logger.info(
                "File processing completed",
                file_id=file_id,
                chunks=len(saved_chunks)
            )
            
        except Exception as e:
            logger.error(
                "File processing failed",
                file_id=file_id,
                error=str(e)
            )
            
            # Update file status
            await self._update_file_status(
                file_id,
                'failed',
                {
                    'error_message': str(e),
                    'failed_at': datetime.utcnow().isoformat()
                }
            )
            
            raise
    
    async def _extract_content(
        self,
        file_path: str,
        mime_type: str
    ) -> Any:
        """Extract content from file based on type"""
        extractor = self.extractors.get(mime_type)
        
        if not extractor:
            # Try to find extractor by file extension
            ext = os.path.splitext(file_path)[1].lower()
            if ext == '.pdf':
                extractor = self.extractors['application/pdf']
            elif ext == '.docx':
                extractor = self.extractors['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
            elif ext in ['.txt', '.md']:
                extractor = self.extractors['text/plain']
            else:
                raise ValueError(f"Unsupported file type: {mime_type}")
        
        return await extractor.extract(file_path)
    
    async def _chunk_content(
        self,
        text: str,
        options: Dict[str, Any]
    ) -> List[Any]:
        """Chunk content using semantic chunker"""
        chunking_options = ChunkingOptions(
            min_chunk_size=options.get('min_chunk_size', 200),
            max_chunk_size=options.get('chunk_size', 1500),
            chunk_overlap=options.get('overlap_size', 100),
            preserve_structure=True,
            adaptive_size=True,
            include_metadata=True
        )
        
        return await self.chunker.chunk(text, chunking_options)
    
    async def _save_chunks(
        self,
        file_id: str,
        chunks: List[Any]
    ) -> List[Dict[str, Any]]:
        """Save chunks to database"""
        async with self.db_pool.acquire() as conn:
            # Delete existing chunks
            await conn.execute(
                "DELETE FROM file_chunks WHERE file_id = $1",
                file_id
            )
            
            # Insert new chunks
            saved_chunks = []
            for idx, chunk in enumerate(chunks):
                # Sanitize content - remove null bytes
                clean_content = chunk.content.replace('\x00', '') if chunk.content else ''
                
                # Sanitize metadata
                clean_metadata = {}
                if chunk.metadata:
                    for key, value in chunk.metadata.items():
                        if isinstance(value, str):
                            clean_metadata[key] = value.replace('\x00', '')
                        elif isinstance(value, (list, dict)):
                            # For complex types, convert to JSON string and clean
                            clean_metadata[key] = json.dumps(value).replace('\x00', '')
                            clean_metadata[key] = json.loads(clean_metadata[key])
                        else:
                            clean_metadata[key] = value
                
                result = await conn.fetchrow(
                    """
                    INSERT INTO file_chunks (
                        file_id, chunk_index, content, 
                        content_length, chunk_type, importance,
                        section_title, hierarchy_level, concepts,
                        metadata, created_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
                    ) RETURNING id, content, chunk_index, metadata
                    """,
                    file_id,
                    idx,
                    clean_content,
                    len(clean_content),
                    clean_metadata.get('type', 'text'),
                    clean_metadata.get('importance', 'medium'),
                    clean_metadata.get('title', '').replace('\x00', '') if clean_metadata.get('title') else None,
                    clean_metadata.get('level', 0),
                    json.dumps(clean_metadata.get('concepts', [])),
                    json.dumps(clean_metadata) if clean_metadata else '{}',
                    datetime.utcnow()
                )
                
                saved_chunks.append({
                    'id': result['id'],
                    'content': result['content'],
                    'chunk_index': result['chunk_index'],
                    'metadata': result['metadata']
                })
            
            return saved_chunks
    
    async def _queue_embeddings(
        self,
        file_id: str,
        chunks: List[Dict[str, Any]],
        user_id: str
    ) -> None:
        """Queue embedding generation for chunks"""
        # Create embedding jobs
        embedding_jobs = []
        
        for chunk in chunks:
            job = {
                'job_type': 'generate_embedding',
                'file_id': str(file_id),
                'chunk_id': str(chunk['id']),
                'content': chunk['content'],
                'user_id': str(user_id),
                'metadata': chunk['metadata']
            }
            embedding_jobs.append(job)
        
        # Send to embedding queue in batches
        batch_size = 50
        for i in range(0, len(embedding_jobs), batch_size):
            batch = embedding_jobs[i:i + batch_size]
            await self.pgmq.send_batch('embeddings', batch)
        
        logger.info(
            "Queued embeddings generation",
            file_id=file_id,
            chunks=len(chunks)
        )
    
    async def _get_file_info(self, file_id: str) -> Dict[str, Any]:
        """Get file information from database"""
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchrow(
                """
                SELECT f.*, c.user_id
                FROM course_files f
                JOIN modules m ON f.module_id = m.id
                JOIN courses c ON m.course_id = c.id
                WHERE f.id = $1
                """,
                file_id
            )
            
            if not result:
                raise ValueError(f"File not found: {file_id}")
                
            return dict(result)
    
    async def _update_file_status(
        self,
        file_id: str,
        status: str,
        additional_fields: Dict[str, Any] = None
    ) -> None:
        """Update file processing status"""
        async with self.db_pool.acquire() as conn:
            query = """
                UPDATE course_files 
                SET status = $1, updated_at = $2
            """
            params = [status, datetime.utcnow()]
            
            if additional_fields:
                # Add metadata field update
                query += ", metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb"
                params.append(json.dumps(additional_fields))
                
            query += " WHERE id = $" + str(len(params) + 1)
            params.append(file_id)
            
            await conn.execute(query, *params)