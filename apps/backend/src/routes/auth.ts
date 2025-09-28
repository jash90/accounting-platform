import { Hono, Context } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db, users, passwordResetTokens, emailVerificationTokens } from '../db';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { emailService } from '../services/email.service';

type Variables = {
  user: {
    userId: string;
    email: string;
  };
};

const authRoutes = new Hono<{ Variables: Variables }>();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
});

const confirmResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

// Sign up
authRoutes.post('/signup', zValidator('json', signupSchema), async (c) => {
  try {
    const { email, password, firstName, lastName } = c.req.valid('json');

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingUser.length > 0) {
      return c.json({ error: 'User already exists' }, 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      })
      .returning();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send welcome email
    await emailService.sendWelcomeEmail(newUser.email, newUser.firstName);

    return c.json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        isEmailVerified: newUser.isEmailVerified,
      },
      token,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Login
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json');

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Request password reset
authRoutes.post(
  '/reset-password',
  zValidator('json', resetPasswordSchema),
  async (c) => {
    try {
      const { email } = c.req.valid('json');

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (!user) {
        // Don't reveal if user exists or not
        return c.json({
          message:
            'If an account with that email exists, we sent a password reset link.',
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password-reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Store reset token in database
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token: resetToken,
        expiresAt,
      });

      // Send password reset email
      const emailSent = await emailService.sendPasswordResetEmail(email, resetToken);

      if (!emailSent) {
        console.log(`Password reset token for ${email}: ${resetToken}`);
        console.log(`Reset link: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`);
      }

      return c.json({
        message:
          'If an account with that email exists, we sent a password reset link.',
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

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch {
        return c.json({ error: 'Invalid or expired token' }, 400);
      }

      if (decoded.type !== 'password-reset') {
        return c.json({ error: 'Invalid token type' }, 400);
      }

      // Check if token exists in database and is not expired
      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token))
        .limit(1);

      if (!resetToken || resetToken.expiresAt < new Date()) {
        return c.json({ error: 'Invalid or expired token' }, 400);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update user password
      await db
        .update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, resetToken.userId));

      // Delete used reset token
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));

      return c.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Confirm reset password error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
);

// Verify token middleware
const verifyToken = async (
  c: Context<{ Variables: Variables }>,
  next: () => Promise<void>
) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'No token provided' }, 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    c.set('user', decoded);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// Get current user
authRoutes.get('/me', verifyToken, async (c) => {
  try {
    const tokenUser = c.get('user');
    const { userId } = tokenUser;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isEmailVerified: users.isEmailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
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

export { authRoutes };
