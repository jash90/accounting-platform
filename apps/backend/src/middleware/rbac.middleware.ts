/**
 * RBAC Middleware
 *
 * Provides middleware functions for protecting routes with permission checks.
 */

import { Context, Next } from 'hono';
import { rbacService, type PermissionCheck } from '../services/rbac.service';
import { auditService } from '../services/audit.service';

type Variables = {
  user: {
    userId: string;
    email: string;
  };
};

/**
 * Middleware to check if user has required permission
 */
export function requirePermission(resource: string, action: string) {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const permissionCheck: PermissionCheck = {
      resource,
      action,
    };

    const result = await rbacService.checkPermission(user.userId, permissionCheck);

    if (!result.allowed) {
      // Log failed authorization attempt
      await auditService.logEvent({
        userId: user.userId,
        eventType: 'authorization_failed',
        eventCategory: 'authorization',
        eventSeverity: 'warning',
        resourceType: resource,
        action: action,
        result: 'denied',
        failureReason: result.reason || 'Missing permission',
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined,
        userAgent: c.req.header('user-agent'),
      });

      return c.json(
        {
          error: 'Forbidden',
          message: result.reason || 'You do not have permission to perform this action',
        },
        403
      );
    }

    // Log successful authorization
    await auditService.logEvent({
      userId: user.userId,
      eventType: 'authorization_success',
      eventCategory: 'authorization',
      eventSeverity: 'info',
      resourceType: resource,
      action: action,
      result: 'success',
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined,
      userAgent: c.req.header('user-agent'),
    });

    await next();
  };
}

/**
 * Middleware to check if user has any of the required permissions
 */
export function requireAnyPermission(permissions: PermissionCheck[]) {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const result = await rbacService.checkAnyPermission(user.userId, permissions);

    if (!result.allowed) {
      await auditService.logEvent({
        userId: user.userId,
        eventType: 'authorization_failed',
        eventCategory: 'authorization',
        eventSeverity: 'warning',
        action: 'check_any_permission',
        result: 'denied',
        failureReason: result.reason || 'Missing required permissions',
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined,
        userAgent: c.req.header('user-agent'),
        metadata: { requiredPermissions: permissions },
      });

      return c.json(
        {
          error: 'Forbidden',
          message: result.reason || 'You do not have any of the required permissions',
        },
        403
      );
    }

    await next();
  };
}

/**
 * Middleware to check if user has all of the required permissions
 */
export function requireAllPermissions(permissions: PermissionCheck[]) {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const result = await rbacService.checkAllPermissions(user.userId, permissions);

    if (!result.allowed) {
      await auditService.logEvent({
        userId: user.userId,
        eventType: 'authorization_failed',
        eventCategory: 'authorization',
        eventSeverity: 'warning',
        action: 'check_all_permissions',
        result: 'denied',
        failureReason: result.reason || 'Missing required permissions',
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined,
        userAgent: c.req.header('user-agent'),
        metadata: { requiredPermissions: permissions },
      });

      return c.json(
        {
          error: 'Forbidden',
          message: result.reason || 'You do not have all of the required permissions',
        },
        403
      );
    }

    await next();
  };
}

/**
 * Middleware to check if user has a specific role
 */
export function requireRole(roleName: string) {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const hasRole = await rbacService.hasRole(user.userId, roleName);

    if (!hasRole) {
      await auditService.logEvent({
        userId: user.userId,
        eventType: 'authorization_failed',
        eventCategory: 'authorization',
        eventSeverity: 'warning',
        action: 'check_role',
        result: 'denied',
        failureReason: `Missing required role: ${roleName}`,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined,
        userAgent: c.req.header('user-agent'),
        metadata: { requiredRole: roleName },
      });

      return c.json(
        {
          error: 'Forbidden',
          message: `You must have the ${roleName} role to perform this action`,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Middleware to check if user has any of the specified roles
 */
export function requireAnyRole(roleNames: string[]) {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const hasAnyRole = await rbacService.hasAnyRole(user.userId, roleNames);

    if (!hasAnyRole) {
      await auditService.logEvent({
        userId: user.userId,
        eventType: 'authorization_failed',
        eventCategory: 'authorization',
        eventSeverity: 'warning',
        action: 'check_any_role',
        result: 'denied',
        failureReason: `Missing any of required roles: ${roleNames.join(', ')}`,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined,
        userAgent: c.req.header('user-agent'),
        metadata: { requiredRoles: roleNames },
      });

      return c.json(
        {
          error: 'Forbidden',
          message: `You must have one of the following roles: ${roleNames.join(', ')}`,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Example usage:
 *
 * // Require specific permission
 * app.get('/invoices', requirePermission('invoices', 'read'), (c) => {
 *   // ... handler code
 * });
 *
 * // Require specific role
 * app.get('/admin/users', requireRole('admin'), (c) => {
 *   // ... handler code
 * });
 *
 * // Require any of multiple roles
 * app.get('/reports', requireAnyRole(['admin', 'accountant']), (c) => {
 *   // ... handler code
 * });
 *
 * // Require multiple permissions
 * app.post('/invoices/:id/approve',
 *   requireAllPermissions([
 *     { resource: 'invoices', action: 'read' },
 *     { resource: 'invoices', action: 'approve' }
 *   ]),
 *   (c) => {
 *     // ... handler code
 *   }
 * );
 */
