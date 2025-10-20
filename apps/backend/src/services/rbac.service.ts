/**
 * Role-Based Access Control (RBAC) Service
 *
 * Provides permission checking and role management for the platform.
 * Supports hierarchical roles and fine-grained permissions.
 */

import { db } from '../db';
import { eq, and, or, isNull, inArray } from 'drizzle-orm';
import {
  users,
  roles,
  permissions,
  userRoles,
  userPermissions,
  rolePermissions,
  type Role,
  type Permission,
  type UserRole
} from '../db/schema-enhanced';

export interface PermissionCheck {
  resource: string;
  action: string;
  organizationId?: string;
  resourceId?: string;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

export class RBACService {
  /**
   * Check if user has permission to perform an action on a resource
   */
  async checkPermission(
    userId: string,
    permission: PermissionCheck
  ): Promise<PermissionResult> {
    // Get all user permissions (from roles and direct grants)
    const userPermissionsList = await this.getUserPermissions(userId, permission.organizationId);

    // Check if permission exists
    const hasPermission = userPermissionsList.some(
      (p) =>
        p.resource === permission.resource &&
        p.action === permission.action
    );

    if (!hasPermission) {
      return {
        allowed: false,
        reason: `Missing permission: ${permission.resource}.${permission.action}`,
      };
    }

    // Check for explicit denials (user_permissions with is_granted = false)
    const deniedPermissions = await db
      .select()
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.isGranted, false),
          eq(permissions.resource, permission.resource),
          eq(permissions.action, permission.action),
          permission.organizationId
            ? eq(userPermissions.organizationId, permission.organizationId)
            : isNull(userPermissions.organizationId),
          or(
            isNull(userPermissions.expiresAt),
            eq(userPermissions.expiresAt, new Date())
          )
        )
      );

    if (deniedPermissions.length > 0) {
      return {
        allowed: false,
        reason: 'Permission explicitly denied',
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user has any of the specified permissions
   */
  async checkAnyPermission(
    userId: string,
    permissions: PermissionCheck[]
  ): Promise<PermissionResult> {
    for (const permission of permissions) {
      const result = await this.checkPermission(userId, permission);
      if (result.allowed) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason: 'Missing all required permissions',
    };
  }

  /**
   * Check if user has all of the specified permissions
   */
  async checkAllPermissions(
    userId: string,
    permissions: PermissionCheck[]
  ): Promise<PermissionResult> {
    for (const permission of permissions) {
      const result = await this.checkPermission(userId, permission);
      if (!result.allowed) {
        return result;
      }
    }

    return { allowed: true };
  }

  /**
   * Get all permissions for a user (from roles and direct grants)
   */
  async getUserPermissions(
    userId: string,
    organizationId?: string
  ): Promise<Permission[]> {
    const now = new Date();

    // Get permissions from roles
    const rolePerms = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description,
        createdAt: permissions.createdAt,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          organizationId
            ? or(
                eq(userRoles.organizationId, organizationId),
                isNull(userRoles.organizationId)
              )
            : isNull(userRoles.organizationId),
          or(
            isNull(userRoles.validUntil),
            eq(userRoles.validUntil, now)
          )
        )
      );

    // Get direct permissions
    const directPerms = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description,
        createdAt: permissions.createdAt,
      })
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.isGranted, true),
          organizationId
            ? eq(userPermissions.organizationId, organizationId)
            : isNull(userPermissions.organizationId),
          or(
            isNull(userPermissions.expiresAt),
            eq(userPermissions.expiresAt, now)
          )
        )
      );

    // Combine and deduplicate
    const allPerms = [...rolePerms, ...directPerms];
    const uniquePerms = allPerms.filter(
      (perm, index, self) =>
        index === self.findIndex((p) => p.id === perm.id)
    );

    return uniquePerms;
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string, organizationId?: string): Promise<Role[]> {
    const now = new Date();

    const userRolesList = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        parentRoleId: roles.parentRoleId,
        level: roles.level,
        isSystemRole: roles.isSystemRole,
        isAssignable: roles.isAssignable,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          organizationId
            ? or(
                eq(userRoles.organizationId, organizationId),
                isNull(userRoles.organizationId)
              )
            : isNull(userRoles.organizationId),
          or(
            isNull(userRoles.validUntil),
            eq(userRoles.validUntil, now)
          )
        )
      );

    return userRolesList;
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
    options?: {
      organizationId?: string;
      validUntil?: Date;
    }
  ): Promise<void> {
    await db.insert(userRoles).values({
      userId,
      roleId,
      organizationId: options?.organizationId,
      validUntil: options?.validUntil,
      assignedBy,
    }).onConflictDoNothing();
  }

  /**
   * Remove role from user
   */
  async removeRole(
    userId: string,
    roleId: string,
    organizationId?: string
  ): Promise<void> {
    await db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId),
          organizationId
            ? eq(userRoles.organizationId, organizationId)
            : isNull(userRoles.organizationId)
        )
      );
  }

  /**
   * Grant permission directly to user
   */
  async grantPermission(
    userId: string,
    permissionId: string,
    grantedBy: string,
    options?: {
      organizationId?: string;
      resourceId?: string;
      expiresAt?: Date;
    }
  ): Promise<void> {
    await db.insert(userPermissions).values({
      userId,
      permissionId,
      isGranted: true,
      organizationId: options?.organizationId,
      resourceId: options?.resourceId,
      grantedBy,
      expiresAt: options?.expiresAt,
    }).onConflictDoUpdate({
      target: [userPermissions.userId, userPermissions.permissionId],
      set: {
        isGranted: true,
        expiresAt: options?.expiresAt,
      }
    });
  }

  /**
   * Revoke permission from user
   */
  async revokePermission(
    userId: string,
    permissionId: string,
    organizationId?: string
  ): Promise<void> {
    await db
      .delete(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permissionId, permissionId),
          organizationId
            ? eq(userPermissions.organizationId, organizationId)
            : isNull(userPermissions.organizationId)
        )
      );
  }

  /**
   * Get all available roles
   */
  async getAllRoles(): Promise<Role[]> {
    return await db.select().from(roles);
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions);
  }

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const rolePerms = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description,
        createdAt: permissions.createdAt,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    return rolePerms;
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(
    userId: string,
    roleName: string,
    organizationId?: string
  ): Promise<boolean> {
    const userRolesList = await this.getUserRoles(userId, organizationId);
    return userRolesList.some((role) => role.name === roleName);
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasAnyRole(
    userId: string,
    roleNames: string[],
    organizationId?: string
  ): Promise<boolean> {
    const userRolesList = await this.getUserRoles(userId, organizationId);
    return userRolesList.some((role) => roleNames.includes(role.name));
  }

  /**
   * Get permission by name
   */
  async getPermissionByName(name: string): Promise<Permission | null> {
    const [permission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.name, name))
      .limit(1);

    return permission || null;
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: string): Promise<Role | null> {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);

    return role || null;
  }
}

export const rbacService = new RBACService();
