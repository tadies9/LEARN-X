"""
Explanation Orchestrator - Migrated from Node.js
Coordinates personalized explanations, introductions, and examples
"""

from typing import AsyncIterator, Dict, List, Optional, Any
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
class ContentChunk:
    """Document content chunk"""
    id: str
    content: str
    metadata: Dict[str, Any]
    score: float = 1.0


@dataclass
class PersonalizedContent:
    """Result with personalization metrics"""
    content: str
    personalization_score: float
    quality_metrics: Dict[str, float]
    cached: bool = False


class ExplanationOrchestrator:
    """
    Coordinates personalized explanations, introductions, and examples.
    Migrated from Node.js ExplanationOrchestrator with enhancements.
    """
    
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
        
        # Circuit breaker for explanation services
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60,
            name="explanation_orchestrator"
        )

    async def generate_personalized_introduction(
        self,
        topic: str,
        content: str,
        user_id: str,
        model: Optional[AIModel] = None
    ) -> PersonalizedContent:
        """Generate personalized introduction that immediately hooks the learner"""
        start_time = datetime.utcnow()
        
        try:
            # Get user persona
            persona = await self.persona_engine.get_persona(user_id)
            if not persona:
                raise ValueError(f"User persona not found for {user_id}")
            
            # Check cache
            cache_key = f"intro:{user_id}:{hash(topic + content[:100])}"
            if self.cache:
                cached_content = await self.cache.get(cache_key)
                if cached_content:
                    return PersonalizedContent(
                        content=cached_content,
                        personalization_score=0.8,
                        quality_metrics={"cached": 1.0},
                        cached=True
                    )
            
            # Build personalized prompt
            prompt = await self._build_introduction_prompt(topic, content, persona)
            
            # Generate introduction
            async def generate():
                return await self.ai_manager.complete(
                    messages=[Message(role="user", content=prompt)],
                    model=model or AIModel.GPT_4O,
                    options=CompletionOptions(
                        temperature=0.8,
                        max_tokens=800
                    ),
                    user_id=user_id
                )
            
            response = await self.circuit_breaker.call(generate)
            
            # Calculate personalization score
            personalization_score = await self.persona_engine.calculate_personalization_score(
                user_id, response.content, "introduction"
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
                request_type="introduction",
                model=model or AIModel.GPT_4O,
                prompt_tokens=self._estimate_tokens(prompt),
                completion_tokens=self._estimate_tokens(response.content),
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to generate personalized introduction: {e}")
            raise

    async def generate_deep_explanation_stream(
        self,
        chunks: List[ContentChunk],
        topic: str,
        user_id: str,
        subtopic: Optional[str] = None,
        current_level: str = "foundation",
        model: Optional[AIModel] = None
    ) -> AsyncIterator[str]:
        """Generate deeply personalized explanation with streaming"""
        start_time = datetime.utcnow()
        
        try:
            # Get user persona
            persona = await self.persona_engine.get_persona(user_id)
            if not persona:
                raise ValueError(f"User persona not found for {user_id}")
            
            # Build comprehensive personalized prompt
            system_prompt = await self._build_deep_explanation_system_prompt(persona, current_level)
            user_prompt = await self._build_deep_explanation_user_prompt(
                chunks, topic, subtopic, persona
            )
            
            # Generate streaming response
            async def generate():
                return self.ai_manager.complete_stream(
                    messages=[
                        Message(role="system", content=system_prompt),
                        Message(role="user", content=user_prompt)
                    ],
                    model=model or AIModel.GPT_4O,
                    options=CompletionOptions(
                        temperature=0.7,
                        max_tokens=2500,
                        stream=True
                    ),
                    user_id=user_id
                )
            
            # Stream response with cost tracking
            full_content = ""
            async for chunk in await self.circuit_breaker.call(generate):
                full_content += chunk
                yield chunk
            
            # Track cost
            await self.cost_tracker.track_request(
                user_id=user_id,
                request_type="deep_explanation",
                model=model or AIModel.GPT_4O,
                prompt_tokens=self._estimate_tokens(system_prompt + user_prompt),
                completion_tokens=self._estimate_tokens(full_content),
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
        except Exception as e:
            logger.error(f"Failed to generate deep explanation: {e}")
            raise

    async def generate_progressive_explanation(
        self,
        concept: str,
        content: str,
        user_id: str,
        current_level: str = "foundation",
        model: Optional[AIModel] = None
    ) -> PersonalizedContent:
        """Generate progressive explanation that builds complexity"""
        start_time = datetime.utcnow()
        
        try:
            persona = await self.persona_engine.get_persona(user_id)
            if not persona:
                raise ValueError(f"User persona not found for {user_id}")
            
            # Build progressive explanation prompt
            prompt = await self._build_progressive_explanation_prompt(
                concept, content, persona, current_level
            )
            
            # Generate explanation
            async def generate():
                return await self.ai_manager.complete(
                    messages=[Message(role="user", content=prompt)],
                    model=model or AIModel.GPT_4O,
                    options=CompletionOptions(
                        temperature=0.7,
                        max_tokens=2000
                    ),
                    user_id=user_id
                )
            
            response = await self.circuit_breaker.call(generate)
            
            # Calculate quality metrics
            personalization_score = await self.persona_engine.calculate_personalization_score(
                user_id, response.content, "progressive_explanation"
            )
            
            # Track cost
            await self.cost_tracker.track_request(
                user_id=user_id,
                request_type="progressive_explanation",
                model=model or AIModel.GPT_4O,
                prompt_tokens=self._estimate_tokens(prompt),
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
            logger.error(f"Failed to generate progressive explanation: {e}")
            raise

    async def generate_personalized_examples(
        self,
        concept: str,
        user_id: str,
        count: int = 3,
        model: Optional[AIModel] = None
    ) -> List[str]:
        """Generate personalized examples for concepts"""
        start_time = datetime.utcnow()
        
        try:
            persona = await self.persona_engine.get_persona(user_id)
            if not persona:
                raise ValueError(f"User persona not found for {user_id}")
            
            # Build examples prompt
            prompt = await self._build_examples_prompt(concept, persona, count)
            
            # Generate examples
            async def generate():
                return await self.ai_manager.complete(
                    messages=[Message(role="user", content=prompt)],
                    model=model or AIModel.GPT_4_TURBO,
                    options=CompletionOptions(
                        temperature=0.8,
                        max_tokens=1500,
                        response_format={"type": "json_object"}
                    ),
                    user_id=user_id
                )
            
            response = await self.circuit_breaker.call(generate)
            
            # Parse examples
            examples = self._parse_examples(response.content)
            
            # Track cost
            await self.cost_tracker.track_request(
                user_id=user_id,
                request_type="examples",
                model=model or AIModel.GPT_4_TURBO,
                prompt_tokens=self._estimate_tokens(prompt),
                completion_tokens=self._estimate_tokens(response.content),
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
            return examples
            
        except Exception as e:
            logger.error(f"Failed to generate personalized examples: {e}")
            raise

    async def generate_contextual_examples(
        self,
        concept: str,
        user_id: str,
        example_type: str = "application",
        count: int = 3,
        model: Optional[AIModel] = None
    ) -> List[str]:
        """Generate contextual examples for different use cases"""
        start_time = datetime.utcnow()
        
        try:
            persona = await self.persona_engine.get_persona(user_id)
            if not persona:
                raise ValueError(f"User persona not found for {user_id}")
            
            # Build contextual examples prompt
            prompt = await self._build_contextual_examples_prompt(
                concept, persona, example_type, count
            )
            
            # Generate examples
            async def generate():
                return await self.ai_manager.complete(
                    messages=[Message(role="user", content=prompt)],
                    model=model or AIModel.GPT_4_TURBO,
                    options=CompletionOptions(
                        temperature=0.8,
                        max_tokens=1500,
                        response_format={"type": "json_object"}
                    ),
                    user_id=user_id
                )
            
            response = await self.circuit_breaker.call(generate)
            
            # Parse examples
            examples = self._parse_examples(response.content)
            
            # Track cost
            await self.cost_tracker.track_request(
                user_id=user_id,
                request_type="contextual_examples",
                model=model or AIModel.GPT_4_TURBO,
                prompt_tokens=self._estimate_tokens(prompt),
                completion_tokens=self._estimate_tokens(response.content),
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
            return examples
            
        except Exception as e:
            logger.error(f"Failed to generate contextual examples: {e}")
            raise

    # Private helper methods
    async def _build_introduction_prompt(
        self, topic: str, content: str, persona: UserPersona
    ) -> str:
        """Build personalized introduction prompt"""
        # Get personalization context
        personalization_prompt = await self.persona_engine.generate_personalization_prompt(
            persona.user_id, "introduction", topic, content[:500]
        )
        
        return f"""{personalization_prompt}

Create an engaging introduction to {topic} that immediately hooks the learner.

CONTENT OVERVIEW:
{content[:1000]}

INTRODUCTION REQUIREMENTS:
1. Start with a compelling hook related to their professional context
2. Connect to their personal interests where relevant
3. Clearly state what they'll learn and why it matters
4. Set appropriate expectations for difficulty and time
5. Make them excited to dive deeper

The introduction should feel like it was written specifically for this learner."""

    async def _build_deep_explanation_system_prompt(
        self, persona: UserPersona, current_level: str
    ) -> str:
        """Build system prompt for deep explanations"""
        return f"""You are an expert educator creating deeply personalized explanations.

LEARNER PROFILE:
- Professional Role: {persona.professional_context.current_role} in {persona.professional_context.industry}
- Experience Level: {persona.experience_level}
- Learning Style: {persona.learning_style.preferred_format.value}
- Communication Preference: {persona.communication_style.preferred_tone.value}
- Content Density: {persona.content_density.preferred_density.value}

CURRENT LEARNING LEVEL: {current_level}

EXPLANATION APPROACH:
1. Match their professional context and experience level
2. Use their preferred learning style and communication tone
3. Incorporate relevant examples from their field
4. Build complexity gradually from current level
5. Maintain engagement through their interests

Create explanations that feel personally crafted for this specific learner."""

    async def _build_deep_explanation_user_prompt(
        self,
        chunks: List[ContentChunk],
        topic: str,
        subtopic: Optional[str],
        persona: UserPersona
    ) -> str:
        """Build user prompt for deep explanations"""
        # Prepare content from chunks
        content = self._prepare_content_from_chunks(chunks)
        
        subtopic_context = f" - specifically {subtopic}" if subtopic else ""
        
        return f"""Provide a comprehensive explanation of {topic}{subtopic_context}.

CONTENT TO EXPLAIN:
{content}

PERSONALIZATION REQUIREMENTS:
- Professional Context: {persona.professional_context.current_role} in {persona.professional_context.industry}
- Relevant Interests: {', '.join(persona.personal_interests.primary_interests[:2])}
- Learning Style: {persona.learning_style.preferred_format.value}
- Communication Tone: {persona.communication_style.preferred_tone.value}

EXPLANATION STRUCTURE:
1. Context and relevance to their field
2. Core concepts with clear definitions
3. Practical examples from their domain
4. Real-world applications and use cases
5. Common challenges and solutions
6. Next steps for deeper learning

Make this explanation immediately applicable to their professional context."""

    async def _build_progressive_explanation_prompt(
        self,
        concept: str,
        content: str,
        persona: UserPersona,
        current_level: str
    ) -> str:
        """Build progressive explanation prompt"""
        return f"""Create a progressive explanation of {concept} starting from {current_level} level.

CONTENT:
{content[:1500]}

LEARNER PROFILE:
- Role: {persona.professional_context.current_role}
- Industry: {persona.professional_context.industry}
- Current Level: {current_level}
- Learning Style: {persona.learning_style.preferred_format.value}

PROGRESSIVE STRUCTURE:
1. Start with foundational concepts they already know
2. Build bridges to new information
3. Introduce complexity gradually
4. Use examples that build on each other
5. Check understanding at each level
6. Prepare them for the next level

Ensure each step feels achievable and connected to what they already understand."""

    async def _build_examples_prompt(
        self, concept: str, persona: UserPersona, count: int
    ) -> str:
        """Build examples generation prompt"""
        return f"""Generate {count} personalized examples to illustrate "{concept}".

LEARNER CONTEXT:
- Professional Role: {persona.professional_context.current_role}
- Industry: {persona.professional_context.industry}
- Primary Interests: {', '.join(persona.personal_interests.primary_interests[:2])}
- Specializations: {', '.join(persona.professional_context.specializations[:2])}

EXAMPLE REQUIREMENTS:
1. Relevant to their professional context
2. Connect to their interests when possible
3. Progressive difficulty (simple to complex)
4. Practical and actionable
5. Include real-world applications

Return as JSON:
{{
  "examples": [
    {{"title": "...", "description": "...", "context": "...", "difficulty": "beginner|intermediate|advanced"}},
    ...
  ]
}}"""

    async def _build_contextual_examples_prompt(
        self,
        concept: str,
        persona: UserPersona,
        example_type: str,
        count: int
    ) -> str:
        """Build contextual examples prompt"""
        type_descriptions = {
            "basic": "fundamental, simple examples",
            "application": "practical, real-world applications",
            "problem-solving": "examples showing problem-solving approaches",
            "real-world": "actual industry examples and case studies"
        }
        
        type_desc = type_descriptions.get(example_type, "practical examples")
        
        return f"""Generate {count} {type_desc} for "{concept}".

LEARNER CONTEXT:
- Role: {persona.professional_context.current_role} in {persona.professional_context.industry}
- Experience: {persona.professional_context.years_experience} years
- Interests: {', '.join(persona.personal_interests.primary_interests[:2])}

EXAMPLE TYPE: {example_type}

Requirements for {type_desc}:
1. Highly relevant to their professional role
2. Match their experience level
3. Include specific details and context
4. Show practical value and application
5. Connect to their industry when possible

Return as JSON:
{{
  "examples": [
    {{"title": "...", "scenario": "...", "application": "...", "outcome": "..."}},
    ...
  ]
}}"""

    def _prepare_content_from_chunks(self, chunks: List[ContentChunk]) -> str:
        """Prepare content from document chunks"""
        # Sort by relevance score
        sorted_chunks = sorted(chunks, key=lambda c: c.score, reverse=True)
        
        content_parts = []
        total_length = 0
        limit = 4000  # Token limit for content
        
        for chunk in sorted_chunks:
            chunk_content = chunk.content.strip()
            
            if total_length + len(chunk_content) > limit:
                remaining = limit - total_length
                if remaining > 100:
                    content_parts.append(chunk_content[:remaining] + "...")
                break
            
            content_parts.append(chunk_content)
            total_length += len(chunk_content)
        
        return "\n\n".join(content_parts)

    def _parse_examples(self, content: str) -> List[str]:
        """Parse examples from AI response"""
        try:
            data = json.loads(content)
            examples_data = data.get("examples", [])
            
            # Extract example descriptions or scenarios
            examples = []
            for example in examples_data:
                if isinstance(example, dict):
                    # Try different fields for the example content
                    text = (
                        example.get("description") or
                        example.get("scenario") or
                        example.get("title") or
                        str(example)
                    )
                    examples.append(text)
                else:
                    examples.append(str(example))
            
            return examples
        except json.JSONDecodeError:
            logger.error("Failed to parse examples JSON")
            # Try to extract examples from plain text
            lines = content.split('\n')
            examples = [line.strip() for line in lines if line.strip() and len(line.strip()) > 20]
            return examples[:5]  # Return up to 5 examples

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count"""
        return int(len(text.split()) * 1.3)  # Rough estimate