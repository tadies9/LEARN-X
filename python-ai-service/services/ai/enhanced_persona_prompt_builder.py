"""
Enhanced Persona Prompt Builder Module
Builds subject-aware, naturally personalized prompts with balanced content.
Following LEARN-X coding standards - file under 300 lines
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum


class SubjectCategory(Enum):
    """Categories of subjects with different balance requirements"""
    TECHNICAL = "technical"  # Finance, Math, Programming
    CREATIVE = "creative"    # Arts, Literature, Music
    APPLIED = "applied"      # Business, Psychology, Marketing
    SCIENTIFIC = "scientific" # Biology, Chemistry, Physics


@dataclass
class ContentBalance:
    """Defines the balance between core concepts and personalization"""
    core_concepts_ratio: float
    personalization_ratio: float
    requires_precision: bool
    example_frequency: str  # 'high', 'medium', 'low'


class EnhancedPersonaPromptBuilder:
    """
    Enhanced prompt builder with subject-aware personalization balance.
    Ensures technical subjects maintain accuracy while being engaging.
    """
    
    def __init__(self):
        self.subject_patterns = self._initialize_subject_patterns()
        self.balance_configs = self._initialize_balance_configs()
        
    def build_enhanced_prompt(
        self,
        chunks: List[str],
        output_type: str,
        persona_data: Dict[str, Any],
        subject_area: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Build an enhanced, subject-aware personalized prompt.
        
        Args:
            chunks: Content chunks to process
            output_type: Type of output (explain, quiz, etc.)
            persona_data: User persona information
            subject_area: Optional subject area for better categorization
            additional_context: Additional generation context
            
        Returns:
            Enhanced prompt with natural personalization
        """
        # Detect subject if not provided
        if not subject_area:
            subject_area = self._detect_subject(chunks)
            
        # Get subject category and balance
        category = self._categorize_subject(subject_area)
        balance = self.balance_configs[category]
        
        # Extract user interests and primary interest
        personal_interests = persona_data.get('personal_interests', {}) or {}
        primary_interest = self._get_primary_interest(personal_interests)
        
        # Extract other persona details
        comm_tone = persona_data.get('communication_tone', {}) or {}
        tone_style = comm_tone.get('style', 'professional')
        learning_style = persona_data.get('learning_style', {}) or {}
        primary_learning = learning_style.get('primary', 'mixed')
        
        # Build the enhanced prompt
        prompt = self._construct_enhanced_prompt(
            chunks=chunks,
            output_type=output_type,
            subject_area=subject_area,
            category=category,
            balance=balance,
            primary_interest=primary_interest,
            tone_style=tone_style,
            primary_learning=primary_learning,
            additional_context=additional_context
        )
        
        return prompt
    
    def _detect_subject(self, chunks: List[str]) -> str:
        """Detect subject area from content chunks"""
        combined_text = ' '.join(chunks[:3]).lower()  # Check first 3 chunks
        
        # Count matches for each subject pattern
        subject_scores = {}
        for subject, patterns in self.subject_patterns.items():
            score = sum(1 for pattern in patterns if pattern in combined_text)
            if score > 0:
                subject_scores[subject] = score
        
        # Return highest scoring subject or 'general'
        if subject_scores:
            return max(subject_scores.items(), key=lambda x: x[1])[0]
        return 'general'
    
    def _categorize_subject(self, subject: str) -> SubjectCategory:
        """Categorize subject into broad categories"""
        subject_lower = subject.lower()
        
        # Technical subjects
        if any(tech in subject_lower for tech in ['finance', 'math', 'accounting', 'programming', 'statistics', 'economics']):
            return SubjectCategory.TECHNICAL
            
        # Creative subjects
        if any(creative in subject_lower for creative in ['art', 'literature', 'music', 'design', 'writing', 'poetry']):
            return SubjectCategory.CREATIVE
            
        # Scientific subjects
        if any(sci in subject_lower for sci in ['biology', 'chemistry', 'physics', 'science', 'medical']):
            return SubjectCategory.SCIENTIFIC
            
        # Applied subjects (default)
        return SubjectCategory.APPLIED
    
    def _get_primary_interest(self, personal_interests: Dict[str, Any]) -> str:
        """Extract primary interest from persona data"""
        primary_interests = personal_interests.get('primary', [])
        if primary_interests and len(primary_interests) > 0:
            return primary_interests[0]
        return 'your personal experiences'
    
    def _construct_enhanced_prompt(
        self,
        chunks: List[str],
        output_type: str,
        subject_area: str,
        category: SubjectCategory,
        balance: ContentBalance,
        primary_interest: str,
        tone_style: str,
        primary_learning: str,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Construct the enhanced prompt with all components"""
        
        # Get subject-specific instructions
        subject_instructions = self._get_subject_instructions(category, balance)
        
        # Build content context
        content_context = self._build_content_context(chunks)
        
        # Calculate percentages for clarity
        core_percent = int(balance.core_concepts_ratio * 100)
        personal_percent = int(balance.personalization_ratio * 100)
        
        prompt_parts = [
            f"You are creating {output_type} content for {subject_area}.",
            "",
            "CRITICAL BALANCE REQUIREMENTS:",
            f"- {core_percent}% focus on CORE CONCEPTS and accurate information",
            f"- {personal_percent}% personalization through relatable connections",
            f"- Precision Required: {'YES - include exact numbers, formulas, definitions' if balance.requires_precision else 'NO - focus on conceptual understanding'}",
            "",
            "USER PROFILE:",
            f"- Primary Interest: {primary_interest}",
            f"- Communication Style: {tone_style}",
            f"- Learning Style: {primary_learning}",
            "",
            "NATURAL PERSONALIZATION APPROACH:",
            f"1. START with a {primary_interest} scenario that naturally connects to the topic",
            f"2. NEVER announce the personalization (avoid 'Since you like {primary_interest}...')",
            f"3. WEAVE connections naturally - as if discussing with someone who shares this interest",
            f"4. RETURN to core {subject_area} concepts regularly throughout",
            f"5. Use vocabulary from both {primary_interest} AND {subject_area} naturally",
            "",
            subject_instructions,
            "",
            "CONTENT TO TRANSFORM:",
            content_context,
            "",
            "Remember: The goal is deep understanding through natural connection, not forced analogies.",
            f"Make it feel like learning {subject_area} from someone who happens to share their passion for {primary_interest}."
        ]
        
        # Add additional context if provided
        if additional_context:
            prompt_parts.extend([
                "",
                "ADDITIONAL CONTEXT:",
                self._format_additional_context(additional_context)
            ])
        
        return "\n".join(prompt_parts)
    
    def _get_subject_instructions(self, category: SubjectCategory, _balance: ContentBalance) -> str:
        """Get category-specific instructions"""
        instructions = {
            SubjectCategory.TECHNICAL: """
TECHNICAL SUBJECT REQUIREMENTS:
- Include ACTUAL numbers, formulas, calculations, and precise definitions
- Use analogies to INTRODUCE concepts, then provide exact technical details
- Structure: Personal Hook → Technical Definition → Calculation/Example → Application
- Example: "Just like tracking shooting percentages... ROI = (Gain - Cost) / Cost × 100%"
- ALWAYS return to concrete numbers and verifiable facts""",
            
            SubjectCategory.CREATIVE: """
CREATIVE SUBJECT REQUIREMENTS:
- Let concepts emerge through narrative and exploration
- Use rich metaphors and storytelling throughout
- Structure: Story → Concept → Deeper Exploration → Personal Meaning
- Encourage personal interpretation while teaching fundamentals
- Balance creative expression with foundational knowledge""",
            
            SubjectCategory.SCIENTIFIC: """
SCIENTIFIC SUBJECT REQUIREMENTS:
- Start with observable phenomena from their world
- Build to scientific principles with proper terminology
- Include actual data, measurements, and scientific method
- Structure: Observation → Hypothesis → Scientific Explanation → Evidence
- Maintain scientific accuracy while making it relatable""",
            
            SubjectCategory.APPLIED: """
APPLIED SUBJECT REQUIREMENTS:
- Focus on practical applications and real-world scenarios
- Balance theory with actionable insights
- Use case studies and examples from their interest area
- Structure: Situation → Theory → Application → Results
- Emphasize 'how to use this' throughout"""
        }
        
        return instructions.get(category, instructions[SubjectCategory.APPLIED])
    
    def _build_content_context(self, chunks: List[str]) -> str:
        """Build formatted content context from chunks"""
        if not chunks:
            return "No content provided."
        
        combined_chunks = []
        for i, chunk in enumerate(chunks[:20]):  # Allow more chunks with smart selection
            if chunk.strip():
                combined_chunks.append(f"[Section {i+1}]\n{chunk}")
        
        return "\n\n".join(combined_chunks)
    
    def _format_additional_context(self, context: Dict[str, Any]) -> str:
        """Format additional context"""
        formatted_parts = []
        for key, value in context.items():
            if isinstance(value, list):
                formatted_parts.append(f"{key}: {', '.join(str(v) for v in value)}")
            else:
                formatted_parts.append(f"{key}: {value}")
        return "\n".join(formatted_parts)
    
    def _initialize_subject_patterns(self) -> Dict[str, List[str]]:
        """Initialize patterns for subject detection"""
        return {
            'finance': ['stock', 'investment', 'portfolio', 'market', 'trading', 'equity', 'bond', 'roi'],
            'mathematics': ['equation', 'formula', 'calculate', 'theorem', 'proof', 'variable', 'function'],
            'programming': ['code', 'function', 'variable', 'algorithm', 'loop', 'class', 'method', 'api'],
            'biology': ['cell', 'organism', 'dna', 'evolution', 'ecosystem', 'species', 'metabolism'],
            'psychology': ['behavior', 'cognitive', 'emotion', 'personality', 'perception', 'memory'],
            'business': ['strategy', 'marketing', 'management', 'customer', 'revenue', 'operations'],
            'art': ['design', 'color', 'composition', 'aesthetic', 'creative', 'style', 'technique'],
            'literature': ['narrative', 'character', 'plot', 'theme', 'symbolism', 'genre', 'author'],
        }
    
    def _initialize_balance_configs(self) -> Dict[SubjectCategory, ContentBalance]:
        """Initialize content balance configurations"""
        return {
            SubjectCategory.TECHNICAL: ContentBalance(
                core_concepts_ratio=0.7,
                personalization_ratio=0.3,
                requires_precision=True,
                example_frequency='high'
            ),
            SubjectCategory.CREATIVE: ContentBalance(
                core_concepts_ratio=0.4,
                personalization_ratio=0.6,
                requires_precision=False,
                example_frequency='medium'
            ),
            SubjectCategory.SCIENTIFIC: ContentBalance(
                core_concepts_ratio=0.65,
                personalization_ratio=0.35,
                requires_precision=True,
                example_frequency='high'
            ),
            SubjectCategory.APPLIED: ContentBalance(
                core_concepts_ratio=0.55,
                personalization_ratio=0.45,
                requires_precision=False,
                example_frequency='medium'
            )
        }


# Utility function for easy integration
def create_enhanced_persona_prompt(
    chunks: List[str],
    output_type: str,
    persona_data: Dict[str, Any],
    subject_area: Optional[str] = None,
    **kwargs
) -> str:
    """Create an enhanced persona-aware prompt with subject balance"""
    builder = EnhancedPersonaPromptBuilder()
    return builder.build_enhanced_prompt(
        chunks=chunks,
        output_type=output_type,
        persona_data=persona_data,
        subject_area=subject_area,
        additional_context=kwargs if kwargs else None
    )