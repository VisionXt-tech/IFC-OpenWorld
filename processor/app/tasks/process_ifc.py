"""
Celery tasks for IFC file processing
"""

import logging
import os
import tempfile
from typing import Dict, Any
import psycopg2
from celery import Celery
from ..config import get_settings
from ..services.ifc_parser import parse_ifc_file

settings = get_settings()
logger = logging.getLogger(__name__)

# Initialize Celery app
celery_app = Celery(
    "ifc_processor",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.processing_timeout_seconds,
    task_soft_time_limit=settings.processing_timeout_seconds - 30,
)


@celery_app.task(bind=True, name="process_ifc_file")
def process_ifc_file(self, file_id: str, s3_key: str) -> Dict[str, Any]:
    """
    Process IFC file: download from S3, extract coordinates, update database

    Args:
        self: Celery task instance (for retry/status updates)
        file_id: Database ID of the IFC file record
        s3_key: S3 key where file is stored

    Returns:
        Dictionary with processing results

    Raises:
        Exception: If processing fails (will be retried by Celery)
    """
    logger.info(f"Starting IFC processing for file_id={file_id}, s3_key={s3_key}")

    # Update database status to 'processing'
    update_file_status(file_id, "processing", "processing")

    try:
        # Step 1: Download file from S3
        local_file_path = download_from_s3(s3_key)
        logger.info(f"Downloaded IFC file to: {local_file_path}")

        # Step 2: Parse IFC file and extract coordinates
        result = parse_ifc_file(local_file_path)
        latitude = result["latitude"]
        longitude = result["longitude"]
        metadata = result["metadata"]

        logger.info(f"Extracted coordinates: lat={latitude}, lon={longitude}")

        # Step 3: Update database with coordinates
        building_id = update_database(file_id, latitude, longitude, metadata)

        # Step 4: Update file processing status to 'completed'
        update_file_status(file_id, "completed", "completed")

        # Step 5: Cleanup temp file
        os.unlink(local_file_path)
        logger.info(f"Cleaned up temp file: {local_file_path}")

        return {
            "status": "success",
            "file_id": file_id,
            "building_id": building_id,
            "latitude": latitude,
            "longitude": longitude,
            "metadata": metadata,
        }

    except Exception as e:
        logger.error(f"IFC processing failed for file_id={file_id}: {e}", exc_info=True)

        # Update database status to 'failed'
        update_file_status(file_id, "completed", "failed", error_message=str(e))

        # Cleanup temp file if it exists
        if "local_file_path" in locals() and os.path.exists(local_file_path):
            os.unlink(local_file_path)

        raise  # Re-raise for Celery retry mechanism


def download_from_s3(s3_key: str) -> str:
    """
    Download file from S3 to temporary local path

    Args:
        s3_key: S3 object key

    Returns:
        Path to downloaded file
    """
    import boto3
    from botocore.client import Config

    # Initialize S3 client
    s3_client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )

    # Create temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".ifc") as temp_file:
        temp_path = temp_file.name

    # Download from S3
    s3_client.download_file(settings.s3_bucket, s3_key, temp_path)
    logger.info(f"Downloaded s3://{settings.s3_bucket}/{s3_key} to {temp_path}")

    return temp_path


def update_database(
    file_id: str, latitude: float, longitude: float, metadata: Dict[str, Any]
) -> str:
    """
    Create building record in database with extracted coordinates

    Args:
        file_id: IFC file ID
        latitude: Building latitude
        longitude: Building longitude
        metadata: Building metadata (name, address, etc.)

    Returns:
        Building ID (UUID)
    """
    conn = psycopg2.connect(settings.database_url)
    cursor = conn.cursor()

    try:
        # Insert building record with PostGIS point
        query = """
            INSERT INTO buildings (
                ifc_file_id,
                name,
                address,
                city,
                country,
                height,
                floor_count,
                location
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                ST_GeogFromText(%s)
            )
            RETURNING id
        """

        point_wkt = f"POINT({longitude} {latitude})"

        cursor.execute(
            query,
            (
                file_id,
                metadata.get("name"),
                metadata.get("address"),
                metadata.get("city"),
                metadata.get("country"),
                metadata.get("height"),
                metadata.get("floor_count"),
                point_wkt,
            ),
        )

        building_id = cursor.fetchone()[0]
        conn.commit()

        logger.info(f"Created building record with ID: {building_id}")
        return building_id

    finally:
        cursor.close()
        conn.close()


def update_file_status(
    file_id: str,
    upload_status: str,
    processing_status: str,
    error_message: str = None,
) -> None:
    """
    Update IFC file processing status in database

    Args:
        file_id: IFC file ID
        upload_status: Upload status (pending/completed/failed)
        processing_status: Processing status (not_started/processing/completed/failed)
        error_message: Optional error message for failed status
    """
    conn = psycopg2.connect(settings.database_url)
    cursor = conn.cursor()

    try:
        query = """
            UPDATE ifc_files
            SET upload_status = %s,
                processing_status = %s,
                updated_at = NOW()
            WHERE id = %s
        """

        cursor.execute(query, (upload_status, processing_status, file_id))
        conn.commit()

        logger.info(f"Updated file_id={file_id} status: {processing_status}")

        # Log error if present
        if error_message:
            logger.error(f"Processing error for file_id={file_id}: {error_message}")

    finally:
        cursor.close()
        conn.close()
