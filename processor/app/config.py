"""
Configuration management for IFC Processor Service
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Service
    service_name: str = "ifc-processor"
    environment: str = "development"
    port: int = 8000
    host: str = "0.0.0.0"

    # Database
    database_url: str

    # Redis
    redis_url: str

    # Celery
    celery_broker_url: str
    celery_result_backend: str

    # S3
    s3_endpoint: str
    s3_bucket: str
    s3_access_key_id: str
    s3_secret_access_key: str
    s3_region: str = "us-east-1"

    # Processing
    max_file_size_mb: int = 100
    processing_timeout_seconds: int = 300

    # ClamAV
    clamav_host: str = "localhost"
    clamav_port: int = 3310
    clamav_enabled: bool = True

    # Logging
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
