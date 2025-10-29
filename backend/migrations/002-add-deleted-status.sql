-- Migration 002: Add 'deleted' status to upload_status enum
-- Date: 2025-10-29
-- Purpose: Support auto-cleanup feature for development mode

-- Add 'deleted' value to upload_status enum
ALTER TYPE upload_status ADD VALUE IF NOT EXISTS 'deleted';

-- Verify the enum has all values
-- Expected values: pending, completed, failed, deleted
SELECT enum_range(NULL::upload_status);
