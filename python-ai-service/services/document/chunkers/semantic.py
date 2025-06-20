"""
Semantic text chunking using spaCy.
Provides intelligent NLP-based chunking.
"""

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    spacy = None
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import re

from core.logging import get_logger
from services.document.chunkers.base import BaseChunker, Chunk, ChunkingOptions

logger = get_logger(__name__)


@dataclass
class SemanticUnit:
    """Represents a semantic unit of text"""
    text: str
    start_idx: int
    end_idx: int
    unit_type: str  # sentence, paragraph, section
    importance: float = 1.0
    entities: List[str] = None
    
    def __post_init__(self):
        if self.entities is None:
            self.entities = []


class SemanticChunker(BaseChunker):
    """
    Advanced semantic chunking using spaCy NLP.
    Creates chunks based on semantic boundaries and coherence.
    """
    
    def __init__(self, model_name: str = "en_core_web_sm"):
        if not SPACY_AVAILABLE:
            logger.warning("spaCy not available, semantic chunking will fall back to simple sentence splitting")
            self.nlp = None
            return
            
        try:
            self.nlp = spacy.load(model_name)
        except OSError:
            logger.warning(
                f"spaCy model {model_name} not found, semantic chunking will fall back to simple sentence splitting"
            )
            self.nlp = None
            return
        
        # Increase max_length for processing large documents
        # Default is 1,000,000 characters, we'll set it to 10,000,000
        self.nlp.max_length = 10_000_000
        
        # Add sentencizer for better sentence boundary detection
        if 'sentencizer' not in self.nlp.pipe_names:
            self.nlp.add_pipe('sentencizer')
    
    async def chunk(
        self,
        text: str,
        options: ChunkingOptions
    ) -> List[Chunk]:
        """
        Chunk text using semantic analysis.
        
        Args:
            text: Text to chunk
            options: Chunking configuration
            
        Returns:
            List of semantic chunks
        """
        # Fallback to simple sentence splitting if spaCy not available
        if self.nlp is None:
            return self._fallback_chunk(text, options)
            
        # Check if text is too large for single processing
        if len(text) > self.nlp.max_length:
            logger.info(
                f"Text too large ({len(text)} chars), processing in sections"
            )
            return await self._chunk_large_text(text, options)
        
        # Process text with spaCy
        doc = self.nlp(text)
        
        # Extract semantic units
        units = self._extract_semantic_units(doc, text)
        
        # Group units into chunks
        chunks = self._group_into_chunks(units, options)
        
        # Add metadata to chunks
        chunks = self._enhance_with_metadata(chunks, doc)
        
        return chunks
    
    def _extract_semantic_units(
        self,
        doc: Any,
        original_text: str
    ) -> List[SemanticUnit]:
        """Extract semantic units from document"""
        units = []
        
        # First, identify paragraphs
        paragraphs = self._split_paragraphs(original_text)
        
        for para_start, para_end, para_text in paragraphs:
            # Process paragraph with spaCy
            para_doc = self.nlp(para_text)
            
            # Extract sentences within paragraph
            for sent in para_doc.sents:
                # Get entities in sentence
                entities = [ent.text for ent in sent.ents]
                
                # Calculate sentence importance
                importance = self._calculate_importance(sent)
                
                unit = SemanticUnit(
                    text=sent.text.strip(),
                    start_idx=para_start + sent.start_char,
                    end_idx=para_start + sent.end_char,
                    unit_type='sentence',
                    importance=importance,
                    entities=entities
                )
                units.append(unit)
        
        return units
    
    def _split_paragraphs(self, text: str) -> List[Tuple[int, int, str]]:
        """Split text into paragraphs with positions"""
        paragraphs = []
        
        # Split by double newlines or common paragraph markers
        para_pattern = r'\n\s*\n|\r\n\s*\r\n'
        
        last_end = 0
        for match in re.finditer(para_pattern, text):
            para_text = text[last_end:match.start()].strip()
            if para_text:
                paragraphs.append((last_end, match.start(), para_text))
            last_end = match.end()
        
        # Don't forget the last paragraph
        if last_end < len(text):
            para_text = text[last_end:].strip()
            if para_text:
                paragraphs.append((last_end, len(text), para_text))
        
        return paragraphs
    
    def _calculate_importance(self, sent: Any) -> float:
        """
        Calculate sentence importance based on various factors.
        Higher scores indicate more important sentences.
        """
        importance = 1.0
        
        # Boost for sentences with named entities
        if sent.ents:
            importance *= 1.2
        
        # Boost for sentences with numbers/statistics
        has_numbers = any(token.like_num for token in sent)
        if has_numbers:
            importance *= 1.1
        
        # Boost for definition-like patterns
        definition_patterns = [
            r'\bis\s+(?:a|an|the)\b',
            r'\bdefin(?:e|ed|ition)\b',
            r'\bmeans?\b',
            r'\brefers?\s+to\b'
        ]
        
        sent_lower = sent.text.lower()
        for pattern in definition_patterns:
            if re.search(pattern, sent_lower):
                importance *= 1.3
                break
        
        # Penalty for very short sentences
        if len(sent) < 5:
            importance *= 0.8
        
        return importance
    
    def _group_into_chunks(
        self,
        units: List[SemanticUnit],
        options: ChunkingOptions
    ) -> List[Chunk]:
        """
        Group semantic units into chunks.
        Uses dynamic programming for optimal grouping.
        """
        chunks = []
        current_chunk_units = []
        current_size = 0
        
        for unit in units:
            unit_size = len(unit.text)
            
            # Check if adding this unit exceeds max size
            if current_size + unit_size > options.max_chunk_size and current_chunk_units:
                # Create chunk from current units
                chunk = self._create_chunk_from_units(
                    current_chunk_units,
                    len(chunks)
                )
                chunks.append(chunk)
                
                # Start new chunk with overlap if specified
                if options.chunk_overlap > 0:
                    # Keep last few units for overlap
                    overlap_units = self._get_overlap_units(
                        current_chunk_units,
                        options.chunk_overlap
                    )
                    current_chunk_units = overlap_units
                    current_size = sum(len(u.text) for u in overlap_units)
                else:
                    current_chunk_units = []
                    current_size = 0
            
            # Add unit to current chunk
            current_chunk_units.append(unit)
            current_size += unit_size
        
        # Don't forget the last chunk
        if current_chunk_units:
            chunk = self._create_chunk_from_units(
                current_chunk_units,
                len(chunks)
            )
            chunks.append(chunk)
        
        return chunks
    
    def _create_chunk_from_units(
        self,
        units: List[SemanticUnit],
        chunk_index: int
    ) -> Chunk:
        """Create a chunk from semantic units"""
        # Combine text
        text = ' '.join(unit.text for unit in units)
        
        # Collect all entities
        all_entities = []
        for unit in units:
            all_entities.extend(unit.entities)
        
        # Calculate average importance
        avg_importance = sum(u.importance for u in units) / len(units)
        
        # Determine chunk type based on units
        chunk_type = self._determine_chunk_type(units)
        
        return Chunk(
            content=text,
            metadata={
                'chunk_index': chunk_index,
                'type': chunk_type,
                'importance': self._importance_to_string(avg_importance),
                'entities': list(set(all_entities)),  # Unique entities
                'sentence_count': len(units),
                'start_position': units[0].start_idx,
                'end_position': units[-1].end_idx
            }
        )
    
    def _get_overlap_units(
        self,
        units: List[SemanticUnit],
        overlap_size: int
    ) -> List[SemanticUnit]:
        """Get units for overlap based on character count"""
        overlap_units = []
        total_size = 0
        
        # Add units from the end until we reach overlap size
        for unit in reversed(units):
            overlap_units.insert(0, unit)
            total_size += len(unit.text)
            if total_size >= overlap_size:
                break
        
        return overlap_units
    
    def _determine_chunk_type(self, units: List[SemanticUnit]) -> str:
        """Determine chunk type based on content"""
        # Simple heuristics - can be enhanced
        text = ' '.join(u.text for u in units)
        
        if re.search(r'^(Chapter|Section|\d+\.)\s', text):
            return 'section_header'
        elif any('definition' in u.text.lower() for u in units):
            return 'definition'
        elif any(u.entities for u in units):
            return 'informational'
        else:
            return 'narrative'
    
    def _importance_to_string(self, importance: float) -> str:
        """Convert importance score to string category"""
        if importance >= 1.2:
            return 'high'
        elif importance >= 0.9:
            return 'medium'
        else:
            return 'low'
    
    def _enhance_with_metadata(
        self,
        chunks: List[Chunk],
        doc: Any
    ) -> List[Chunk]:
        """Enhance chunks with additional NLP-derived metadata"""
        # Extract document-level entities
        doc_entities = [(ent.text, ent.label_) for ent in doc.ents]
        
        # Extract key concepts (most frequent noun phrases)
        noun_phrases = [chunk.text for chunk in doc.noun_chunks]
        concept_freq = {}
        for np in noun_phrases:
            np_lower = np.lower()
            concept_freq[np_lower] = concept_freq.get(np_lower, 0) + 1
        
        # Get top concepts
        top_concepts = sorted(
            concept_freq.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        # Add document-level metadata to each chunk
        for chunk in chunks:
            chunk.metadata['document_entities'] = doc_entities[:5]
            chunk.metadata['document_concepts'] = [c[0] for c in top_concepts[:5]]
        
        return chunks
    
    async def _chunk_large_text(
        self,
        text: str,
        options: ChunkingOptions
    ) -> List[Chunk]:
        """
        Handle texts that exceed spaCy's max_length by processing in sections.
        """
        # If spaCy not available, use fallback
        if self.nlp is None:
            return self._fallback_chunk(text, options)
            
        chunks = []
        
        # Split text into manageable sections
        # Use a safe size that's well below the max_length
        safe_size = int(self.nlp.max_length * 0.8)  # 80% of max_length
        
        # Find paragraph boundaries for clean splits
        paragraphs = self._split_paragraphs(text)
        
        current_section = ""
        current_start = 0
        section_paragraphs = []
        
        for para_start, para_end, para_text in paragraphs:
            # Check if adding this paragraph would exceed safe size
            if len(current_section) + len(para_text) > safe_size and current_section:
                # Process current section
                section_chunks = await self._process_section(
                    current_section,
                    section_paragraphs,
                    options
                )
                chunks.extend(section_chunks)
                
                # Start new section
                current_section = para_text
                current_start = para_start
                section_paragraphs = [(para_start, para_end, para_text)]
            else:
                # Add to current section
                if current_section:
                    current_section += "\n\n" + para_text
                else:
                    current_section = para_text
                    current_start = para_start
                section_paragraphs.append((para_start, para_end, para_text))
        
        # Process final section
        if current_section:
            section_chunks = await self._process_section(
                current_section,
                section_paragraphs,
                options
            )
            chunks.extend(section_chunks)
        
        # Renumber chunks sequentially
        for idx, chunk in enumerate(chunks):
            chunk.metadata['chunk_index'] = idx
        
        return chunks
    
    async def _process_section(
        self,
        section_text: str,
        section_paragraphs: List[Tuple[int, int, str]],
        options: ChunkingOptions
    ) -> List[Chunk]:
        """
        Process a section of text that fits within spaCy's limits.
        """
        # Process with spaCy
        doc = self.nlp(section_text)
        
        # Extract semantic units for this section
        units = []
        offset = section_paragraphs[0][0] if section_paragraphs else 0
        
        for para_idx, (para_start, para_end, para_text) in enumerate(section_paragraphs):
            # Process paragraph with spaCy
            para_doc = self.nlp(para_text)
            
            # Extract sentences within paragraph
            for sent in para_doc.sents:
                # Get entities in sentence
                entities = [ent.text for ent in sent.ents]
                
                # Calculate sentence importance
                importance = self._calculate_importance(sent)
                
                unit = SemanticUnit(
                    text=sent.text.strip(),
                    start_idx=para_start + sent.start_char,
                    end_idx=para_start + sent.end_char,
                    unit_type='sentence',
                    importance=importance,
                    entities=entities
                )
                units.append(unit)
        
        # Group units into chunks
        chunks = self._group_into_chunks(units, options)
        
        # Add basic metadata (full document metadata will be limited)
        for chunk in chunks:
            chunk.metadata['section_processed'] = True
        
        return chunks
    
    def _fallback_chunk(self, text: str, options: ChunkingOptions) -> List[Chunk]:
        """
        Simple fallback chunking when spaCy is not available.
        Uses basic sentence splitting and size-based chunking.
        """
        import re
        
        # Simple sentence splitting using regex
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        chunks = []
        current_chunk = ""
        current_start = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # Check if adding this sentence would exceed chunk size
            if (len(current_chunk) + len(sentence) + 1 > options.max_size and 
                current_chunk and 
                len(current_chunk) >= options.min_size):
                
                # Create chunk from current content
                chunk = Chunk(
                    text=current_chunk.strip(),
                    start_idx=current_start,
                    end_idx=current_start + len(current_chunk),
                    chunk_index=len(chunks),
                    metadata={
                        'chunking_method': 'fallback_sentence',
                        'sentence_count': current_chunk.count('.') + current_chunk.count('!') + current_chunk.count('?'),
                        'spacy_available': False
                    }
                )
                chunks.append(chunk)
                
                # Start new chunk
                current_chunk = sentence
                current_start = text.find(sentence, current_start + len(current_chunk))
            else:
                # Add sentence to current chunk
                if current_chunk:
                    current_chunk += " " + sentence
                else:
                    current_chunk = sentence
                    current_start = text.find(sentence, current_start)
        
        # Add final chunk if any content remains
        if current_chunk.strip():
            chunk = Chunk(
                text=current_chunk.strip(),
                start_idx=current_start,
                end_idx=current_start + len(current_chunk),
                chunk_index=len(chunks),
                metadata={
                    'chunking_method': 'fallback_sentence',
                    'sentence_count': current_chunk.count('.') + current_chunk.count('!') + current_chunk.count('?'),
                    'spacy_available': False
                }
            )
            chunks.append(chunk)
        
        return chunks