"""
Database Service
Handles PostgreSQL operations for IFC processing results
"""
import logging
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class DatabaseError(Exception):
    """Custom exception for database errors"""
    pass


def get_database_connection():
    """
    Get PostgreSQL database connection from environment variable.

    Returns:
        psycopg2 connection object
    """
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise DatabaseError("DATABASE_URL environment variable not set")

    try:
        conn = psycopg2.connect(database_url)
        return conn
    except psycopg2.Error as e:
        logger.error(f"Database connection error: {e}")
        raise DatabaseError(f"Failed to connect to database: {str(e)}")


def update_processing_result(
    file_id: str,
    latitude: float,
    longitude: float,
    metadata: Dict[str, Any]
) -> None:
    """
    Update ifc_files table with processing results and create building record.

    Args:
        file_id: UUID of the file record
        latitude: Building latitude
        longitude: Building longitude
        metadata: Building metadata (name, address, height, etc.)

    Raises:
        DatabaseError: If update fails
    """
    conn = None
    try:
        conn = get_database_connection()
        cur = conn.cursor()

        # Update ifc_files table: mark as completed
        logger.info(f"Updating file {file_id} processing status")

        cur.execute(
            """
            UPDATE ifc_files
            SET processing_status = 'completed',
                updated_at = NOW()
            WHERE id = %s
            """,
            (file_id,)
        )

        # Create building record with PostGIS geometry
        logger.info(f"Creating building record at ({latitude}, {longitude})")

        cur.execute(
            """
            INSERT INTO buildings (
                ifc_file_id,
                name,
                address,
                city,
                country,
                height,
                floor_count,
                location,
                created_at,
                updated_at
            ) VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
                NOW(),
                NOW()
            )
            RETURNING id
            """,
            (
                file_id,
                metadata.get('name', 'Unknown Building'),
                metadata.get('address'),
                metadata.get('city'),
                metadata.get('country'),
                metadata.get('height'),
                metadata.get('floorCount'),
                longitude,  # PostGIS uses (longitude, latitude) order
                latitude,
            )
        )

        building_id = cur.fetchone()[0]
        logger.info(f"Created building {building_id}")

        conn.commit()
        logger.info("Database update successful")

    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {e}")
        raise DatabaseError(f"Failed to update database: {str(e)}")
    finally:
        if conn:
            conn.close()


def mark_processing_failed(file_id: str, error_message: str) -> None:
    """
    Mark file processing as failed with error message.

    Args:
        file_id: UUID of the file record
        error_message: Error description

    Raises:
        DatabaseError: If update fails
    """
    conn = None
    try:
        conn = get_database_connection()
        cur = conn.cursor()

        logger.info(f"Marking file {file_id} as failed: {error_message}")

        cur.execute(
            """
            UPDATE ifc_files
            SET processing_status = 'failed',
                error_message = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (error_message, file_id)
        )

        conn.commit()
        logger.info("Marked processing as failed")

    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {e}")
        raise DatabaseError(f"Failed to mark as failed: {str(e)}")
    finally:
        if conn:
            conn.close()


def get_file_info(file_id: str) -> Optional[Dict[str, Any]]:
    """
    Get file information from database.

    Args:
        file_id: UUID of the file record

    Returns:
        Dictionary with file info or None if not found
    """
    conn = None
    try:
        conn = get_database_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute(
            """
            SELECT id, file_name, s3_key, upload_status, processing_status
            FROM ifc_files
            WHERE id = %s
            """,
            (file_id,)
        )

        result = cur.fetchone()
        return dict(result) if result else None

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return None
    finally:
        if conn:
            conn.close()