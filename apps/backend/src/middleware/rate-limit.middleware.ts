import { Context, Next } from 'hono';
import { rateLimitService, RateLimitConfig } from '../services/rate-limit.service';

/**
 * Rate limiting middleware for Hono
 * Prevents brute force attacks by limiting login attempts
 */
export function rateLimitMiddleware(config?: Partial<RateLimitConfig>) {
  const fullConfig: RateLimitConfig = {
    maxAttempts: config?.maxAttempts ?? 5,
    windowMinutes: config?.windowMinutes ?? 15,
    lockoutMinutes: config?.lockoutMinutes ?? 30,
  };

  return async (c: Context, next: Next) => {
    // Extract email from request body
    const body = await c.req.json().catch(() => ({}));
    const email = body.email;

    if (!email) {
      // If no email, skip rate limiting (not a login attempt)
      return next();
    }

    // Get client IP address
    const ipAddress = c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
                      c.req.header('x-real-ip') ||
                      'unknown';

    // Check if rate limited
    const { limited, remainingAttempts, resetTime } = await rateLimitService.isRateLimited(
      email,
      ipAddress,
      fullConfig
    );

    if (limited) {
      const retryAfterMinutes = fullConfig.lockoutMinutes;
      const retryAfterSeconds = retryAfterMinutes * 60;

      return c.json(
        {
          error: 'Too many failed login attempts',
          message: `Account temporarily locked. Please try again in ${retryAfterMinutes} minutes.`,
          retryAfter: resetTime?.toISOString(),
        },
        429, // Too Many Requests
        {
          'Retry-After': retryAfterSeconds.toString(),
          'X-RateLimit-Limit': fullConfig.maxAttempts.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime?.toISOString() || '',
        }
      );
    }

    // Add rate limit info to response headers
    c.header('X-RateLimit-Limit', fullConfig.maxAttempts.toString());
    c.header('X-RateLimit-Remaining', remainingAttempts.toString());

    // Continue to route handler
    return next();
  };
}

/**
 * Simplified rate limit middleware with default config
 */
export const rateLimitLogin = rateLimitMiddleware({
  maxAttempts: 5,
  windowMinutes: 15,
  lockoutMinutes: 30,
});

/**
 * Stricter rate limit for password reset
 */
export const rateLimitPasswordReset = rateLimitMiddleware({
  maxAttempts: 3,
  windowMinutes: 60,
  lockoutMinutes: 60,
});
