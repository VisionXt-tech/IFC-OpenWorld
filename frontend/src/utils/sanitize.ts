/**
 * Sanitization utilities for XSS protection (VULN-003)
 * Uses DOMPurify to clean user-generated content
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param dirty - Potentially dangerous HTML/text string
 * @returns Sanitized safe string
 */
export function sanitizeHTML(dirty: string | null | undefined): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    KEEP_CONTENT: true, // Keep text content
  });
}

/**
 * Sanitize building name for display
 * Removes all HTML tags and dangerous characters
 * @param name - Building name from IFC file
 * @returns Safe string for display
 */
export function sanitizeBuildingName(name: string | null | undefined): string {
  if (!name) return 'Unnamed Building';

  // First sanitize HTML
  const cleaned = sanitizeHTML(name);

  // Remove potentially dangerous characters
  const safe = cleaned
    .replace(/[<>'"]/g, '') // Remove quotes and brackets
    .trim();

  return safe || 'Unnamed Building';
}

/**
 * Sanitize text for use in Cesium labels
 * Extra strict as Cesium renders text directly
 * @param text - Text to sanitize
 * @returns Safe string
 */
export function sanitizeCesiumLabel(text: string | null | undefined): string {
  if (!text) return '';

  return sanitizeHTML(text)
    .replace(/[<>'"{}]/g, '') // Remove dangerous chars
    .substring(0, 100); // Limit length
}
