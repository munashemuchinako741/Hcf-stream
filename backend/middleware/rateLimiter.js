'use strict';

/**
 * Centralized, Redis-backed rate limiting for the API.
 *
 * Uses express-rate-limit + rate-limit-redis.
 * - One Redis store per limiter (via unique prefixes) to avoid ERR_ERL_DOUBLE_COUNT.
 * - Skips internal/health traffic.
 * - Returns structured JSON error responses with standard RateLimit-* headers.
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const redisClient = require('../config/redis');

/**
 * Factory to create a Redis-backed rate limiter.
 *
 * IMPORTANT:
 *  - Each limiter MUST have a unique `storePrefix` to avoid
 *    "ERR_ERL_DOUBLE_COUNT" when multiple limiters are applied
 *    to the same request (e.g. apiLimiter + authLimiter).
 *
 * @param {Object} options
 * @param {number} options.windowMs   Time window in ms (e.g. 15 * 60 * 1000)
 * @param {number} options.limit      Max requests per IP in the window
 * @param {string} options.message    User-facing error message
 * @param {string} options.storePrefix Redis key prefix for this limiter
 * @returns {import('express').RequestHandler}
 */
function createRateLimiter({ windowMs, limit, message, storePrefix }) {
  return rateLimit({
    /**
     * Redis store configuration
     * Uses a shared redisClient, but separate keyspaces via `prefix`.
     */
    store: new RedisStore({
      // express-rate-limit v7+ expects a sendCommand function
      // that forwards raw Redis commands.
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: storePrefix, // UNIQUE per limiter (e.g. "rl:api:", "rl:auth:")
    }),

    // Time window for counting requests
    windowMs,

    // Maximum number of requests per IP in the given window
    // NOTE: In newer versions this option is called `limit` (alias for `max`).
    limit,

    // Standardized response body when limit is exceeded
    message: {
      error: message,
    },

    /**
     * Use standardized RateLimit headers.
     * - RateLimit-Limit
     * - RateLimit-Remaining
     * - RateLimit-Reset
     */
    standardHeaders: true,

    // Disable legacy X-RateLimit-* headers for cleaner responses
    legacyHeaders: false,

    /**
     * Custom handler for when the rate limit is exceeded.
     * This gives you consistent JSON across the API and a hook
     * for logging or observability.
     */
    handler: (req, res, next, options) => {
      // You can plug this into your logger (e.g. Winston, pino, etc.)
      console.warn(
        `[RateLimit] ${req.ip} blocked on ${req.method} ${req.originalUrl} | ` +
          `limit=${options.limit} windowMs=${options.windowMs}`
      );

      res.status(options.statusCode).json({
        error: message,
        // Optional extra metadata
        statusCode: options.statusCode,
        // Retry-After is automatically set by express-rate-limit when standardHeaders = true
        retryAfter: res.getHeader('Retry-After'),
      });
    },

    /**
     * Skip function: decide which requests should bypass rate limiting.
     * - Health/monitoring endpoints
     * - Localhost/dev requests, if desired
     */
    skip: (req) => {
      const isHealthCheck =
        req.path === '/health' ||
        req.path === '/healthz' ||
        req.path === '/livez' ||
        req.path === '/readyz';

      // NOTE: In production, you'll typically run behind a proxy.
      // Make sure `app.set('trust proxy', 1)` is set in your Express app
      // so req.ip is the REAL client IP (not the load balancer).
      const isLocalhost =
        req.ip === '127.0.0.1' ||
        req.ip === '::1' ||
        req.ip === '::ffff:127.0.0.1';

      return isHealthCheck || isLocalhost;
    },

    /**
     * Additional safety validations.
     * Keep `singleCount` enabled so double-counting issues are surfaced,
     * then prevent them via unique prefixes and correct mounting (see below).
     */
    validate: {
      singleCount: true,
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Rate limiter instances                                            */
/* ------------------------------------------------------------------ */

// General API limiter – applies to most API traffic
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 requests per IP per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  storePrefix: 'rl:api:', // MUST be unique
});

// Stricter limiter for authentication endpoints (login, register, etc.)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 auth requests per IP per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  storePrefix: 'rl:auth:', // MUST be unique
});

// Limiter for static assets (optional; use if static is served via Express)
const staticLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 500, // 500 static requests per IP per hour
  message: 'Too many static asset requests, please try again later.',
  storePrefix: 'rl:static:', // MUST be unique
});

module.exports = {
  apiLimiter,
  authLimiter,
  staticLimiter,
};
