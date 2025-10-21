import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db, refreshTokens, rememberMeTokens, sessions } from '../db';
import { eq, and, gte, lt } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access tokens
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // Refresh tokens last 7 days
const REMEMBER_ME_EXPIRY_DAYS = 30; // Remember me tokens last 30 days

interface TokenPayload {
  userId: string;
  email: string;
  type?: string;
}

class TokenService {
  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate JWT access token (short-lived)
   */
  generateAccessToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, type: 'access' },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Generate JWT refresh token and store in database
   */
  async generateRefreshToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
      userId,
      token,
      expiresAt,
      userAgent,
      ipAddress,
      isRevoked: false,
    });

    return token;
  }

  /**
   * Generate remember me token and store in database
   */
  async generateRememberMeToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + REMEMBER_ME_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await db.insert(rememberMeTokens).values({
      userId,
      token,
      expiresAt,
      userAgent,
      ipAddress,
    });

    return token;
  }

  /**
   * Verify and decode JWT access token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      if (decoded.type !== 'access') {
        return null;
      }
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token from database
   */
  async verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
    try {
      const [refreshToken] = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.token, token),
            eq(refreshTokens.isRevoked, false),
            gte(refreshTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!refreshToken) {
        return null;
      }

      return { userId: refreshToken.userId };
    } catch (error) {
      console.error('Error verifying refresh token:', error);
      return null;
    }
  }

  /**
   * Verify remember me token from database
   */
  async verifyRememberMeToken(token: string): Promise<{ userId: string } | null> {
    try {
      const [rememberToken] = await db
        .select()
        .from(rememberMeTokens)
        .where(
          and(
            eq(rememberMeTokens.token, token),
            gte(rememberMeTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!rememberToken) {
        return null;
      }

      return { userId: rememberToken.userId };
    } catch (error) {
      console.error('Error verifying remember me token:', error);
      return null;
    }
  }

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      await db
        .update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.token, token));
    } catch (error) {
      console.error('Error revoking refresh token:', error);
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    try {
      await db
        .update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.userId, userId));
    } catch (error) {
      console.error('Error revoking all refresh tokens:', error);
    }
  }

  /**
   * Delete a remember me token
   */
  async deleteRememberMeToken(token: string): Promise<void> {
    try {
      await db
        .delete(rememberMeTokens)
        .where(eq(rememberMeTokens.token, token));
    } catch (error) {
      console.error('Error deleting remember me token:', error);
    }
  }

  /**
   * Delete all remember me tokens for a user
   */
  async deleteAllRememberMeTokens(userId: string): Promise<void> {
    try {
      await db
        .delete(rememberMeTokens)
        .where(eq(rememberMeTokens.userId, userId));
    } catch (error) {
      console.error('Error deleting all remember me tokens:', error);
    }
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<{
    refreshTokens: number;
    rememberMeTokens: number;
  }> {
    const now = new Date();

    try {
      const expiredRefresh = await db
        .delete(refreshTokens)
        .where(lt(refreshTokens.expiresAt, now));

      const expiredRememberMe = await db
        .delete(rememberMeTokens)
        .where(lt(rememberMeTokens.expiresAt, now));

      return {
        refreshTokens: expiredRefresh.length || 0,
        rememberMeTokens: expiredRememberMe.length || 0,
      };
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      return {
        refreshTokens: 0,
        rememberMeTokens: 0,
      };
    }
  }

  /**
   * Get all active refresh tokens for a user
   */
  async getUserRefreshTokens(userId: string): Promise<Array<{
    id: string;
    createdAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }>> {
    try {
      const tokens = await db
        .select({
          id: refreshTokens.id,
          createdAt: refreshTokens.createdAt,
          userAgent: refreshTokens.userAgent,
          ipAddress: refreshTokens.ipAddress,
        })
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.userId, userId),
            eq(refreshTokens.isRevoked, false),
            gte(refreshTokens.expiresAt, new Date())
          )
        );

      return tokens;
    } catch (error) {
      console.error('Error getting user refresh tokens:', error);
      return [];
    }
  }
}

export const tokenService = new TokenService();
export { TokenPayload, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY_DAYS, REMEMBER_ME_EXPIRY_DAYS };
