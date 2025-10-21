/**
 * Enhanced RBAC Service with Company-Level Roles
 *
 * Extends the base RBAC service with:
 * - SuperAdmin detection via environment variable
 * - Company owner checks
 * - Company-scoped permissions
 * - Module access verification
 */

import { rbacService, PermissionCheck } from './rbac.service';
import { companyService } from './company.service';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users, userRoles, roles } from '../db';

const SUPERADMIN_EMAIL = process.env.SUPERADMIN || 'bartekziimny90@gmail.com';

export interface RoleCheckResult {
  allowed: boolean;
  role?: string;
  reason?: string;
}

export class EnhancedRBACService {
  /**
   * Check if user is SuperAdmin based on email
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return false;
    }

    return user.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
  }

  /**
   * Check if user has SuperAdmin role in database
   */
  async hasSuperAdminRole(userId: string): Promise<boolean> {
    const userRolesList = await rbacService.getUserRoles(userId);
    return userRolesList.some((role) => role.name === 'super_admin');
  }

  /**
   * Assign SuperAdmin role if user matches SUPERADMIN email
   */
  async assignSuperAdminIfEligible(userId: string): Promise<boolean> {
    const isSuperAdmin = await this.isSuperAdmin(userId);

    if (!isSuperAdmin) {
      return false;
    }

    // Check if already has super_admin role
    const hasSuperAdmin = await this.hasSuperAdminRole(userId);

    if (hasSuperAdmin) {
      return true; // Already assigned
    }

    // Get super_admin role
    const superAdminRole = await rbacService.getRoleByName('super_admin');

    if (!superAdminRole) {
      console.error('SuperAdmin role not found in database');
      return false;
    }

    // Assign super_admin role
    await rbacService.assignRole(userId, superAdminRole.id, userId);

    console.log(`✅ Assigned SuperAdmin role to user ${userId}`);
    return true;
  }

  /**
   * Check if user is a company owner
   */
  async isCompanyOwner(userId: string, companyId: string): Promise<boolean> {
    return await companyService.isCompanyOwner(companyId, userId);
  }

  /**
   * Check if user is a company member (owner or employee)
   */
  async isCompanyMember(userId: string, companyId: string): Promise<boolean> {
    return await companyService.isCompanyMember(companyId, userId);
  }

  /**
   * Get user's highest role level
   */
  async getUserHighestRole(userId: string, companyId?: string): Promise<{
    role: string;
    level: number;
  } | null> {
    // Check SuperAdmin first
    const isSuperAdmin = await this.isSuperAdmin(userId);
    if (isSuperAdmin) {
      return {
        role: 'super_admin',
        level: 0,
      };
    }

    // Check company-specific role
    if (companyId) {
      const isOwner = await this.isCompanyOwner(userId, companyId);
      if (isOwner) {
        return {
          role: 'company_owner',
          level: 1,
        };
      }

      const isMember = await this.isCompanyMember(userId, companyId);
      if (isMember) {
        return {
          role: 'employee',
          level: 2,
        };
      }
    }

    // Check general roles from database
    const userRolesList = await rbacService.getUserRoles(userId, companyId);

    if (userRolesList.length === 0) {
      return null;
    }

    // Get the role with lowest level (highest privilege)
    const highestRole = userRolesList.reduce((prev, current) =>
      current.level < prev.level ? current : prev
    );

    return {
      role: highestRole.name,
      level: highestRole.level,
    };
  }

  /**
   * Authorize action based on role hierarchy
   */
  async authorizeAction(
    userId: string,
    requiredRole: 'super_admin' | 'company_owner' | 'employee',
    companyId?: string
  ): Promise<RoleCheckResult> {
    // SuperAdmin can do anything
    const isSuperAdmin = await this.isSuperAdmin(userId);
    if (isSuperAdmin) {
      return {
        allowed: true,
        role: 'super_admin',
      };
    }

    // Company-specific authorization
    if (companyId) {
      const isOwner = await this.isCompanyOwner(userId, companyId);

      if (requiredRole === 'company_owner') {
        if (isOwner) {
          return {
            allowed: true,
            role: 'company_owner',
          };
        }

        return {
          allowed: false,
          reason: 'Company owner access required',
        };
      }

      if (requiredRole === 'employee') {
        const isMember = await this.isCompanyMember(userId, companyId);

        if (isOwner || isMember) {
          return {
            allowed: true,
            role: isOwner ? 'company_owner' : 'employee',
          };
        }

        return {
          allowed: false,
          reason: 'Company member access required',
        };
      }
    }

    // For super_admin requirement
    if (requiredRole === 'super_admin') {
      return {
        allowed: false,
        reason: 'SuperAdmin access required',
      };
    }

    return {
      allowed: false,
      reason: 'Insufficient privileges',
    };
  }

  /**
   * Check permission with company context
   */
  async checkPermission(
    userId: string,
    permission: PermissionCheck,
    companyId?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // SuperAdmin bypass
    const isSuperAdmin = await this.isSuperAdmin(userId);
    if (isSuperAdmin) {
      return { allowed: true };
    }

    // Company owner bypass for company resources
    if (companyId && permission.organizationId === companyId) {
      const isOwner = await this.isCompanyOwner(userId, companyId);
      if (isOwner) {
        return { allowed: true };
      }
    }

    // Use base RBAC service for permission check
    return await rbacService.checkPermission(userId, permission);
  }

  /**
   * Check module access for user in company
   */
  async checkModuleAccess(
    userId: string,
    companyId: string,
    moduleName: string,
    permission: 'read' | 'write' | 'delete' = 'read'
  ): Promise<boolean> {
    // SuperAdmin has access to everything
    const isSuperAdmin = await this.isSuperAdmin(userId);
    if (isSuperAdmin) {
      return true;
    }

    // Get module
    const module = await companyService.getModuleByName(moduleName);
    if (!module) {
      return false;
    }

    // Check access using company service
    return await companyService.hasModuleAccess(companyId, userId, module.id, permission);
  }

  /**
   * Get user's accessible companies with roles
   */
  async getUserAccessibleCompanies(userId: string): Promise<any[]> {
    // SuperAdmin can access all companies
    const isSuperAdmin = await this.isSuperAdmin(userId);
    if (isSuperAdmin) {
      const allCompanies = await companyService.getAllCompanies();
      return allCompanies.map((company) => ({
        ...company,
        role: 'super_admin',
      }));
    }

    // Get user's companies
    return await companyService.getUserCompanies(userId);
  }

  /**
   * Get user's effective permissions for a company
   */
  async getUserEffectivePermissions(
    userId: string,
    companyId: string
  ): Promise<{
    role: string;
    permissions: string[];
    modules: any[];
  }> {
    const role = await this.getUserHighestRole(userId, companyId);

    if (!role) {
      return {
        role: 'none',
        permissions: [],
        modules: [],
      };
    }

    // Get permissions from RBAC
    const permissions = await rbacService.getUserPermissions(userId, companyId);

    // Get accessible modules
    const modules = await companyService.getEmployeeModuleAccess(companyId, userId);

    return {
      role: role.role,
      permissions: permissions.map((p) => p.name),
      modules,
    };
  }

  /**
   * Initialize user roles on first login
   */
  async initializeUserRoles(userId: string): Promise<void> {
    // Check and assign SuperAdmin if eligible
    await this.assignSuperAdminIfEligible(userId);

    // Get or create default employee role
    const employeeRole = await rbacService.getRoleByName('employee');

    if (employeeRole) {
      const userRolesList = await rbacService.getUserRoles(userId);

      // If user has no roles and is not SuperAdmin, assign employee role
      if (userRolesList.length === 0) {
        const isSuperAdmin = await this.isSuperAdmin(userId);
        if (!isSuperAdmin) {
          await rbacService.assignRole(userId, employeeRole.id, userId);
          console.log(`✅ Assigned default employee role to user ${userId}`);
        }
      }
    }
  }

  /**
   * Verify SuperAdmin action
   */
  async requireSuperAdmin(userId: string): Promise<void> {
    const isSuperAdmin = await this.isSuperAdmin(userId);
    if (!isSuperAdmin) {
      throw new Error('SuperAdmin access required');
    }
  }

  /**
   * Verify company owner action
   */
  async requireCompanyOwner(userId: string, companyId: string): Promise<void> {
    const isSuperAdmin = await this.isSuperAdmin(userId);
    const isOwner = await this.isCompanyOwner(userId, companyId);

    if (!isSuperAdmin && !isOwner) {
      throw new Error('Company owner access required');
    }
  }

  /**
   * Verify company member action
   */
  async requireCompanyMember(userId: string, companyId: string): Promise<void> {
    const isSuperAdmin = await this.isSuperAdmin(userId);
    const isMember = await this.isCompanyMember(userId, companyId);

    if (!isSuperAdmin && !isMember) {
      throw new Error('Company member access required');
    }
  }
}

export const enhancedRBACService = new EnhancedRBACService();
