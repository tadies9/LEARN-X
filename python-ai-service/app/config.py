"""
Configuration management for Python AI Service.
Follows coding standards: Single responsibility, explicit typing
"""

from typing import Optional, List, Union
from pydantic_settings import BaseSettings
from pydantic import Field, validator
import os
from enum import Enum

# Load .env file early
from dotenv import load_dotenv
load_dotenv()


class Environment(str, Enum):
    """Application environment types"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class LogLevel(str, Enum):
    """Logging levels"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class Settings(BaseSettings):
    """
    Application settings with validation.
    Loaded from environment variables and .env file
    """
    
    # Application
    app_name: str = "LEARN-X Python AI Service"
    app_version: str = "1.0.0"
    environment: Environment = Field(
        default=Environment.DEVELOPMENT,
        description="Application environment"
    )
    debug: bool = Field(default=False)
    
    # API
    api_prefix: str = "/api/v1"
    cors_origins: Union[List[str], str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"],
        env="CORS_ORIGINS"
    )
    
    # Database
    database_url: Optional[str] = Field(
        default=None,
        description="PostgreSQL connection URL"
    )
    database_pool_size: int = Field(default=10)
    database_max_overflow: int = Field(default=20)
    
    # Supabase
    supabase_url: str = Field(
        default="https://your-project.supabase.co",
        description="Supabase project URL"
    )
    supabase_anon_key: Optional[str] = Field(
        default=None,
        description="Supabase anonymous key"
    )
    supabase_service_key: Optional[str] = Field(
        default=None,
        description="Supabase service role key"
    )
    
    # Queue Configuration
    pgmq_poll_interval: int = Field(
        default=5000,
        description="PGMQ poll interval in milliseconds"
    )
    pgmq_visibility_timeout: int = Field(
        default=30,
        description="Message visibility timeout in seconds"
    )
    pgmq_batch_size: int = Field(default=10)
    pgmq_max_retries: int = Field(default=3)
    
    # OpenAI
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    openai_embedding_model: str = Field(
        default="text-embedding-3-small",
        description="OpenAI embedding model"
    )
    openai_embedding_dimensions: int = Field(default=1536)
    openai_max_batch_size: int = Field(default=50)
    
    # Anthropic
    anthropic_api_key: Optional[str] = Field(default=None, description="Anthropic API key")
    anthropic_max_tokens: int = Field(default=4096)
    
    # Local AI Models
    enable_local_models: bool = Field(default=False)
    local_models_path: Optional[str] = Field(default=None, description="Path to local model files")
    local_model_gpu_layers: int = Field(default=-1, description="GPU layers for local models")
    local_model_context_size: int = Field(default=4096)
    
    # AI Provider Configuration
    ai_default_provider: str = Field(default="openai", description="Default AI provider")
    ai_enable_fallback: bool = Field(default=True)
    ai_enable_cost_optimization: bool = Field(default=True)
    ai_request_timeout: int = Field(default=60)
    ai_max_retries: int = Field(default=3)
    
    # Caching
    enable_vector_cache: bool = Field(default=True)
    vector_cache_type: str = Field(default="memory", description="memory or redis")
    vector_cache_ttl: int = Field(default=3600)
    redis_url: Optional[str] = Field(default=None, description="Redis URL for caching")
    
    # Document Processing
    max_file_size_mb: int = Field(default=50)
    default_chunk_size: int = Field(default=1500)
    min_chunk_size: int = Field(default=200)
    chunk_overlap: int = Field(default=100)
    
    # Performance
    worker_count: int = Field(default=4)
    max_concurrent_jobs: int = Field(default=10)
    request_timeout: int = Field(default=300)
    
    # Monitoring
    log_level: LogLevel = Field(default=LogLevel.INFO)
    sentry_dsn: Optional[str] = Field(default=None)
    enable_metrics: bool = Field(default=True)
    metrics_port: int = Field(default=9090)
    
    # Security
    api_key_header: str = Field(default="X-API-Key")
    internal_api_key: Optional[str] = Field(
        default=None,
        description="API key for internal service communication"
    )
    
    @validator("database_url")
    def validate_database_url(cls, v: Optional[str]) -> Optional[str]:
        """Ensure database URL is PostgreSQL if provided"""
        if v and not v.startswith(("postgresql://", "postgres://")):
            raise ValueError("Database URL must be PostgreSQL")
        return v
    
    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string"""
        if v is None:
            return ["http://localhost:3000", "http://localhost:3001"]
        if isinstance(v, str):
            if not v or v.strip() == "":
                return ["http://localhost:3000", "http://localhost:3001"]
            try:
                return [origin.strip() for origin in v.split(",") if origin.strip()]
            except Exception:
                return ["http://localhost:3000", "http://localhost:3001"]
        if isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://localhost:3001"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        json_parse_mode = None  # Disable JSON parsing for env vars
        
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment == Environment.PRODUCTION
    
    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment == Environment.DEVELOPMENT


# Singleton instance
settings = Settings()