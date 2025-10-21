import crypto from 'crypto';
import { db, sessions, users } from '../db';
import { eq, and, gte, lt } from 'drizzle-orm';

const SESSION_EXPIRY_HOURS = 24; // Sessions expire after 24 hours of inactivity

class SessionService {
  /**
   * Generate a secure session token
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(48).toString('hex');
  }

  /**
   * Create a new session for a user
   */
  async createSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    const token = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    await db.insert(sessions).values({
      userId,
      token,
      expiresAt,
      userAgent,
      ipAddress,
      lastActivityAt: new Date(),
    });

    return token;
  }

  /**
   * Verify a session token and return user data
   */
  async verifySession(token: string): Promise<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null> {
    try {
      const [session] = await db
        .select({
          session: sessions,
          user: users,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(
          and(
            eq(sessions.token, token),
            gte(sessions.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!session) {
        return null;
      }

      // Update last activity
      await this.updateActivity(token);

      return {
        userId: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
      };
    } catch (error) {
      console.error('Error verifying session:', error);
      return null;
    }
  }

  /**
   * Update last activity time for a session
   */
  async updateActivity(token: string): Promise<void> {
    try {
      const newExpiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

      await db
        .update(sessions)
        .set({
          lastActivityAt: new Date(),
          expiresAt: newExpiresAt, // Extend session on activity
        })
        .where(eq(sessions.token, token));
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSession(token: string): Promise<void> {
    try {
      await db
        .delete(sessions)
        .where(eq(sessions.token, token));
    } catch (error) {
      console.error('Error invalidating session:', error);
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      await db
        .delete(sessions)
        .where(eq(sessions.userId, userId));
    } catch (error) {
      console.error('Error invalidating all user sessions:', error);
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Array<{
    id: string;
    createdAt: Date;
    lastActivityAt: Date;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }>> {
    try {
      const userSessions = await db
        .select({
          id: sessions.id,
          createdAt: sessions.createdAt,
          lastActivityAt: sessions.lastActivityAt,
          expiresAt: sessions.expiresAt,
          userAgent: sessions.userAgent,
          ipAddress: sessions.ipAddress,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, userId),
            gte(sessions.expiresAt, new Date())
          )
        );

      return userSessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const deleted = await db
        .delete(sessions)
        .where(lt(sessions.expiresAt, new Date()));

      return deleted.length || 0;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalActive: number;
    byIP: Record<string, number>;
    byUserAgent: Record<string, number>;
  }> {
    try {
      const activeSessions = await db
        .select()
        .from(sessions)
        .where(gte(sessions.expiresAt, new Date()));

      const byIP: Record<string, number> = {};
      const byUserAgent: Record<string, number> = {};

      activeSessions.forEach(session => {
        if (session.ipAddress) {
          byIP[session.ipAddress] = (byIP[session.ipAddress] || 0) + 1;
        }
        if (session.userAgent) {
          byUserAgent[session.userAgent] = (byUserAgent[session.userAgent] || 0) + 1;
        }
      });

      return {
        totalActive: activeSessions.length,
        byIP,
        byUserAgent,
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        totalActive: 0,
        byIP: {},
        byUserAgent: {},
      };
    }
  }
}

export const sessionService = new SessionService();
export { SESSION_EXPIRY_HOURS };
