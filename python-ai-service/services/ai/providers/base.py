"""Base AI Provider Interface"""
from abc import ABC, abstractmethod
from typing import AsyncIterator, Dict, List, Optional, Union, Any
from dataclasses import dataclass
from enum import Enum
import asyncio
from datetime import datetime


class AIModel(str, Enum):
    """Supported AI models"""
    # OpenAI Models
    GPT_4O = "gpt-4o"
    GPT_4_TURBO = "gpt-4-turbo"
    GPT_35_TURBO = "gpt-3.5-turbo"
    
    # Anthropic Models
    CLAUDE_3_OPUS = "claude-3-opus-20240229"
    CLAUDE_3_SONNET = "claude-3-sonnet-20240229"
    CLAUDE_3_HAIKU = "claude-3-haiku-20240307"
    
    # Local Models
    LLAMA_2_7B = "llama-2-7b"
    LLAMA_2_13B = "llama-2-13b"
    LLAMA_3_8B = "llama-3-8b"
    LLAMA_3_70B = "llama-3-70b"
    MISTRAL_7B = "mistral-7b"
    MIXTRAL_8X7B = "mixtral-8x7b"
    
    # Embedding Models
    EMBEDDING_3_SMALL = "text-embedding-3-small"
    EMBEDDING_3_LARGE = "text-embedding-3-large"
    EMBEDDING_ADA_002 = "text-embedding-ada-002"


@dataclass
class Message:
    """Chat message"""
    role: str  # system, user, assistant
    content: str
    name: Optional[str] = None
    function_call: Optional[Dict[str, Any]] = None


@dataclass
class CompletionOptions:
    """Options for text completion"""
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    stop: Optional[List[str]] = None
    stream: bool = False
    user: Optional[str] = None
    response_format: Optional[Dict[str, str]] = None
    tools: Optional[List[Dict[str, Any]]] = None
    tool_choice: Optional[Union[str, Dict[str, Any]]] = None


@dataclass
class CompletionResponse:
    """Response from completion request"""
    id: str
    model: str
    content: str
    finish_reason: Optional[str] = None
    usage: Optional[Dict[str, int]] = None
    created: Optional[datetime] = None
    system_fingerprint: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None


@dataclass
class EmbeddingOptions:
    """Options for embedding generation"""
    dimensions: Optional[int] = None
    user: Optional[str] = None


@dataclass
class EmbeddingResponse:
    """Response from embedding request"""
    embeddings: List[List[float]]
    model: str
    usage: Dict[str, int]


@dataclass
class ProviderConfig:
    """Configuration for AI provider"""
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    organization: Optional[str] = None
    timeout: int = 60
    max_retries: int = 3
    
    # Local model specific
    model_path: Optional[str] = None
    n_ctx: int = 4096
    n_gpu_layers: int = -1  # -1 means use all available
    n_threads: Optional[int] = None
    use_mmap: bool = True
    use_mlock: bool = False
    
    # Rate limiting
    requests_per_minute: Optional[int] = None
    tokens_per_minute: Optional[int] = None


class AIProvider(ABC):
    """Abstract base class for AI providers"""
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self._rate_limiter = None
        self._initialized = False
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the provider (load models, establish connections, etc.)"""
        pass
    
    @abstractmethod
    async def complete(
        self, 
        messages: List[Message], 
        model: AIModel,
        options: Optional[CompletionOptions] = None
    ) -> CompletionResponse:
        """Generate a completion for the given messages"""
        pass
    
    @abstractmethod
    async def complete_stream(
        self,
        messages: List[Message],
        model: AIModel,
        options: Optional[CompletionOptions] = None
    ) -> AsyncIterator[str]:
        """Generate a streaming completion for the given messages"""
        pass
    
    @abstractmethod
    async def embed(
        self,
        texts: Union[str, List[str]],
        model: AIModel,
        options: Optional[EmbeddingOptions] = None
    ) -> EmbeddingResponse:
        """Generate embeddings for the given texts"""
        pass
    
    @abstractmethod
    async def count_tokens(self, text: str, model: AIModel) -> int:
        """Count tokens in the given text for the specified model"""
        pass
    
    @abstractmethod
    def supports_model(self, model: AIModel) -> bool:
        """Check if the provider supports the given model"""
        pass
    
    @abstractmethod
    def get_model_info(self, model: AIModel) -> Dict[str, Any]:
        """Get information about the model (context window, pricing, etc.)"""
        pass
    
    async def health_check(self) -> bool:
        """Check if the provider is healthy and can handle requests"""
        try:
            # Simple test with minimal tokens
            response = await self.complete(
                [Message(role="user", content="Hi")],
                self.get_default_model(),
                CompletionOptions(max_tokens=5)
            )
            return bool(response.content)
        except Exception:
            return False
    
    @abstractmethod
    def get_default_model(self) -> AIModel:
        """Get the default model for this provider"""
        pass
    
    async def close(self) -> None:
        """Clean up resources"""
        pass