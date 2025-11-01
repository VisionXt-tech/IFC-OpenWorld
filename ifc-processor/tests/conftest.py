"""
Pytest configuration and shared fixtures
"""

import pytest
import os
import sys
from pathlib import Path

# Add app directory to Python path for imports
app_dir = Path(__file__).parent.parent
sys.path.insert(0, str(app_dir))


@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    """
    Auto-use fixture to set up test environment variables
    This runs before every test to ensure clean environment
    """
    # Set required environment variables for Settings
    test_env = {
        "DATABASE_URL": "postgresql://test_user:test_pass@localhost:5433/test_db",
        "REDIS_URL": "redis://localhost:6379/0",
        "CELERY_BROKER_URL": "redis://localhost:6379/0",
        "CELERY_RESULT_BACKEND": "redis://localhost:6379/0",
        "S3_ENDPOINT": "http://localhost:9000",
        "S3_BUCKET": "test-bucket",
        "S3_ACCESS_KEY_ID": "test-access-key",
        "S3_SECRET_ACCESS_KEY": "test-secret-key",
        "S3_REGION": "us-east-1",
        "SERVICE_NAME": "ifc-processor-test",
        "ENVIRONMENT": "test",
        "PORT": "8000",
        "HOST": "0.0.0.0",
        "MAX_FILE_SIZE_MB": "100",
        "PROCESSING_TIMEOUT_SECONDS": "300",
        "LOG_LEVEL": "WARNING",  # Reduce log noise during tests
    }

    for key, value in test_env.items():
        monkeypatch.setenv(key, value)

    # Clear settings cache to ensure fresh settings for each test
    from app.config import get_settings

    get_settings.cache_clear()


@pytest.fixture
def sample_ifc_coordinates():
    """Provide sample IFC coordinate data for tests"""
    return {
        "rome": {
            "latitude_dms": (41, 53, 24, 72000),
            "longitude_dms": (12, 29, 32, 64000),
            "latitude_dd": 41.890020,
            "longitude_dd": 12.492400,
        },
        "london": {
            "latitude_dms": (51, 30, 26, 0),
            "longitude_dms": (0, 7, 39, 0),
            "latitude_dd": 51.507222,
            "longitude_dd": 0.127500,
        },
        "sydney": {
            "latitude_dms": (-33, 51, 25, 0),
            "longitude_dms": (151, 12, 28, 0),
            "latitude_dd": -33.856944,
            "longitude_dd": 151.207778,
        },
    }


@pytest.fixture
def sample_building_metadata():
    """Provide sample building metadata for tests"""
    return {
        "full": {
            "name": "Test Office Building",
            "address": "123 Main Street",
            "city": "Rome",
            "country": "Italy",
            "height": 48.5,
            "floor_count": 4,
        },
        "minimal": {
            "name": "Simple Building",
            "address": None,
            "city": None,
            "country": None,
            "height": None,
            "floor_count": 0,
        },
    }
