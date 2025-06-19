"""
OpenAI provider implementation.
Handles OpenAI API interactions with proper abstraction.
"""

import openai
from openai import AsyncOpenAI
from typing import List, Dict, Any, Optional, AsyncGenerator, Tuple
import tiktoken

from core.logging import get_logger
from services.ai.interfaces.base import (
    BaseAIInterface,
    AIConfig,
    TokenUsage,
    AIProvider
)

logger = get_logger(__name__)


class OpenAIProvider(BaseAIInterface):
    """
    OpenAI API provider implementation.
    Supports embeddings and text generation.
    """
    
    def __init__(self, config: AIConfig):
        super().__init__(config)
        self.client: Optional[AsyncOpenAI] = None
        self.embedding_model = config.model_name or "text-embedding-3-small"
        self.generation_model = "gpt-4-turbo-preview"
        self.encoding = None
        
    async def initialize(self) -> None:
        """Initialize OpenAI client"""
        if not self.config.api_key:
            raise ValueError("OpenAI API key is required")
            
        self.client = AsyncOpenAI(api_key=self.config.api_key)
        
        # Initialize tokenizer
        try:
            self.encoding = tiktoken.encoding_for_model(self.generation_model)
        except KeyError:
            self.encoding = tiktoken.get_encoding("cl100k_base")
            
        logger.info("OpenAI provider initialized")
    
    async def generate_embedding(
        self,
        text: str,
        model: Optional[str] = None
    ) -> List[float]:
        """Generate embedding for text"""
        if not self.client:
            await self.initialize()
            
        try:
            response = await self.client.embeddings.create(
                model=model or self.embedding_model,
                input=text,
                encoding_format="float"
            )
            
            return response.data[0].embedding
            
        except Exception as e:
            logger.error(
                "Failed to generate embedding",
                error=str(e),
                model=model or self.embedding_model
            )
            raise
    
    async def generate_embeddings_batch(
        self,
        texts: List[str],
        model: Optional[str] = None
    ) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        if not self.client:
            await self.initialize()
            
        try:
            # OpenAI supports batch embedding requests
            response = await self.client.embeddings.create(
                model=model or self.embedding_model,
                input=texts,
                encoding_format="float"
            )
            
            return [item.embedding for item in response.data]
            
        except Exception as e:
            logger.error(
                "Failed to generate batch embeddings",
                error=str(e),
                count=len(texts)
            )
            raise
    
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Tuple[str, TokenUsage]:
        """Generate text completion"""
        if not self.client:
            await self.initialize()
            
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        try:
            response = await self.client.chat.completions.create(
                model=self.generation_model,
                messages=messages,
                max_tokens=max_tokens or self.config.max_tokens,
                temperature=temperature or self.config.temperature
            )
            
            # Extract usage information
            usage = TokenUsage(
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                total_tokens=response.usage.total_tokens
            )
            
            return response.choices[0].message.content, usage
            
        except Exception as e:
            logger.error(
                "Failed to generate text",
                error=str(e),
                model=self.generation_model
            )
            raise
    
    async def generate_text_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> AsyncGenerator[str, None]:
        """Generate text completion with streaming"""
        if not self.client:
            await self.initialize()
            
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        try:
            stream = await self.client.chat.completions.create(
                model=self.generation_model,
                messages=messages,
                max_tokens=max_tokens or self.config.max_tokens,
                temperature=temperature or self.config.temperature,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(
                "Failed to generate streaming text",
                error=str(e),
                model=self.generation_model
            )
            raise
    
    async def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        if not self.encoding:
            try:
                self.encoding = tiktoken.encoding_for_model(self.generation_model)
            except KeyError:
                self.encoding = tiktoken.get_encoding("cl100k_base")
                
        return len(self.encoding.encode(text))
    
    async def validate_connection(self) -> bool:
        """Validate OpenAI connection"""
        if not self.client:
            await self.initialize()
            
        try:
            # Try to list models as a connection test
            models = await self.client.models.list()
            return len(models.data) > 0
            
        except Exception as e:
            logger.error("OpenAI connection validation failed", error=str(e))
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "provider": AIProvider.OPENAI.value,
            "embedding_model": self.embedding_model,
            "generation_model": self.generation_model,
            "max_tokens": self.config.max_tokens,
            "temperature": self.config.temperature,
            "features": {
                "embeddings": True,
                "text_generation": True,
                "streaming": True,
                "batch_embeddings": True
            }
        }