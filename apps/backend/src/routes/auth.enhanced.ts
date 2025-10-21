import { Hono, Context } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq, and, gte } from 'drizzle-orm';
import { db, users, passwordResetTokens, emailVerificationTokens } from '../db';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { emailService } from '../services/email.service';
import { rateLimitService } from '../services/rate-limit.service';
import { tokenService } from '../services/token.service';
import { sessionService } from '../services/session.service';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

type Variables = {
  user: {
    userId: string;
    email: string;
  };
};

const authRoutes = new Hono<{ Variables: Variables }>();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to extract client info
function getClientInfo(c: Context) {
  const ipAddress = c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
                    c.req.header('x-real-ip') ||
                    'unknown';
  const userAgent = c.req.header('user-agent');
  return { ipAddress, userAgent };
}

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const confirmResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const verifyEmailSchema = z.object({
  token: z.string(),
});

// Sign up with email verification
authRoutes.post('/signup', zValidator('json', signupSchema), async (c) => {
  try {
    const { email, password, firstName, lastName } = c.req.valid('json');
    const { ipAddress, userAgent } = getClientInfo(c);

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      return c.json({ error: 'User with this email already exists' }, 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        authProvider: 'local',
        isEmailVerified: false,
      })
      .returning();

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(emailVerificationTokens).values({
      userId: newUser.id,
      token: verificationToken,
      expiresAt,
    });

    // Send verification email
    await emailService.sendEmail({
      to: newUser.email,
      subject: 'Verify your email - Accounting Platform',
      html: `
        <p>Hello ${firstName},</p>
        <p>Thank you for signing up! Please verify your email by clicking the link below:</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/verify-email?token=${verificationToken}">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create this account, please ignore this email.</p>
      `,
    });

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(newUser.id, newUser.email);
    const refreshToken = await tokenService.generateRefreshToken(newUser.id, userAgent, ipAddress);

    return c.json({
      message: 'Account created successfully. Please check your email to verify your account.',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        isEmailVerified: newUser.isEmailVerified,
      },
      accessToken,
      refreshToken,
    }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Login with rate limiting
authRoutes.post(
  '/login',
  rateLimitMiddleware({ maxAttempts: 5, windowMinutes: 15, lockoutMinutes: 30 }),
  zValidator('json', loginSchema),
  async (c) => {
    try {
      const { email, password, rememberMe } = c.req.valid('json');
      const { ipAddress, userAgent } = getClientInfo(c);

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user || !user.password) {
        // Record failed attempt
        await rateLimitService.recordLoginAttempt(email, ipAddress, false, userAgent);
        return c.json({ error: 'Invalid email or password' }, 401);
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
        return c.json({
          error: 'Account temporarily locked',
          message: `Too many failed login attempts. Please try again in ${minutesRemaining} minutes.`,
        }, 423); // 423 Locked
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        // Increment failed login attempts
        const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
        let lockedUntil = user.lockedUntil;

        // Lock account after 5 failed attempts
        if (newFailedAttempts >= 5) {
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        }

        await db
          .update(users)
          .set({
            failedLoginAttempts: newFailedAttempts,
            lockedUntil,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        // Record failed attempt
        await rateLimitService.recordLoginAttempt(email, ipAddress, false, userAgent);

        return c.json({
          error: 'Invalid email or password',
          attemptsRemaining: Math.max(0, 5 - newFailedAttempts),
        }, 401);
      }

      // Reset failed login attempts on successful login
      await db
        .update(users)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Record successful attempt
      await rateLimitService.recordLoginAttempt(email, ipAddress, true, userAgent);

      // Clear old failed attempts
      await rateLimitService.clearLoginAttempts(email, ipAddress);

      // Generate tokens
      const accessToken = tokenService.generateAccessToken(user.id, user.email);
      const refreshToken = await tokenService.generateRefreshToken(user.id, userAgent, ipAddress);

      // Generate remember me token if requested
      let rememberMeToken;
      if (rememberMe) {
        rememberMeToken = await tokenService.generateRememberMeToken(user.id, userAgent, ipAddress);
      }

      return c.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
        },
        accessToken,
        refreshToken,
        ...(rememberMeToken && { rememberMeToken }),
      });
    } catch (error) {
      console.error('Login error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
);

// Refresh access token
authRoutes.post('/refresh', zValidator('json', refreshTokenSchema), async (c) => {
  try {
    const { refreshToken } = c.req.valid('json');
    const { ipAddress, userAgent } = getClientInfo(c);

    const tokenData = await tokenService.verifyRefreshToken(refreshToken);

    if (!tokenData) {
      return c.json({ error: 'Invalid or expired refresh token' }, 401);
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenData.userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Generate new access token
    const accessToken = tokenService.generateAccessToken(user.id, user.email);

    // Optionally rotate refresh token
    const newRefreshToken = await tokenService.generateRefreshToken(user.id, userAgent, ipAddress);
    await tokenService.revokeRefreshToken(refreshToken);

    return c.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Request password reset with rate limiting
authRoutes.post(
  '/reset-password',
  rateLimitMiddleware({ maxAttempts: 3, windowMinutes: 60, lockoutMinutes: 60 }),
  zValidator('json', resetPasswordSchema),
  async (c) => {
    try {
      const { email } = c.req.valid('json');

      // Find user (don't reveal if user exists)
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (user) {
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Delete any existing reset tokens for this user
        await db
          .delete(passwordResetTokens)
          .where(eq(passwordResetTokens.userId, user.id));

        // Store new reset token
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          token: resetToken,
          expiresAt,
        });

        // Send password reset email
        await emailService.sendPasswordResetEmail(user.email, resetToken);
      }

      // Always return success to prevent email enumeration
      return c.json({
        message: 'If an account with that email exists, we sent a password reset link.',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
);

// Confirm password reset
authRoutes.post(
  '/confirm-reset-password',
  zValidator('json', confirmResetPasswordSchema),
  async (c) => {
    try {
      const { token, password } = c.req.valid('json');

      // Find valid reset token
      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            gte(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!resetToken) {
        return c.json({ error: 'Invalid or expired reset token' }, 400);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update user password and reset failed attempts
      await db
        .update(users)
        .set({
          password: hashedPassword,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, resetToken.userId));

      // Delete used reset token
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));

      // Revoke all existing sessions and tokens for security
      await tokenService.revokeAllRefreshTokens(resetToken.userId);
      await sessionService.invalidateAllUserSessions(resetToken.userId);

      return c.json({ message: 'Password reset successfully. Please login with your new password.' });
    } catch (error) {
      console.error('Confirm reset password error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
);

// Verify email
authRoutes.post('/verify-email', zValidator('json', verifyEmailSchema), async (c) => {
  try {
    const { token } = c.req.valid('json');

    // Find valid verification token
    const [verificationToken] = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.token, token),
          gte(emailVerificationTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!verificationToken) {
      return c.json({ error: 'Invalid or expired verification token' }, 400);
    }

    // Update user email verification status
    await db
      .update(users)
      .set({
        isEmailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, verificationToken.userId));

    // Delete used verification token
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));

    return c.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Resend verification email
authRoutes.post('/resend-verification', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const decoded = tokenService.verifyAccessToken(token);

    if (!decoded) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (user.isEmailVerified) {
      return c.json({ error: 'Email already verified' }, 400);
    }

    // Delete old verification tokens
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, user.id));

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(emailVerificationTokens).values({
      userId: user.id,
      token: verificationToken,
      expiresAt,
    });

    // Send verification email
    await emailService.sendEmail({
      to: user.email,
      subject: 'Verify your email - Accounting Platform',
      html: `
        <p>Hello ${user.firstName},</p>
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/verify-email?token=${verificationToken}">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
      `,
    });

    return c.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Verify token middleware
const verifyToken = async (
  c: Context<{ Variables: Variables }>,
  next: () => Promise<void>
) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'No token provided' }, 401);
  }

  const decoded = tokenService.verifyAccessToken(token);

  if (!decoded) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  c.set('user', { userId: decoded.userId, email: decoded.email });
  await next();
};

// Get current user
authRoutes.get('/me', verifyToken, async (c) => {
  try {
    const tokenUser = c.get('user');

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profilePicture: users.profilePicture,
        isEmailVerified: users.isEmailVerified,
        authProvider: users.authProvider,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, tokenUser.userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Logout (revoke tokens)
authRoutes.post('/logout', verifyToken, async (c) => {
  try {
    const tokenUser = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const { refreshToken } = body;

    // Revoke specific refresh token if provided
    if (refreshToken) {
      await tokenService.revokeRefreshToken(refreshToken);
    } else {
      // Revoke all refresh tokens
      await tokenService.revokeAllRefreshTokens(tokenUser.userId);
    }

    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user's active sessions
authRoutes.get('/sessions', verifyToken, async (c) => {
  try {
    const tokenUser = c.get('user');

    const sessions = await sessionService.getUserSessions(tokenUser.userId);
    const refreshTokens = await tokenService.getUserRefreshTokens(tokenUser.userId);

    return c.json({
      sessions,
      refreshTokens,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export { authRoutes, verifyToken };
