"""Configuration management for the AI/ML service"""

from functools import lru_cache
from typing import Optional

from pydantic import Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Application
    app_name: str = Field(default="learnx-ai-service")
    app_env: str = Field(default="development")
    app_port: int = Field(default=8001)
    app_host: str = Field(default="0.0.0.0")
    log_level: str = Field(default="INFO")
    
    # Database
    database_url: PostgresDsn
    database_pool_size: int = Field(default=20)
    database_max_overflow: int = Field(default=10)
    
    # Redis
    redis_url: RedisDsn
    redis_pool_size: int = Field(default=10)
    
    # PGMQ
    pgmq_poll_interval: int = Field(default=5)
    pgmq_visibility_timeout: int = Field(default=300)
    pgmq_max_retries: int = Field(default=3)
    pgmq_batch_size: int = Field(default=10)
    
    # OpenAI
    openai_api_key: str
    openai_embedding_model: str = Field(default="text-embedding-3-small")
    openai_embedding_dimensions: int = Field(default=1536)
    openai_max_batch_size: int = Field(default=50)
    
    # Local Models
    enable_local_models: bool = Field(default=False)
    local_embedding_model: str = Field(default="sentence-transformers/all-MiniLM-L6-v2")
    local_llm_model: Optional[str] = Field(default=None)
    ollama_base_url: Optional[str] = Field(default=None)
    
    # Processing
    max_chunk_size: int = Field(default=1500)
    min_chunk_size: int = Field(default=200)
    chunk_overlap: int = Field(default=100)
    enable_semantic_chunking: bool = Field(default=True)
    enable_nlp_enhancement: bool = Field(default=True)
    
    # Workers
    worker_concurrency: int = Field(default=4)
    worker_heartbeat_interval: int = Field(default=30)
    worker_shutdown_timeout: int = Field(default=30)
    
    # Monitoring
    enable_metrics: bool = Field(default=True)
    metrics_port: int = Field(default=9090)
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.app_env.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.app_env.lower() == "development"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()