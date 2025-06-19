"""
Base AI interface for provider abstraction.
Enables easy switching between AI providers.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncGenerator
from dataclasses import dataclass
from enum import Enum


class AIProvider(str, Enum):
    """Available AI providers"""
    OPENAI = "openai"
    LOCAL_LLM = "local_llm"
    HUGGINGFACE = "huggingface"
    ANTHROPIC = "anthropic"


@dataclass
class AIConfig:
    """Configuration for AI provider"""
    provider: AIProvider
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    endpoint_url: Optional[str] = None
    max_tokens: int = 4096
    temperature: float = 0.7
    timeout: int = 300


@dataclass
class TokenUsage:
    """Token usage information"""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    
    @property
    def estimated_cost(self) -> float:
        """Estimate cost based on token usage"""
        # Default OpenAI pricing - should be configurable
        prompt_cost = self.prompt_tokens * 0.0001
        completion_cost = self.completion_tokens * 0.0003
        return prompt_cost + completion_cost


class BaseAIInterface(ABC):
    """
    Abstract base class for AI providers.
    All AI providers must implement this interface.
    """
    
    def __init__(self, config: AIConfig):
        self.config = config
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the AI provider connection"""
        pass
    
    @abstractmethod
    async def generate_embedding(
        self,
        text: str,
        model: Optional[str] = None
    ) -> List[float]:
        """
        Generate embedding for text.
        
        Args:
            text: Text to embed
            model: Optional model override
            
        Returns:
            Embedding vector
        """
        pass
    
    @abstractmethod
    async def generate_embeddings_batch(
        self,
        texts: List[str],
        model: Optional[str] = None
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts.
        
        Args:
            texts: List of texts to embed
            model: Optional model override
            
        Returns:
            List of embedding vectors
        """
        pass
    
    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Tuple[str, TokenUsage]:
        """
        Generate text completion.
        
        Args:
            prompt: User prompt
            system_prompt: System instructions
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            
        Returns:
            Generated text and token usage
        """
        pass
    
    @abstractmethod
    async def generate_text_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate text completion with streaming.
        
        Args:
            prompt: User prompt
            system_prompt: System instructions
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            
        Yields:
            Text chunks as they're generated
        """
        pass
    
    @abstractmethod
    async def count_tokens(self, text: str) -> int:
        """
        Count tokens in text.
        
        Args:
            text: Text to count tokens for
            
        Returns:
            Number of tokens
        """
        pass
    
    @abstractmethod
    async def validate_connection(self) -> bool:
        """
        Validate the AI provider connection.
        
        Returns:
            True if connection is valid
        """
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the current model.
        
        Returns:
            Model information dictionary
        """
        pass