/**
 * CSRF Token Endpoint
 * Provides CSRF tokens to clients using double-submit cookie pattern
 */

import { Router, type Request, type Response } from 'express';
import { generateCsrfToken } from '../../middleware/csrf.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * GET /api/v1/csrf-token
 * Returns a fresh CSRF token and sets it as a cookie
 *
 * Double-Submit Cookie Pattern:
 * 1. Server generates cryptographically secure token
 * 2. Sets token as cookie (httpOnly=false so client can read it)
 * 3. Returns token in response body
 * 4. Client must include token in X-CSRF-Token header for state-changing requests
 *
 * Usage (frontend):
 * ```typescript
 * const response = await fetch('/api/v1/csrf-token');
 * const { csrfToken } = await response.json();
 *
 * // Include in subsequent requests
 * fetch('/api/v1/upload/request', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-CSRF-Token': csrfToken
 *   },
 *   body: JSON.stringify(data)
 * });
 * ```
 */
router.get('/csrf-token', generateCsrfToken, (req: Request, res: Response): void => {
  try {
    const token = res.locals['csrfToken'] as string | undefined;

    if (!token) {
      logger.error('CSRF token not generated');
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate CSRF token',
      });
      return;
    }

    logger.debug('CSRF token provided to client', {
      ip: req.ip,
    });

    res.status(200).json({
      csrfToken: token,
      expiresIn: 3600, // 1 hour in seconds
    });
  } catch (error) {
    logger.error('CSRF token endpoint failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'Internal Server Error',
    });
  }
});

export { router as csrfRouter };
