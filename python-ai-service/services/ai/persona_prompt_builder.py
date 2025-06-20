"""
Persona Prompt Builder Module
Builds persona-aware prompts for AI content generation with chunk-based content.
Handles missing/incomplete persona data gracefully and creates output-specific prompts.
"""

from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
from enum import Enum
import json


class OutputType(Enum):
    """Supported output types for content generation"""
    EXPLAIN = "explain"
    FLASHCARDS = "flashcards"
    SUMMARY = "summary"
    QUIZ = "quiz"
    EXAMPLES = "examples"
    PRACTICE = "practice"
    OUTLINE = "outline"


class LearningStyleType(Enum):
    """Learning style preferences"""
    VISUAL = "visual"
    AUDITORY = "auditory"
    READING = "reading"
    KINESTHETIC = "kinesthetic"
    MIXED = "mixed"


@dataclass
class PersonaContext:
    """Structured persona context for prompt building"""
    technical_level: str = "intermediate"
    learning_style: str = "mixed"
    communication_tone: str = "professional"
    content_density: str = "moderate"
    industry: Optional[str] = None
    interests: List[str] = None
    goals: List[str] = None
    
    def __post_init__(self):
        if self.interests is None:
            self.interests = []
        if self.goals is None:
            self.goals = []


class PersonaPromptBuilder:
    """
    Builds persona-aware prompts for AI content generation.
    Handles missing persona data and creates output-specific prompts.
    """
    
    def __init__(self):
        self.default_persona = PersonaContext()
        self.output_templates = self._initialize_output_templates()
        self.learning_style_emphasis = self._initialize_learning_styles()
    
    def build_prompt(
        self,
        chunks: List[str],
        output_type: Union[str, OutputType],
        persona_data: Optional[Dict[str, Any]] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Build a persona-aware prompt for content generation.
        
        Args:
            chunks: List of content chunks/embeddings
            output_type: Type of output to generate
            persona_data: Raw persona data from database
            additional_context: Any additional context for generation
            
        Returns:
            Complete prompt string for AI generation
        """
        # Validate and convert output type
        if isinstance(output_type, str):
            try:
                output_type = OutputType(output_type.lower())
            except ValueError:
                output_type = OutputType.EXPLAIN
        
        # Extract persona context
        persona_context = self._extract_persona_context(persona_data)
        
        # Build content context from chunks
        content_context = self._build_content_context(chunks)
        
        # Get output-specific template
        template = self.output_templates.get(output_type, self.output_templates[OutputType.EXPLAIN])
        
        # Build the complete prompt
        prompt = self._construct_prompt(
            template=template,
            content_context=content_context,
            persona_context=persona_context,
            output_type=output_type,
            additional_context=additional_context
        )
        
        return prompt
    
    def _extract_persona_context(self, persona_data: Optional[Dict[str, Any]]) -> PersonaContext:
        """Extract and validate persona context from database object"""
        if not persona_data:
            return self.default_persona
        
        # Safely extract professional context
        prof_context = persona_data.get('professional_context', {}) or {}
        technical_level = prof_context.get('technicalLevel', 'intermediate')
        industry = prof_context.get('industry')
        
        # Safely extract learning style
        learning_data = persona_data.get('learning_style', {}) or {}
        learning_style = learning_data.get('primary', 'mixed')
        
        # Safely extract content preferences
        content_prefs = persona_data.get('content_preferences', {}) or {}
        content_density = content_prefs.get('density', 'moderate')
        
        # Safely extract communication tone
        comm_tone = persona_data.get('communication_tone', {}) or {}
        tone = comm_tone.get('style', 'professional')
        
        # Safely extract interests and goals
        personal_interests = persona_data.get('personal_interests', {}) or {}
        interests = personal_interests.get('learningTopics', [])
        
        # Create persona context
        return PersonaContext(
            technical_level=technical_level,
            learning_style=learning_style,
            communication_tone=tone,
            content_density=content_density,
            industry=industry,
            interests=interests[:5] if interests else [],  # Limit to top 5
            goals=prof_context.get('careerAspirations', '').split(',')[:3] if prof_context.get('careerAspirations') else []
        )
    
    def _build_content_context(self, chunks: List[str]) -> str:
        """Build formatted content context from chunks"""
        if not chunks:
            return "No content provided."
        
        # Combine chunks with markers
        combined_chunks = []
        for i, chunk in enumerate(chunks[:10]):  # Limit to 10 chunks
            combined_chunks.append(f"[Chunk {i+1}]\n{chunk}")
        
        return "\n\n".join(combined_chunks)
    
    def _construct_prompt(
        self,
        template: str,
        content_context: str,
        persona_context: PersonaContext,
        output_type: OutputType,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Construct the final prompt with all components"""
        # Build persona description
        persona_desc = self._build_persona_description(persona_context)
        
        # Get learning style emphasis
        learning_emphasis = self.learning_style_emphasis.get(
            persona_context.learning_style,
            self.learning_style_emphasis['mixed']
        )
        
        # Build the complete prompt
        prompt_parts = [
            f"You are a master storyteller creating deeply personalized {output_type.value} content.",
            "",
            "LEARNER PROFILE:",
            persona_desc,
            "",
            "LEARNING STYLE EMPHASIS:",
            learning_emphasis,
            "",
            "STORYTELLING APPROACH:",
            f"Create content that feels like it was written by a mentor who deeply understands this learner.",
            f"Use narratives, analogies, and examples specifically from their world: {persona_context.industry or 'their field'}.",
            f"Connect to their interests: {', '.join(persona_context.interests[:3]) if persona_context.interests else 'their passions'}.",
            f"Relate everything to their journey toward: {', '.join(persona_context.goals[:2]) if persona_context.goals else 'their aspirations'}.",
            "",
            "CONTENT TO TRANSFORM INTO A PERSONAL NARRATIVE:",
            content_context,
            "",
            "CREATION GUIDELINES:",
            template,
        ]
        
        # Add additional context if provided
        if additional_context:
            prompt_parts.extend([
                "",
                "ADDITIONAL REQUIREMENTS:",
                self._format_additional_context(additional_context)
            ])
        
        # Add output format reminder
        prompt_parts.extend([
            "",
            f"Transform this technical content into a compelling personal narrative that will resonate deeply with this specific learner.",
            f"Make them feel seen, understood, and excited about their learning journey.",
            f"Every sentence should feel like it was written specifically for them."
        ])
        
        return "\n".join(prompt_parts)
    
    def _build_persona_description(self, persona: PersonaContext) -> str:
        """Build a natural language description of the persona"""
        desc_parts = [
            f"Technical Level: {persona.technical_level}",
            f"Primary Learning Style: {persona.learning_style}",
            f"Preferred Communication Tone: {persona.communication_tone}",
            f"Content Density Preference: {persona.content_density}",
        ]
        
        if persona.industry:
            desc_parts.append(f"Industry/Field: {persona.industry}")
        
        if persona.interests:
            desc_parts.append(f"Learning Interests: {', '.join(persona.interests)}")
        
        if persona.goals:
            desc_parts.append(f"Learning Goals: {', '.join(persona.goals)}")
        
        return "\n".join(desc_parts)
    
    def _format_additional_context(self, context: Dict[str, Any]) -> str:
        """Format additional context into readable requirements"""
        formatted_parts = []
        for key, value in context.items():
            if isinstance(value, list):
                formatted_parts.append(f"{key}: {', '.join(str(v) for v in value)}")
            else:
                formatted_parts.append(f"{key}: {value}")
        return "\n".join(formatted_parts)
    
    def _initialize_output_templates(self) -> Dict[OutputType, str]:
        """Initialize output-specific prompt templates"""
        return {
            OutputType.EXPLAIN: """
Create a deeply personalized, narrative-driven explanation that:
1. Opens with a relatable story or analogy from the learner's industry/interests
2. Weaves technical concepts through personal narratives and real-world scenarios
3. Uses emotional engagement and storytelling to make complex ideas memorable
4. Incorporates specific examples from their professional context and aspirations
5. Creates "aha moments" by connecting abstract concepts to their daily experiences
6. Uses metaphors and analogies that resonate with their interests and background
7. Maintains a conversational, engaging tone throughout
8. Builds understanding through a journey, not just facts
9. Relates everything back to their career goals and personal growth
10. Makes them feel like the content was written specifically for them

The explanation should feel like a personal mentor sharing wisdom, not a textbook.
Use storytelling techniques, personal anecdotes (hypothetical but relatable), and 
create an emotional connection to the material.""",
            
            OutputType.FLASHCARDS: """
Create flashcards that:
1. Use terminology appropriate for their technical level
2. Include memory aids suited to their learning style
3. Focus on concepts relevant to their interests/goals
4. Use concise language matching their density preference
5. Include 5-10 cards covering key concepts""",
            
            OutputType.SUMMARY: """
Create a summary that:
1. Matches their preferred content density
2. Highlights points relevant to their industry/interests
3. Uses their preferred communication tone
4. Organizes information for their learning style
5. Focuses on practical applications for their goals""",
            
            OutputType.QUIZ: """
Create quiz questions that:
1. Match their technical level difficulty
2. Include scenarios from their industry if applicable
3. Test understanding in ways suited to their learning style
4. Provide feedback in their preferred tone
5. Include 5-8 questions with explanations""",
            
            OutputType.EXAMPLES: """
Create practical examples that:
1. Relate to their industry or interests
2. Match their technical understanding level
3. Appeal to their primary learning style
4. Use familiar contexts from their background
5. Include 3-5 diverse, relevant examples""",
            
            OutputType.PRACTICE: """
Create practice exercises that:
1. Match their current skill level
2. Progress at a pace suited to their preferences
3. Include hands-on elements for kinesthetic learners
4. Provide feedback in their preferred tone
5. Build toward their stated learning goals""",
            
            OutputType.OUTLINE: """
Create a structured outline that:
1. Organizes content for their learning style
2. Uses headings at their comprehension level
3. Includes depth matching their density preference
4. Highlights connections to their interests/goals
5. Provides a clear learning pathway"""
        }
    
    def _initialize_learning_styles(self) -> Dict[str, str]:
        """Initialize learning style emphasis guidelines"""
        return {
            'visual': """Paint vivid pictures with words. Create mental images through rich descriptions and visual metaphors. 
Use storytelling that helps them 'see' the concepts. Structure content like a visual journey with clear landmarks.""",
            
            'auditory': """Write as if you're having a personal conversation. Use rhythm, repetition, and memorable phrases. 
Include dialogue, quotes, and conversational examples. Make it feel like a mentor speaking directly to them.""",
            
            'reading': """Craft rich, detailed narratives with depth and nuance. Use eloquent language and comprehensive storytelling. 
Build understanding through well-crafted prose that engages their love of reading.""",
            
            'kinesthetic': """Create action-oriented narratives. Use examples where they can imagine themselves doing things. 
Include stories of hands-on experiences and practical applications. Make them feel the concepts through active scenarios.""",
            
            'mixed': """Blend all storytelling techniques - paint pictures, create conversations, craft narratives, and include action. 
Use varied approaches to create a rich, multi-dimensional learning experience."""
        }


# Utility function for external use
def create_persona_prompt(
    chunks: List[str],
    output_type: str,
    persona_data: Optional[Dict[str, Any]] = None,
    **kwargs
) -> str:
    """
    Convenience function to create a persona-aware prompt.
    
    Args:
        chunks: Content chunks to process
        output_type: Type of output to generate
        persona_data: User persona information
        **kwargs: Additional context parameters
        
    Returns:
        Generated prompt string
    """
    builder = PersonaPromptBuilder()
    return builder.build_prompt(
        chunks=chunks,
        output_type=output_type,
        persona_data=persona_data,
        additional_context=kwargs if kwargs else None
    )