"""
AI content generation and embedding routes.
Handles streaming content generation, embeddings, and model management.
"""

from typing import Dict, List, Optional, Union, Any, AsyncIterator
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
import json
import asyncio
import uuid
import time
from datetime import datetime

from core.logging import get_logger
from services.ai.manager import AIManager, ProviderType, FallbackStrategy
from services.ai.providers.base import (
    AIModel, Message, CompletionOptions, EmbeddingOptions, ProviderConfig
)
from services.personalization.enhanced_persona_engine import (
    EnhancedPersonalizationEngine, EnhancedPersonaData, ContentType
)
from services.cache.ai_content_cache import (
    IntelligentAICache, CacheEntry, create_ai_content_cache
)
from services.ai.batch_processor import BatchProcessor, BatchRequest, Priority
from app.config import settings

logger = get_logger(__name__)
router = APIRouter()

# Global service instances
ai_manager: Optional[AIManager] = None
personalization_engine: Optional[EnhancedPersonalizationEngine] = None
intelligent_cache: Optional[IntelligentAICache] = None
batch_processor: Optional[BatchProcessor] = None


async def get_ai_manager() -> AIManager:
    """Get or initialize AI manager and related services"""
    global ai_manager, personalization_engine, intelligent_cache, batch_processor
    
    if not ai_manager:
        ai_manager = AIManager(
            default_provider=ProviderType.OPENAI,
            fallback_strategy=FallbackStrategy.LEAST_COST,
            enable_cost_optimization=True,
            enable_local_fallback=True
        )
        
        # Initialize OpenAI provider
        if settings.openai_api_key:
            openai_config = ProviderConfig(
                api_key=settings.openai_api_key,
                timeout=60,
                max_retries=3
            )
            await ai_manager.initialize_provider(ProviderType.OPENAI, openai_config)
        
        # Initialize Anthropic provider if configured
        if hasattr(settings, 'anthropic_api_key') and settings.anthropic_api_key:
            anthropic_config = ProviderConfig(
                api_key=settings.anthropic_api_key,
                timeout=60,
                max_retries=3
            )
            await ai_manager.initialize_provider(ProviderType.ANTHROPIC, anthropic_config)
        
        # Initialize local models if path configured
        if hasattr(settings, 'local_models_path') and settings.local_models_path:
            local_config = ProviderConfig(
                model_path=settings.local_models_path,
                n_ctx=4096,
                n_gpu_layers=-1,  # Use all GPU layers if available
                use_mmap=True
            )
            try:
                await ai_manager.initialize_provider(ProviderType.LOCAL, local_config)
            except ImportError:
                logger.warning("llama-cpp-python not installed, skipping local models")
    
    # Initialize personalization engine
    if not personalization_engine:
        personalization_engine = EnhancedPersonalizationEngine()
    
    # Initialize intelligent cache
    if not intelligent_cache:
        cache_type = getattr(settings, 'cache_type', 'memory')
        cache_config = getattr(settings, 'cache_config', {})
        content_cache = create_ai_content_cache(cache_type, cache_config)
        intelligent_cache = IntelligentAICache(content_cache)
    
    # Initialize batch processor
    if not batch_processor:
        from services.ai.batch_processor import create_batch_processor
        batch_config = getattr(settings, 'batch_config', {})
        batch_processor = create_batch_processor(ai_manager, batch_config)
        await batch_processor.start()
    
    return ai_manager


# Request/Response Models
class CompletionRequest(BaseModel):
    messages: List[Dict[str, str]]
    model: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, gt=0, le=4096)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    stop: Optional[List[str]] = None
    stream: bool = False
    user_id: Optional[str] = None
    preferred_providers: Optional[List[str]] = None


class ContentGenerationRequest(BaseModel):
    content: str
    content_type: str = Field(..., description="Type: explanation, summary, quiz, flashcards")
    topic: Optional[str] = None
    difficulty: str = Field(default="intermediate", pattern="^(beginner|intermediate|advanced)$")
    persona: Optional[Dict[str, Any]] = None
    model: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=2000, gt=0, le=4096)
    stream: bool = True
    user_id: Optional[str] = None


class EmbeddingRequest(BaseModel):
    texts: Union[str, List[str]]
    model: Optional[str] = "text-embedding-3-small"
    dimensions: Optional[int] = None
    user_id: Optional[str] = None


class BatchEmbeddingRequest(BaseModel):
    items: List[Dict[str, Union[str, Dict[str, Any]]]]  # [{id, text, metadata}]
    model: Optional[str] = "text-embedding-3-small"
    dimensions: Optional[int] = None
    batch_size: int = Field(default=50, gt=0, le=100)
    user_id: Optional[str] = None


class OutlineGenerationRequest(BaseModel):
    file_id: str
    user_id: str
    content: Optional[str] = None  # If content provided directly
    difficulty: str = Field(default="intermediate", pattern="^(beginner|intermediate|advanced)$")
    num_topics: int = Field(default=5, ge=3, le=8)
    subtopics_per_topic: int = Field(default=5, ge=3, le=7)
    stream: bool = True


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None  # File context, previous messages
    user_id: str
    persona: Optional[Dict[str, Any]] = None
    stream: bool = True
    model: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class QuizGenerationRequest(BaseModel):
    content: str
    topic: Optional[str] = None
    difficulty: str = Field(default="intermediate", pattern="^(beginner|intermediate|advanced)$")
    num_questions: int = Field(default=5, ge=3, le=15)
    question_types: List[str] = Field(default=["multiple_choice", "true_false", "short_answer"])
    user_id: str
    persona: Optional[Dict[str, Any]] = None
    include_explanations: bool = True


class SummaryGenerationRequest(BaseModel):
    content: str
    summary_type: str = Field(default="comprehensive", pattern="^(brief|comprehensive|key_points|executive)$")
    max_length: Optional[int] = Field(default=None, ge=100, le=2000)
    focus_areas: Optional[List[str]] = None
    user_id: str
    persona: Optional[Dict[str, Any]] = None


class FlashcardGenerationRequest(BaseModel):
    content: str
    topic: Optional[str] = None
    num_cards: int = Field(default=10, ge=5, le=25)
    difficulty: str = Field(default="intermediate", pattern="^(beginner|intermediate|advanced)$")
    card_types: List[str] = Field(default=["definition", "concept", "example"])
    user_id: str
    persona: Optional[Dict[str, Any]] = None


class PersonaRequest(BaseModel):
    """Enhanced persona structure matching all 5 dimensions"""
    # Professional Context
    professional_context: Optional[Dict[str, Any]] = None
    
    # Personal Interests  
    personal_interests: Optional[Dict[str, Any]] = None
    
    # Learning Style
    learning_style: Optional[Dict[str, Any]] = None
    
    # Content Preferences
    content_preferences: Optional[Dict[str, Any]] = None
    
    # Communication Tone
    communication_tone: Optional[Dict[str, Any]] = None


# Routes
@router.post("/complete")
async def create_completion(
    request: CompletionRequest,
    ai_manager: AIManager = Depends(get_ai_manager)
):
    """Create a text completion"""
    try:
        # Convert request to internal format
        messages = [
            Message(role=msg["role"], content=msg["content"])
            for msg in request.messages
        ]
        
        model = AIModel(request.model) if request.model else None
        options = CompletionOptions(
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            top_p=request.top_p,
            frequency_penalty=request.frequency_penalty,
            presence_penalty=request.presence_penalty,
            stop=request.stop
        )
        
        preferred_providers = None
        if request.preferred_providers:
            preferred_providers = [
                ProviderType(p) for p in request.preferred_providers
            ]
        
        if request.stream:
            # Return streaming response
            async def generate():
                try:
                    async for chunk in ai_manager.complete_stream(
                        messages=messages,
                        model=model,
                        options=options,
                        preferred_providers=preferred_providers,
                        user_id=request.user_id
                    ):
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                except Exception as e:
                    error_data = {"error": str(e)}
                    yield f"data: {json.dumps(error_data)}\n\n"
                finally:
                    yield "data: [DONE]\n\n"
            
            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no"
                }
            )
        else:
            # Return complete response
            response = await ai_manager.complete(
                messages=messages,
                model=model,
                options=options,
                preferred_providers=preferred_providers,
                user_id=request.user_id
            )
            
            return {
                "id": response.id,
                "model": response.model,
                "content": response.content,
                "finish_reason": response.finish_reason,
                "usage": response.usage,
                "created": response.created
            }
            
    except Exception as e:
        logger.error(f"Completion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-content")
async def generate_content(
    request: ContentGenerationRequest,
    ai_manager: AIManager = Depends(get_ai_manager)
):
    """Generate educational content with personalization"""
    try:
        # Build messages based on content type
        messages = _build_content_messages(request)
        
        model = AIModel(request.model) if request.model else None
        options = CompletionOptions(
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        if request.stream:
            # Return streaming response
            async def generate():
                try:
                    total_content = ""
                    async for chunk in ai_manager.complete_stream(
                        messages=messages,
                        model=model,
                        options=options,
                        user_id=request.user_id
                    ):
                        total_content += chunk
                        yield f"data: {json.dumps({'content': chunk, 'type': request.content_type})}\n\n"
                    
                    # Send completion marker
                    yield f"data: {json.dumps({'done': True, 'total_length': len(total_content)})}\n\n"
                except Exception as e:
                    error_data = {"error": str(e)}
                    yield f"data: {json.dumps(error_data)}\n\n"
                finally:
                    yield "data: [DONE]\n\n"
            
            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no"
                }
            )
        else:
            # Return complete response
            response = await ai_manager.complete(
                messages=messages,
                model=model,
                options=options,
                user_id=request.user_id
            )
            
            return {
                "content": response.content,
                "content_type": request.content_type,
                "model": response.model,
                "usage": response.usage
            }
            
    except Exception as e:
        logger.error(f"Content generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embeddings")
async def create_embeddings(
    request: EmbeddingRequest,
    ai_manager: AIManager = Depends(get_ai_manager)
):
    """Create embeddings for text(s)"""
    try:
        model = AIModel(request.model) if request.model else AIModel.EMBEDDING_3_SMALL
        options = EmbeddingOptions(dimensions=request.dimensions)
        
        response = await ai_manager.embed(
            texts=request.texts,
            model=model,
            options=options,
            user_id=request.user_id
        )
        
        return {
            "embeddings": response.embeddings,
            "model": response.model,
            "usage": response.usage
        }
        
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embeddings/batch")
async def create_batch_embeddings(
    request: BatchEmbeddingRequest,
    background_tasks: BackgroundTasks,
    ai_manager: AIManager = Depends(get_ai_manager)
):
    """Create embeddings for multiple texts in batches"""
    try:
        model = AIModel(request.model) if request.model else AIModel.EMBEDDING_3_SMALL
        options = EmbeddingOptions(dimensions=request.dimensions)
        
        # Process in batches
        results = []
        for i in range(0, len(request.items), request.batch_size):
            batch = request.items[i:i + request.batch_size]
            texts = [item["text"] for item in batch]
            
            response = await ai_manager.embed(
                texts=texts,
                model=model,
                options=options,
                user_id=request.user_id
            )
            
            # Combine with metadata
            for j, embedding in enumerate(response.embeddings):
                results.append({
                    "id": batch[j].get("id", f"item_{i+j}"),
                    "embedding": embedding,
                    "metadata": batch[j].get("metadata", {})
                })
        
        return {
            "embeddings": results,
            "model": model.value,
            "total_items": len(results)
        }
        
    except Exception as e:
        logger.error(f"Batch embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def list_models(ai_manager: AIManager = Depends(get_ai_manager)):
    """List available models and their capabilities"""
    try:
        models = {}
        
        for provider_type, provider in ai_manager.providers.items():
            provider_models = {}
            
            for model in AIModel:
                if provider.supports_model(model):
                    info = provider.get_model_info(model)
                    provider_models[model.value] = {
                        "supported": True,
                        "info": info
                    }
            
            models[provider_type.value] = provider_models
        
        return {"models": models}
        
    except Exception as e:
        logger.error(f"Models list error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_ai_stats(ai_manager: AIManager = Depends(get_ai_manager)):
    """Get AI service statistics"""
    try:
        stats = await ai_manager.get_stats()
        return stats
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-outline")
async def generate_outline(
    request: OutlineGenerationRequest,
    ai_manager: AIManager = Depends(get_ai_manager)
):
    """Generate learning outline with streaming support"""
    try:
        # Get file content if file_id provided
        content = request.content
        if not content and request.file_id:
            content = await _get_file_content(request.file_id)
        
        if not content:
            raise HTTPException(status_code=400, detail="No content provided")
        
        # Build outline generation messages
        messages = _build_outline_messages(content, request)
        
        model = AIModel.GPT_4_TURBO  # Use GPT-4 for better structured output
        options = CompletionOptions(
            temperature=0.3,  # Lower temperature for more structured output
            max_tokens=2000
        )
        
        if request.stream:
            async def generate():
                try:
                    current_topic = 0
                    buffer = ""
                    
                    async for chunk in ai_manager.complete_stream(
                        messages=messages,
                        model=model,
                        options=options,
                        user_id=request.user_id
                    ):
                        buffer += chunk
                        
                        # Try to parse and stream topics as they complete
                        if _is_topic_complete(buffer):
                            topic_data = _extract_topic_from_buffer(buffer, current_topic)
                            if topic_data:
                                yield f"data: {json.dumps({'type': 'topic', 'data': topic_data})}\n\n"
                                current_topic += 1
                                buffer = _clean_buffer_after_topic(buffer)
                    
                    # Final processing
                    if buffer.strip():
                        final_topics = _extract_remaining_topics(buffer, current_topic)
                        for topic in final_topics:
                            yield f"data: {json.dumps({'type': 'topic', 'data': topic})}\n\n"
                    
                    yield f"data: {json.dumps({'type': 'complete'})}\n\n"
                    
                except Exception as e:
                    error_data = {"type": "error", "message": str(e)}
                    yield f"data: {json.dumps(error_data)}\n\n"
                finally:
                    yield "data: [DONE]\n\n"
            
            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            )
        else:
            # Non-streaming response
            response = await ai_manager.complete(
                messages=messages,
                model=model,
                options=options,
                user_id=request.user_id
            )
            
            outline_data = _parse_outline_response(response.content)
            return {
                "outline": outline_data,
                "model": response.model,
                "usage": response.usage
            }
            
    except Exception as e:
        logger.error(f"Outline generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/start")
async def start_chat(
    request: ChatRequest,
    ai_manager: AIManager = Depends(get_ai_manager)
):
    """Start a new chat conversation or continue existing one"""
    try:
        # Generate conversation ID if not provided
        if not request.conversation_id:
            request.conversation_id = str(uuid.uuid4())
        
        # Build chat messages with context and persona
        messages = await _build_chat_messages(request)
        
        model = AIModel(request.model) if request.model else AIModel.GPT_4_TURBO
        options = CompletionOptions(
            temperature=request.temperature,
            max_tokens=1000
        )
        
        if request.stream:
            async def generate():
                try:
                    conversation_data = {
                        "type": "conversation_start",
                        "conversation_id": request.conversation_id
                    }
                    yield f"data: {json.dumps(conversation_data)}\n\n"
                    
                    async for chunk in ai_manager.complete_stream(
                        messages=messages,
                        model=model,
                        options=options,
                        user_id=request.user_id
                    ):
                        response_data = {
                            "type": "message",
                            "content": chunk,
                            "conversation_id": request.conversation_id
                        }
                        yield f"data: {json.dumps(response_data)}\n\n"
                    
                    yield f"data: {json.dumps({'type': 'complete'})}\n\n"
                    
                except Exception as e:
                    error_data = {"type": "error", "message": str(e)}
                    yield f"data: {json.dumps(error_data)}\n\n"
                finally:
                    yield "data: [DONE]\n\n"
            
            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            )
        else:
            response = await ai_manager.complete(
                messages=messages,
                model=model,
                options=options,
                user_id=request.user_id
            )
            
            return {
                "conversation_id": request.conversation_id,
                "message": response.content,
                "model": response.model,
                "usage": response.usage
            }
            
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz/generate")
async def generate_quiz(
    request: QuizGenerationRequest,
    ai_manager: AIManager = Depends(get_ai_manager)
):
    """Generate personalized quiz questions"""
    try:
        messages = _build_quiz_messages(request)
        
        model = AIModel.GPT_4_TURBO
        options = CompletionOptions(
            temperature=0.4,  # Balanced for creativity and consistency
            max_tokens=2000
        )
        
        response = await ai_manager.complete(
            messages=messages,
            model=model,
            options=options,
            user_id=request.user_id
        )
        
        quiz_data = _parse_quiz_response(response.content, request)
        
        return {
            "quiz": quiz_data,
            "model": response.model,
            "usage": response.usage,
            "metadata": {
                "difficulty": request.difficulty,
                "num_questions": request.num_questions,
                "question_types": request.question_types
            }
        }
        
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summary/generate")
async def generate_summary(
    request: SummaryGenerationRequest,
    ai_manager: AIManager = Depends(get_ai_manager)
):
    """Generate personalized content summary"""
    try:
        messages = _build_summary_messages(request)
        
        model = AIModel.GPT_4_TURBO
        options = CompletionOptions(
            temperature=0.3,  # Lower for more factual summaries
            max_tokens=request.max_length or 1000
        )
        
        response = await ai_manager.complete(
            messages=messages,
            model=model,
            options=options,
            user_id=request.user_id
        )
        
        summary_data = _parse_summary_response(response.content, request)
        
        return {
            "summary": summary_data,
            "model": response.model,
            "usage": response.usage,
            "metadata": {
                "summary_type": request.summary_type,
                "original_length": len(request.content),
                "summary_length": len(response.content)
            }
        }
        
    except Exception as e:
        logger.error(f"Summary generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/flashcards/generate")
async def generate_flashcards(
    request: FlashcardGenerationRequest,
    ai_manager: AIManager = Depends(get_ai_manager)
):
    """Generate personalized flashcards"""
    try:
        messages = _build_flashcard_messages(request)
        
        model = AIModel.GPT_4_TURBO
        options = CompletionOptions(
            temperature=0.5,  # Balanced for variety
            max_tokens=2000
        )
        
        response = await ai_manager.complete(
            messages=messages,
            model=model,
            options=options,
            user_id=request.user_id
        )
        
        flashcards_data = _parse_flashcard_response(response.content, request)
        
        return {
            "flashcards": flashcards_data,
            "model": response.model,
            "usage": response.usage,
            "metadata": {
                "num_cards": len(flashcards_data),
                "difficulty": request.difficulty,
                "card_types": request.card_types
            }
        }
        
    except Exception as e:
        logger.error(f"Flashcard generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain/stream")
async def explain_stream(
    request: ContentGenerationRequest,
    ai_manager: AIManager = Depends(get_ai_manager)
):
    """Enhanced streaming explanation with personalization and caching"""
    try:
        # Get services
        global personalization_engine, intelligent_cache
        
        # Convert persona to enhanced format if provided
        enhanced_persona = None
        if request.persona:
            enhanced_persona = EnhancedPersonaData(
                user_id=request.user_id,
                professional_context=request.persona.get('professional_context', {}),
                personal_interests=request.persona.get('personal_interests', {}),
                learning_style=request.persona.get('learning_style', {}),
                content_preferences=request.persona.get('content_preferences', {}),
                communication_tone=request.persona.get('communication_tone', {})
            )
        
        # Generate personalized prompt
        if enhanced_persona and personalization_engine:
            personalized_prompt = await personalization_engine.generate_personalized_prompt(
                content=request.content,
                content_type=ContentType.EXPLANATION,
                persona=enhanced_persona,
                additional_context={'topic': request.topic, 'difficulty': request.difficulty}
            )
        else:
            personalized_prompt = f"Explain this content at {request.difficulty} level:\n\n{request.content}"
        
        # Check cache or generate
        async def generate_content():
            messages = [Message(role="user", content=personalized_prompt)]
            model = AIModel(request.model) if request.model else AIModel.GPT_4_TURBO
            options = CompletionOptions(
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )
            
            response = await ai_manager.complete(
                messages=messages,
                model=model,
                options=options,
                user_id=request.user_id
            )
            
            return {
                'content': response.content,
                'model': response.model,
                'usage': response.usage
            }
        
        # Use intelligent cache if available
        if intelligent_cache:
            content, was_cached = await intelligent_cache.get_or_generate(
                content_type=request.content_type,
                source_content=request.content,
                persona=request.persona,
                generator_func=generate_content,
                additional_params={
                    'topic': request.topic,
                    'difficulty': request.difficulty,
                    'temperature': request.temperature
                }
            )
            
            if was_cached:
                logger.info(f"Content served from cache for user {request.user_id}")
        else:
            result = await generate_content()
            content = result['content']
        
        # Stream the response
        if request.stream:
            async def generate():
                try:
                    # Split content into chunks for streaming
                    words = content.split()
                    chunk_size = 5  # Words per chunk
                    
                    for i in range(0, len(words), chunk_size):
                        chunk = ' '.join(words[i:i + chunk_size])
                        if i + chunk_size < len(words):
                            chunk += ' '
                        
                        yield f"data: {json.dumps({'content': chunk, 'type': request.content_type})}\n\n"
                        await asyncio.sleep(0.05)  # Small delay for streaming effect
                    
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    
                except Exception as e:
                    error_data = {"error": str(e)}
                    yield f"data: {json.dumps(error_data)}\n\n"
                finally:
                    yield "data: [DONE]\n\n"
            
            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            )
        else:
            return {"content": content, "cached": was_cached if intelligent_cache else False}
            
    except Exception as e:
        logger.error(f"Enhanced explain stream error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch/process")
async def process_batch(
    requests: List[Dict[str, Any]],
    priority: str = "normal",
    wait_for_results: bool = True,
    ai_manager: AIManager = Depends(get_ai_manager)
):
    """Process multiple AI requests in an optimized batch"""
    try:
        global batch_processor
        
        if not batch_processor:
            raise HTTPException(status_code=503, detail="Batch processor not available")
        
        if len(requests) > 50:
            raise HTTPException(status_code=400, detail="Maximum 50 requests per batch")
        
        # Convert priority string to enum
        priority_map = {
            'low': Priority.LOW,
            'normal': Priority.NORMAL,
            'high': Priority.HIGH,
            'urgent': Priority.URGENT
        }
        request_priority = priority_map.get(priority.lower(), Priority.NORMAL)
        
        # Create batch requests
        batch_requests = []
        for i, req_data in enumerate(requests):
            batch_req = BatchRequest(
                id=f"batch_{int(time.time())}_{i}",
                request_type=req_data.get('type', 'completion'),
                data=req_data.get('data', {}),
                priority=request_priority,
                user_id=req_data.get('user_id', 'unknown'),
                created_at=datetime.now()
            )
            batch_requests.append(batch_req)
        
        # Process requests
        if wait_for_results:
            # Submit requests and wait for results
            tasks = []
            for batch_req in batch_requests:
                task = asyncio.create_task(
                    batch_processor.submit_request(batch_req, wait_for_result=True)
                )
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Format results
            formatted_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    formatted_results.append({
                        'request_id': batch_requests[i].id,
                        'success': False,
                        'error': str(result)
                    })
                else:
                    formatted_results.append({
                        'request_id': result.request_id,
                        'success': result.success,
                        'result': result.result,
                        'error': result.error,
                        'processing_time': result.processing_time,
                        'tokens_used': result.tokens_used,
                        'cost_estimate': result.cost_estimate
                    })
            
            return {
                'batch_id': f"batch_{int(time.time())}",
                'total_requests': len(requests),
                'results': formatted_results,
                'stats': batch_processor.get_stats()
            }
        else:
            # Submit requests asynchronously
            request_ids = []
            for batch_req in batch_requests:
                request_id = await batch_processor.submit_request(batch_req, wait_for_result=False)
                request_ids.append(request_id)
            
            return {
                'batch_id': f"batch_{int(time.time())}",
                'request_ids': request_ids,
                'status': 'submitted'
            }
            
    except Exception as e:
        logger.error(f"Batch processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch/stats")
async def get_batch_stats(ai_manager: AIManager = Depends(get_ai_manager)):
    """Get batch processing statistics"""
    try:
        global batch_processor
        
        if not batch_processor:
            return {"error": "Batch processor not available"}
        
        return batch_processor.get_stats()
        
    except Exception as e:
        logger.error(f"Batch stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cache/stats")
async def get_cache_stats(ai_manager: AIManager = Depends(get_ai_manager)):
    """Get cache statistics"""
    try:
        global intelligent_cache
        
        if not intelligent_cache:
            return {"error": "Cache not available"}
        
        return await intelligent_cache.get_cache_stats()
        
    except Exception as e:
        logger.error(f"Cache stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cache/invalidate")
async def invalidate_cache(
    user_id: str,
    ai_manager: AIManager = Depends(get_ai_manager)
):
    """Invalidate cache for a user (e.g., when persona changes)"""
    try:
        global intelligent_cache
        
        if not intelligent_cache:
            return {"error": "Cache not available"}
        
        invalidated = await intelligent_cache.invalidate_persona_content(user_id)
        
        return {
            "user_id": user_id,
            "invalidated_entries": invalidated,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Cache invalidation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _build_content_messages(request: ContentGenerationRequest) -> List[Message]:
    """Build messages for content generation based on type"""
    # Use PersonaPromptBuilder for personalized content generation
    from services.ai.persona_prompt_builder import PersonaPromptBuilder
    
    logger.info(f"Building content messages with persona: {bool(request.persona)}")
    if request.persona:
        logger.info(f"Persona data keys: {list(request.persona.keys())}")
    
    # Convert content to chunks format
    chunks = [request.content]
    
    # Use PersonaPromptBuilder if persona is provided
    if request.persona:
        prompt_builder = PersonaPromptBuilder()
        
        # Convert persona to the format expected by PersonaPromptBuilder
        persona_data = {
            'professional_context': request.persona.get('professional_context', {}),
            'personal_interests': request.persona.get('personal_interests', {}),
            'learning_style': request.persona.get('learning_style', {}),
            'content_preferences': request.persona.get('content_preferences', {}),
            'communication_tone': request.persona.get('communication_tone', {})
        }
        
        # Map content_type to PersonaPromptBuilder output types
        output_type_map = {
            'explanation': 'explain',
            'summary': 'summary',
            'quiz': 'quiz',
            'flashcards': 'flashcards',
            'outline': 'outline',
            'examples': 'examples',
            'practice': 'practice'
        }
        output_type = output_type_map.get(request.content_type, 'explain')
        
        # Build the personalized prompt
        user_prompt = prompt_builder.build_prompt(
            chunks=chunks,
            output_type=output_type,
            persona_data=persona_data,
            additional_context={'topic': request.topic, 'difficulty': request.difficulty}
        )
        
        logger.info(f"Generated personalized prompt (first 500 chars): {user_prompt[:500]}...")
        
        # For explanations, we don't need a system prompt as it's included in the prompt
        return [Message(role="user", content=user_prompt)]
    else:
        # Fallback to basic prompts if no persona
        system_prompt = _get_system_prompt(request.content_type, request.difficulty)
        user_prompt = _get_user_prompt(request)
        
        return [
            Message(role="system", content=system_prompt),
            Message(role="user", content=user_prompt)
        ]


def _get_system_prompt(content_type: str, difficulty: str) -> str:
    """Get system prompt for content type"""
    base_prompt = f"You are an expert educator creating {difficulty}-level educational content."
    
    if content_type == "explanation":
        return f"{base_prompt} Create clear, engaging explanations that break down complex topics into understandable parts."
    elif content_type == "summary":
        return f"{base_prompt} Create concise, comprehensive summaries that capture key points and insights."
    elif content_type == "quiz":
        return f"{base_prompt} Create thoughtful quiz questions that test understanding and critical thinking."
    elif content_type == "flashcards":
        return f"{base_prompt} Create effective flashcards with clear questions and comprehensive answers."
    else:
        return f"{base_prompt} Create high-quality educational content."


def _get_user_prompt(request: ContentGenerationRequest) -> str:
    """Build user prompt for content generation"""
    prompt = f"Create {request.content_type} content for the following material:\n\n{request.content}"
    
    if request.topic:
        prompt += f"\n\nTopic focus: {request.topic}"
    
    return prompt


def _format_persona(persona: Dict[str, Any]) -> str:
    """Format persona information for prompts"""
    parts = []
    
    if "learning_style" in persona:
        parts.append(f"Learning Style: {persona['learning_style']}")
    
    if "academic_level" in persona:
        parts.append(f"Academic Level: {persona['academic_level']}")
    
    if "interests" in persona:
        interests = ", ".join(persona["interests"])
        parts.append(f"Interests: {interests}")
    
    if "goals" in persona:
        parts.append(f"Goals: {persona['goals']}")
    
    return "\n".join(parts)


async def _get_file_content(file_id: str) -> Optional[str]:
    """Get file content from database"""
    # This would connect to your database and retrieve file chunks
    # For now, return a placeholder
    logger.warning(f"File content retrieval not implemented for file_id: {file_id}")
    return None


def _build_outline_messages(content: str, request: OutlineGenerationRequest) -> List[Message]:
    """Build messages for outline generation"""
    system_prompt = f"""You are an expert educational content analyzer. Create a comprehensive learning outline for the provided content.

Generate {request.num_topics} main topics, each with {request.subtopics_per_topic} subtopics.
Difficulty level: {request.difficulty}

Return the outline in this exact JSON format:
{{
  "topics": [
    {{
      "id": "topic-1",
      "title": "Topic Title",
      "subtopics": [
        {{"id": "intro-1", "title": "Introduction", "type": "intro", "completed": false}},
        {{"id": "concepts-1", "title": "Core Concepts", "type": "concepts", "completed": false}},
        {{"id": "examples-1", "title": "Examples", "type": "examples", "completed": false}},
        {{"id": "practice-1", "title": "Practice", "type": "practice", "completed": false}},
        {{"id": "summary-1", "title": "Summary", "type": "summary", "completed": false}}
      ],
      "progress": 0
    }}
  ]
}}"""

    user_prompt = f"Create a learning outline for this content:\n\n{content[:8000]}"  # Limit for context
    
    return [
        Message(role="system", content=system_prompt),
        Message(role="user", content=user_prompt)
    ]


async def _build_chat_messages(request: ChatRequest) -> List[Message]:
    """Build messages for chat conversation"""
    messages = []
    
    # System message with persona and context
    system_parts = ["You are an AI tutor helping a student learn."]
    
    if request.persona:
        persona_info = _format_enhanced_persona(request.persona)
        system_parts.append(f"Student Profile:\n{persona_info}")
    
    if request.context:
        if "file_content" in request.context:
            system_parts.append(f"Current learning material:\n{request.context['file_content'][:2000]}")
        if "previous_messages" in request.context:
            system_parts.append("Previous conversation context has been provided.")
    
    system_prompt = "\n\n".join(system_parts)
    messages.append(Message(role="system", content=system_prompt))
    
    # Add previous messages if provided
    if request.context and "previous_messages" in request.context:
        for msg in request.context["previous_messages"][-5:]:  # Last 5 messages
            messages.append(Message(role=msg["role"], content=msg["content"]))
    
    # Add current user message
    messages.append(Message(role="user", content=request.message))
    
    return messages


def _build_quiz_messages(request: QuizGenerationRequest) -> List[Message]:
    """Build messages for quiz generation"""
    system_prompt = f"""You are an expert quiz creator. Generate {request.num_questions} {request.difficulty}-level quiz questions.

Question types to include: {', '.join(request.question_types)}
Include explanations: {request.include_explanations}

Return in this JSON format:
{{
  "quiz": {{
    "title": "Quiz Title",
    "questions": [
      {{
        "id": "q1",
        "type": "multiple_choice",
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
        "explanation": "Why this is correct"
      }}
    ]
  }}
}}"""

    if request.persona:
        persona_info = _format_enhanced_persona(request.persona)
        system_prompt += f"\n\nStudent Profile:\n{persona_info}"

    user_prompt = f"Create quiz questions for this content:\n\n{request.content}"
    if request.topic:
        user_prompt += f"\n\nFocus on topic: {request.topic}"
    
    return [
        Message(role="system", content=system_prompt),
        Message(role="user", content=user_prompt)
    ]


def _build_summary_messages(request: SummaryGenerationRequest) -> List[Message]:
    """Build messages for summary generation"""
    system_prompt = f"""You are an expert content summarizer. Create a {request.summary_type} summary.

Summary type: {request.summary_type}
Max length: {request.max_length or 'flexible'}
"""

    if request.focus_areas:
        system_prompt += f"Focus areas: {', '.join(request.focus_areas)}\n"

    if request.persona:
        persona_info = _format_enhanced_persona(request.persona)
        system_prompt += f"\nReader Profile:\n{persona_info}"

    user_prompt = f"Summarize this content:\n\n{request.content}"
    
    return [
        Message(role="system", content=system_prompt),
        Message(role="user", content=user_prompt)
    ]


def _build_flashcard_messages(request: FlashcardGenerationRequest) -> List[Message]:
    """Build messages for flashcard generation"""
    system_prompt = f"""You are an expert flashcard creator. Generate {request.num_cards} flashcards for {request.difficulty}-level learning.

Card types: {', '.join(request.card_types)}

Return in this JSON format:
{{
  "flashcards": [
    {{
      "id": "card1",
      "type": "definition",
      "front": "Question or term",
      "back": "Answer or definition",
      "difficulty": "{request.difficulty}",
      "tags": ["tag1", "tag2"]
    }}
  ]
}}"""

    if request.persona:
        persona_info = _format_enhanced_persona(request.persona)
        system_prompt += f"\n\nLearner Profile:\n{persona_info}"

    user_prompt = f"Create flashcards for this content:\n\n{request.content}"
    if request.topic:
        user_prompt += f"\n\nTopic focus: {request.topic}"
    
    return [
        Message(role="system", content=system_prompt),
        Message(role="user", content=user_prompt)
    ]


def _format_enhanced_persona(persona: Dict[str, Any]) -> str:
    """Format enhanced persona with all 5 dimensions"""
    parts = []
    
    # Professional Context
    if "professional_context" in persona:
        pc = persona["professional_context"]
        prof_parts = []
        if "role" in pc:
            prof_parts.append(f"Role: {pc['role']}")
        if "industry" in pc:
            prof_parts.append(f"Industry: {pc['industry']}")
        if "technicalLevel" in pc:
            prof_parts.append(f"Technical Level: {pc['technicalLevel']}")
        if prof_parts:
            parts.append("Professional: " + ", ".join(prof_parts))
    
    # Personal Interests
    if "personal_interests" in persona:
        pi = persona["personal_interests"]
        if "primary" in pi:
            parts.append(f"Primary Interests: {', '.join(pi['primary'])}")
        if "secondary" in pi:
            parts.append(f"Secondary Interests: {', '.join(pi['secondary'])}")
    
    # Learning Style
    if "learning_style" in persona:
        ls = persona["learning_style"]
        if "primary" in ls:
            parts.append(f"Learning Style: {ls['primary']}")
    
    # Content Preferences
    if "content_preferences" in persona:
        cp = persona["content_preferences"]
        pref_parts = []
        if "density" in cp:
            pref_parts.append(f"Density: {cp['density']}")
        if "detailTolerance" in cp:
            pref_parts.append(f"Detail Level: {cp['detailTolerance']}")
        if pref_parts:
            parts.append("Content Preferences: " + ", ".join(pref_parts))
    
    # Communication Tone
    if "communication_tone" in persona:
        ct = persona["communication_tone"]
        if "style" in ct:
            parts.append(f"Communication Style: {ct['style']}")
    
    return "\n".join(parts)


def _is_topic_complete(buffer: str) -> bool:
    """Check if a topic is complete in the buffer"""
    # Simple heuristic - look for topic structure indicators
    return '"title":' in buffer and '"subtopics":' in buffer and buffer.count('{') >= 2


def _extract_topic_from_buffer(buffer: str, topic_index: int) -> Optional[Dict[str, Any]]:
    """Extract a topic from the buffer"""
    try:
        # Try to parse JSON and extract topic
        if "topics" in buffer:
            data = json.loads(buffer)
            if "topics" in data and len(data["topics"]) > topic_index:
                return data["topics"][topic_index]
        return None
    except:
        return None


def _clean_buffer_after_topic(buffer: str) -> str:
    """Clean buffer after extracting a topic"""
    # Simple implementation - could be more sophisticated
    return ""


def _extract_remaining_topics(buffer: str, start_index: int) -> List[Dict[str, Any]]:
    """Extract remaining topics from buffer"""
    try:
        data = json.loads(buffer)
        if "topics" in data:
            return data["topics"][start_index:]
        return []
    except:
        return []


def _parse_outline_response(content: str) -> Dict[str, Any]:
    """Parse outline response content"""
    try:
        return json.loads(content)
    except:
        # Fallback parsing if JSON is malformed
        return {"topics": [{"id": "error", "title": "Parse Error", "subtopics": []}]}


def _parse_quiz_response(content: str, request: QuizGenerationRequest) -> Dict[str, Any]:
    """Parse quiz response content"""
    try:
        data = json.loads(content)
        return data.get("quiz", {})
    except:
        return {"title": "Generated Quiz", "questions": []}


def _parse_summary_response(content: str, request: SummaryGenerationRequest) -> Dict[str, Any]:
    """Parse summary response content"""
    return {
        "content": content,
        "type": request.summary_type,
        "word_count": len(content.split())
    }


def _parse_flashcard_response(content: str, request: FlashcardGenerationRequest) -> List[Dict[str, Any]]:
    """Parse flashcard response content"""
    try:
        data = json.loads(content)
        return data.get("flashcards", [])
    except:
        return []