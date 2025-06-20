"""
OpenAI API client for content generation.
Handles API calls and response management.
"""

import os
from typing import Dict, Any, Optional
import aiohttp
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential

from core.logging import get_logger

logger = get_logger(__name__)


class OpenAIClient:
    """
    Async OpenAI API client for content generation.
    Follows coding standards: < 300 lines, single responsibility.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key not provided")
        
        self.base_url = "https://api.openai.com/v1"
        self.default_model = "gpt-4"
        self.timeout = aiohttp.ClientTimeout(total=60)
        
    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        top_p: float = 1.0,
        frequency_penalty: float = 0.0,
        presence_penalty: float = 0.0,
        **kwargs
    ) -> str:
        """
        Generate content using OpenAI's API.
        
        Args:
            prompt: The prompt to send to the model
            model: Model to use (defaults to gpt-4)
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            top_p: Nucleus sampling parameter
            frequency_penalty: Frequency penalty (-2 to 2)
            presence_penalty: Presence penalty (-2 to 2)
            **kwargs: Additional parameters for the API
            
        Returns:
            Generated text content
        """
        model = model or self.default_model
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a helpful AI assistant that generates educational content."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "frequency_penalty": frequency_penalty,
            "presence_penalty": presence_penalty,
            **kwargs
        }
        
        try:
            response = await self._make_request(payload)
            
            # Extract the generated content
            if response.get('choices') and len(response['choices']) > 0:
                content = response['choices'][0]['message']['content']
                
                # Log usage statistics
                usage = response.get('usage', {})
                logger.info(
                    "OpenAI generation completed",
                    model=model,
                    prompt_tokens=usage.get('prompt_tokens'),
                    completion_tokens=usage.get('completion_tokens'),
                    total_tokens=usage.get('total_tokens')
                )
                
                return content
            else:
                raise ValueError("No content generated from OpenAI")
                
        except Exception as e:
            logger.error(
                "OpenAI generation failed",
                model=model,
                error=str(e),
                error_type=type(e).__name__
            )
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def _make_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make an API request to OpenAI with retry logic.
        
        Args:
            payload: Request payload
            
        Returns:
            API response as dictionary
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        async with aiohttp.ClientSession(timeout=self.timeout) as session:
            async with session.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            ) as response:
                
                # Handle different response statuses
                if response.status == 200:
                    return await response.json()
                elif response.status == 429:
                    # Rate limit - will be retried
                    error_data = await response.json()
                    logger.warning(
                        "OpenAI rate limit hit",
                        error=error_data.get('error', {}).get('message')
                    )
                    raise Exception("Rate limit exceeded")
                elif response.status >= 500:
                    # Server error - will be retried
                    logger.warning(
                        "OpenAI server error",
                        status=response.status
                    )
                    raise Exception(f"Server error: {response.status}")
                else:
                    # Client error - won't be retried
                    error_data = await response.json()
                    error_message = error_data.get('error', {}).get('message', 'Unknown error')
                    raise ValueError(f"OpenAI API error: {error_message}")
    
    async def generate_structured(
        self,
        prompt: str,
        output_format: str,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate content with structured output format.
        
        Args:
            prompt: The prompt to send to the model
            output_format: Expected output format (json, list, etc.)
            model: Model to use
            **kwargs: Additional generation parameters
            
        Returns:
            Structured content as dictionary
        """
        # Add format instruction to prompt
        formatted_prompt = f"{prompt}\n\nPlease provide your response in {output_format} format."
        
        # Use lower temperature for structured output
        kwargs['temperature'] = kwargs.get('temperature', 0.3)
        
        response = await self.generate(
            prompt=formatted_prompt,
            model=model,
            **kwargs
        )
        
        # Try to parse structured response
        try:
            if output_format.lower() == 'json':
                import json
                # Find JSON in response
                json_start = response.find('{')
                json_end = response.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response[json_start:json_end]
                    return json.loads(json_str)
            elif output_format.lower() == 'list':
                # Parse list format
                lines = response.strip().split('\n')
                items = []
                for line in lines:
                    # Remove common list markers
                    cleaned = line.strip()
                    if cleaned.startswith(('- ', '* ', '• ')):
                        cleaned = cleaned[2:].strip()
                    elif cleaned and cleaned[0].isdigit() and '. ' in cleaned:
                        cleaned = cleaned.split('. ', 1)[1].strip()
                    if cleaned:
                        items.append(cleaned)
                return {'items': items}
        except Exception as e:
            logger.warning(
                "Failed to parse structured output",
                format=output_format,
                error=str(e)
            )
        
        # Return raw response if parsing fails
        return {'content': response}
    
    async def estimate_tokens(self, text: str) -> int:
        """
        Estimate token count for text.
        Uses a simple approximation (actual tokenization varies).
        
        Args:
            text: Text to estimate tokens for
            
        Returns:
            Estimated token count
        """
        # Simple estimation: ~4 characters per token on average
        # This is a rough approximation; actual tokenization is more complex
        return len(text) // 4
    
    def validate_model(self, model: str) -> bool:
        """
        Validate if a model name is supported.
        
        Args:
            model: Model name to validate
            
        Returns:
            True if model is supported
        """
        supported_models = [
            'gpt-4',
            'gpt-4-turbo-preview',
            'gpt-3.5-turbo',
            'gpt-3.5-turbo-16k'
        ]
        return model in supported_models