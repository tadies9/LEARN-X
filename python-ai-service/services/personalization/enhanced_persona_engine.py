"""
Enhanced persona-based content personalization engine.
Implements comprehensive personalization across all 5 persona dimensions.
"""

from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from enum import Enum
import json

from core.logging import get_logger

logger = get_logger(__name__)


class ContentType(Enum):
    EXPLANATION = "explanation"
    SUMMARY = "summary"
    QUIZ = "quiz"
    FLASHCARDS = "flashcards"
    OUTLINE = "outline"
    EXAMPLES = "examples"
    PRACTICE = "practice"


class LearningStyle(Enum):
    VISUAL = "visual"
    AUDITORY = "auditory"
    READING = "reading"
    KINESTHETIC = "kinesthetic"
    MIXED = "mixed"


class CommunicationTone(Enum):
    FORMAL = "formal"
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    CASUAL = "casual"
    ACADEMIC = "academic"


@dataclass
class EnhancedPersonaData:
    """Enhanced user persona with all 5 dimensions"""
    user_id: str
    
    # 1. Professional Context
    professional_context: Dict[str, Any]
    
    # 2. Personal Interests
    personal_interests: Dict[str, Any]
    
    # 3. Learning Style
    learning_style: Dict[str, Any]
    
    # 4. Content Preferences
    content_preferences: Dict[str, Any]
    
    # 5. Communication Tone
    communication_tone: Dict[str, Any]


class EnhancedPersonalizationEngine:
    """
    Advanced personalization engine that adapts content across all persona dimensions.
    Provides deep personalization for educational content.
    """
    
    def __init__(self):
        self.complexity_mapping = {
            'beginner': {
                'vocabulary_level': 'simple',
                'concept_density': 'low',
                'prerequisite_assumptions': 'minimal',
                'explanation_depth': 'surface'
            },
            'intermediate': {
                'vocabulary_level': 'moderate',
                'concept_density': 'medium',
                'prerequisite_assumptions': 'some',
                'explanation_depth': 'moderate'
            },
            'advanced': {
                'vocabulary_level': 'technical',
                'concept_density': 'high',
                'prerequisite_assumptions': 'significant',
                'explanation_depth': 'deep'
            },
            'expert': {
                'vocabulary_level': 'specialized',
                'concept_density': 'very_high',
                'prerequisite_assumptions': 'extensive',
                'explanation_depth': 'comprehensive'
            }
        }
        
        self.tone_styles = {
            'formal': {
                'greeting': 'Good day',
                'pronouns': 'one, you',
                'contractions': False,
                'exclamations': False,
                'structure': 'structured'
            },
            'professional': {
                'greeting': 'Hello',
                'pronouns': 'you, we',
                'contractions': 'minimal',
                'exclamations': 'rare',
                'structure': 'organized'
            },
            'friendly': {
                'greeting': 'Hi there',
                'pronouns': 'you, we, I',
                'contractions': True,
                'exclamations': 'moderate',
                'structure': 'conversational'
            },
            'casual': {
                'greeting': 'Hey',
                'pronouns': 'you, we, I',
                'contractions': True,
                'exclamations': 'frequent',
                'structure': 'relaxed'
            },
            'academic': {
                'greeting': 'In this study',
                'pronouns': 'we, one',
                'contractions': False,
                'exclamations': False,
                'structure': 'thesis-driven'
            }
        }
    
    async def generate_personalized_prompt(
        self,
        content: str,
        content_type: ContentType,
        persona: EnhancedPersonaData,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a comprehensive personalized prompt for AI content generation.
        
        Args:
            content: Source content to personalize
            content_type: Type of content being generated
            persona: User's comprehensive persona
            additional_context: Optional additional context
            
        Returns:
            Personalized prompt for AI generation
        """
        
        # Analyze persona dimensions
        professional_analysis = self._analyze_professional_context(persona.professional_context)
        interests_analysis = self._analyze_personal_interests(persona.personal_interests)
        learning_analysis = self._analyze_learning_style(persona.learning_style)
        content_analysis = self._analyze_content_preferences(persona.content_preferences)
        tone_analysis = self._analyze_communication_tone(persona.communication_tone)
        
        # Build comprehensive personalization instructions
        prompt = self._build_comprehensive_prompt(
            content=content,
            content_type=content_type,
            professional=professional_analysis,
            interests=interests_analysis,
            learning=learning_analysis,
            content_prefs=content_analysis,
            communication=tone_analysis,
            additional_context=additional_context
        )
        
        return prompt
    
    def _analyze_professional_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze professional context for personalization"""
        return {
            'role': context.get('role', 'general'),
            'industry': context.get('industry', 'general'),
            'experience_level': context.get('experienceYears', 0),
            'technical_level': context.get('technicalLevel', 'intermediate'),
            'career_stage': self._determine_career_stage(context),
            'domain_expertise': self._extract_domain_expertise(context),
            'workplace_context': context.get('currentStatus', 'employed')
        }
    
    def _analyze_personal_interests(self, interests: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze personal interests for personalization"""
        primary = interests.get('primary', [])
        secondary = interests.get('secondary', [])
        learning_topics = interests.get('learningTopics', [])
        
        return {
            'primary_interests': primary,
            'secondary_interests': secondary,
            'learning_topics': learning_topics,
            'interest_categories': self._categorize_interests(primary + secondary),
            'hobby_overlap': self._find_professional_overlap(interests),
            'motivation_drivers': self._identify_motivation_drivers(interests)
        }
    
    def _analyze_learning_style(self, style: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze learning style preferences"""
        primary_style = style.get('primary', 'mixed')
        secondary_style = style.get('secondary', None)
        preference_strength = style.get('preferenceStrength', 5)
        
        return {
            'primary_style': primary_style,
            'secondary_style': secondary_style,
            'preference_strength': preference_strength,
            'learning_modalities': self._get_learning_modalities(primary_style),
            'content_structure_preferences': self._get_structure_preferences(primary_style),
            'engagement_strategies': self._get_engagement_strategies(primary_style)
        }
    
    def _analyze_content_preferences(self, prefs: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze content preference settings"""
        return {
            'density': prefs.get('density', 'comprehensive'),
            'examples_per_concept': prefs.get('examplesPerConcept', 2),
            'summary_style': prefs.get('summaryStyle', 'bullet_points'),
            'detail_tolerance': prefs.get('detailTolerance', 'moderate'),
            'repetition_preference': prefs.get('repetitionPreference', 'some'),
            'pacing': self._determine_content_pacing(prefs),
            'organization_style': self._determine_organization_style(prefs)
        }
    
    def _analyze_communication_tone(self, tone: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze communication tone preferences"""
        style = tone.get('style', 'friendly')
        technical_comfort = tone.get('technicalComfort', 5)
        encouragement_level = tone.get('encouragementLevel', 'moderate')
        humor_appropriate = tone.get('humorAppropriate', True)
        
        return {
            'communication_style': style,
            'technical_comfort': technical_comfort,
            'encouragement_level': encouragement_level,
            'humor_appropriate': humor_appropriate,
            'formality_level': self._map_formality_level(style),
            'supportiveness': self._determine_supportiveness(encouragement_level),
            'directness': self._determine_directness(style)
        }
    
    def _build_comprehensive_prompt(
        self,
        content: str,
        content_type: ContentType,
        professional: Dict[str, Any],
        interests: Dict[str, Any],
        learning: Dict[str, Any],
        content_prefs: Dict[str, Any],
        communication: Dict[str, Any],
        additional_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build the comprehensive personalization prompt"""
        
        prompt_sections = []
        
        # Introduction
        prompt_sections.append(f"Create personalized {content_type.value} content for a learner with the following detailed profile:")
        
        # Professional Context Section
        prompt_sections.append(f"""
PROFESSIONAL CONTEXT:
- Role: {professional['role']} in {professional['industry']}
- Experience Level: {professional['experience_level']} years ({professional['career_stage']})
- Technical Level: {professional['technical_level']}
- Domain Expertise: {professional['domain_expertise']}
- Work Status: {professional['workplace_context']}""")
        
        # Personal Interests Section
        if interests['primary_interests']:
            prompt_sections.append(f"""
PERSONAL INTERESTS & MOTIVATION:
- Primary Interests: {', '.join(interests['primary_interests'])}
- Secondary Interests: {', '.join(interests['secondary_interests'])}
- Learning Topics: {', '.join(interests['learning_topics'])}
- Interest Categories: {', '.join(interests['interest_categories'])}
- Motivation Drivers: {interests['motivation_drivers']}""")
        
        # Learning Style Section
        prompt_sections.append(f"""
LEARNING STYLE PREFERENCES:
- Primary Learning Style: {learning['primary_style']} (strength: {learning['preference_strength']}/10)
- Secondary Style: {learning['secondary_style'] or 'None'}
- Preferred Modalities: {', '.join(learning['learning_modalities'])}
- Content Structure: {learning['content_structure_preferences']}
- Engagement Strategy: {learning['engagement_strategies']}""")
        
        # Content Preferences Section
        prompt_sections.append(f"""
CONTENT PREFERENCES:
- Information Density: {content_prefs['density']}
- Examples per Concept: {content_prefs['examples_per_concept']}
- Detail Tolerance: {content_prefs['detail_tolerance']}
- Summary Style: {content_prefs['summary_style']}
- Repetition Preference: {content_prefs['repetition_preference']}
- Pacing: {content_prefs['pacing']}
- Organization: {content_prefs['organization_style']}""")
        
        # Communication Tone Section
        prompt_sections.append(f"""
COMMUNICATION PREFERENCES:
- Communication Style: {communication['communication_style']}
- Technical Comfort: {communication['technical_comfort']}/10
- Encouragement Level: {communication['encouragement_level']}
- Humor Appropriate: {communication['humor_appropriate']}
- Formality Level: {communication['formality_level']}
- Supportiveness: {communication['supportiveness']}
- Directness: {communication['directness']}""")
        
        # Personalization Instructions
        prompt_sections.append(f"""
PERSONALIZATION REQUIREMENTS:
1. PROFESSIONAL ALIGNMENT: Use examples and terminology from {professional['industry']}/{professional['role']}
2. INTEREST INTEGRATION: Connect concepts to {', '.join(interests['primary_interests'][:2])} when relevant
3. LEARNING STYLE ADAPTATION: Emphasize {learning['primary_style']} learning approaches
4. CONTENT ADAPTATION: Provide {content_prefs['density']} content with {content_prefs['detail_tolerance']} detail level
5. TONE MATCHING: Use {communication['communication_style']} tone with {communication['formality_level']} formality
6. ENGAGEMENT: Apply {learning['engagement_strategies']} engagement techniques
7. STRUCTURE: Organize content using {content_prefs['organization_style']} structure
8. EXAMPLES: Include {content_prefs['examples_per_concept']} relevant examples per major concept""")
        
        # Content-specific instructions
        content_specific = self._get_content_specific_instructions(content_type, learning, content_prefs)
        if content_specific:
            prompt_sections.append(content_specific)
        
        # Additional context
        if additional_context:
            prompt_sections.append(f"\nADDITIONAL CONTEXT:\n{json.dumps(additional_context, indent=2)}")
        
        # Source content
        prompt_sections.append(f"\nSOURCE CONTENT:\n{content}")
        
        # Final instruction
        prompt_sections.append(f"\nGenerate the personalized {content_type.value} content following all the above requirements:")
        
        return "\n".join(prompt_sections)
    
    def _determine_career_stage(self, context: Dict[str, Any]) -> str:
        """Determine career stage from context"""
        experience = context.get('experienceYears', 0)
        if experience < 2:
            return 'entry_level'
        elif experience < 5:
            return 'early_career'
        elif experience < 10:
            return 'mid_career'
        elif experience < 20:
            return 'senior_level'
        else:
            return 'executive_level'
    
    def _extract_domain_expertise(self, context: Dict[str, Any]) -> str:
        """Extract domain expertise from professional context"""
        role = context.get('role', '').lower()
        industry = context.get('industry', '').lower()
        
        if any(tech in role for tech in ['engineer', 'developer', 'programmer']):
            return 'technical'
        elif any(bus in role for bus in ['manager', 'director', 'lead']):
            return 'management'
        elif any(sales in role for sales in ['sales', 'marketing', 'business']):
            return 'business'
        elif any(res in role for res in ['research', 'scientist', 'analyst']):
            return 'research'
        else:
            return 'general'
    
    def _categorize_interests(self, interests: List[str]) -> List[str]:
        """Categorize interests into broader categories"""
        categories = set()
        
        for interest in interests:
            interest_lower = interest.lower()
            if any(tech in interest_lower for tech in ['technology', 'programming', 'coding', 'ai', 'data']):
                categories.add('technology')
            elif any(sci in interest_lower for sci in ['science', 'research', 'biology', 'physics']):
                categories.add('science')
            elif any(art in interest_lower for art in ['art', 'design', 'creative', 'music']):
                categories.add('creative')
            elif any(bus in interest_lower for bus in ['business', 'finance', 'management']):
                categories.add('business')
            elif any(spo in interest_lower for spo in ['sport', 'fitness', 'health', 'exercise']):
                categories.add('health_fitness')
            else:
                categories.add('lifestyle')
        
        return list(categories)
    
    def _find_professional_overlap(self, interests: Dict[str, Any]) -> str:
        """Find overlap between professional and personal interests"""
        # Simplified implementation
        return "moderate"
    
    def _identify_motivation_drivers(self, interests: Dict[str, Any]) -> str:
        """Identify what motivates the learner"""
        # Simplified implementation based on interest patterns
        return "achievement_and_growth"
    
    def _get_learning_modalities(self, style: str) -> List[str]:
        """Get preferred learning modalities"""
        modality_map = {
            'visual': ['diagrams', 'charts', 'infographics', 'mind_maps'],
            'auditory': ['explanations', 'discussions', 'verbal_examples'],
            'reading': ['text', 'articles', 'detailed_descriptions'],
            'kinesthetic': ['hands_on', 'practice_exercises', 'simulations'],
            'mixed': ['varied_approaches', 'multi_modal_content']
        }
        return modality_map.get(style, ['varied_approaches'])
    
    def _get_structure_preferences(self, style: str) -> str:
        """Get content structure preferences based on learning style"""
        structure_map = {
            'visual': 'hierarchical_with_visuals',
            'auditory': 'narrative_flow',
            'reading': 'detailed_sequential',
            'kinesthetic': 'step_by_step_practical',
            'mixed': 'flexible_multi_format'
        }
        return structure_map.get(style, 'balanced_approach')
    
    def _get_engagement_strategies(self, style: str) -> str:
        """Get engagement strategies based on learning style"""
        strategy_map = {
            'visual': 'visual_emphasis_and_spatial_organization',
            'auditory': 'conversational_and_rhythmic_patterns',
            'reading': 'detailed_explanations_and_references',
            'kinesthetic': 'interactive_and_practical_application',
            'mixed': 'varied_engagement_techniques'
        }
        return strategy_map.get(style, 'adaptive_engagement')
    
    def _determine_content_pacing(self, prefs: Dict[str, Any]) -> str:
        """Determine content pacing preferences"""
        density = prefs.get('density', 'comprehensive')
        detail_tolerance = prefs.get('detailTolerance', 'moderate')
        
        if density == 'concise' and detail_tolerance == 'low':
            return 'fast_paced'
        elif density == 'comprehensive' and detail_tolerance == 'high':
            return 'thorough_and_gradual'
        else:
            return 'moderate_pacing'
    
    def _determine_organization_style(self, prefs: Dict[str, Any]) -> str:
        """Determine content organization preferences"""
        summary_style = prefs.get('summaryStyle', 'bullet_points')
        
        if summary_style == 'bullet_points':
            return 'structured_lists'
        elif summary_style == 'narrative':
            return 'flowing_narrative'
        else:
            return 'mixed_organization'
    
    def _map_formality_level(self, style: str) -> str:
        """Map communication style to formality level"""
        formality_map = {
            'formal': 'very_formal',
            'professional': 'formal',
            'friendly': 'semi_formal',
            'casual': 'informal',
            'academic': 'academic_formal'
        }
        return formality_map.get(style, 'balanced')
    
    def _determine_supportiveness(self, encouragement_level: str) -> str:
        """Determine supportiveness level"""
        support_map = {
            'minimal': 'neutral_informative',
            'moderate': 'gently_encouraging',
            'high': 'actively_supportive'
        }
        return support_map.get(encouragement_level, 'balanced_support')
    
    def _determine_directness(self, style: str) -> str:
        """Determine communication directness"""
        directness_map = {
            'formal': 'diplomatically_direct',
            'professional': 'clearly_direct',
            'friendly': 'gently_direct',
            'casual': 'straightforward',
            'academic': 'methodically_direct'
        }
        return directness_map.get(style, 'balanced_directness')
    
    def _get_content_specific_instructions(
        self,
        content_type: ContentType,
        learning: Dict[str, Any],
        content_prefs: Dict[str, Any]
    ) -> Optional[str]:
        """Get content-type specific personalization instructions"""
        
        if content_type == ContentType.QUIZ:
            return f"""
QUIZ-SPECIFIC PERSONALIZATION:
- Adapt question complexity to match learning style preferences
- Use {learning['primary_style']} learning approach in question format
- Include practical examples relevant to professional context
- Balance question types according to engagement strategies"""
        
        elif content_type == ContentType.FLASHCARDS:
            return f"""
FLASHCARD-SPECIFIC PERSONALIZATION:
- Design cards to match {learning['primary_style']} learning preferences
- Use {content_prefs['organization_style']} for information hierarchy
- Include memory aids suitable for the learning style
- Balance front/back content according to detail tolerance"""
        
        elif content_type == ContentType.SUMMARY:
            return f"""
SUMMARY-SPECIFIC PERSONALIZATION:
- Use {content_prefs['summary_style']} format
- Maintain {content_prefs['density']} information density
- Structure according to {content_prefs['organization_style']}
- Emphasize points relevant to professional context"""
        
        elif content_type == ContentType.EXPLANATION:
            return f"""
EXPLANATION-SPECIFIC PERSONALIZATION:
- Use {learning['engagement_strategies']} for concept introduction
- Provide examples from professional/interest domains
- Structure explanations using {learning['content_structure_preferences']}
- Match detail level to {content_prefs['detail_tolerance']} preference"""
        
        return None


# Singleton instance
enhanced_personalization_engine = EnhancedPersonalizationEngine()