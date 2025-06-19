"""
Base extractor interface for document processing.
Defines common structure for all extractors.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class ExtractionResult:
    """Result of document extraction"""
    text: str
    metadata: Dict[str, Any]
    pages: List[Dict[str, Any]]
    success: bool
    error: Optional[str] = None


class BaseExtractor(ABC):
    """
    Abstract base class for document extractors.
    All extractors must implement this interface.
    """
    
    @abstractmethod
    async def extract(self, file_path: str) -> ExtractionResult:
        """
        Extract text and metadata from document.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Extraction result with text and metadata
        """
        pass
    
    @abstractmethod
    def can_handle(self, mime_type: str) -> bool:
        """
        Check if this extractor can handle the given MIME type.
        
        Args:
            mime_type: MIME type of the document
            
        Returns:
            True if this extractor can handle the type
        """
        pass
    
    def sanitize_text(self, text: str) -> str:
        """
        Basic text sanitization.
        Remove problematic characters and normalize whitespace.
        """
        # Remove null bytes
        text = text.replace('\x00', '')
        
        # Normalize whitespace
        text = ' '.join(text.split())
        
        # Remove control characters except newlines and tabs
        import re
        text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', '', text)
        
        return text.strip()