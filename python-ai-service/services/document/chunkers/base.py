"""
Base chunker interface for document chunking.
Defines common structure for all chunking strategies.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class ChunkingOptions:
    """Options for chunking configuration"""
    min_chunk_size: int = 200
    max_chunk_size: int = 1500
    chunk_overlap: int = 100
    preserve_structure: bool = True
    adaptive_size: bool = True
    include_metadata: bool = True


@dataclass
class Chunk:
    """Represents a document chunk"""
    content: str
    metadata: Dict[str, Any]
    
    @property
    def size(self) -> int:
        """Get chunk size in characters"""
        return len(self.content)


class BaseChunker(ABC):
    """
    Abstract base class for document chunkers.
    All chunkers must implement this interface.
    """
    
    @abstractmethod
    async def chunk(
        self,
        text: str,
        options: ChunkingOptions
    ) -> List[Chunk]:
        """
        Chunk text into smaller pieces.
        
        Args:
            text: Text to chunk
            options: Chunking configuration
            
        Returns:
            List of chunks with metadata
        """
        pass
    
    def validate_chunk(self, chunk: Chunk, options: ChunkingOptions) -> bool:
        """
        Validate a chunk meets requirements.
        
        Args:
            chunk: Chunk to validate
            options: Chunking options
            
        Returns:
            True if chunk is valid
        """
        # Check size constraints
        if chunk.size < options.min_chunk_size:
            return False
            
        if chunk.size > options.max_chunk_size * 1.1:  # Allow 10% overflow
            return False
            
        # Check content is not empty
        if not chunk.content.strip():
            return False
            
        return True