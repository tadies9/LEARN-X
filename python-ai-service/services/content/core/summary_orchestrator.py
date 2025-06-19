"""
Summary Orchestrator - Migrated from Node.js
Coordinates personalized summaries with different formats and purposes
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import json
import asyncio
from structlog import get_logger

from ...ai.manager import AIManager, AIModel, Message, CompletionOptions
from ...ai.cost_tracker import CostTracker
from ...ai.circuit_breaker import CircuitBreaker
from ...personalization.enhanced_persona_engine import EnhancedPersonaEngine, UserPersona
from ...cache.vector_cache import VectorCache

logger = get_logger()


@dataclass
class PersonalizedContent:
    """Result with personalization metrics"""
    content: str
    personalization_score: float
    quality_metrics: Dict[str, float]
    cached: bool = False


class SummaryOrchestrator:
    """
    Coordinates personalized summaries with different formats and purposes.
    Migrated from Node.js SummaryOrchestrator with enhancements.
    """
    
    # Summary format templates
    FORMAT_TEMPLATES = {
        'key-points': {
            'structure': 'bulleted list of main points',
            'instruction': 'Extract and present the most important points as clear, actionable bullets',
            'max_points': 7
        },
        'comprehensive': {
            'structure': 'detailed overview with sections',
            'instruction': 'Provide a thorough summary that covers all important aspects',
            'max_sections': 5
        },
        'visual-map': {
            'structure': 'hierarchical concept map format',
            'instruction': 'Organize information as a visual hierarchy showing relationships',
            'use_formatting': True
        },
        'executive': {
            'structure': 'executive summary format',
            'instruction': 'Focus on strategic insights and business implications',
            'target_audience': 'decision makers'
        },
        'technical': {
            'structure': 'technical specification format',
            'instruction': 'Emphasize technical details, processes, and implementation',
            'target_audience': 'technical professionals'
        }
    }
    
    # Purpose-based adaptations
    PURPOSE_ADAPTATIONS = {
        'review': {
            'focus': 'reinforcement and retention',
            'style': 'clear and memorable',
            'include': ['key concepts', 'important facts', 'connections']
        },
        'application': {
            'focus': 'practical implementation',
            'style': 'actionable and specific',
            'include': ['how-to steps', 'real-world examples', 'best practices']
        },
        'next-steps': {
            'focus': 'forward momentum',
            'style': 'progressive and motivating',
            'include': ['action items', 'learning path', 'resources']
        },
        'connections': {
            'focus': 'relationship mapping',
            'style': 'analytical and integrative',
            'include': ['cross-references', 'implications', 'broader context']
        },
        'assessment': {
            'focus': 'knowledge validation',
            'style': 'testing and evaluation',
            'include': ['checkpoints', 'self-assessment', 'gaps to address']
        }
    }

    def __init__(
        self,
        ai_manager: AIManager,
        persona_engine: EnhancedPersonaEngine,
        cost_tracker: CostTracker,
        cache: Optional[VectorCache] = None
    ):
        self.ai_manager = ai_manager
        self.persona_engine = persona_engine
        self.cost_tracker = cost_tracker
        self.cache = cache
        
        # Circuit breaker for summary services
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60,
            name="summary_orchestrator"
        )

    async def generate_deep_summary(
        self,
        content: str,
        user_id: str,
        format_type: str = "key-points",
        purpose: str = "review",
        model: Optional[AIModel] = None
    ) -> PersonalizedContent:
        """Generate deeply personalized summary with format and purpose optimization"""
        start_time = datetime.utcnow()
        
        try:
            # Get user persona
            persona = await self.persona_engine.get_persona(user_id)
            if not persona:
                raise ValueError(f"User persona not found for {user_id}")
            
            # Check cache
            cache_key = f"summary:{user_id}:{hash(content + format_type + purpose)}"
            if self.cache:
                cached_content = await self.cache.get(cache_key)
                if cached_content:
                    return PersonalizedContent(
                        content=cached_content,
                        personalization_score=0.8,
                        quality_metrics={"cached": 1.0},
                        cached=True
                    )
            
            # Build comprehensive prompt
            system_prompt = await self._build_summary_system_prompt(persona, format_type, purpose)
            user_prompt = await self._build_summary_user_prompt(content, persona, format_type, purpose)
            
            # Generate summary
            async def generate():
                return await self.ai_manager.complete(
                    messages=[
                        Message(role="system", content=system_prompt),
                        Message(role="user", content=user_prompt)
                    ],
                    model=model or AIModel.GPT_4_TURBO,
                    options=CompletionOptions(
                        temperature=0.5,
                        max_tokens=self._calculate_max_tokens(format_type, content)
                    ),
                    user_id=user_id
                )
            
            response = await self.circuit_breaker.call(generate)
            
            # Calculate personalization score
            personalization_score = await self.persona_engine.calculate_personalization_score(
                user_id, response.content, f"summary_{format_type}"
            )
            
            # Create result
            result = PersonalizedContent(
                content=response.content,
                personalization_score=personalization_score.get("overall", 0.7),
                quality_metrics=personalization_score,
                cached=False
            )
            
            # Cache result
            if self.cache:
                await self.cache.set(cache_key, response.content, ttl=3600)
            
            # Track cost
            await self.cost_tracker.track_request(
                user_id=user_id,
                request_type=f"summary_{format_type}",
                model=model or AIModel.GPT_4_TURBO,
                prompt_tokens=self._estimate_tokens(system_prompt + user_prompt),
                completion_tokens=self._estimate_tokens(response.content),
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to generate deep summary: {e}")
            raise

    async def generate_goal_oriented_summary(
        self,
        content: str,
        user_id: str,
        summary_purpose: str = "review",
        model: Optional[AIModel] = None
    ) -> PersonalizedContent:
        """Generate summary optimized for specific learning goals"""
        start_time = datetime.utcnow()
        
        try:
            persona = await self.persona_engine.get_persona(user_id)
            if not persona:
                raise ValueError(f"User persona not found for {user_id}")
            
            # Build goal-oriented prompt
            system_prompt = await self._build_goal_oriented_system_prompt(persona, summary_purpose)
            user_prompt = await self._build_goal_oriented_user_prompt(content, persona, summary_purpose)
            
            # Generate summary
            async def generate():
                return await self.ai_manager.complete(
                    messages=[
                        Message(role="system", content=system_prompt),
                        Message(role="user", content=user_prompt)
                    ],
                    model=model or AIModel.GPT_4_TURBO,
                    options=CompletionOptions(
                        temperature=0.6,
                        max_tokens=1200
                    ),
                    user_id=user_id
                )
            
            response = await self.circuit_breaker.call(generate)
            
            # Calculate quality metrics
            personalization_score = await self.persona_engine.calculate_personalization_score(
                user_id, response.content, f"goal_summary_{summary_purpose}"
            )
            
            # Track cost
            await self.cost_tracker.track_request(
                user_id=user_id,
                request_type=f"goal_summary_{summary_purpose}",
                model=model or AIModel.GPT_4_TURBO,
                prompt_tokens=self._estimate_tokens(system_prompt + user_prompt),
                completion_tokens=self._estimate_tokens(response.content),
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
            return PersonalizedContent(
                content=response.content,
                personalization_score=personalization_score.get("overall", 0.7),
                quality_metrics=personalization_score,
                cached=False
            )
            
        except Exception as e:
            logger.error(f"Failed to generate goal-oriented summary: {e}")
            raise

    async def generate_adaptive_summary(
        self,
        content: str,
        user_id: str,
        reading_time_available: int,  # minutes
        complexity_level: str = "auto",
        model: Optional[AIModel] = None
    ) -> PersonalizedContent:
        """Generate summary adapted to available time and complexity preferences"""
        start_time = datetime.utcnow()
        
        try:
            persona = await self.persona_engine.get_persona(user_id)
            if not persona:
                raise ValueError(f"User persona not found for {user_id}")
            
            # Determine optimal format based on time and complexity
            optimal_format = self._determine_optimal_format(
                reading_time_available, complexity_level, persona
            )
            
            # Build adaptive prompt
            system_prompt = await self._build_adaptive_system_prompt(
                persona, optimal_format, reading_time_available
            )
            user_prompt = await self._build_adaptive_user_prompt(
                content, persona, optimal_format, reading_time_available
            )
            
            # Generate summary
            async def generate():
                return await self.ai_manager.complete(
                    messages=[
                        Message(role="system", content=system_prompt),
                        Message(role="user", content=user_prompt)
                    ],
                    model=model or AIModel.GPT_4_TURBO,
                    options=CompletionOptions(
                        temperature=0.5,
                        max_tokens=self._calculate_adaptive_max_tokens(reading_time_available)
                    ),
                    user_id=user_id
                )
            
            response = await self.circuit_breaker.call(generate)
            
            # Calculate metrics
            personalization_score = await self.persona_engine.calculate_personalization_score(
                user_id, response.content, f"adaptive_summary_{optimal_format['type']}"
            )
            
            # Track cost
            await self.cost_tracker.track_request(
                user_id=user_id,
                request_type="adaptive_summary",
                model=model or AIModel.GPT_4_TURBO,
                prompt_tokens=self._estimate_tokens(system_prompt + user_prompt),
                completion_tokens=self._estimate_tokens(response.content),
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
            return PersonalizedContent(
                content=response.content,
                personalization_score=personalization_score.get("overall", 0.7),
                quality_metrics={
                    **personalization_score,
                    "time_efficiency": self._calculate_time_efficiency(response.content, reading_time_available),
                    "format_match": optimal_format["confidence"]
                },
                cached=False
            )
            
        except Exception as e:
            logger.error(f"Failed to generate adaptive summary: {e}")
            raise

    async def generate_multi_perspective_summary(
        self,
        content: str,
        user_id: str,
        perspectives: List[str],  # e.g., ["technical", "business", "user"]
        model: Optional[AIModel] = None
    ) -> Dict[str, PersonalizedContent]:
        """Generate summaries from multiple perspectives"""
        try:
            persona = await self.persona_engine.get_persona(user_id)
            if not persona:
                raise ValueError(f"User persona not found for {user_id}")
            
            # Generate summaries for each perspective
            summaries = {}
            
            for perspective in perspectives:
                try:
                    summary = await self._generate_perspective_summary(
                        content, persona, perspective, model, user_id
                    )
                    summaries[perspective] = summary
                except Exception as e:
                    logger.error(f"Failed to generate {perspective} perspective summary: {e}")
                    summaries[perspective] = PersonalizedContent(
                        content=f"Error generating {perspective} perspective summary.",
                        personalization_score=0.0,
                        quality_metrics={"error": 1.0},
                        cached=False
                    )
            
            return summaries
            
        except Exception as e:
            logger.error(f"Failed to generate multi-perspective summary: {e}")
            raise

    # Private helper methods
    async def _build_summary_system_prompt(
        self, persona: UserPersona, format_type: str, purpose: str
    ) -> str:
        """Build system prompt for summaries"""
        format_config = self.FORMAT_TEMPLATES.get(format_type, self.FORMAT_TEMPLATES['key-points'])
        purpose_config = self.PURPOSE_ADAPTATIONS.get(purpose, self.PURPOSE_ADAPTATIONS['review'])
        
        # Get personalization context
        personalization_prompt = await self.persona_engine.generate_personalization_prompt(
            persona.user_id, f"summary_{format_type}", purpose
        )
        
        return f"""{personalization_prompt}

SUMMARY TASK:
Create a {format_type} summary with {purpose} purpose.

FORMAT SPECIFICATIONS:
- Structure: {format_config['structure']}
- Instruction: {format_config['instruction']}
- Target Audience: {format_config.get('target_audience', 'learner')}

PURPOSE SPECIFICATIONS:
- Focus: {purpose_config['focus']}
- Style: {purpose_config['style']}
- Include: {', '.join(purpose_config['include'])}

PERSONALIZATION REQUIREMENTS:
1. Match the learner's professional context and experience level
2. Use their preferred communication style and tone
3. Incorporate relevant examples from their field
4. Adapt complexity to their background
5. Focus on aspects most relevant to their goals

Create a summary that feels specifically crafted for this learner's needs."""

    async def _build_summary_user_prompt(
        self, content: str, persona: UserPersona, format_type: str, purpose: str
    ) -> str:
        """Build user prompt for summaries"""
        format_config = self.FORMAT_TEMPLATES.get(format_type, self.FORMAT_TEMPLATES['key-points'])
        
        # Limit content length
        content_preview = content[:4000] + "..." if len(content) > 4000 else content
        
        return f"""Create a {format_type} summary for {purpose} from the following content:

CONTENT TO SUMMARIZE:
{content_preview}

SUMMARY REQUIREMENTS:
- Format: {format_config['structure']}
- Purpose: {purpose}
- Professional Context: {persona.professional_context.current_role} in {persona.professional_context.industry}
- Experience Level: {persona.experience_level}
- Preferred Tone: {persona.communication_style.preferred_tone.value}

Focus on information most relevant to their professional role and current learning goals."""

    async def _build_goal_oriented_system_prompt(
        self, persona: UserPersona, purpose: str
    ) -> str:
        """Build system prompt for goal-oriented summaries"""
        purpose_config = self.PURPOSE_ADAPTATIONS.get(purpose, self.PURPOSE_ADAPTATIONS['review'])
        
        return f"""You are creating a {purpose}-oriented summary for a {persona.professional_context.current_role} in {persona.professional_context.industry}.

GOAL: {purpose_config['focus']}
STYLE: {purpose_config['style']}

LEARNER PROFILE:
- Experience Level: {persona.experience_level}
- Learning Style: {persona.learning_style.preferred_format.value}
- Communication Preference: {persona.communication_style.preferred_tone.value}
- Content Density: {persona.content_density.preferred_density.value}

FOCUS AREAS:
{chr(10).join(['- ' + item for item in purpose_config['include']])}

Create a summary that directly supports their {purpose} goals."""

    async def _build_goal_oriented_user_prompt(
        self, content: str, persona: UserPersona, purpose: str
    ) -> str:
        """Build user prompt for goal-oriented summaries"""
        purpose_config = self.PURPOSE_ADAPTATIONS.get(purpose, self.PURPOSE_ADAPTATIONS['review'])
        
        content_preview = content[:4000] + "..." if len(content) > 4000 else content
        
        return f"""Create a {purpose}-oriented summary from this content:

CONTENT:
{content_preview}

SUMMARY GOAL: {purpose_config['focus']}

Requirements:
1. Focus on {purpose_config['style']} information
2. Include {', '.join(purpose_config['include'])}
3. Make it relevant to {persona.professional_context.current_role} work
4. Use {persona.communication_style.preferred_tone.value} tone
5. Optimize for {purpose} purposes

Provide a summary that directly supports their learning goals."""

    def _determine_optimal_format(
        self, reading_time: int, complexity_level: str, persona: UserPersona
    ) -> Dict[str, Any]:
        """Determine optimal summary format based on constraints"""
        # Time-based format selection
        if reading_time <= 2:
            base_format = "key-points"
            max_items = 3
        elif reading_time <= 5:
            base_format = "key-points"
            max_items = 5
        elif reading_time <= 10:
            base_format = "comprehensive"
            max_items = 7
        else:
            base_format = "comprehensive"
            max_items = 10
        
        # Adjust based on learning style
        if persona.learning_style.preferred_format.value == "visual":
            if reading_time > 5:
                base_format = "visual-map"
        
        # Adjust based on professional context
        if persona.professional_context.management_level in ["manager", "executive"]:
            if reading_time <= 5:
                base_format = "executive"
        
        return {
            "type": base_format,
            "max_items": max_items,
            "confidence": 0.8,
            "reasoning": f"Selected based on {reading_time}min reading time and {persona.learning_style.preferred_format.value} learning style"
        }

    async def _build_adaptive_system_prompt(
        self, persona: UserPersona, format_config: Dict[str, Any], reading_time: int
    ) -> str:
        """Build system prompt for adaptive summaries"""
        return f"""Create an adaptive summary optimized for {reading_time} minutes reading time.

LEARNER PROFILE:
- Role: {persona.professional_context.current_role}
- Industry: {persona.professional_context.industry}
- Experience: {persona.experience_level}
- Learning Style: {persona.learning_style.preferred_format.value}
- Communication: {persona.communication_style.preferred_tone.value}

FORMAT OPTIMIZATION:
- Type: {format_config['type']}
- Max Items: {format_config['max_items']}
- Reading Time Target: {reading_time} minutes
- Confidence: {format_config['confidence']}

ADAPTIVE REQUIREMENTS:
1. Optimize information density for available time
2. Prioritize most relevant information for their role
3. Use format that matches their learning style
4. Ensure content can be absorbed in target time
5. Include actionable takeaways

Create a time-optimized summary that maximizes learning value."""

    async def _build_adaptive_user_prompt(
        self, content: str, persona: UserPersona, format_config: Dict[str, Any], reading_time: int
    ) -> str:
        """Build user prompt for adaptive summaries"""
        content_preview = content[:4000] + "..." if len(content) > 4000 else content
        
        return f"""Create an adaptive summary optimized for {reading_time} minutes of reading:

CONTENT:
{content_preview}

OPTIMIZATION CONSTRAINTS:
- Reading Time: {reading_time} minutes
- Format: {format_config['type']}
- Max Key Items: {format_config['max_items']}
- Professional Focus: {persona.professional_context.current_role}

REQUIREMENTS:
1. Prioritize information most relevant to their role
2. Use {format_config['type']} structure
3. Keep within {reading_time} minute reading time
4. Include actionable insights
5. Match {persona.communication_style.preferred_tone.value} communication style

Deliver maximum learning value within the time constraint."""

    async def _generate_perspective_summary(
        self, content: str, persona: UserPersona, perspective: str, model: Optional[AIModel], user_id: str
    ) -> PersonalizedContent:
        """Generate summary from specific perspective"""
        perspective_prompts = {
            "technical": "Focus on technical details, implementation, and system aspects",
            "business": "Emphasize business impact, ROI, and strategic implications",
            "user": "Highlight user experience, usability, and end-user benefits",
            "security": "Concentrate on security implications, risks, and safeguards",
            "scalability": "Address scalability concerns, performance, and growth potential"
        }
        
        prompt_addition = perspective_prompts.get(
            perspective, 
            f"Analyze from the {perspective} perspective"
        )
        
        system_prompt = f"""Create a summary from the {perspective} perspective.

PERSPECTIVE FOCUS: {prompt_addition}

LEARNER CONTEXT:
- Role: {persona.professional_context.current_role}
- Industry: {persona.professional_context.industry}
- Experience: {persona.experience_level}

Provide insights most relevant to someone with their background viewing from the {perspective} angle."""
        
        user_prompt = f"""Summarize from the {perspective} perspective:

{content[:3000]}

Focus on aspects most important from the {perspective} viewpoint."""
        
        response = await self.ai_manager.complete(
            messages=[
                Message(role="system", content=system_prompt),
                Message(role="user", content=user_prompt)
            ],
            model=model or AIModel.GPT_4_TURBO,
            options=CompletionOptions(temperature=0.6, max_tokens=800),
            user_id=user_id
        )
        
        return PersonalizedContent(
            content=response.content,
            personalization_score=0.7,
            quality_metrics={"perspective_relevance": 0.8},
            cached=False
        )

    def _calculate_max_tokens(self, format_type: str, content: str) -> int:
        """Calculate appropriate max tokens based on format and content"""
        base_tokens = {
            'key-points': 500,
            'comprehensive': 1200,
            'visual-map': 800,
            'executive': 600,
            'technical': 1000
        }
        
        # Adjust based on content length
        content_factor = min(2.0, len(content) / 2000)
        
        return int(base_tokens.get(format_type, 500) * content_factor)

    def _calculate_adaptive_max_tokens(self, reading_time: int) -> int:
        """Calculate max tokens based on reading time"""
        # Assume ~200 words per minute reading speed
        # And ~1.3 tokens per word average
        return int(reading_time * 200 * 1.3)

    def _calculate_time_efficiency(self, content: str, target_time: int) -> float:
        """Calculate how well content matches target reading time"""
        estimated_words = len(content.split())
        estimated_time = estimated_words / 200  # 200 words per minute
        
        if estimated_time <= target_time:
            return 1.0
        else:
            return target_time / estimated_time

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count"""
        return int(len(text.split()) * 1.3)