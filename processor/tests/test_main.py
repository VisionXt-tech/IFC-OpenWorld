"""
Integration tests for FastAPI endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
from app.main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


class TestHealthEndpoint:
    """Test /health endpoint"""

    def test_health_check_success(self, client):
        """Test health check returns healthy status"""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "ifc-processor"
        assert "environment" in data

    def test_health_check_response_schema(self, client):
        """Test health check response has required fields"""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "service" in data
        assert "environment" in data


class TestProcessEndpoint:
    """Test /process endpoint"""

    @patch("app.main.process_ifc_file")
    def test_process_ifc_success(self, mock_process_task, client):
        """Test successful IFC processing request"""
        # Mock Celery task
        mock_task = Mock()
        mock_task.id = "test-task-123"
        mock_process_task.delay.return_value = mock_task

        request_data = {
            "file_id": "file-uuid-123",
            "s3_key": "ifc-raw/sample.ifc",
        }

        response = client.post("/process", json=request_data)

        assert response.status_code == 202
        data = response.json()
        assert data["task_id"] == "test-task-123"
        assert data["status"] == "queued"
        assert data["file_id"] == "file-uuid-123"

        mock_process_task.delay.assert_called_once_with("file-uuid-123", "ifc-raw/sample.ifc")

    def test_process_ifc_missing_file_id(self, client):
        """Test process request with missing file_id"""
        request_data = {
            "s3_key": "ifc-raw/sample.ifc",
        }

        response = client.post("/process", json=request_data)

        assert response.status_code == 422  # Validation error

    def test_process_ifc_missing_s3_key(self, client):
        """Test process request with missing s3_key"""
        request_data = {
            "file_id": "file-uuid-123",
        }

        response = client.post("/process", json=request_data)

        assert response.status_code == 422  # Validation error

    def test_process_ifc_empty_request(self, client):
        """Test process request with empty body"""
        response = client.post("/process", json={})

        assert response.status_code == 422  # Validation error

    @patch("app.main.process_ifc_file")
    def test_process_ifc_task_error(self, mock_process_task, client):
        """Test process request when task queueing fails"""
        mock_process_task.delay.side_effect = Exception("Redis connection failed")

        request_data = {
            "file_id": "file-uuid-123",
            "s3_key": "ifc-raw/sample.ifc",
        }

        response = client.post("/process", json=request_data)

        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "Failed to queue processing task" in data["detail"]


class TestTaskStatusEndpoint:
    """Test /task/{task_id} endpoint"""

    @patch("app.tasks.process_ifc.celery_app")
    @patch("celery.result.AsyncResult")
    def test_get_task_status_pending(self, mock_async_result, mock_celery, client):
        """Test task status for pending task"""
        mock_result = Mock()
        mock_result.state = "PENDING"
        mock_async_result.return_value = mock_result

        response = client.get("/task/test-task-123")

        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "test-task-123"
        assert data["state"] == "PENDING"
        assert "waiting in queue" in data["status"].lower()

    @patch("app.tasks.process_ifc.celery_app")
    @patch("celery.result.AsyncResult")
    def test_get_task_status_started(self, mock_async_result, mock_celery, client):
        """Test task status for started task"""
        mock_result = Mock()
        mock_result.state = "STARTED"
        mock_async_result.return_value = mock_result

        response = client.get("/task/test-task-123")

        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "test-task-123"
        assert data["state"] == "STARTED"
        assert "processing" in data["status"].lower()

    @patch("app.tasks.process_ifc.celery_app")
    @patch("celery.result.AsyncResult")
    def test_get_task_status_success(self, mock_async_result, mock_celery, client):
        """Test task status for successful task"""
        mock_result = Mock()
        mock_result.state = "SUCCESS"
        mock_result.result = {
            "status": "success",
            "file_id": "file-uuid-123",
            "building_id": "building-uuid-456",
            "latitude": 41.8902,
            "longitude": 12.4924,
        }
        mock_async_result.return_value = mock_result

        response = client.get("/task/test-task-123")

        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "test-task-123"
        assert data["state"] == "SUCCESS"
        assert "completed successfully" in data["status"].lower()
        assert "result" in data
        assert data["result"]["status"] == "success"
        assert data["result"]["latitude"] == 41.8902

    @patch("app.tasks.process_ifc.celery_app")
    @patch("celery.result.AsyncResult")
    def test_get_task_status_failure(self, mock_async_result, mock_celery, client):
        """Test task status for failed task"""
        mock_result = Mock()
        mock_result.state = "FAILURE"
        mock_result.info = "Invalid IFC file format"
        mock_async_result.return_value = mock_result

        response = client.get("/task/test-task-123")

        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "test-task-123"
        assert data["state"] == "FAILURE"
        assert "failed" in data["status"].lower()
        assert "error" in data
        assert data["error"] == "Invalid IFC file format"

    @patch("app.tasks.process_ifc.celery_app")
    @patch("celery.result.AsyncResult")
    def test_get_task_status_not_found(self, mock_async_result, mock_celery, client):
        """Test task status for non-existent task"""
        mock_async_result.side_effect = Exception("Task not found")

        response = client.get("/task/invalid-task-id")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()


class TestAPIDocumentation:
    """Test API documentation endpoints"""

    def test_openapi_schema(self, client):
        """Test OpenAPI schema is accessible"""
        response = client.get("/openapi.json")

        assert response.status_code == 200
        schema = response.json()
        assert "openapi" in schema
        assert "info" in schema
        assert schema["info"]["title"] == "IFC Processor Service"

    def test_docs_ui(self, client):
        """Test Swagger UI is accessible"""
        response = client.get("/docs")

        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]

    def test_redoc_ui(self, client):
        """Test ReDoc UI is accessible"""
        response = client.get("/redoc")

        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
