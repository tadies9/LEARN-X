"""Anthropic Claude Provider Implementation"""
import asyncio
from typing import AsyncIterator, Dict, List, Optional, Union, Any
import anthropic
from structlog import get_logger

from .base import (
    AIProvider, AIModel, Message, CompletionOptions, CompletionResponse,
    EmbeddingOptions, EmbeddingResponse, ProviderConfig
)


logger = get_logger()


class AnthropicProvider(AIProvider):
    """Anthropic Claude API provider implementation"""
    
    SUPPORTED_MODELS = {
        AIModel.CLAUDE_3_OPUS,
        AIModel.CLAUDE_3_SONNET,
        AIModel.CLAUDE_3_HAIKU,
    }
    
    MODEL_INFO = {
        AIModel.CLAUDE_3_OPUS: {
            "context_window": 200000,
            "max_output": 4096,
            "input_cost_per_1k": 0.015,
            "output_cost_per_1k": 0.075,
        },
        AIModel.CLAUDE_3_SONNET: {
            "context_window": 200000,
            "max_output": 4096,
            "input_cost_per_1k": 0.003,
            "output_cost_per_1k": 0.015,
        },
        AIModel.CLAUDE_3_HAIKU: {
            "context_window": 200000,
            "max_output": 4096,
            "input_cost_per_1k": 0.00025,
            "output_cost_per_1k": 0.00125,
        },
    }
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.client: Optional[anthropic.AsyncAnthropic] = None
    
    async def initialize(self) -> None:
        """Initialize Anthropic client"""
        if self._initialized:
            return
            
        self.client = anthropic.AsyncAnthropic(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=self.config.timeout,
            max_retries=self.config.max_retries,
        )
        
        self._initialized = True
        logger.info("Anthropic provider initialized")
    
    async def complete(
        self,
        messages: List[Message],
        model: AIModel,
        options: Optional[CompletionOptions] = None
    ) -> CompletionResponse:
        """Generate completion using Anthropic API"""
        if not self._initialized:
            await self.initialize()
        
        options = options or CompletionOptions()
        
        # Extract system message if present
        system_message = None
        claude_messages = []
        
        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                claude_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        try:
            params = {
                "model": model.value,
                "messages": claude_messages,
                "max_tokens": options.max_tokens or 4096,
                "temperature": options.temperature,
                "top_p": options.top_p,
                "stop_sequences": options.stop,
            }
            
            if system_message:
                params["system"] = system_message
            
            response = await self.client.messages.create(**params)
            
            # Extract text content
            content = ""
            for block in response.content:
                if block.type == "text":
                    content += block.text
            
            return CompletionResponse(
                id=response.id,
                model=response.model,
                content=content,
                finish_reason=response.stop_reason,
                usage={
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens
                }
            )
            
        except Exception as e:
            logger.error(f"Anthropic completion error: {e}")
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
        
        # Extract system message if present
        system_message = None
        claude_messages = []
        
        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                claude_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        try:
            params = {
                "model": model.value,
                "messages": claude_messages,
                "max_tokens": options.max_tokens or 4096,
                "temperature": options.temperature,
                "top_p": options.top_p,
                "stop_sequences": options.stop,
                "stream": True,
            }
            
            if system_message:
                params["system"] = system_message
            
            async with self.client.messages.stream(**params) as stream:
                async for text in stream.text_stream:
                    yield text
                    
        except Exception as e:
            logger.error(f"Anthropic streaming error: {e}")
            raise
    
    async def embed(
        self,
        texts: Union[str, List[str]],
        model: AIModel,
        options: Optional[EmbeddingOptions] = None
    ) -> EmbeddingResponse:
        """Anthropic doesn't support embeddings directly"""
        raise NotImplementedError("Anthropic doesn't provide embedding models")
    
    async def count_tokens(self, text: str, model: AIModel) -> int:
        """Count tokens for Claude models"""
        # Anthropic uses a similar tokenization to GPT models
        # For accurate counting, we'd need their tokenizer
        # This is an approximation based on character count
        return len(text) // 4  # Rough approximation
    
    def supports_model(self, model: AIModel) -> bool:
        """Check if model is supported"""
        return model in self.SUPPORTED_MODELS
    
    def get_model_info(self, model: AIModel) -> Dict[str, Any]:
        """Get model information"""
        return self.MODEL_INFO.get(model, {})
    
    def get_default_model(self) -> AIModel:
        """Get default model"""
        return AIModel.CLAUDE_3_SONNET
    
    async def close(self) -> None:
        """Clean up resources"""
        if self.client:
            await self.client.close()
        self._initialized = False