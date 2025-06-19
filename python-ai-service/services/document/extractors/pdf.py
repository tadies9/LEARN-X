"""
PDF text extraction using PyMuPDF.
Provides better extraction than pdf-parse in Node.js.
"""

import fitz  # PyMuPDF
from typing import List, Dict, Any, Optional, Tuple
import re

from core.logging import get_logger
from services.document.extractors.base import BaseExtractor, ExtractionResult

logger = get_logger(__name__)


class PDFExtractor(BaseExtractor):
    """
    Advanced PDF text extraction with structure preservation.
    Uses PyMuPDF for better handling of complex PDFs.
    """
    
    def __init__(self):
        self.supported_types = ['application/pdf']
        
    async def extract(self, file_path: str) -> ExtractionResult:
        """
        Extract text and metadata from PDF.
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            Extraction result with text and metadata
        """
        try:
            doc = fitz.open(file_path)
            
            # Extract metadata
            metadata = self._extract_metadata(doc)
            
            # Extract text with structure
            pages = []
            full_text = []
            
            for page_num, page in enumerate(doc):
                page_data = self._extract_page(page, page_num + 1)
                pages.append(page_data)
                full_text.append(page_data['text'])
            
            doc.close()
            
            return ExtractionResult(
                text='\n\n'.join(full_text),
                metadata=metadata,
                pages=pages,
                success=True
            )
            
        except Exception as e:
            logger.error(
                "PDF extraction failed",
                file_path=file_path,
                error=str(e)
            )
            return ExtractionResult(
                text="",
                metadata={},
                pages=[],
                success=False,
                error=str(e)
            )
    
    def _extract_metadata(self, doc: fitz.Document) -> Dict[str, Any]:
        """Extract document metadata"""
        metadata = doc.metadata
        
        return {
            'title': metadata.get('title', ''),
            'author': metadata.get('author', ''),
            'subject': metadata.get('subject', ''),
            'keywords': metadata.get('keywords', ''),
            'creator': metadata.get('creator', ''),
            'producer': metadata.get('producer', ''),
            'creation_date': str(metadata.get('creationDate', '')),
            'modification_date': str(metadata.get('modDate', '')),
            'page_count': doc.page_count,
            'is_encrypted': doc.is_encrypted,
            'is_form': doc.is_form_pdf
        }
    
    def _extract_page(self, page: fitz.Page, page_num: int) -> Dict[str, Any]:
        """Extract text and structure from a single page"""
        # Get page text with layout preservation
        text = page.get_text()
        
        # Extract text blocks for structure analysis
        blocks = page.get_text("blocks")
        
        # Identify headers, paragraphs, etc.
        structured_blocks = self._analyze_blocks(blocks)
        
        # Extract tables if present
        tables = self._extract_tables(page)
        
        # Extract images count
        image_list = page.get_images()
        
        return {
            'page_number': page_num,
            'text': text,
            'blocks': structured_blocks,
            'tables': tables,
            'image_count': len(image_list),
            'width': page.rect.width,
            'height': page.rect.height
        }
    
    def _analyze_blocks(self, blocks: List[Tuple]) -> List[Dict[str, Any]]:
        """
        Analyze text blocks to identify structure.
        Detects headers, paragraphs, lists, etc.
        """
        structured_blocks = []
        
        for block in blocks:
            if len(block) < 5:  # Skip non-text blocks
                continue
                
            x0, y0, x1, y1, text, block_no, block_type = block[:7]
            
            # Skip empty blocks
            if not text or not text.strip():
                continue
            
            # Analyze block characteristics
            block_data = {
                'text': text.strip(),
                'bbox': [x0, y0, x1, y1],
                'type': self._classify_block(text, y0, y1 - y0)
            }
            
            structured_blocks.append(block_data)
        
        return structured_blocks
    
    def _classify_block(self, text: str, y_pos: float, height: float) -> str:
        """
        Classify block type based on content and position.
        Simple heuristics for structure detection.
        """
        text = text.strip()
        
        # Check for headers (short, possibly upper position)
        if len(text) < 100 and y_pos < 200:
            if text.isupper() or re.match(r'^(Chapter|Section|\d+\.)', text):
                return 'header'
        
        # Check for list items
        if re.match(r'^[\d\-\*\•]\s', text):
            return 'list_item'
        
        # Check for footnotes (small text at bottom)
        if y_pos > 700 and len(text) < 200:
            return 'footnote'
        
        # Default to paragraph
        return 'paragraph'
    
    def _extract_tables(self, page: fitz.Page) -> List[Dict[str, Any]]:
        """
        Extract tables from PDF page.
        Basic implementation - can be enhanced with better table detection.
        """
        tables = []
        
        # PyMuPDF doesn't have built-in table extraction
        # This is a placeholder for more sophisticated table detection
        # Could integrate with libraries like camelot-py or tabula-py
        
        return tables
    
    def can_handle(self, mime_type: str) -> bool:
        """Check if this extractor can handle the file type"""
        return mime_type in self.supported_types