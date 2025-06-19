"""
Stub text document extractor.
Minimal implementation to get the service running.
"""

from typing import Dict, Any
from services.document.extractors.base import BaseExtractor, ExtractionResult
from core.logging import get_logger

logger = get_logger(__name__)


class TextExtractor(BaseExtractor):
    """
    Stub extractor for text documents (TXT, MD, etc.).
    """
    
    async def extract(self, file_path: str) -> ExtractionResult:
        """
        Extract text from text file.
        
        Args:
            file_path: Path to the text file
            
        Returns:
            ExtractionResult with extracted text and metadata
        """
        logger.info("Extracting text file (stub)", file_path=file_path)
        
        try:
            # For stub, try to read the actual file if it exists
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
                
            return ExtractionResult(
                success=True,
                text=text,
                metadata={
                    'extractor': 'text',
                    'file_path': file_path,
                    'char_count': len(text),
                    'line_count': text.count('\n') + 1
                },
                error=None
            )
        except Exception as e:
            # If file doesn't exist or can't be read, return stub content
            logger.warning(f"Could not read file, returning stub: {e}")
            return ExtractionResult(
                success=True,
                text=f"Stub extracted text from text file: {file_path}",
                metadata={
                    'extractor': 'text_stub',
                    'file_path': file_path
                },
                error=None
            )