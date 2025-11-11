/**
 * File Validation Utilities (VULN-005)
 * Validates file types by checking magic bytes (file signatures)
 * Prevents malicious files disguised with fake extensions
 */

import { logger } from './logger.js';

/**
 * IFC file magic bytes signature
 * IFC files (ISO 10303-21) must start with "ISO-10303-21;"
 * This is the STEP file format header
 */
const IFC_MAGIC_BYTES = 'ISO-10303-21;';

/**
 * Validates if a buffer starts with IFC magic bytes
 * @param buffer - File buffer to validate (first 1KB is sufficient)
 * @returns true if valid IFC file, false otherwise
 */
export function isValidIFCFile(buffer: Buffer): boolean {
  try {
    // Convert first bytes to string
    const header = buffer.toString('utf-8', 0, Math.min(buffer.length, 100));

    // Check if header starts with IFC magic bytes
    // IFC files must start with "ISO-10303-21;"
    const isValid = header.startsWith(IFC_MAGIC_BYTES);

    if (!isValid) {
      logger.warn('Invalid IFC file detected', {
        header: header.substring(0, 50), // Log first 50 chars for debugging
      });
    }

    return isValid;
  } catch (error) {
    logger.error('Failed to validate IFC magic bytes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Validates IFC file from S3
 * Downloads first 1KB of file and checks magic bytes
 * @param s3Key - S3 object key
 * @param s3Service - S3 service instance
 * @returns true if valid IFC file
 */
export async function validateIFCFileFromS3(
  s3Key: string,
  s3Service: any
): Promise<boolean> {
  try {
    // Download first 1KB of file (enough to check header)
    const buffer = await s3Service.getObjectPartial(s3Key, 0, 1024);

    return isValidIFCFile(buffer);
  } catch (error) {
    logger.error('Failed to validate IFC file from S3', {
      s3Key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Additional file type signatures for future expansion
 */
export const FILE_SIGNATURES = {
  IFC: IFC_MAGIC_BYTES,
  // Future: Add other supported formats
  // GLTF: '\u007B\u0022asset\u0022', // {"asset"
  // ZIP: 'PK\x03\x04',
} as const;

/**
 * Get human-readable file type from magic bytes
 * @param buffer - File buffer
 * @returns File type string or 'unknown'
 */
export function detectFileType(buffer: Buffer): string {
  const header = buffer.toString('utf-8', 0, Math.min(buffer.length, 100));

  if (header.startsWith(FILE_SIGNATURES.IFC)) {
    return 'IFC (ISO 10303-21)';
  }

  // Check if it's a text file
  if (/^[\x09\x0A\x0D\x20-\x7E]*$/.test(header)) {
    return 'Text file (unknown format)';
  }

  return 'Unknown binary file';
}
