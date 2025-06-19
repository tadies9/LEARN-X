"""
Comprehensive Content Generation Service
Migrated from Node.js with enhanced personalization and streaming support
"""

from typing import AsyncIterator, Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import json
import re
import asyncio
from structlog import get_logger

from ..ai.manager import AIManager, AIModel, Message, CompletionOptions
from ..ai.cost_tracker import CostTracker
from ..ai.circuit_breaker import CircuitBreaker
from ..personalization.persona_engine import PersonaEngine, UserPersona
from ..cache.vector_cache import VectorCache

logger = get_logger()


class ContentType(Enum):
    """Content generation types"""
    EXPLANATION = "explanation"
    SUMMARY = "summary"
    FLASHCARD = "flashcard"
    QUIZ = "quiz"
    PRACTICE = "practice"
    CHAT = "chat"
    INTRODUCTION = "introduction"
    EXAMPLE = "example"


class QuizType(Enum):
    """Quiz question types"""
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    SCENARIO_ANALYSIS = "scenario_analysis"
    PROBLEM_SOLVING = "problem_solving"
    APPLICATION = "application"


class PersonalizationLevel(Enum):
    """Personalization intensity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    ADAPTIVE = "adaptive"


@dataclass
class ContentChunk:
    """Document content chunk with metadata"""
    id: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    score: float = 1.0
    section_title: Optional[str] = None
    concepts: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)


@dataclass
class GenerationParams:
    """Base parameters for content generation"""
    user_id: str
    model: Optional[AIModel] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    use_cache: bool = True
    personalization_level: PersonalizationLevel = PersonalizationLevel.MEDIUM
    language: str = "en"
    include_examples: bool = True
    include_practice: bool = False
    stream: bool = True


@dataclass
class ExplanationParams(GenerationParams):
    """Parameters for explanation generation"""
    chunks: List[ContentChunk]
    topic: str
    subtopic: Optional[str] = None
    current_level: str = "foundation"  # foundation, intermediate, advanced
    progressive: bool = False


@dataclass
class SummaryParams(GenerationParams):
    """Parameters for summary generation"""
    content: str
    format: str = "key-points"  # key-points, comprehensive, visual-map
    purpose: str = "review"  # review, application, next-steps, connections


@dataclass
class FlashcardParams(GenerationParams):
    """Parameters for flashcard generation"""
    content: str
    topic: str
    count: int = 10
    contextual_examples: bool = True
    difficulty_mix: bool = True


@dataclass
class QuizParams(GenerationParams):
    """Parameters for quiz generation"""
    content: str
    topic: str
    quiz_type: QuizType = QuizType.MULTIPLE_CHOICE
    count: int = 5
    adaptive_difficulty: bool = True
    include_explanations: bool = True


@dataclass
class ChatParams(GenerationParams):
    """Parameters for chat responses"""
    message: str
    context: List[str]
    current_page: Optional[int] = None
    selected_text: Optional[str] = None
    conversation_history: List[Dict[str, str]] = field(default_factory=list)


@dataclass
class PersonalizedContent:
    """Result with personalization metrics"""
    content: str
    personalization_score: float
    quality_metrics: Dict[str, float]
    cached: bool = False
    cost_info: Optional[Dict[str, Any]] = None


class ComprehensiveContentGenerator:
    """
    Comprehensive content generation service with full personalization support.
    Migrated from Node.js ContentGenerationService with enhancements.
    """
    
    # Domain expertise mapping
    DOMAIN_EXPERTISE = {
        'technology': ['programming', 'software', 'ai', 'data', 'cybersecurity'],
        'business': ['management', 'strategy', 'finance', 'marketing', 'operations'],
        'science': ['physics', 'chemistry', 'biology', 'mathematics', 'research'],
        'healthcare': ['medicine', 'nursing', 'public health', 'pharmacy', 'therapy'],
        'education': ['teaching', 'curriculum', 'pedagogy', 'assessment', 'learning']
    }
    
    # Communication tone templates
    TONE_TEMPLATES = {
        'formal': {
            'system_modifier': "Use professional, academic language with precise terminology.",
            'response_style': "structured and authoritative"
        },
        'casual': {
            'system_modifier': "Use conversational, friendly language like talking to a colleague.",
            'response_style': "approachable and engaging"
        },
        'encouraging': {
            'system_modifier': "Use supportive, motivating language that builds confidence.",
            'response_style': "positive and empowering"
        },
        'direct': {
            'system_modifier': "Use concise, to-the-point language focusing on key information.",
            'response_style': "clear and efficient"
        },
        'storytelling': {
            'system_modifier': "Use narrative elements and analogies to explain concepts.",
            'response_style': "engaging and memorable"
        }
    }

    def __init__(
        self,
        ai_manager: AIManager,
        persona_engine: PersonaEngine,
        cost_tracker: CostTracker,
        cache: Optional[VectorCache] = None
    ):
        self.ai_manager = ai_manager
        self.persona_engine = persona_engine
        self.cost_tracker = cost_tracker
        self.cache = cache
        
        # Circuit breakers for different content types
        self.circuit_breakers = {
            content_type.value: CircuitBreaker(
                failure_threshold=5,
                recovery_timeout=60,
                name=f"content_generation_{content_type.value}"
            )
            for content_type in ContentType
        }
        
        # Template cache for performance
        self.template_cache: Dict[str, str] = {}

    async def generate_explanation_stream(
        self, params: ExplanationParams
    ) -> AsyncIterator[str]:
        """Generate streaming personalized explanation"""
        start_time = datetime.utcnow()
        
        try:
            # Get user persona
            persona = await self.persona_engine.get_persona(params.user_id)
            if not persona:
                raise ValueError(f"User persona not found for {params.user_id}")
            
            # Check cache if enabled
            cache_key = None
            if params.use_cache and self.cache:
                cache_key = self._generate_cache_key(
                    ContentType.EXPLANATION, params, persona
                )
                cached_content = await self.cache.get(cache_key)
                if cached_content:
                    for chunk in cached_content.split(' '):
                        yield chunk + ' '
                        await asyncio.sleep(0.01)  # Simulate streaming
                    return
            
            # Build personalized prompt
            system_prompt = await self._build_explanation_system_prompt(persona, params)
            user_prompt = await self._build_explanation_user_prompt(params, persona)
            
            # Track prompt tokens
            prompt_tokens = self._estimate_tokens(system_prompt + user_prompt)
            
            # Generate with circuit breaker
            circuit_breaker = self.circuit_breakers[ContentType.EXPLANATION.value]
            
            async def generate():
                return self.ai_manager.complete_stream(
                    messages=[
                        Message(role="system", content=system_prompt),
                        Message(role="user", content=user_prompt)
                    ],
                    model=params.model or AIModel.GPT_4O,
                    options=CompletionOptions(
                        temperature=params.temperature,
                        max_tokens=params.max_tokens or 2000,
                        stream=True
                    ),
                    user_id=params.user_id
                )
            
            # Stream response
            full_content = ""
            async for chunk in await circuit_breaker.call(generate):
                full_content += chunk
                yield chunk
            
            # Calculate metrics and costs
            completion_tokens = self._estimate_tokens(full_content)
            
            # Track cost
            await self.cost_tracker.track_request(
                user_id=params.user_id,
                request_type=ContentType.EXPLANATION.value,
                model=params.model or AIModel.GPT_4O,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
            # Cache result
            if params.use_cache and self.cache and cache_key:
                await self.cache.set(cache_key, full_content, ttl=3600)
                
        except Exception as e:
            logger.error(f"Failed to generate explanation: {e}")
            raise

    async def generate_summary(self, params: SummaryParams) -> PersonalizedContent:
        """Generate personalized summary"""
        start_time = datetime.utcnow()
        
        try:
            persona = await self.persona_engine.get_persona(params.user_id)
            if not persona:
                raise ValueError(f"User persona not found for {params.user_id}")
            
            # Check cache
            cache_key = None
            if params.use_cache and self.cache:
                cache_key = self._generate_cache_key(ContentType.SUMMARY, params, persona)
                cached = await self.cache.get(cache_key)
                if cached:
                    return PersonalizedContent(
                        content=cached,
                        personalization_score=0.8,
                        quality_metrics={"cached": 1.0},
                        cached=True
                    )
            
            # Build prompts
            system_prompt = await self._build_summary_system_prompt(persona, params)
            user_prompt = await self._build_summary_user_prompt(params, persona)
            
            # Track tokens
            prompt_tokens = self._estimate_tokens(system_prompt + user_prompt)
            
            # Generate
            circuit_breaker = self.circuit_breakers[ContentType.SUMMARY.value]
            
            async def generate():
                return await self.ai_manager.complete(
                    messages=[
                        Message(role="system", content=system_prompt),
                        Message(role="user", content=user_prompt)
                    ],
                    model=params.model or AIModel.GPT_4_TURBO,
                    options=CompletionOptions(
                        temperature=params.temperature,
                        max_tokens=params.max_tokens or 1000
                    ),
                    user_id=params.user_id
                )
            
            response = await circuit_breaker.call(generate)
            content = response.content
            
            # Calculate metrics
            completion_tokens = self._estimate_tokens(content)
            personalization_score = self._calculate_personalization_score(content, persona)
            quality_metrics = self._calculate_quality_metrics(content, ContentType.SUMMARY)
            
            # Track cost
            cost_info = await self.cost_tracker.track_request(
                user_id=params.user_id,
                request_type=ContentType.SUMMARY.value,
                model=params.model or AIModel.GPT_4_TURBO,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
            # Cache result
            if params.use_cache and self.cache and cache_key:
                await self.cache.set(cache_key, content, ttl=3600)
            
            return PersonalizedContent(
                content=content,
                personalization_score=personalization_score,
                quality_metrics=quality_metrics,
                cached=False,
                cost_info=cost_info
            )
            
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
            raise

    async def generate_flashcards(self, params: FlashcardParams) -> List[Dict[str, Any]]:
        """Generate personalized flashcards"""
        start_time = datetime.utcnow()
        
        try:
            persona = await self.persona_engine.get_persona(params.user_id)
            if not persona:
                raise ValueError(f"User persona not found for {params.user_id}")
            
            # Build prompts
            system_prompt = await self._build_flashcard_system_prompt(persona, params)
            user_prompt = await self._build_flashcard_user_prompt(params, persona)
            
            # Track tokens
            prompt_tokens = self._estimate_tokens(system_prompt + user_prompt)
            
            # Generate with circuit breaker
            circuit_breaker = self.circuit_breakers[ContentType.FLASHCARD.value]
            
            async def generate():
                return await self.ai_manager.complete(
                    messages=[
                        Message(role="system", content=system_prompt),
                        Message(role="user", content=user_prompt)
                    ],
                    model=params.model or AIModel.GPT_4_TURBO,
                    options=CompletionOptions(
                        temperature=params.temperature,
                        max_tokens=params.max_tokens or 1500,
                        response_format={"type": "json_object"}
                    ),
                    user_id=params.user_id
                )
            
            response = await circuit_breaker.call(generate)
            
            # Parse flashcards
            flashcards = self._parse_flashcards(response.content)
            
            # Track cost
            completion_tokens = self._estimate_tokens(response.content)
            await self.cost_tracker.track_request(
                user_id=params.user_id,
                request_type=ContentType.FLASHCARD.value,
                model=params.model or AIModel.GPT_4_TURBO,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
            return flashcards
            
        except Exception as e:
            logger.error(f"Failed to generate flashcards: {e}")
            raise

    async def generate_quiz(self, params: QuizParams) -> List[Dict[str, Any]]:
        """Generate personalized quiz questions"""
        start_time = datetime.utcnow()
        
        try:
            persona = await self.persona_engine.get_persona(params.user_id)
            if not persona:
                raise ValueError(f"User persona not found for {params.user_id}")
            
            # Build prompts
            system_prompt = await self._build_quiz_system_prompt(persona, params)
            user_prompt = await self._build_quiz_user_prompt(params, persona)
            
            # Track tokens
            prompt_tokens = self._estimate_tokens(system_prompt + user_prompt)
            
            # Generate with circuit breaker
            circuit_breaker = self.circuit_breakers[ContentType.QUIZ.value]
            
            async def generate():
                return await self.ai_manager.complete(
                    messages=[
                        Message(role="system", content=system_prompt),
                        Message(role="user", content=user_prompt)
                    ],
                    model=params.model or AIModel.GPT_4_TURBO,
                    options=CompletionOptions(
                        temperature=params.temperature,
                        max_tokens=params.max_tokens or 2000,
                        response_format={"type": "json_object"}
                    ),
                    user_id=params.user_id
                )
            
            response = await circuit_breaker.call(generate)
            
            # Parse quiz questions
            questions = self._parse_quiz_questions(response.content, params.quiz_type)
            
            # Track cost
            completion_tokens = self._estimate_tokens(response.content)
            await self.cost_tracker.track_request(
                user_id=params.user_id,
                request_type=ContentType.QUIZ.value,
                model=params.model or AIModel.GPT_4_TURBO,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
            return questions
            
        except Exception as e:
            logger.error(f"Failed to generate quiz: {e}")
            raise

    async def stream_chat_response(self, params: ChatParams) -> AsyncIterator[str]:
        """Stream personalized chat response"""
        start_time = datetime.utcnow()
        
        try:
            persona = await self.persona_engine.get_persona(params.user_id)
            
            # Build context-aware prompt
            system_prompt = await self._build_chat_system_prompt(persona, params)
            user_prompt = params.message
            
            # Include conversation history
            messages = [Message(role="system", content=system_prompt)]
            
            # Add conversation history
            for msg in params.conversation_history[-5:]:  # Last 5 messages
                messages.append(Message(
                    role=msg.get("role", "user"),
                    content=msg.get("content", "")
                ))
            
            messages.append(Message(role="user", content=user_prompt))
            
            # Track tokens
            prompt_tokens = self._estimate_tokens(system_prompt + user_prompt)
            
            # Generate with circuit breaker
            circuit_breaker = self.circuit_breakers[ContentType.CHAT.value]
            
            async def generate():
                return self.ai_manager.complete_stream(
                    messages=messages,
                    model=params.model or AIModel.GPT_4O,
                    options=CompletionOptions(
                        temperature=0.7,
                        max_tokens=1000,
                        stream=True
                    ),
                    user_id=params.user_id
                )
            
            # Stream response
            full_content = ""
            async for chunk in await circuit_breaker.call(generate):
                full_content += chunk
                yield chunk
            
            # Track cost
            completion_tokens = self._estimate_tokens(full_content)
            await self.cost_tracker.track_request(
                user_id=params.user_id,
                request_type=ContentType.CHAT.value,
                model=params.model or AIModel.GPT_4O,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
        except Exception as e:
            logger.error(f"Failed to stream chat response: {e}")
            raise

    # Private helper methods
    async def _build_explanation_system_prompt(
        self, persona: UserPersona, params: ExplanationParams
    ) -> str:
        """Build system prompt for explanations"""
        # Get persona dimensions
        professional_context = self._extract_professional_context(persona)
        interests = self._extract_relevant_interests(persona, params.topic)
        learning_style = self._extract_learning_style(persona)
        communication_tone = self._extract_communication_tone(persona)
        
        tone_template = self.TONE_TEMPLATES.get(
            communication_tone.get('preferred_tone', 'casual'),
            self.TONE_TEMPLATES['casual']
        )
        
        return f"""You are an expert educator creating personalized learning content.

LEARNER PROFILE:
- Professional Context: {professional_context['current_role']} in {professional_context['industry']}
- Experience Level: {professional_context['experience_level']}
- Relevant Interests: {', '.join(interests[:3])}
- Learning Style: {learning_style['preferred_format']}, {learning_style['pace']} pace
- Communication Preference: {tone_template['response_style']}

PERSONALIZATION GUIDELINES:
1. {tone_template['system_modifier']}
2. Use examples from {professional_context['industry']} when relevant
3. Match {learning_style['pace']} learning pace with appropriate detail level
4. Incorporate interests in examples: {', '.join(interests[:2])}
5. Structure content for {learning_style['preferred_format']} learners

CONTENT REQUIREMENTS:
- Make complex concepts accessible and engaging
- Use analogies and real-world applications
- Include practical examples and use cases
- Break information into digestible sections
- Maintain educational rigor while being approachable

Remember: Adapt your explanation style to match the learner's professional background and personal interests."""

    async def _build_explanation_user_prompt(
        self, params: ExplanationParams, persona: UserPersona
    ) -> str:
        """Build user prompt for explanations"""
        # Prepare content from chunks
        content = self._prepare_content_from_chunks(params.chunks, limit=6000)
        
        subtopic_context = f" - specifically focusing on {params.subtopic}" if params.subtopic else ""
        
        interests = self._extract_relevant_interests(persona, params.topic)
        professional_context = self._extract_professional_context(persona)
        
        example_context = ""
        if params.include_examples and interests:
            example_context = f"\nInclude examples related to: {', '.join(interests[:2])}"
        
        practice_context = ""
        if params.include_practice:
            practice_context = f"\nSuggest a practical exercise for someone in {professional_context['industry']}"
        
        return f"""Explain the following content about {params.topic}{subtopic_context}:

CONTENT TO EXPLAIN:
{content}

EXPLANATION REQUIREMENTS:
- Target Level: {params.current_level}
- Professional Context: {professional_context['current_role']} in {professional_context['industry']}
- Make it engaging and immediately applicable{example_context}{practice_context}
- Use clear section headers and formatting
- Focus on practical understanding and real-world relevance

Provide a comprehensive explanation that helps the learner truly understand and apply these concepts."""

    def _prepare_content_from_chunks(
        self, chunks: List[ContentChunk], limit: Optional[int] = None
    ) -> str:
        """Prepare content from document chunks"""
        # Sort by relevance score
        sorted_chunks = sorted(chunks, key=lambda c: c.score, reverse=True)
        
        content_parts = []
        total_length = 0
        
        for chunk in sorted_chunks:
            chunk_content = chunk.content.strip()
            
            # Add section context if available
            if chunk.section_title:
                chunk_content = f"[{chunk.section_title}]\n{chunk_content}"
            
            if limit and total_length + len(chunk_content) > limit:
                remaining = limit - total_length
                if remaining > 100:
                    content_parts.append(chunk_content[:remaining] + "...")
                break
            
            content_parts.append(chunk_content)
            total_length += len(chunk_content)
        
        return "\n\n".join(content_parts)

    def _extract_professional_context(self, persona: UserPersona) -> Dict[str, str]:
        """Extract professional context from persona"""
        return {
            'current_role': getattr(persona, 'current_role', 'professional'),
            'industry': getattr(persona, 'industry', 'general'),
            'experience_level': getattr(persona, 'experience_level', 'intermediate'),
            'education_level': getattr(persona, 'education_level', 'bachelor')
        }

    def _extract_relevant_interests(self, persona: UserPersona, topic: str) -> List[str]:
        """Extract relevant interests based on topic"""
        all_interests = []
        
        if hasattr(persona, 'primary_interests') and persona.primary_interests:
            all_interests.extend(persona.primary_interests)
        if hasattr(persona, 'secondary_interests') and persona.secondary_interests:
            all_interests.extend(persona.secondary_interests)
        if hasattr(persona, 'hobbies') and persona.hobbies:
            all_interests.extend(persona.hobbies)
        
        if not all_interests:
            return []
        
        # Score interests by relevance to topic
        topic_lower = topic.lower()
        scored_interests = []
        
        for interest in all_interests:
            score = 0
            interest_words = interest.lower().split()
            
            # Direct word matches
            for word in interest_words:
                if word in topic_lower:
                    score += 3
            
            # Domain relevance
            for domain, keywords in self.DOMAIN_EXPERTISE.items():
                if any(keyword in interest.lower() for keyword in keywords):
                    if any(keyword in topic_lower for keyword in keywords):
                        score += 2
            
            if score > 0:
                scored_interests.append((interest, score))
        
        # Sort and return top interests
        scored_interests.sort(key=lambda x: x[1], reverse=True)
        return [interest for interest, _ in scored_interests[:4]]

    def _extract_learning_style(self, persona: UserPersona) -> Dict[str, str]:
        """Extract learning style preferences"""
        return {
            'preferred_format': getattr(persona, 'learning_style', 'mixed'),
            'pace': getattr(persona, 'learning_pace', 'moderate'),
            'depth': getattr(persona, 'preferred_depth', 'balanced'),
            'interaction': getattr(persona, 'interaction_preference', 'moderate')
        }

    def _extract_communication_tone(self, persona: UserPersona) -> Dict[str, str]:
        """Extract communication tone preferences"""
        return {
            'preferred_tone': getattr(persona, 'communication_tone', 'casual'),
            'formality_level': getattr(persona, 'formality_preference', 'balanced'),
            'humor_level': getattr(persona, 'humor_preference', 'moderate'),
            'encouragement_level': getattr(persona, 'encouragement_preference', 'moderate')
        }

    def _generate_cache_key(
        self, content_type: ContentType, params: Any, persona: UserPersona
    ) -> str:
        """Generate cache key for content"""
        key_parts = [
            content_type.value,
            params.user_id,
            str(hash(str(params.__dict__))),
            str(hash(str(persona.__dict__)))
        ]
        return ":".join(key_parts)

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count (rough approximation)"""
        return len(text.split()) * 1.3  # Rough estimate

    def _calculate_personalization_score(
        self, content: str, persona: UserPersona
    ) -> float:
        """Calculate how well content is personalized"""
        score = 0.5  # Base score
        
        # Check for professional context mentions
        professional_context = self._extract_professional_context(persona)
        if professional_context['industry'].lower() in content.lower():
            score += 0.2
        
        # Check for interest integration
        interests = getattr(persona, 'primary_interests', [])
        for interest in interests[:3]:
            if interest.lower() in content.lower():
                score += 0.1
        
        return min(1.0, score)

    def _calculate_quality_metrics(
        self, content: str, content_type: ContentType
    ) -> Dict[str, float]:
        """Calculate content quality metrics"""
        return {
            'length_appropriateness': min(1.0, len(content) / 1000),
            'structure_clarity': 0.8,  # Would need more sophisticated analysis
            'engagement_level': 0.8,
            'educational_value': 0.9
        }

    def _parse_flashcards(self, content: str) -> List[Dict[str, Any]]:
        """Parse flashcards from AI response"""
        try:
            data = json.loads(content)
            if isinstance(data, dict):
                flashcards = data.get('flashcards', data.get('cards', []))
            else:
                flashcards = data
                
            # Ensure proper format
            formatted_cards = []
            for card in flashcards:
                if isinstance(card, dict) and 'question' in card and 'answer' in card:
                    formatted_cards.append({
                        'front': card.get('question', ''),
                        'back': card.get('answer', ''),
                        'difficulty': card.get('difficulty', 'medium')
                    })
            
            return formatted_cards
        except json.JSONDecodeError:
            logger.error("Failed to parse flashcards JSON")
            return []

    def _parse_quiz_questions(
        self, content: str, quiz_type: QuizType
    ) -> List[Dict[str, Any]]:
        """Parse quiz questions from AI response"""
        try:
            data = json.loads(content)
            if isinstance(data, dict):
                questions = data.get('questions', data.get('quiz', []))
            else:
                questions = data
            
            # Ensure proper format based on quiz type
            formatted_questions = []
            for q in questions:
                if isinstance(q, dict) and 'question' in q:
                    formatted_q = {
                        'question': q.get('question', ''),
                        'type': quiz_type.value,
                        'answer': q.get('answer', q.get('correct', '')),
                        'explanation': q.get('explanation', ''),
                        'difficulty': q.get('difficulty', 'medium')
                    }
                    
                    # Add options for multiple choice
                    if quiz_type == QuizType.MULTIPLE_CHOICE and 'options' in q:
                        formatted_q['options'] = q['options']
                    
                    formatted_questions.append(formatted_q)
            
            return formatted_questions
        except json.JSONDecodeError:
            logger.error("Failed to parse quiz questions JSON")
            return []

    # Additional helper methods for other content types...
    async def _build_summary_system_prompt(
        self, persona: UserPersona, params: SummaryParams
    ) -> str:
        """Build system prompt for summaries"""
        professional_context = self._extract_professional_context(persona)
        communication_tone = self._extract_communication_tone(persona)
        
        tone_template = self.TONE_TEMPLATES.get(
            communication_tone.get('preferred_tone', 'casual'),
            self.TONE_TEMPLATES['casual']
        )
        
        return f"""You are creating a personalized summary for a {professional_context['current_role']} in {professional_context['industry']}.

{tone_template['system_modifier']}

Summary Purpose: {params.purpose}
Format: {params.format}
Target Audience: {professional_context['experience_level']} level professional

Focus on practical takeaways and actionable insights relevant to their field."""

    async def _build_summary_user_prompt(
        self, params: SummaryParams, persona: UserPersona
    ) -> str:
        """Build user prompt for summaries"""
        professional_context = self._extract_professional_context(persona)
        
        return f"""Create a {params.format} summary of the following content for {params.purpose}:

CONTENT:
{params.content[:4000]}

REQUIREMENTS:
- Format: {params.format}
- Purpose: {params.purpose}
- Professional Context: {professional_context['current_role']} in {professional_context['industry']}
- Experience Level: {professional_context['experience_level']}

Focus on key insights, practical applications, and actionable takeaways."""

    async def _build_flashcard_system_prompt(
        self, persona: UserPersona, params: FlashcardParams
    ) -> str:
        """Build system prompt for flashcards"""
        professional_context = self._extract_professional_context(persona)
        learning_style = self._extract_learning_style(persona)
        
        return f"""You are creating flashcards for a {professional_context['current_role']} in {professional_context['industry']}.

Learning Profile:
- Experience Level: {professional_context['experience_level']}
- Learning Style: {learning_style['preferred_format']}
- Pace: {learning_style['pace']}

Create engaging, practical flashcards that test both factual recall and conceptual understanding."""

    async def _build_flashcard_user_prompt(
        self, params: FlashcardParams, persona: UserPersona
    ) -> str:
        """Build user prompt for flashcards"""
        professional_context = self._extract_professional_context(persona)
        interests = self._extract_relevant_interests(persona, params.topic)
        
        interest_context = ""
        if interests:
            interest_context = f"\nInclude examples from: {', '.join(interests[:2])}"
        
        return f"""Create {params.count} flashcards from the following content about {params.topic}:

CONTENT:
{params.content[:4000]}

REQUIREMENTS:
- Target: {professional_context['current_role']} in {professional_context['industry']}
- Mix of factual and conceptual questions
- Progressive difficulty levels{interest_context}
- Include practical applications

Return as JSON:
{{
  "flashcards": [
    {{"question": "...", "answer": "...", "difficulty": "easy|medium|hard"}},
    ...
  ]
}}"""

    async def _build_quiz_system_prompt(
        self, persona: UserPersona, params: QuizParams
    ) -> str:
        """Build system prompt for quiz"""
        professional_context = self._extract_professional_context(persona)
        learning_style = self._extract_learning_style(persona)
        
        return f"""You are creating a {params.quiz_type.value} quiz for a {professional_context['current_role']} in {professional_context['industry']}.

Quiz Requirements:
- Type: {params.quiz_type.value}
- Question Count: {params.count}
- Experience Level: {professional_context['experience_level']}
- Include detailed explanations: {params.include_explanations}
- Adaptive difficulty: {params.adaptive_difficulty}

Focus on practical application and real-world scenarios relevant to their field."""

    async def _build_quiz_user_prompt(
        self, params: QuizParams, persona: UserPersona
    ) -> str:
        """Build user prompt for quiz"""
        professional_context = self._extract_professional_context(persona)
        interests = self._extract_relevant_interests(persona, params.topic)
        
        quiz_format = self._get_quiz_format_instructions(params.quiz_type)
        
        return f"""Create a {params.count}-question {params.quiz_type.value} quiz about {params.topic}:

CONTENT:
{params.content[:4000]}

TARGET AUDIENCE:
- Role: {professional_context['current_role']}
- Industry: {professional_context['industry']}
- Level: {professional_context['experience_level']}

{quiz_format}

Focus on practical scenarios and real-world applications."""

    def _get_quiz_format_instructions(self, quiz_type: QuizType) -> str:
        """Get format instructions for different quiz types"""
        formats = {
            QuizType.MULTIPLE_CHOICE: """Return as JSON:
{
  "questions": [
    {
      "question": "...",
      "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
      "correct": "A",
      "explanation": "...",
      "difficulty": "easy|medium|hard"
    }
  ]
}""",
            QuizType.TRUE_FALSE: """Return as JSON:
{
  "questions": [
    {
      "question": "...",
      "answer": "True|False",
      "explanation": "...",
      "difficulty": "easy|medium|hard"
    }
  ]
}""",
            QuizType.SHORT_ANSWER: """Return as JSON:
{
  "questions": [
    {
      "question": "...",
      "answer": "Expected answer...",
      "explanation": "Key points to look for...",
      "difficulty": "easy|medium|hard"
    }
  ]
}"""
        }
        return formats.get(quiz_type, formats[QuizType.MULTIPLE_CHOICE])

    async def _build_chat_system_prompt(
        self, persona: Optional[UserPersona], params: ChatParams
    ) -> str:
        """Build system prompt for chat"""
        if not persona:
            return """You are an AI study assistant helping a user understand educational content.
Be helpful, encouraging, and focused on learning."""
        
        professional_context = self._extract_professional_context(persona)
        communication_tone = self._extract_communication_tone(persona)
        
        tone_template = self.TONE_TEMPLATES.get(
            communication_tone.get('preferred_tone', 'casual'),
            self.TONE_TEMPLATES['casual']
        )
        
        context_info = ""
        if params.current_page:
            context_info += f"They are currently on page {params.current_page}. "
        if params.selected_text:
            context_info += f"They have highlighted: \"{params.selected_text[:100]}...\""
        
        available_context = "\n".join(params.context[:3]) if params.context else "No specific context available."
        
        return f"""You are an AI study assistant helping a {professional_context['current_role']} in {professional_context['industry']}.

LEARNER PROFILE:
- Experience Level: {professional_context['experience_level']}
- Communication Style: {tone_template['response_style']}

CURRENT CONTEXT:
{context_info}

AVAILABLE CONTENT:
{available_context}

{tone_template['system_modifier']}

Guidelines:
- Be helpful and encouraging
- Use examples relevant to their professional context
- Keep responses focused and practical
- Cite specific parts of the context when answering
- Encourage active learning and critical thinking"""