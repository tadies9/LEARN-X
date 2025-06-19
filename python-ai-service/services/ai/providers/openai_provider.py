"""OpenAI Provider Implementation"""
import asyncio
from typing import AsyncIterator, Dict, List, Optional, Union, Any
import openai
from openai import AsyncOpenAI
import tiktoken
from structlog import get_logger

from .base import (
    AIProvider, AIModel, Message, CompletionOptions, CompletionResponse,
    EmbeddingOptions, EmbeddingResponse, ProviderConfig
)


logger = get_logger()


class OpenAIProvider(AIProvider):
    """OpenAI API provider implementation"""
    
    SUPPORTED_MODELS = {
        AIModel.GPT_4O,
        AIModel.GPT_4_TURBO,
        AIModel.GPT_35_TURBO,
        AIModel.EMBEDDING_3_SMALL,
        AIModel.EMBEDDING_3_LARGE,
        AIModel.EMBEDDING_ADA_002,
    }
    
    MODEL_INFO = {
        AIModel.GPT_4O: {
            "context_window": 128000,
            "max_output": 4096,
            "input_cost_per_1k": 0.005,
            "output_cost_per_1k": 0.015,
        },
        AIModel.GPT_4_TURBO: {
            "context_window": 128000,
            "max_output": 4096,
            "input_cost_per_1k": 0.01,
            "output_cost_per_1k": 0.03,
        },
        AIModel.GPT_35_TURBO: {
            "context_window": 16385,
            "max_output": 4096,
            "input_cost_per_1k": 0.0005,
            "output_cost_per_1k": 0.0015,
        },
        AIModel.EMBEDDING_3_SMALL: {
            "dimensions": 1536,
            "max_input": 8191,
            "cost_per_1k": 0.00002,
        },
        AIModel.EMBEDDING_3_LARGE: {
            "dimensions": 3072,
            "max_input": 8191,
            "cost_per_1k": 0.00013,
        },
    }
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.client: Optional[AsyncOpenAI] = None
        self._tokenizers: Dict[str, tiktoken.Encoding] = {}
    
    async def initialize(self) -> None:
        """Initialize OpenAI client"""
        if self._initialized:
            return
            
        self.client = AsyncOpenAI(
            api_key=self.config.api_key,
            organization=self.config.organization,
            base_url=self.config.base_url,
            timeout=self.config.timeout,
            max_retries=self.config.max_retries,
        )
        
        self._initialized = True
        logger.info("OpenAI provider initialized")
    
    async def complete(
        self,
        messages: List[Message],
        model: AIModel,
        options: Optional[CompletionOptions] = None
    ) -> CompletionResponse:
        """Generate completion using OpenAI API"""
        if not self._initialized:
            await self.initialize()
        
        options = options or CompletionOptions()
        
        # Convert messages to OpenAI format
        openai_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        try:
            # Build request parameters
            params = {
                "model": model.value,
                "messages": openai_messages,
                "temperature": options.temperature,
                "max_tokens": options.max_tokens,
                "top_p": options.top_p,
                "frequency_penalty": options.frequency_penalty,
                "presence_penalty": options.presence_penalty,
                "stop": options.stop,
                "user": options.user,
            }
            
            # Add optional parameters
            if options.response_format:
                params["response_format"] = options.response_format
            if options.tools:
                params["tools"] = options.tools
            if options.tool_choice:
                params["tool_choice"] = options.tool_choice
            
            response = await self.client.chat.completions.create(**params)
            
            choice = response.choices[0]
            
            return CompletionResponse(
                id=response.id,
                model=response.model,
                content=choice.message.content or "",
                finish_reason=choice.finish_reason,
                usage=response.usage.model_dump() if response.usage else None,
                created=response.created,
                system_fingerprint=response.system_fingerprint,
                tool_calls=[tc.model_dump() for tc in choice.message.tool_calls] if choice.message.tool_calls else None
            )
            
        except Exception as e:
            logger.error(f"OpenAI completion error: {e}")
            raise
    
    async def complete_stream(
        self,
        messages: List[Message],
        model: AIModel,
        options: Optional[CompletionOptions] = None
    ) -> AsyncIterator[str]:
        """Generate streaming completion"""
        if not self._initialized:
            await self.initialize()
        
        options = options or CompletionOptions()
        
        # Convert messages to OpenAI format
        openai_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        try:
            # Build request parameters
            params = {
                "model": model.value,
                "messages": openai_messages,
                "temperature": options.temperature,
                "max_tokens": options.max_tokens,
                "top_p": options.top_p,
                "frequency_penalty": options.frequency_penalty,
                "presence_penalty": options.presence_penalty,
                "stop": options.stop,
                "user": options.user,
                "stream": True,
            }
            
            # Add optional parameters
            if options.response_format:
                params["response_format"] = options.response_format
            if options.tools:
                params["tools"] = options.tools
            if options.tool_choice:
                params["tool_choice"] = options.tool_choice
            
            stream = await self.client.chat.completions.create(**params)
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"OpenAI streaming error: {e}")
            raise
    
    async def embed(
        self,
        texts: Union[str, List[str]],
        model: AIModel,
        options: Optional[EmbeddingOptions] = None
    ) -> EmbeddingResponse:
        """Generate embeddings using OpenAI API"""
        if not self._initialized:
            await self.initialize()
        
        options = options or EmbeddingOptions()
        
        # Ensure texts is a list
        if isinstance(texts, str):
            texts = [texts]
        
        try:
            params = {
                "model": model.value,
                "input": texts,
            }
            
            if options.dimensions and model in [AIModel.EMBEDDING_3_SMALL, AIModel.EMBEDDING_3_LARGE]:
                params["dimensions"] = options.dimensions
            
            if options.user:
                params["user"] = options.user
            
            response = await self.client.embeddings.create(**params)
            
            embeddings = [data.embedding for data in response.data]
            
            return EmbeddingResponse(
                embeddings=embeddings,
                model=response.model,
                usage=response.usage.model_dump()
            )
            
        except Exception as e:
            logger.error(f"OpenAI embedding error: {e}")
            raise
    
    async def count_tokens(self, text: str, model: AIModel) -> int:
        """Count tokens for the given text and model"""
        encoding_name = self._get_encoding_name(model)
        
        if encoding_name not in self._tokenizers:
            self._tokenizers[encoding_name] = tiktoken.get_encoding(encoding_name)
        
        encoding = self._tokenizers[encoding_name]
        return len(encoding.encode(text))
    
    def supports_model(self, model: AIModel) -> bool:
        """Check if model is supported"""
        return model in self.SUPPORTED_MODELS
    
    def get_model_info(self, model: AIModel) -> Dict[str, Any]:
        """Get model information"""
        return self.MODEL_INFO.get(model, {})
    
    def get_default_model(self) -> AIModel:
        """Get default model"""
        return AIModel.GPT_4O
    
    def _get_encoding_name(self, model: AIModel) -> str:
        """Get the tiktoken encoding name for a model"""
        if model in [AIModel.GPT_4O, AIModel.GPT_4_TURBO]:
            return "cl100k_base"
        elif model == AIModel.GPT_35_TURBO:
            return "cl100k_base"
        else:
            return "cl100k_base"  # Default for newer models
    
    async def close(self) -> None:
        """Clean up resources"""
        if self.client:
            await self.client.close()
        self._initialized = False