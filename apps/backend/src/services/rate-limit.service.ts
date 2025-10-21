import { db, loginAttempts } from '../db';
import { and, eq, gte } from 'drizzle-orm';

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  lockoutMinutes: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMinutes: 15,
  lockoutMinutes: 30,
};

class RateLimitService {
  /**
   * Record a login attempt (success or failure)
   */
  async recordLoginAttempt(
    email: string,
    ipAddress: string,
    success: boolean,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.insert(loginAttempts).values({
        email,
        ipAddress,
        userAgent,
        success,
      });
    } catch (error) {
      console.error('Error recording login attempt:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Check if an email or IP address is rate limited
   */
  async isRateLimited(
    email: string,
    ipAddress: string,
    config: RateLimitConfig = DEFAULT_RATE_LIMIT
  ): Promise<{ limited: boolean; remainingAttempts: number; resetTime?: Date }> {
    const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

    try {
      // Get failed attempts for this email within the time window
      const emailAttempts = await db
        .select()
        .from(loginAttempts)
        .where(
          and(
            eq(loginAttempts.email, email),
            eq(loginAttempts.success, false),
            gte(loginAttempts.attemptedAt, windowStart)
          )
        );

      // Get failed attempts for this IP address within the time window
      const ipAttempts = await db
        .select()
        .from(loginAttempts)
        .where(
          and(
            eq(loginAttempts.ipAddress, ipAddress),
            eq(loginAttempts.success, false),
            gte(loginAttempts.attemptedAt, windowStart)
          )
        );

      const emailFailedCount = emailAttempts.length;
      const ipFailedCount = ipAttempts.length;

      // Rate limit if either email or IP has too many failed attempts
      if (emailFailedCount >= config.maxAttempts || ipFailedCount >= config.maxAttempts) {
        const resetTime = new Date(Date.now() + config.lockoutMinutes * 60 * 1000);
        return {
          limited: true,
          remainingAttempts: 0,
          resetTime,
        };
      }

      const maxFailed = Math.max(emailFailedCount, ipFailedCount);
      const remaining = config.maxAttempts - maxFailed;

      return {
        limited: false,
        remainingAttempts: remaining,
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Fail open (don't block) if there's a database error
      return {
        limited: false,
        remainingAttempts: config.maxAttempts,
      };
    }
  }

  /**
   * Clear login attempts for an email (e.g., after successful login)
   */
  async clearLoginAttempts(email: string, ipAddress?: string): Promise<void> {
    try {
      const windowStart = new Date(Date.now() - 60 * 60 * 1000); // Clear last hour

      if (ipAddress) {
        // Clear for both email and IP
        await db
          .delete(loginAttempts)
          .where(
            and(
              eq(loginAttempts.email, email),
              eq(loginAttempts.ipAddress, ipAddress),
              gte(loginAttempts.attemptedAt, windowStart)
            )
          );
      } else {
        // Clear for email only
        await db
          .delete(loginAttempts)
          .where(
            and(
              eq(loginAttempts.email, email),
              gte(loginAttempts.attemptedAt, windowStart)
            )
          );
      }
    } catch (error) {
      console.error('Error clearing login attempts:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Clean up old login attempts (should be run periodically)
   */
  async cleanupOldAttempts(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const deleted = await db
        .delete(loginAttempts)
        .where(gte(loginAttempts.attemptedAt, cutoffDate));

      return deleted.length || 0;
    } catch (error) {
      console.error('Error cleaning up old attempts:', error);
      return 0;
    }
  }

  /**
   * Get login attempt statistics for an email
   */
  async getLoginStats(email: string, days: number = 7): Promise<{
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    recentIPs: string[];
  }> {
    try {
      const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const attempts = await db
        .select()
        .from(loginAttempts)
        .where(
          and(
            eq(loginAttempts.email, email),
            gte(loginAttempts.attemptedAt, windowStart)
          )
        );

      const successful = attempts.filter(a => a.success).length;
      const failed = attempts.filter(a => !a.success).length;
      const uniqueIPs = [...new Set(attempts.map(a => a.ipAddress))];

      return {
        totalAttempts: attempts.length,
        successfulAttempts: successful,
        failedAttempts: failed,
        recentIPs: uniqueIPs,
      };
    } catch (error) {
      console.error('Error getting login stats:', error);
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        recentIPs: [],
      };
    }
  }
}

export const rateLimitService = new RateLimitService();
export { RateLimitConfig };
