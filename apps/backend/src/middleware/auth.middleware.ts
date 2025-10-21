/**
 * Authentication and Authorization Middleware
 *
 * Provides middleware functions for protecting routes with authentication
 * and role-based access control.
 */

import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { db, users } from '../db';
import { eq } from 'drizzle-orm';
import { enhancedRBACService } from '../services/rbac-enhanced.service';

// Extend Hono Context with user information
export interface AuthContext extends Context {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isSuperAdmin?: boolean;
  };
}

/**
 * Extract and verify JWT token from Authorization header
 */
export async function requireAuth(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

    // Verify token
    const decoded: any = jwt.verify(token, jwtSecret);

    // Get user from database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (!user.isActive) {
      return c.json({ error: 'User account is inactive' }, 403);
    }

    // Check if user is SuperAdmin
    const isSuperAdmin = await enhancedRBACService.isSuperAdmin(user.id);

    // Initialize user roles on first authenticated request
    await enhancedRBACService.initializeUserRoles(user.id);

    // Attach user to context
    c.set('user', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isSuperAdmin,
    });

    await next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    if (error instanceof jwt.TokenExpiredError) {
      return c.json({ error: 'Token expired' }, 401);
    }

    return c.json({ error: 'Authentication failed' }, 500);
  }
}

/**
 * Require SuperAdmin role
 */
export async function requireSuperAdmin(c: Context, next: Next) {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    await enhancedRBACService.requireSuperAdmin(user.id);
    await next();
  } catch (error) {
    return c.json(
      {
        error: 'SuperAdmin access required',
        message: error instanceof Error ? error.message : 'Insufficient permissions',
      },
      403
    );
  }
}

/**
 * Require company owner role
 */
export function requireCompanyOwner(companyIdParam: string = 'companyId') {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const companyId = c.req.param(companyIdParam) || c.req.query(companyIdParam);

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    try {
      await enhancedRBACService.requireCompanyOwner(user.id, companyId);
      await next();
    } catch (error) {
      return c.json(
        {
          error: 'Company owner access required',
          message: error instanceof Error ? error.message : 'Insufficient permissions',
        },
        403
      );
    }
  };
}

/**
 * Require company member role (owner or employee)
 */
export function requireCompanyMember(companyIdParam: string = 'companyId') {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const companyId = c.req.param(companyIdParam) || c.req.query(companyIdParam);

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    try {
      await enhancedRBACService.requireCompanyMember(user.id, companyId);
      await next();
    } catch (error) {
      return c.json(
        {
          error: 'Company member access required',
          message: error instanceof Error ? error.message : 'Insufficient permissions',
        },
        403
      );
    }
  };
}

/**
 * Require specific permission
 */
export function requirePermission(resource: string, action: string) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    try {
      const result = await enhancedRBACService.checkPermission(user.id, {
        resource,
        action,
      });

      if (!result.allowed) {
        return c.json(
          {
            error: 'Permission denied',
            message: result.reason || `Missing permission: ${resource}.${action}`,
          },
          403
        );
      }

      await next();
    } catch (error) {
      return c.json(
        {
          error: 'Authorization failed',
          message: error instanceof Error ? error.message : 'Failed to check permissions',
        },
        500
      );
    }
  };
}

/**
 * Require module access
 */
export function requireModuleAccess(
  moduleName: string,
  permission: 'read' | 'write' | 'delete' = 'read',
  companyIdParam: string = 'companyId'
) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const companyId = c.req.param(companyIdParam) || c.req.query(companyIdParam);

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    try {
      const hasAccess = await enhancedRBACService.checkModuleAccess(
        user.id,
        companyId,
        moduleName,
        permission
      );

      if (!hasAccess) {
        return c.json(
          {
            error: 'Module access denied',
            message: `You don't have ${permission} access to the ${moduleName} module`,
          },
          403
        );
      }

      await next();
    } catch (error) {
      return c.json(
        {
          error: 'Authorization failed',
          message: error instanceof Error ? error.message : 'Failed to check module access',
        },
        500
      );
    }
  };
}

/**
 * Optional authentication (doesn't block if not authenticated)
 */
export async function optionalAuth(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

      const decoded: any = jwt.verify(token, jwtSecret);

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (user && user.isActive) {
        const isSuperAdmin = await enhancedRBACService.isSuperAdmin(user.id);

        c.set('user', {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isSuperAdmin,
        });
      }
    }
  } catch (error) {
    // Ignore authentication errors for optional auth
    console.debug('Optional auth failed:', error);
  }

  await next();
}
