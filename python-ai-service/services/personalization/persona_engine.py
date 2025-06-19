"""
Persona-based content personalization engine.
Adapts content based on user preferences and learning style.
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import json

from core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class PersonaData:
    """User persona information"""
    user_id: str
    professional_context: Dict[str, Any]
    personal_interests: Dict[str, Any]
    learning_style: Dict[str, Any]
    content_preferences: Dict[str, Any]
    communication_tone: Dict[str, Any]


class PersonalizationEngine:
    """
    Engine for personalizing content based on user personas.
    Adapts tone, complexity, examples, and structure.
    """
    
    def __init__(self):
        self.tone_adapters = {
            'formal': self._formal_tone,
            'casual': self._casual_tone,
            'encouraging': self._encouraging_tone,
            'direct': self._direct_tone,
            'storytelling': self._storytelling_tone
        }
        
        self.complexity_levels = {
            'beginner': 1,
            'intermediate': 2,
            'advanced': 3,
            'expert': 4
        }
    
    async def personalize_content(
        self,
        content: str,
        content_type: str,
        persona: PersonaData
    ) -> str:
        """
        Personalize content based on user persona.
        
        Args:
            content: Original content
            content_type: Type of content (explanation, quiz, etc.)
            persona: User persona data
            
        Returns:
            Personalized content
        """
        # Adapt complexity
        target_complexity = self._determine_complexity(persona)
        
        # Get communication preferences
        tone = persona.communication_tone.get('preferred_tone', 'casual')
        humor = persona.communication_tone.get('humor_level', 'moderate')
        formality = persona.communication_tone.get('formality', 'balanced')
        
        # Build personalization prompt
        prompt = self._build_personalization_prompt(
            content,
            content_type,
            persona,
            target_complexity,
            tone,
            humor,
            formality
        )
        
        return prompt
    
    def _determine_complexity(self, persona: PersonaData) -> str:
        """Determine appropriate complexity level"""
        # Check academic background
        education = persona.professional_context.get('education_level', '')
        experience = persona.professional_context.get('years_experience', 0)
        
        # Map to complexity
        if 'phd' in education.lower() or experience > 10:
            return 'expert'
        elif 'master' in education.lower() or experience > 5:
            return 'advanced'
        elif 'bachelor' in education.lower() or experience > 2:
            return 'intermediate'
        else:
            return 'beginner'
    
    def _build_personalization_prompt(
        self,
        content: str,
        content_type: str,
        persona: PersonaData,
        complexity: str,
        tone: str,
        humor: str,
        formality: str
    ) -> str:
        """Build prompt for content personalization"""
        
        # Extract relevant persona details
        field = persona.professional_context.get('field', 'general')
        interests = persona.personal_interests.get('hobbies', [])
        learning_pace = persona.learning_style.get('pace', 'moderate')
        preferred_depth = persona.learning_style.get('depth', 'balanced')
        
        prompt = f"""
Personalize this {content_type} for a learner with the following profile:

LEARNER PROFILE:
- Field: {field}
- Complexity Level: {complexity}
- Learning Pace: {learning_pace}
- Preferred Depth: {preferred_depth}
- Communication Style: {tone} tone, {formality} formality, {humor} humor
- Interests: {', '.join(interests[:3]) if interests else 'general'}

PERSONALIZATION REQUIREMENTS:
1. Adjust language complexity to match {complexity} level
2. Use {tone} tone throughout
3. Include examples relevant to {field} when possible
4. Match the {learning_pace} learning pace
5. Provide {preferred_depth} depth of explanation

ORIGINAL CONTENT:
{content}

PERSONALIZED CONTENT:
"""
        
        return prompt
    
    def _formal_tone(self, text: str) -> str:
        """Apply formal tone adaptations"""
        # Placeholder for tone transformation
        return text
    
    def _casual_tone(self, text: str) -> str:
        """Apply casual tone adaptations"""
        # Placeholder for tone transformation
        return text
    
    def _encouraging_tone(self, text: str) -> str:
        """Apply encouraging tone adaptations"""
        # Placeholder for tone transformation
        return text
    
    def _direct_tone(self, text: str) -> str:
        """Apply direct tone adaptations"""
        # Placeholder for tone transformation
        return text
    
    def _storytelling_tone(self, text: str) -> str:
        """Apply storytelling tone adaptations"""
        # Placeholder for tone transformation
        return text
    
    def generate_examples(
        self,
        concept: str,
        persona: PersonaData,
        count: int = 3
    ) -> List[str]:
        """
        Generate personalized examples based on user interests.
        
        Args:
            concept: Concept to illustrate
            persona: User persona
            count: Number of examples
            
        Returns:
            List of personalized examples
        """
        field = persona.professional_context.get('field', '')
        interests = persona.personal_interests.get('hobbies', [])
        
        # Build example generation prompt
        prompt = f"""
Generate {count} examples to illustrate "{concept}" that would resonate with someone who:
- Works in: {field}
- Has interests in: {', '.join(interests[:3])}

Make the examples practical and relatable to their background.
"""
        
        return [prompt]  # Placeholder
    
    def adapt_structure(
        self,
        content: Dict[str, Any],
        persona: PersonaData
    ) -> Dict[str, Any]:
        """
        Adapt content structure based on learning preferences.
        
        Args:
            content: Structured content
            persona: User persona
            
        Returns:
            Adapted content structure
        """
        learning_format = persona.learning_style.get('preferred_format', 'mixed')
        
        if learning_format == 'visual':
            # Emphasize diagrams, charts, visual elements
            content['emphasis'] = 'visual'
            content['diagram_priority'] = 'high'
            
        elif learning_format == 'textual':
            # Focus on written explanations
            content['emphasis'] = 'text'
            content['detail_level'] = 'high'
            
        elif learning_format == 'interactive':
            # Add more interactive elements
            content['emphasis'] = 'interactive'
            content['exercise_frequency'] = 'high'
            
        return content