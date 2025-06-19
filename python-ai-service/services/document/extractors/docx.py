"""
Stub DOCX document extractor.
Minimal implementation to get the service running.
"""

from typing import Dict, Any
from services.document.extractors.base import BaseExtractor, ExtractionResult
from core.logging import get_logger

logger = get_logger(__name__)


class DocxExtractor(BaseExtractor):
    """
    Stub extractor for DOCX documents.
    """
    
    def can_handle(self, mime_type: str) -> bool:
        """Check if this extractor can handle DOCX files."""
        return mime_type in [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword'
        ]
    
    async def extract(self, file_path: str) -> ExtractionResult:
        """
        Extract text from DOCX file.
        
        Args:
            file_path: Path to the DOCX file
            
        Returns:
            ExtractionResult with extracted text and metadata
        """
        logger.info("Extracting DOCX (stub)", file_path=file_path)
        
        # Stub implementation
        return ExtractionResult(
            success=True,
            text=f"Stub extracted text from DOCX file: {file_path}",
            metadata={
                'extractor': 'docx_stub',
                'file_path': file_path,
                'page_count': 1,
                'word_count': 10
            },
            pages=[{
                'page_number': 1,
                'text': f"Stub extracted text from DOCX file: {file_path}"
            }],
            error=None
        )