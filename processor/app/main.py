"""
IFC Processor Service - FastAPI application
"""

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
import logging
from .config import get_settings
from .tasks.process_ifc import process_ifc_file

# Initialize settings
settings = get_settings()

# Configure logging
logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="IFC Processor Service",
    description="Microservice for processing IFC files and extracting geographical coordinates",
    version="1.0.0",
)


# Request/Response models
class ProcessIFCRequest(BaseModel):
    """Request to process IFC file"""

    file_id: str = Field(..., description="Database ID of IFC file record")
    s3_key: str = Field(..., description="S3 key where IFC file is stored")


class ProcessIFCResponse(BaseModel):
    """Response after queueing IFC processing task"""

    task_id: str = Field(..., description="Celery task ID for tracking")
    status: str = Field(..., description="Task status (queued)")
    file_id: str = Field(..., description="IFC file ID")


class HealthResponse(BaseModel):
    """Health check response"""

    status: str
    service: str
    environment: str


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint

    Returns service status and configuration
    """
    return HealthResponse(
        status="healthy",
        service=settings.service_name,
        environment=settings.environment,
    )


@app.post(
    "/process",
    response_model=ProcessIFCResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Processing"],
)
async def process_ifc(request: ProcessIFCRequest):
    """
    Queue IFC file for processing

    This endpoint adds the IFC file to the Celery task queue for asynchronous processing.
    The actual processing happens in the background worker.

    Processing steps:
    1. Download IFC file from S3
    2. Parse IFC and extract IfcSite coordinates
    3. Extract building metadata (name, address, floors, etc.)
    4. Create building record in database with PostGIS coordinates
    5. Update file processing status

    Args:
        request: ProcessIFCRequest with file_id and s3_key

    Returns:
        ProcessIFCResponse with task_id for tracking

    Raises:
        HTTPException: If task queueing fails
    """
    try:
        # Queue Celery task
        task = process_ifc_file.delay(request.file_id, request.s3_key)

        logger.info(f"Queued IFC processing task: {task.id} for file_id={request.file_id}")

        return ProcessIFCResponse(
            task_id=task.id,
            status="queued",
            file_id=request.file_id,
        )

    except Exception as e:
        logger.error(f"Failed to queue IFC processing task: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue processing task: {str(e)}",
        )


@app.get("/task/{task_id}", tags=["Processing"])
async def get_task_status(task_id: str):
    """
    Get status of processing task

    Args:
        task_id: Celery task ID returned from /process endpoint

    Returns:
        Task status information

    Raises:
        HTTPException: If task not found
    """
    from celery.result import AsyncResult
    from .tasks.process_ifc import celery_app

    try:
        result = AsyncResult(task_id, app=celery_app)

        if result.state == "PENDING":
            response = {
                "task_id": task_id,
                "state": result.state,
                "status": "Task is waiting in queue",
            }
        elif result.state == "STARTED":
            response = {
                "task_id": task_id,
                "state": result.state,
                "status": "Task is currently processing",
            }
        elif result.state == "SUCCESS":
            response = {
                "task_id": task_id,
                "state": result.state,
                "status": "Task completed successfully",
                "result": result.result,
            }
        elif result.state == "FAILURE":
            response = {
                "task_id": task_id,
                "state": result.state,
                "status": "Task failed",
                "error": str(result.info),
            }
        else:
            response = {
                "task_id": task_id,
                "state": result.state,
                "status": f"Task is in state: {result.state}",
            }

        return response

    except Exception as e:
        logger.error(f"Failed to get task status for {task_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task not found: {task_id}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower(),
    )
