"""AI Provider Manager with fallback and cost optimization"""
from typing import Dict, List, Optional, Union, AsyncIterator, Any
from enum import Enum
import asyncio
from datetime import datetime, timedelta
from collections import defaultdict
import random

from structlog import get_logger

from .providers.base import (
    AIProvider, AIModel, Message, CompletionOptions, CompletionResponse,
    EmbeddingOptions, EmbeddingResponse, ProviderConfig
)
from .providers.openai_provider import OpenAIProvider
from .providers.anthropic_provider import AnthropicProvider

# Conditionally import local provider
try:
    from .providers.local_provider import LocalModelProvider
    LOCAL_PROVIDER_AVAILABLE = True
except ImportError:
    LOCAL_PROVIDER_AVAILABLE = False
    LocalModelProvider = None
from .circuit_breaker import CircuitBreaker
from .cost_tracker import CostTracker


logger = get_logger()


class ProviderType(str, Enum):
    """Available provider types"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"


class FallbackStrategy(str, Enum):
    """Fallback strategies for provider selection"""
    SEQUENTIAL = "sequential"  # Try providers in order
    RANDOM = "random"  # Random selection
    LEAST_COST = "least_cost"  # Choose cheapest provider
    LEAST_LATENCY = "least_latency"  # Choose fastest provider
    ROUND_ROBIN = "round_robin"  # Rotate through providers


class AIManager:
    """Manages multiple AI providers with fallback and optimization"""
    
    def __init__(
        self,
        default_provider: ProviderType = ProviderType.OPENAI,
        fallback_strategy: FallbackStrategy = FallbackStrategy.SEQUENTIAL,
        enable_cost_optimization: bool = True,
        enable_local_fallback: bool = True,
    ):
        self.providers: Dict[ProviderType, AIProvider] = {}
        self.circuit_breakers: Dict[ProviderType, CircuitBreaker] = {}
        self.cost_tracker = CostTracker()
        self.default_provider = default_provider
        self.fallback_strategy = fallback_strategy
        self.enable_cost_optimization = enable_cost_optimization
        self.enable_local_fallback = enable_local_fallback
        
        # Performance tracking
        self.latency_history: Dict[ProviderType, List[float]] = defaultdict(list)
        self.success_rates: Dict[ProviderType, Dict[str, int]] = defaultdict(
            lambda: {"success": 0, "failure": 0}
        )
        
        # Round-robin state
        self._round_robin_index = 0
    
    async def initialize_provider(
        self,
        provider_type: ProviderType,
        config: ProviderConfig
    ) -> None:
        """Initialize a specific provider"""
        try:
            if provider_type == ProviderType.OPENAI:
                provider = OpenAIProvider(config)
            elif provider_type == ProviderType.ANTHROPIC:
                provider = AnthropicProvider(config)
            elif provider_type == ProviderType.LOCAL:
                if not LOCAL_PROVIDER_AVAILABLE:
                    raise ImportError("Local model provider is not available. Install llama-cpp-python to use local models.")
                provider = LocalModelProvider(config)
            else:
                raise ValueError(f"Unknown provider type: {provider_type}")
            
            await provider.initialize()
            self.providers[provider_type] = provider
            
            # Initialize circuit breaker for the provider
            self.circuit_breakers[provider_type] = CircuitBreaker(
                failure_threshold=5,
                recovery_timeout=60,
                expected_exception=Exception
            )
            
            logger.info(f"Initialized provider: {provider_type}")
            
        except Exception as e:
            logger.error(f"Failed to initialize provider {provider_type}: {e}")
            raise
    
    async def complete(
        self,
        messages: List[Message],
        model: Optional[AIModel] = None,
        options: Optional[CompletionOptions] = None,
        preferred_providers: Optional[List[ProviderType]] = None,
        user_id: Optional[str] = None
    ) -> CompletionResponse:
        """Generate completion with automatic provider selection and fallback"""
        start_time = datetime.now()
        
        # Get ordered list of providers to try
        providers_to_try = self._get_provider_order(
            model, preferred_providers, options
        )
        
        last_error = None
        for provider_type in providers_to_try:
            if provider_type not in self.providers:
                continue
            
            provider = self.providers[provider_type]
            circuit_breaker = self.circuit_breakers[provider_type]
            
            # Skip if circuit breaker is open
            if circuit_breaker.state == "open":
                logger.warning(f"Skipping {provider_type} - circuit breaker open")
                continue
            
            try:
                # Check if provider supports the model
                if model and not provider.supports_model(model):
                    # Try to map to equivalent model
                    mapped_model = self._map_model(model, provider_type)
                    if not mapped_model:
                        continue
                    model_to_use = mapped_model
                else:
                    model_to_use = model or provider.get_default_model()
                
                # Execute with circuit breaker
                response = await circuit_breaker.call(
                    provider.complete,
                    messages,
                    model_to_use,
                    options
                )
                
                # Track success
                latency = (datetime.now() - start_time).total_seconds()
                self._track_success(provider_type, latency)
                
                # Track costs
                if response.usage and user_id:
                    await self.cost_tracker.track_usage(
                        user_id=user_id,
                        provider=provider_type.value,
                        model=model_to_use.value,
                        prompt_tokens=response.usage.get("prompt_tokens", 0),
                        completion_tokens=response.usage.get("completion_tokens", 0),
                        cost=self._calculate_cost(
                            model_to_use,
                            response.usage.get("prompt_tokens", 0),
                            response.usage.get("completion_tokens", 0)
                        )
                    )
                
                logger.info(
                    f"Completion successful with {provider_type}",
                    latency=latency,
                    model=model_to_use.value
                )
                
                return response
                
            except Exception as e:
                logger.error(f"Provider {provider_type} failed: {e}")
                last_error = e
                self._track_failure(provider_type)
                continue
        
        # All providers failed
        raise Exception(f"All providers failed. Last error: {last_error}")
    
    async def complete_stream(
        self,
        messages: List[Message],
        model: Optional[AIModel] = None,
        options: Optional[CompletionOptions] = None,
        preferred_providers: Optional[List[ProviderType]] = None,
        user_id: Optional[str] = None
    ) -> AsyncIterator[str]:
        """Generate streaming completion with automatic provider selection"""
        start_time = datetime.now()
        
        # Get ordered list of providers to try
        providers_to_try = self._get_provider_order(
            model, preferred_providers, options
        )
        
        last_error = None
        for provider_type in providers_to_try:
            if provider_type not in self.providers:
                continue
            
            provider = self.providers[provider_type]
            circuit_breaker = self.circuit_breakers[provider_type]
            
            # Skip if circuit breaker is open
            if circuit_breaker.state == "open":
                logger.warning(f"Skipping {provider_type} - circuit breaker open")
                continue
            
            try:
                # Check if provider supports the model
                if model and not provider.supports_model(model):
                    mapped_model = self._map_model(model, provider_type)
                    if not mapped_model:
                        continue
                    model_to_use = mapped_model
                else:
                    model_to_use = model or provider.get_default_model()
                
                # Track token usage for streaming
                token_count = 0
                
                async def stream_with_tracking():
                    nonlocal token_count
                    async for chunk in provider.complete_stream(
                        messages, model_to_use, options
                    ):
                        token_count += len(chunk.split())  # Rough estimate
                        yield chunk
                
                # Execute with circuit breaker
                async for chunk in circuit_breaker.call_async_generator(
                    stream_with_tracking()
                ):
                    yield chunk
                
                # Track success
                latency = (datetime.now() - start_time).total_seconds()
                self._track_success(provider_type, latency)
                
                # Track costs (rough estimate for streaming)
                if user_id:
                    prompt_tokens = sum(len(m.content.split()) for m in messages) * 1.3
                    await self.cost_tracker.track_usage(
                        user_id=user_id,
                        provider=provider_type.value,
                        model=model_to_use.value,
                        prompt_tokens=int(prompt_tokens),
                        completion_tokens=token_count,
                        cost=self._calculate_cost(
                            model_to_use,
                            int(prompt_tokens),
                            token_count
                        )
                    )
                
                logger.info(
                    f"Streaming completion successful with {provider_type}",
                    latency=latency,
                    model=model_to_use.value
                )
                
                return
                
            except Exception as e:
                logger.error(f"Provider {provider_type} failed: {e}")
                last_error = e
                self._track_failure(provider_type)
                continue
        
        # All providers failed
        raise Exception(f"All providers failed. Last error: {last_error}")
    
    async def embed(
        self,
        texts: Union[str, List[str]],
        model: Optional[AIModel] = None,
        options: Optional[EmbeddingOptions] = None,
        user_id: Optional[str] = None
    ) -> EmbeddingResponse:
        """Generate embeddings with automatic provider selection"""
        # Embeddings are typically only supported by OpenAI
        # Use OpenAI or fall back to local model
        providers_to_try = [ProviderType.OPENAI]
        if self.enable_local_fallback:
            providers_to_try.append(ProviderType.LOCAL)
        
        last_error = None
        for provider_type in providers_to_try:
            if provider_type not in self.providers:
                continue
            
            provider = self.providers[provider_type]
            
            try:
                # Use appropriate embedding model
                if provider_type == ProviderType.OPENAI:
                    model_to_use = model or AIModel.EMBEDDING_3_SMALL
                else:
                    # Local models use their default for embeddings
                    model_to_use = provider.get_default_model()
                
                response = await provider.embed(texts, model_to_use, options)
                
                # Track costs
                if response.usage and user_id:
                    await self.cost_tracker.track_usage(
                        user_id=user_id,
                        provider=provider_type.value,
                        model=model_to_use.value,
                        prompt_tokens=response.usage.get("prompt_tokens", 0),
                        completion_tokens=0,
                        cost=self._calculate_embedding_cost(
                            model_to_use,
                            response.usage.get("prompt_tokens", 0)
                        )
                    )
                
                return response
                
            except Exception as e:
                logger.error(f"Embedding provider {provider_type} failed: {e}")
                last_error = e
                continue
        
        raise Exception(f"All embedding providers failed. Last error: {last_error}")
    
    def _get_provider_order(
        self,
        model: Optional[AIModel],
        preferred_providers: Optional[List[ProviderType]],
        options: Optional[CompletionOptions]
    ) -> List[ProviderType]:
        """Determine the order of providers to try based on strategy"""
        available_providers = list(self.providers.keys())
        
        # Filter by preferred providers if specified
        if preferred_providers:
            available_providers = [
                p for p in preferred_providers if p in available_providers
            ]
        
        # Apply fallback strategy
        if self.fallback_strategy == FallbackStrategy.SEQUENTIAL:
            # Default order: primary, then others
            if self.default_provider in available_providers:
                available_providers.remove(self.default_provider)
                available_providers.insert(0, self.default_provider)
                
        elif self.fallback_strategy == FallbackStrategy.RANDOM:
            random.shuffle(available_providers)
            
        elif self.fallback_strategy == FallbackStrategy.LEAST_COST:
            # Sort by estimated cost for the model
            if model:
                available_providers.sort(
                    key=lambda p: self._get_model_cost(model, p)
                )
                
        elif self.fallback_strategy == FallbackStrategy.LEAST_LATENCY:
            # Sort by average latency
            available_providers.sort(
                key=lambda p: self._get_average_latency(p)
            )
            
        elif self.fallback_strategy == FallbackStrategy.ROUND_ROBIN:
            # Rotate through providers
            if available_providers:
                self._round_robin_index = (
                    self._round_robin_index % len(available_providers)
                )
                provider = available_providers[self._round_robin_index]
                available_providers.remove(provider)
                available_providers.insert(0, provider)
                self._round_robin_index += 1
        
        return available_providers
    
    def _map_model(
        self,
        model: AIModel,
        provider_type: ProviderType
    ) -> Optional[AIModel]:
        """Map a model to an equivalent model for a different provider"""
        # Model mapping logic
        if provider_type == ProviderType.ANTHROPIC:
            if model in [AIModel.GPT_4O, AIModel.GPT_4_TURBO]:
                return AIModel.CLAUDE_3_OPUS
            elif model == AIModel.GPT_35_TURBO:
                return AIModel.CLAUDE_3_HAIKU
                
        elif provider_type == ProviderType.LOCAL:
            if model in [AIModel.GPT_4O, AIModel.GPT_4_TURBO, AIModel.CLAUDE_3_OPUS]:
                return AIModel.LLAMA_3_70B if AIModel.LLAMA_3_70B in self.providers[provider_type].SUPPORTED_MODELS else AIModel.LLAMA_3_8B
            else:
                return AIModel.LLAMA_3_8B
                
        elif provider_type == ProviderType.OPENAI:
            if model == AIModel.CLAUDE_3_OPUS:
                return AIModel.GPT_4O
            elif model == AIModel.CLAUDE_3_SONNET:
                return AIModel.GPT_4_TURBO
            elif model == AIModel.CLAUDE_3_HAIKU:
                return AIModel.GPT_35_TURBO
        
        return None
    
    def _calculate_cost(
        self,
        model: AIModel,
        prompt_tokens: int,
        completion_tokens: int
    ) -> float:
        """Calculate cost for a completion"""
        # Get model info from any provider that supports it
        for provider in self.providers.values():
            if provider.supports_model(model):
                info = provider.get_model_info(model)
                if info:
                    input_cost = info.get("input_cost_per_1k", 0) * (prompt_tokens / 1000)
                    output_cost = info.get("output_cost_per_1k", 0) * (completion_tokens / 1000)
                    return input_cost + output_cost
        
        return 0.0
    
    def _calculate_embedding_cost(
        self,
        model: AIModel,
        tokens: int
    ) -> float:
        """Calculate cost for embeddings"""
        for provider in self.providers.values():
            if provider.supports_model(model):
                info = provider.get_model_info(model)
                if info:
                    return info.get("cost_per_1k", 0) * (tokens / 1000)
        
        return 0.0
    
    def _get_model_cost(
        self,
        model: AIModel,
        provider_type: ProviderType
    ) -> float:
        """Get estimated cost per 1k tokens for a model"""
        if provider_type not in self.providers:
            return float('inf')
        
        provider = self.providers[provider_type]
        
        # Map model if needed
        if not provider.supports_model(model):
            model = self._map_model(model, provider_type)
            if not model:
                return float('inf')
        
        info = provider.get_model_info(model)
        if info:
            # Average of input and output costs
            input_cost = info.get("input_cost_per_1k", 0)
            output_cost = info.get("output_cost_per_1k", 0)
            return (input_cost + output_cost) / 2
        
        # Local models have zero cost
        if provider_type == ProviderType.LOCAL:
            return 0.0
        
        return float('inf')
    
    def _get_average_latency(self, provider_type: ProviderType) -> float:
        """Get average latency for a provider"""
        history = self.latency_history.get(provider_type, [])
        if not history:
            return float('inf')
        
        # Use recent history (last 10 requests)
        recent = history[-10:]
        return sum(recent) / len(recent)
    
    def _track_success(self, provider_type: ProviderType, latency: float) -> None:
        """Track successful request"""
        self.success_rates[provider_type]["success"] += 1
        self.latency_history[provider_type].append(latency)
        
        # Keep only recent history
        if len(self.latency_history[provider_type]) > 100:
            self.latency_history[provider_type] = self.latency_history[provider_type][-100:]
    
    def _track_failure(self, provider_type: ProviderType) -> None:
        """Track failed request"""
        self.success_rates[provider_type]["failure"] += 1
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get statistics for all providers"""
        stats = {}
        
        for provider_type, provider in self.providers.items():
            success = self.success_rates[provider_type]["success"]
            failure = self.success_rates[provider_type]["failure"]
            total = success + failure
            
            stats[provider_type.value] = {
                "available": self.circuit_breakers[provider_type].state != "open",
                "success_rate": success / total if total > 0 else 0,
                "average_latency": self._get_average_latency(provider_type),
                "total_requests": total,
                "circuit_breaker_state": self.circuit_breakers[provider_type].state,
            }
        
        # Add cost tracking stats
        cost_stats = await self.cost_tracker.get_stats()
        stats["costs"] = cost_stats
        
        return stats
    
    async def close(self) -> None:
        """Close all providers"""
        for provider in self.providers.values():
            await provider.close()
        
        self.providers.clear()
        self.circuit_breakers.clear()