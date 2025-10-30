"""
S3 Service
Downloads IFC files from MinIO/S3 for processing
"""
import logging
import os
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class S3Error(Exception):
    """Custom exception for S3 errors"""
    pass


def get_s3_client():
    """
    Get configured S3 client (MinIO or AWS).

    Returns:
        boto3 S3 client
    """
    return boto3.client(
        's3',
        endpoint_url=os.getenv('S3_ENDPOINT', 'http://localhost:9000'),
        aws_access_key_id=os.getenv('S3_ACCESS_KEY_ID', 'minioadmin'),
        aws_secret_access_key=os.getenv('S3_SECRET_ACCESS_KEY', 'minioadmin'),
        region_name=os.getenv('S3_REGION', 'us-east-1'),
    )


def download_file_from_s3(s3_key: str, local_path: str) -> str:
    """
    Download file from S3 to local filesystem.

    Args:
        s3_key: S3 object key
        local_path: Local filesystem path to save file

    Returns:
        Local file path

    Raises:
        S3Error: If download fails
    """
    bucket = os.getenv('S3_BUCKET', 'ifc-raw')
    s3_client = get_s3_client()

    try:
        logger.info(f"Downloading {s3_key} from S3 bucket {bucket}")

        s3_client.download_file(bucket, s3_key, local_path)

        logger.info(f"Downloaded to {local_path}")
        return local_path

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        logger.error(f"S3 download error ({error_code}): {e}")

        if error_code == 'NoSuchKey':
            raise S3Error(f"File not found in S3: {s3_key}")
        elif error_code == 'AccessDenied':
            raise S3Error(f"Access denied to S3 file: {s3_key}")
        else:
            raise S3Error(f"Failed to download from S3: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error downloading from S3: {e}")
        raise S3Error(f"Unexpected error: {str(e)}")


def file_exists_in_s3(s3_key: str) -> bool:
    """
    Check if file exists in S3.

    Args:
        s3_key: S3 object key

    Returns:
        True if file exists, False otherwise
    """
    bucket = os.getenv('S3_BUCKET', 'ifc-raw')
    s3_client = get_s3_client()

    try:
        s3_client.head_object(Bucket=bucket, Key=s3_key)
        return True
    except ClientError as e:
        if e.response.get('Error', {}).get('Code') == '404':
            return False
        raise