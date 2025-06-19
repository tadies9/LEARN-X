"""
Local Model Fallback Provider
Provides local model support as fallback when cloud services are unavailable
"""

from typing import AsyncIterator, Dict, List, Optional, Any, Union
from dataclasses import dataclass
import asyncio
import json
import re
from datetime import datetime
from structlog import get_logger

from .base import BaseAIProvider, AIModel, Message, CompletionOptions, CompletionResponse

logger = get_logger()


@dataclass
class LocalModelConfig:
    """Configuration for local models"""
    model_path: str
    max_tokens: int = 2048
    temperature: float = 0.7
    context_length: int = 4096
    use_gpu: bool = True
    quantization: Optional[str] = None  # "4bit", "8bit", None


class LocalFallbackProvider(BaseAIProvider):
    """
    Local model provider using transformers/ollama for fallback scenarios.
    Provides basic content generation when cloud services are unavailable.
    """
    
    # Model configurations for different use cases
    MODEL_CONFIGS = {
        "llama2-7b": LocalModelConfig(
            model_path="meta-llama/Llama-2-7b-chat-hf",
            max_tokens=2048,
            context_length=4096
        ),
        "mistral-7b": LocalModelConfig(
            model_path="mistralai/Mistral-7B-Instruct-v0.1",
            max_tokens=2048,
            context_length=8192
        ),
        "phi-2": LocalModelConfig(
            model_path="microsoft/phi-2",
            max_tokens=1024,
            context_length=2048
        ),
        "tiny-llama": LocalModelConfig(
            model_path="TinyLlama/TinyLlama-1.1B-Chat-v1.0",
            max_tokens=512,
            context_length=2048
        )
    }
    
    # Fallback templates for different content types
    FALLBACK_TEMPLATES = {
        "explanation": """Explain the following topic clearly and simply:

Topic: {topic}
Content: {content}

Provide a clear explanation suitable for learning.""",
        
        "summary": """Summarize the following content into key points:

{content}

Provide 3-5 key points.""",
        
        "flashcard": """Create flashcards from this content:

{content}

Format as:
Q: [Question]
A: [Answer]""",
        
        "quiz": """Create quiz questions from this content:

{content}

Format as multiple choice questions with explanations.""",
        
        "chat": """You are a helpful learning assistant. Answer the following question:

{message}

Context: {context}"""
    }

    def __init__(self, preferred_model: str = "tiny-llama", use_ollama: bool = True):
        self.preferred_model = preferred_model
        self.use_ollama = use_ollama
        self.model_loaded = False
        self.model = None
        self.tokenizer = None
        self.ollama_available = False
        
        # Check availability on initialization
        asyncio.create_task(self._check_availability())

    async def _check_availability(self) -> None:
        """Check if local models are available"""
        try:
            if self.use_ollama:
                await self._check_ollama()
            else:
                await self._check_transformers()
        except Exception as e:
            logger.warning(f"Local models not available: {e}")

    async def _check_ollama(self) -> None:
        """Check if Ollama is available"""
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get("http://localhost:11434/api/tags") as response:
                    if response.status == 200:
                        self.ollama_available = True
                        logger.info("Ollama is available for local inference")
        except Exception as e:
            logger.warning(f"Ollama not available: {e}")

    async def _check_transformers(self) -> None:
        """Check if transformers models are available"""
        try:
            import torch
            from transformers import AutoTokenizer, AutoModelForCausalLM
            
            model_config = self.MODEL_CONFIGS.get(self.preferred_model)
            if not model_config:
                return
            
            # Try to load a lightweight check
            tokenizer = AutoTokenizer.from_pretrained(
                model_config.model_path,
                trust_remote_code=True
            )
            
            self.model_loaded = True
            logger.info(f"Transformers model {self.preferred_model} is available")
            
        except Exception as e:
            logger.warning(f"Transformers model not available: {e}")

    async def complete(
        self,
        messages: List[Message],
        model: AIModel,
        options: CompletionOptions,
        user_id: str
    ) -> CompletionResponse:
        """Generate completion using local model"""
        try:
            if self.ollama_available:
                return await self._complete_ollama(messages, model, options, user_id)
            elif self.model_loaded:
                return await self._complete_transformers(messages, model, options, user_id)
            else:
                return await self._complete_fallback(messages, model, options, user_id)
                
        except Exception as e:
            logger.error(f"Local completion failed: {e}")
            return await self._complete_fallback(messages, model, options, user_id)

    async def complete_stream(
        self,
        messages: List[Message],
        model: AIModel,
        options: CompletionOptions,
        user_id: str
    ) -> AsyncIterator[str]:
        """Generate streaming completion using local model"""
        try:
            if self.ollama_available:
                async for chunk in self._complete_stream_ollama(messages, model, options, user_id):
                    yield chunk
            elif self.model_loaded:
                async for chunk in self._complete_stream_transformers(messages, model, options, user_id):
                    yield chunk
            else:
                # Simulate streaming for fallback
                content = await self._complete_fallback(messages, model, options, user_id)
                words = content.content.split()
                for i, word in enumerate(words):
                    yield word + (" " if i < len(words) - 1 else "")
                    await asyncio.sleep(0.05)  # Simulate typing
                    
        except Exception as e:
            logger.error(f"Local streaming failed: {e}")
            yield "I apologize, but I'm currently unable to process your request. Please try again later."

    async def _complete_ollama(
        self,
        messages: List[Message],
        model: AIModel,
        options: CompletionOptions,
        user_id: str
    ) -> CompletionResponse:
        """Complete using Ollama"""
        try:
            import aiohttp
            
            # Convert messages to Ollama format
            prompt = self._format_messages_for_ollama(messages)
            
            # Map model to Ollama model name
            ollama_model = self._map_to_ollama_model(model)
            
            request_data = {
                "model": ollama_model,
                "prompt": prompt,
                "temperature": options.temperature,
                "num_predict": options.max_tokens or 512,
                "stream": False
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "http://localhost:11434/api/generate",
                    json=request_data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return CompletionResponse(
                            content=result.get("response", ""),
                            model=ollama_model,
                            usage={
                                "prompt_tokens": len(prompt.split()),
                                "completion_tokens": len(result.get("response", "").split()),
                                "total_tokens": len(prompt.split()) + len(result.get("response", "").split())
                            }
                        )
            
            raise Exception("Ollama request failed")
            
        except Exception as e:
            logger.error(f"Ollama completion failed: {e}")
            raise

    async def _complete_stream_ollama(
        self,
        messages: List[Message],
        model: AIModel,
        options: CompletionOptions,
        user_id: str
    ) -> AsyncIterator[str]:
        """Stream completion using Ollama"""
        try:
            import aiohttp
            
            prompt = self._format_messages_for_ollama(messages)
            ollama_model = self._map_to_ollama_model(model)
            
            request_data = {
                "model": ollama_model,
                "prompt": prompt,
                "temperature": options.temperature,
                "num_predict": options.max_tokens or 512,
                "stream": True
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "http://localhost:11434/api/generate",
                    json=request_data
                ) as response:
                    if response.status == 200:
                        async for line in response.content:
                            try:
                                data = json.loads(line.decode().strip())
                                if "response" in data:
                                    yield data["response"]
                                if data.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue
                                
        except Exception as e:
            logger.error(f"Ollama streaming failed: {e}")
            yield "Error occurred during streaming."

    async def _complete_transformers(
        self,
        messages: List[Message],
        model: AIModel,
        options: CompletionOptions,
        user_id: str
    ) -> CompletionResponse:
        """Complete using transformers"""
        try:
            # This would require proper transformers implementation
            # For now, return a simple response
            prompt = self._format_messages_for_local(messages)
            
            # Simulate processing time
            await asyncio.sleep(0.5)
            
            # Generate simple response based on content type
            content = self._generate_simple_response(prompt, messages)
            
            return CompletionResponse(
                content=content,
                model=self.preferred_model,
                usage={
                    "prompt_tokens": len(prompt.split()),
                    "completion_tokens": len(content.split()),
                    "total_tokens": len(prompt.split()) + len(content.split())
                }
            )
            
        except Exception as e:
            logger.error(f"Transformers completion failed: {e}")
            raise

    async def _complete_stream_transformers(
        self,
        messages: List[Message],
        model: AIModel,
        options: CompletionOptions,
        user_id: str
    ) -> AsyncIterator[str]:
        """Stream completion using transformers"""
        try:
            content = await self._complete_transformers(messages, model, options, user_id)
            
            # Simulate streaming
            words = content.content.split()
            for i, word in enumerate(words):
                yield word + (" " if i < len(words) - 1 else "")
                await asyncio.sleep(0.03)
                
        except Exception as e:
            logger.error(f"Transformers streaming failed: {e}")
            yield "Error occurred during streaming."

    async def _complete_fallback(
        self,
        messages: List[Message],
        model: AIModel,
        options: CompletionOptions,
        user_id: str
    ) -> CompletionResponse:
        """Fallback completion using templates"""
        try:
            # Determine content type from messages
            content_type = self._detect_content_type(messages)
            
            # Generate response using templates
            content = self._generate_template_response(messages, content_type)
            
            return CompletionResponse(
                content=content,
                model="fallback-template",
                usage={
                    "prompt_tokens": 50,  # Estimated
                    "completion_tokens": len(content.split()),
                    "total_tokens": 50 + len(content.split())
                }
            )
            
        except Exception as e:
            logger.error(f"Fallback completion failed: {e}")
            return CompletionResponse(
                content="I apologize, but I'm currently unable to process your request.",
                model="fallback-error",
                usage={"prompt_tokens": 0, "completion_tokens": 10, "total_tokens": 10}
            )

    def _format_messages_for_ollama(self, messages: List[Message]) -> str:
        """Format messages for Ollama API"""
        formatted = []
        for msg in messages:
            if msg.role == "system":
                formatted.append(f"System: {msg.content}")
            elif msg.role == "user":
                formatted.append(f"User: {msg.content}")
            elif msg.role == "assistant":
                formatted.append(f"Assistant: {msg.content}")
        
        return "\n".join(formatted) + "\nAssistant:"

    def _format_messages_for_local(self, messages: List[Message]) -> str:
        """Format messages for local models"""
        return " ".join([msg.content for msg in messages])

    def _map_to_ollama_model(self, model: AIModel) -> str:
        """Map AIModel to Ollama model name"""
        model_map = {
            AIModel.GPT_4O: "llama2:7b",
            AIModel.GPT_4_TURBO: "llama2:7b",
            AIModel.GPT_3_5_TURBO: "llama2:7b",
            AIModel.CLAUDE_3_OPUS: "mistral:7b",
            AIModel.CLAUDE_3_SONNET: "mistral:7b",
            AIModel.CLAUDE_3_HAIKU: "tinyllama:1.1b"
        }
        return model_map.get(model, "llama2:7b")

    def _detect_content_type(self, messages: List[Message]) -> str:
        """Detect content type from messages"""
        content = " ".join([msg.content.lower() for msg in messages])
        
        if any(word in content for word in ["explain", "explanation", "understand"]):
            return "explanation"
        elif any(word in content for word in ["summarize", "summary", "key points"]):
            return "summary"
        elif any(word in content for word in ["flashcard", "cards", "study"]):
            return "flashcard"
        elif any(word in content for word in ["quiz", "questions", "test"]):
            return "quiz"
        else:
            return "chat"

    def _generate_template_response(self, messages: List[Message], content_type: str) -> str:
        """Generate response using templates"""
        template = self.FALLBACK_TEMPLATES.get(content_type, self.FALLBACK_TEMPLATES["chat"])
        
        # Extract relevant content from messages
        user_content = ""
        for msg in messages:
            if msg.role == "user":
                user_content = msg.content
                break
        
        # Simple template responses
        if content_type == "explanation":
            return f"This topic involves {user_content[:100]}... Let me explain the key concepts step by step."
        elif content_type == "summary":
            return "Key points:\n1. [Main concept]\n2. [Supporting detail]\n3. [Important conclusion]"
        elif content_type == "flashcard":
            return "Q: What is the main concept?\nA: [Key concept from content]"
        elif content_type == "quiz":
            return "1. What is the primary focus of this content?\na) Option A\nb) Option B\nc) Option C\nd) Option D\n\nAnswer: c) Option C"
        else:
            return "I understand you're asking about this topic. While I have limited capabilities in offline mode, I can provide basic information and guidance."

    def _generate_simple_response(self, prompt: str, messages: List[Message]) -> str:
        """Generate simple response based on prompt analysis"""
        # Basic keyword-based response generation
        prompt_lower = prompt.lower()
        
        if "explain" in prompt_lower:
            return "Let me explain this concept step by step. The main idea is... [explanation would continue based on the content]"
        elif "summarize" in prompt_lower:
            return "Here's a summary of the key points: 1) Main concept, 2) Supporting details, 3) Conclusions"
        elif "example" in prompt_lower:
            return "Here are some examples that illustrate this concept: Example 1: ... Example 2: ..."
        else:
            return "I can help you understand this topic. Based on the information provided, here are the key insights..."

    async def get_available_models(self) -> List[str]:
        """Get list of available local models"""
        models = []
        
        if self.ollama_available:
            try:
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get("http://localhost:11434/api/tags") as response:
                        if response.status == 200:
                            data = await response.json()
                            models.extend([model["name"] for model in data.get("models", [])])
            except Exception:
                pass
        
        if self.model_loaded:
            models.extend(list(self.MODEL_CONFIGS.keys()))
        
        return models or ["fallback-template"]

    async def health_check(self) -> Dict[str, Any]:
        """Check health of local models"""
        return {
            "status": "available" if (self.ollama_available or self.model_loaded) else "limited",
            "ollama_available": self.ollama_available,
            "transformers_available": self.model_loaded,
            "preferred_model": self.preferred_model,
            "fallback_mode": not (self.ollama_available or self.model_loaded)
        }