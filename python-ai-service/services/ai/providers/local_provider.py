"""Local Model Provider Implementation using llama-cpp-python"""
import asyncio
from typing import AsyncIterator, Dict, List, Optional, Union, Any
from pathlib import Path
import json
from concurrent.futures import ThreadPoolExecutor
from functools import partial

try:
    from llama_cpp import Llama
    LLAMA_CPP_AVAILABLE = True
except ImportError:
    LLAMA_CPP_AVAILABLE = False
    Llama = None
    
from structlog import get_logger

from .base import (
    AIProvider, AIModel, Message, CompletionOptions, CompletionResponse,
    EmbeddingOptions, EmbeddingResponse, ProviderConfig
)


logger = get_logger()


class LocalModelProvider(AIProvider):
    """Local model provider using llama-cpp-python"""
    
    SUPPORTED_MODELS = {
        AIModel.LLAMA_2_7B,
        AIModel.LLAMA_2_13B,
        AIModel.LLAMA_3_8B,
        AIModel.LLAMA_3_70B,
        AIModel.MISTRAL_7B,
        AIModel.MIXTRAL_8X7B,
    }
    
    MODEL_INFO = {
        AIModel.LLAMA_2_7B: {
            "context_window": 4096,
            "model_file": "llama-2-7b-chat.Q4_K_M.gguf",
            "chat_format": "llama-2",
        },
        AIModel.LLAMA_2_13B: {
            "context_window": 4096,
            "model_file": "llama-2-13b-chat.Q4_K_M.gguf",
            "chat_format": "llama-2",
        },
        AIModel.LLAMA_3_8B: {
            "context_window": 8192,
            "model_file": "Meta-Llama-3-8B-Instruct.Q4_K_M.gguf",
            "chat_format": "llama-3",
        },
        AIModel.LLAMA_3_70B: {
            "context_window": 8192,
            "model_file": "Meta-Llama-3-70B-Instruct.Q4_K_M.gguf",
            "chat_format": "llama-3",
        },
        AIModel.MISTRAL_7B: {
            "context_window": 8192,
            "model_file": "mistral-7b-instruct-v0.2.Q4_K_M.gguf",
            "chat_format": "mistral-instruct",
        },
        AIModel.MIXTRAL_8X7B: {
            "context_window": 32768,
            "model_file": "mixtral-8x7b-instruct-v0.1.Q4_K_M.gguf",
            "chat_format": "mistral-instruct",
        },
    }
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        if not LLAMA_CPP_AVAILABLE:
            raise ImportError("llama-cpp-python is not installed. Install with: pip install llama-cpp-python")
        
        self.models: Dict[AIModel, Any] = {}
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.model_cache_dir = Path(config.model_path or "./models")
        self.model_cache_dir.mkdir(exist_ok=True)
    
    async def initialize(self) -> None:
        """Initialize local models"""
        if self._initialized:
            return
        
        self._initialized = True
        logger.info("Local model provider initialized")
    
    def _load_model(self, model: AIModel) -> Any:
        """Load a model if not already loaded"""
        if model in self.models:
            return self.models[model]
        
        model_info = self.MODEL_INFO.get(model)
        if not model_info:
            raise ValueError(f"Model {model} not supported")
        
        model_path = self.model_cache_dir / model_info["model_file"]
        
        if not model_path.exists():
            raise FileNotFoundError(
                f"Model file not found: {model_path}. "
                f"Please download the model and place it in {self.model_cache_dir}"
            )
        
        logger.info(f"Loading model {model} from {model_path}")
        
        # Create Llama instance with configuration
        llama_model = Llama(
            model_path=str(model_path),
            n_ctx=self.config.n_ctx,
            n_gpu_layers=self.config.n_gpu_layers,
            n_threads=self.config.n_threads,
            use_mmap=self.config.use_mmap,
            use_mlock=self.config.use_mlock,
            chat_format=model_info.get("chat_format"),
            verbose=False,
        )
        
        self.models[model] = llama_model
        logger.info(f"Model {model} loaded successfully")
        
        return llama_model
    
    def _format_messages(self, messages: List[Message], model: AIModel) -> str:
        """Format messages for the model"""
        model_info = self.MODEL_INFO.get(model, {})
        chat_format = model_info.get("chat_format", "chatml")
        
        if chat_format == "llama-2":
            # Llama 2 format
            formatted = ""
            for msg in messages:
                if msg.role == "system":
                    formatted += f"<<SYS>>\n{msg.content}\n<</SYS>>\n\n"
                elif msg.role == "user":
                    formatted += f"[INST] {msg.content} [/INST]"
                elif msg.role == "assistant":
                    formatted += f" {msg.content} "
            return formatted
            
        elif chat_format == "llama-3":
            # Llama 3 format
            formatted = ""
            for msg in messages:
                if msg.role == "system":
                    formatted += f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{msg.content}<|eot_id|>"
                elif msg.role == "user":
                    formatted += f"<|start_header_id|>user<|end_header_id|>\n\n{msg.content}<|eot_id|>"
                elif msg.role == "assistant":
                    formatted += f"<|start_header_id|>assistant<|end_header_id|>\n\n{msg.content}<|eot_id|>"
            formatted += "<|start_header_id|>assistant<|end_header_id|>\n\n"
            return formatted
            
        elif chat_format == "mistral-instruct":
            # Mistral format
            formatted = ""
            for msg in messages:
                if msg.role == "system":
                    formatted += f"[INST] {msg.content} [/INST]"
                elif msg.role == "user":
                    formatted += f"[INST] {msg.content} [/INST]"
                elif msg.role == "assistant":
                    formatted += f" {msg.content} "
            return formatted
            
        else:
            # Default ChatML format
            formatted = ""
            for msg in messages:
                formatted += f"<|im_start|>{msg.role}\n{msg.content}<|im_end|>\n"
            formatted += "<|im_start|>assistant\n"
            return formatted
    
    async def complete(
        self,
        messages: List[Message],
        model: AIModel,
        options: Optional[CompletionOptions] = None
    ) -> CompletionResponse:
        """Generate completion using local model"""
        if not self._initialized:
            await self.initialize()
        
        options = options or CompletionOptions()
        
        # Load model
        llama_model = await asyncio.get_event_loop().run_in_executor(
            self.executor, self._load_model, model
        )
        
        # Format messages
        prompt = self._format_messages(messages, model)
        
        # Generate completion in thread pool
        def _generate():
            return llama_model(
                prompt,
                max_tokens=options.max_tokens or 2048,
                temperature=options.temperature,
                top_p=options.top_p,
                frequency_penalty=options.frequency_penalty,
                presence_penalty=options.presence_penalty,
                stop=options.stop,
                echo=False,
            )
        
        result = await asyncio.get_event_loop().run_in_executor(
            self.executor, _generate
        )
        
        return CompletionResponse(
            id=f"local-{model.value}-{id(result)}",
            model=model.value,
            content=result["choices"][0]["text"],
            finish_reason=result["choices"][0].get("finish_reason"),
            usage={
                "prompt_tokens": result["usage"]["prompt_tokens"],
                "completion_tokens": result["usage"]["completion_tokens"],
                "total_tokens": result["usage"]["total_tokens"],
            }
        )
    
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
        
        # Load model
        llama_model = await asyncio.get_event_loop().run_in_executor(
            self.executor, self._load_model, model
        )
        
        # Format messages
        prompt = self._format_messages(messages, model)
        
        # Create streaming generator
        def _stream_generate():
            return llama_model(
                prompt,
                max_tokens=options.max_tokens or 2048,
                temperature=options.temperature,
                top_p=options.top_p,
                frequency_penalty=options.frequency_penalty,
                presence_penalty=options.presence_penalty,
                stop=options.stop,
                echo=False,
                stream=True,
            )
        
        # Stream tokens
        loop = asyncio.get_event_loop()
        stream = await loop.run_in_executor(self.executor, _stream_generate)
        
        for chunk in stream:
            token = chunk["choices"][0]["text"]
            if token:
                yield token
    
    async def embed(
        self,
        texts: Union[str, List[str]],
        model: AIModel,
        options: Optional[EmbeddingOptions] = None
    ) -> EmbeddingResponse:
        """Generate embeddings using local model"""
        if not self._initialized:
            await self.initialize()
        
        # Ensure texts is a list
        if isinstance(texts, str):
            texts = [texts]
        
        # Load model (we'll use the default model for embeddings)
        llama_model = await asyncio.get_event_loop().run_in_executor(
            self.executor, self._load_model, self.get_default_model()
        )
        
        # Generate embeddings
        embeddings = []
        for text in texts:
            embedding = await asyncio.get_event_loop().run_in_executor(
                self.executor, llama_model.embed, text
            )
            embeddings.append(embedding)
        
        return EmbeddingResponse(
            embeddings=embeddings,
            model=model.value,
            usage={
                "prompt_tokens": sum(len(t.split()) for t in texts),
                "total_tokens": sum(len(t.split()) for t in texts),
            }
        )
    
    async def count_tokens(self, text: str, model: AIModel) -> int:
        """Count tokens for the given text"""
        if not self._initialized:
            await self.initialize()
        
        llama_model = await asyncio.get_event_loop().run_in_executor(
            self.executor, self._load_model, model
        )
        
        tokens = await asyncio.get_event_loop().run_in_executor(
            self.executor, llama_model.tokenize, text.encode()
        )
        
        return len(tokens)
    
    def supports_model(self, model: AIModel) -> bool:
        """Check if model is supported"""
        return model in self.SUPPORTED_MODELS
    
    def get_model_info(self, model: AIModel) -> Dict[str, Any]:
        """Get model information"""
        return self.MODEL_INFO.get(model, {})
    
    def get_default_model(self) -> AIModel:
        """Get default model"""
        return AIModel.LLAMA_3_8B
    
    async def close(self) -> None:
        """Clean up resources"""
        self.executor.shutdown(wait=True)
        self.models.clear()
        self._initialized = False