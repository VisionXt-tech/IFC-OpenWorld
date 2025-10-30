"""
Celery Worker for IFC Processing
Main task that orchestrates IFC file download, parsing, and database update
"""
import logging
import os
import tempfile
from celery import Celery, Task
from celery.utils.log import get_task_logger

from app.services.s3_service import download_file_from_s3, S3Error
from app.services.ifc_parser import extract_coordinates_from_ifc, extract_metadata_from_ifc, IFCParserError
from app.services.database import update_processing_result, mark_processing_failed, DatabaseError

# Configure logging
logger = get_task_logger(__name__)

# Initialize Celery app
app = Celery('ifc_processor')
app.config_from_object('celeryconfig')


class CallbackTask(Task):
    """
    Custom Task class with callbacks for task lifecycle events
    """
    def on_success(self, retval, task_id, args, kwargs):
        logger.info(f"Task {task_id} completed successfully")

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Task {task_id} failed: {exc}")


@app.task(
    name='app.workers.ifc_processing.process_ifc_file',
    base=CallbackTask,
    bind=True,
    max_retries=3,
    default_retry_delay=60,  # Retry after 60 seconds
)
def process_ifc_file(self, file_id: str, s3_key: str):
    """
    Process IFC file: download, extract coordinates, update database.

    This is the main Celery task that:
    1. Downloads IFC file from S3/MinIO
    2. Extracts coordinates using IfcOpenShell
    3. Extracts building metadata
    4. Updates database with results

    Args:
        file_id: UUID of the file record in database
        s3_key: S3 object key for the file

    Returns:
        Dictionary with processing results
    """
    logger.info(f"Starting IFC processing for file {file_id}, s3_key={s3_key}")

    local_file_path = None

    try:
        # Step 1: Download file from S3
        logger.info("Step 1: Downloading file from S3")

        with tempfile.NamedTemporaryFile(suffix='.ifc', delete=False) as tmp_file:
            local_file_path = tmp_file.name

        download_file_from_s3(s3_key, local_file_path)
        logger.info(f"Downloaded to {local_file_path}")

        # Step 2: Extract coordinates
        logger.info("Step 2: Extracting coordinates from IFC")

        latitude, longitude = extract_coordinates_from_ifc(local_file_path)
        logger.info(f"Extracted coordinates: lat={latitude}, lon={longitude}")

        # Step 3: Extract metadata
        logger.info("Step 3: Extracting metadata from IFC")

        metadata = extract_metadata_from_ifc(local_file_path)
        logger.info(f"Extracted metadata: {metadata}")

        # Step 4: Update database
        logger.info("Step 4: Updating database with results")

        update_processing_result(file_id, latitude, longitude, metadata)
        logger.info("Database updated successfully")

        # Success!
        result = {
            'status': 'completed',
            'file_id': file_id,
            'coordinates': {
                'latitude': latitude,
                'longitude': longitude,
            },
            'metadata': metadata,
        }

        logger.info(f"Processing completed successfully: {result}")
        return result

    except S3Error as e:
        error_msg = f"S3 download error: {str(e)}"
        logger.error(error_msg)
        mark_processing_failed(file_id, error_msg)

        # Retry on S3 errors (might be temporary)
        raise self.retry(exc=e, countdown=60)

    except IFCParserError as e:
        error_msg = f"IFC parsing error: {str(e)}"
        logger.error(error_msg)
        mark_processing_failed(file_id, error_msg)

        # Don't retry on parsing errors (file is invalid)
        return {
            'status': 'failed',
            'file_id': file_id,
            'error': error_msg,
        }

    except DatabaseError as e:
        error_msg = f"Database error: {str(e)}"
        logger.error(error_msg)

        # Retry on database errors (might be temporary)
        raise self.retry(exc=e, countdown=60)

    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)
        mark_processing_failed(file_id, error_msg)

        # Retry on unexpected errors
        raise self.retry(exc=e, countdown=60)

    finally:
        # Cleanup: delete temporary file
        if local_file_path and os.path.exists(local_file_path):
            try:
                os.unlink(local_file_path)
                logger.info(f"Cleaned up temporary file: {local_file_path}")
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file: {e}")


@app.task(name='app.workers.ifc_processing.health_check')
def health_check():
    """
    Simple health check task for monitoring.

    Returns:
        Dictionary with status
    """
    return {
        'status': 'healthy',
        'worker': 'ifc_processor',
    }