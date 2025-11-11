/**
 * CSRF Protection Middleware (VULN-001)
 * Custom implementation using double-submit cookie pattern
 * Recommended by OWASP as modern, stateless CSRF protection
 */

import { randomBytes, timingSafeEqual } from 'crypto';
import { type Request, type Response, type NextFunction } from 'express';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32; // 32 bytes = 256 bits

/**
 * Generate cryptographically secure CSRF token
 */
function generateToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('base64url');
}

/**
 * Safely compare two tokens (timing-safe to prevent timing attacks)
 */
function tokensMatch(token1: string | undefined, token2: string | undefined): boolean {
  if (!token1 || !token2) {
    return false;
  }

  // Convert to buffers for timing-safe comparison
  try {
    const buf1 = Buffer.from(token1, 'base64url');
    const buf2 = Buffer.from(token2, 'base64url');

    // Buffers must be same length
    if (buf1.length !== buf2.length) {
      return false;
    }

    return timingSafeEqual(buf1, buf2);
  } catch {
    return false;
  }
}

/**
 * Middleware to generate and attach CSRF token
 * Call this on routes that need to provide a token (e.g., GET /csrf-token)
 */
export function generateCsrfToken(req: Request, res: Response, next: NextFunction): void {
  try {
    // Generate new token
    const token = generateToken();

    // Set cookie (httpOnly=false so client JS can read it)
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Client needs to read this
      secure: config.server.env === 'production', // HTTPS only in production
      sameSite: 'strict', // Strong CSRF protection
      maxAge: 3600000, // 1 hour
      path: '/',
    });

    // Also attach to response locals for endpoint to return
    res.locals['csrfToken'] = token;

    logger.debug('CSRF token generated', {
      ip: req.ip,
    });

    next();
  } catch (error) {
    logger.error('Failed to generate CSRF token', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
}

/**
 * Middleware to validate CSRF token
 * Apply this to state-changing routes (POST, PUT, DELETE, PATCH)
 *
 * Double-Submit Cookie Pattern:
 * 1. Token must be in cookie (set by server)
 * 2. Token must be in header (sent by client)
 * 3. Both tokens must match
 */
export function validateCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Skip validation for safe methods
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  try {
    // Get token from cookie
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;

    // Get token from header (primary method)
    let headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

    // Fallback: check alternative header name
    if (!headerToken) {
      headerToken = req.headers['csrf-token'] as string | undefined;
    }

    // Validate tokens exist
    if (!cookieToken) {
      logger.warn('CSRF validation failed: missing cookie', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(403).json({
        error: 'CSRF Token Missing',
        message: 'CSRF token not found in cookie. Please refresh the page.',
        code: 'CSRF_COOKIE_MISSING',
      });
      return;
    }

    if (!headerToken) {
      logger.warn('CSRF validation failed: missing header', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(403).json({
        error: 'CSRF Token Missing',
        message: 'CSRF token not found in request header.',
        code: 'CSRF_HEADER_MISSING',
      });
      return;
    }

    // Validate tokens match (timing-safe comparison)
    if (!tokensMatch(cookieToken, headerToken)) {
      logger.warn('CSRF validation failed: token mismatch', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(403).json({
        error: 'Invalid CSRF Token',
        message: 'CSRF token validation failed. Please refresh the page and try again.',
        code: 'CSRF_TOKEN_MISMATCH',
      });
      return;
    }

    logger.debug('CSRF validation successful', {
      ip: req.ip,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error('CSRF validation error', {
      ip: req.ip,
      path: req.path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'CSRF validation failed due to server error.',
    });
    return;
  }
}

/**
 * Error handler for CSRF validation failures
 * Place this before the global error handler
 */
export function csrfErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if error is CSRF-related
  if (
    err.code === 'EBADCSRFTOKEN' ||
    err.message?.includes('CSRF') ||
    err.message?.includes('csrf')
  ) {
    logger.warn('CSRF error handler triggered', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      error: err.message,
    });

    res.status(403).json({
      error: 'Invalid CSRF Token',
      message: 'CSRF token validation failed. Please refresh the page and try again.',
      code: 'CSRF_VALIDATION_FAILED',
    });
    return;
  }

  // Not a CSRF error, pass to next handler
  next(err);
}
