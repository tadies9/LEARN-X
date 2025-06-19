"""
Content Generation API Routes
Provides endpoints for all content generation functionality
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import json
import asyncio
from structlog import get_logger

from ...services.content.comprehensive_generator import (
    ComprehensiveContentGenerator,
    ContentChunk,
    ExplanationParams,
    SummaryParams,
    FlashcardParams,
    QuizParams,
    ChatParams,
    PersonalizedContent,
    GenerationParams,
    ContentType,
    QuizType
)
from ...services.personalization.enhanced_persona_engine import EnhancedPersonaEngine
from ...services.ai.manager import AIManager
from ...services.ai.cost_tracker import CostTracker
from ...services.cache.vector_cache import VectorCache

logger = get_logger()
router = APIRouter(prefix="/content", tags=["content"])


# Request/Response Models
class ContentChunkModel(BaseModel):
    id: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    score: float = 1.0


class ExplanationRequest(BaseModel):
    user_id: str
    chunks: List[ContentChunkModel]
    topic: str
    subtopic: Optional[str] = None
    current_level: str = "foundation"
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    use_cache: bool = True
    personalization_level: str = "medium"
    include_examples: bool = True
    include_practice: bool = False
    stream: bool = True


class SummaryRequest(BaseModel):
    user_id: str
    content: str
    format: str = "key-points"
    purpose: str = "review"
    model: Optional[str] = None
    temperature: float = 0.5
    max_tokens: Optional[int] = 1000
    use_cache: bool = True
    personalization_level: str = "medium"


class FlashcardRequest(BaseModel):
    user_id: str
    content: str
    topic: str
    count: int = 10
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = 1500
    use_cache: bool = True
    personalization_level: str = "medium"
    contextual_examples: bool = True
    difficulty_mix: bool = True


class QuizRequest(BaseModel):
    user_id: str
    content: str
    topic: str
    quiz_type: str = "multiple_choice"
    count: int = 5
    model: Optional[str] = None
    temperature: float = 0.6
    max_tokens: Optional[int] = 2000
    use_cache: bool = True
    personalization_level: str = "medium"
    adaptive_difficulty: bool = True
    include_explanations: bool = True


class ChatRequest(BaseModel):
    user_id: str
    message: str
    context: List[str] = Field(default_factory=list)
    current_page: Optional[int] = None
    selected_text: Optional[str] = None
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 1000
    use_cache: bool = False
    personalization_level: str = "high"
    stream: bool = True


class IntroductionRequest(BaseModel):
    topic: str
    content: str
    user_id: str
    model: Optional[str] = None


class ExamplesRequest(BaseModel):
    concept: str
    user_id: str
    count: int = 3
    model: Optional[str] = None


class PersonalizationScoreRequest(BaseModel):
    user_id: str
    content: str
    content_type: str


# Response Models
class PersonalizedContentResponse(BaseModel):
    content: str
    personalization_score: float
    quality_metrics: Dict[str, float]
    cached: bool
    cost_info: Optional[Dict[str, Any]] = None


class FlashcardResponse(BaseModel):
    front: str
    back: str
    difficulty: str


class QuizQuestionResponse(BaseModel):
    question: str
    type: str
    options: Optional[Dict[str, str]] = None
    answer: str
    explanation: str
    difficulty: Optional[str] = None


# Dependency injection
async def get_content_generator() -> ComprehensiveContentGenerator:
    """Get content generator instance"""
    # In a real implementation, these would be injected via dependency injection
    ai_manager = AIManager()  # Would be properly initialized
    persona_engine = EnhancedPersonaEngine()
    cost_tracker = CostTracker()
    cache = None  # VectorCache() if available
    
    return ComprehensiveContentGenerator(
        ai_manager=ai_manager,
        persona_engine=persona_engine,
        cost_tracker=cost_tracker,
        cache=cache
    )


# Routes
@router.post("/explanation/stream")
async def stream_explanation(
    request: ExplanationRequest,
    generator: ComprehensiveContentGenerator = Depends(get_content_generator)
):
    """Generate streaming personalized explanation"""
    try:
        # Convert request to internal format
        chunks = [
            ContentChunk(
                id=chunk.id,
                content=chunk.content,
                metadata=chunk.metadata,
                score=chunk.score
            )
            for chunk in request.chunks
        ]
        
        params = ExplanationParams(
            user_id=request.user_id,
            chunks=chunks,
            topic=request.topic,
            subtopic=request.subtopic,
            current_level=request.current_level,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            use_cache=request.use_cache,
            personalization_level=request.personalization_level,
            include_examples=request.include_examples,
            include_practice=request.include_practice,
            stream=request.stream
        )
        
        async def generate_stream():
            try:
                async for chunk in generator.generate_explanation_stream(params):
                    # Format as Server-Sent Events
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                logger.error(f"Error in explanation stream: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/plain; charset=utf-8"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to stream explanation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summary", response_model=PersonalizedContentResponse)
async def generate_summary(
    request: SummaryRequest,
    generator: ComprehensiveContentGenerator = Depends(get_content_generator)
):
    """Generate personalized summary"""
    try:
        params = SummaryParams(
            user_id=request.user_id,
            content=request.content,
            format=request.format,
            purpose=request.purpose,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            use_cache=request.use_cache,
            personalization_level=request.personalization_level
        )
        
        result = await generator.generate_summary(params)
        
        return PersonalizedContentResponse(
            content=result.content,
            personalization_score=result.personalization_score,
            quality_metrics=result.quality_metrics,
            cached=result.cached,
            cost_info=result.cost_info
        )
        
    except Exception as e:
        logger.error(f"Failed to generate summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/flashcards")
async def generate_flashcards(
    request: FlashcardRequest,
    generator: ComprehensiveContentGenerator = Depends(get_content_generator)
):
    """Generate personalized flashcards"""
    try:
        params = FlashcardParams(
            user_id=request.user_id,
            content=request.content,
            topic=request.topic,
            count=request.count,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            use_cache=request.use_cache,
            personalization_level=request.personalization_level,
            contextual_examples=request.contextual_examples,
            difficulty_mix=request.difficulty_mix
        )
        
        flashcards = await generator.generate_flashcards(params)
        
        return {
            "flashcards": [
                FlashcardResponse(
                    front=card["front"],
                    back=card["back"],
                    difficulty=card["difficulty"]
                )
                for card in flashcards
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to generate flashcards: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz")
async def generate_quiz(
    request: QuizRequest,
    generator: ComprehensiveContentGenerator = Depends(get_content_generator)
):
    """Generate personalized quiz questions"""
    try:
        # Map string to enum
        quiz_type_map = {
            "multiple_choice": QuizType.MULTIPLE_CHOICE,
            "true_false": QuizType.TRUE_FALSE,
            "short_answer": QuizType.SHORT_ANSWER,
            "scenario_analysis": QuizType.SCENARIO_ANALYSIS,
            "problem_solving": QuizType.PROBLEM_SOLVING,
            "application": QuizType.APPLICATION
        }
        
        params = QuizParams(
            user_id=request.user_id,
            content=request.content,
            topic=request.topic,
            quiz_type=quiz_type_map.get(request.quiz_type, QuizType.MULTIPLE_CHOICE),
            count=request.count,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            use_cache=request.use_cache,
            personalization_level=request.personalization_level,
            adaptive_difficulty=request.adaptive_difficulty,
            include_explanations=request.include_explanations
        )
        
        questions = await generator.generate_quiz(params)
        
        return {
            "questions": [
                QuizQuestionResponse(
                    question=q["question"],
                    type=q["type"],
                    options=q.get("options"),
                    answer=q["answer"],
                    explanation=q["explanation"],
                    difficulty=q.get("difficulty")
                )
                for q in questions
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to generate quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def stream_chat(
    request: ChatRequest,
    generator: ComprehensiveContentGenerator = Depends(get_content_generator)
):
    """Stream personalized chat response"""
    try:
        params = ChatParams(
            user_id=request.user_id,
            message=request.message,
            context=request.context,
            current_page=request.current_page,
            selected_text=request.selected_text,
            conversation_history=request.conversation_history,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            use_cache=request.use_cache,
            personalization_level=request.personalization_level,
            stream=request.stream
        )
        
        async def generate_stream():
            try:
                async for chunk in generator.stream_chat_response(params):
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                logger.error(f"Error in chat stream: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/plain; charset=utf-8"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to stream chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/introduction", response_model=PersonalizedContentResponse)
async def generate_introduction(
    request: IntroductionRequest,
    generator: ComprehensiveContentGenerator = Depends(get_content_generator)
):
    """Generate personalized introduction"""
    try:
        # This would use the explanation orchestrator
        # For now, return a placeholder
        return PersonalizedContentResponse(
            content=f"Personalized introduction to {request.topic} for user {request.user_id}",
            personalization_score=0.8,
            quality_metrics={"placeholder": 1.0},
            cached=False
        )
        
    except Exception as e:
        logger.error(f"Failed to generate introduction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/examples")
async def generate_examples(
    request: ExamplesRequest,
    generator: ComprehensiveContentGenerator = Depends(get_content_generator)
):
    """Generate personalized examples"""
    try:
        # This would use the explanation orchestrator
        # For now, return placeholder examples
        examples = [
            f"Example {i+1} of {request.concept} for user {request.user_id}"
            for i in range(request.count)
        ]
        
        return {"examples": examples}
        
    except Exception as e:
        logger.error(f"Failed to generate examples: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/personalization/score")
async def get_personalization_score(
    request: PersonalizationScoreRequest,
    generator: ComprehensiveContentGenerator = Depends(get_content_generator)
):
    """Get personalization score for content"""
    try:
        # This would use the persona engine
        scores = await generator.persona_engine.calculate_personalization_score(
            request.user_id, request.content, request.content_type
        )
        
        return scores
        
    except Exception as e:
        logger.error(f"Failed to calculate personalization score: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Health and monitoring endpoints
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "content-generation",
        "version": "1.0.0"
    }


@router.get("/metrics")
async def get_metrics():
    """Get service metrics"""
    return {
        "requests_total": 0,  # Would be actual metrics
        "requests_per_minute": 0,
        "average_response_time": 0,
        "error_rate": 0,
        "cache_hit_rate": 0
    }