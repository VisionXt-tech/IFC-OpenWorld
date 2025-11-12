/**
 * Rate limiting middleware
 * Prevents abuse by limiting requests per IP address
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Global rate limiter: 100 requests per 15 minutes per IP
 * Constitution §2.2: Non-functional requirement NFR-009
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (_req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: _req.ip,
      path: _req.path,
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 60000} minutes.`,
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000), // seconds
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/api/v1/health';
  },
});

/**
 * Strict rate limiter for upload endpoints: 10 requests per hour per IP
 * Prevents abuse of expensive file upload operations
 * SECURITY: Protects against storage exhaustion attacks (VULN-004)
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Production-safe limit
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    logger.warn('Upload rate limit exceeded', {
      ip: _req.ip,
      path: _req.path,
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Upload rate limit exceeded. Maximum 10 uploads per hour.',
      retryAfter: 3600, // 1 hour in seconds
    });
  },
});
