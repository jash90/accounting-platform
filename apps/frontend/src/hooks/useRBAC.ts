/**
 * RBAC React Hooks
 *
 * Custom hooks for role-based access control in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import { rbacAPI } from '../services/rbac-api';
import type {
  Company,
  RoleInfo,
  EmployeeModuleAccess,
  EffectivePermissions,
  ModuleAccessCheck,
} from '@accounting-platform/shared-types';

// ============================================================================
// ROLE HOOKS
// ============================================================================

/**
 * Check if current user is SuperAdmin
 */
export function useIsSuperAdmin(): boolean {
  const { user } = useAuthStore();
  return user?.isSuperAdmin || false;
}

/**
 * Get current user's role in a company
 */
export function useCompanyRole(companyId: string | undefined) {
  const [role, setRole] = useState<RoleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setRole(null);
      setLoading(false);
      return;
    }

    async function fetchRole() {
      try {
        setLoading(true);
        const response = await rbacAPI.user.getCompanyRole(companyId);
        setRole(response.role);
        setError(null);
      } catch (err) {
        console.error('Error fetching company role:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch role');
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [companyId]);

  return {
    role,
    isOwner: role?.role === 'company_owner',
    isEmployee: role?.role === 'employee',
    loading,
    error,
  };
}

/**
 * Check if user has specific role
 */
export function useHasRole(roleName: string, companyId?: string): boolean {
  const { role } = useCompanyRole(companyId);
  return role?.role === roleName;
}

// ============================================================================
// COMPANY HOOKS
// ============================================================================

/**
 * Get user's accessible companies
 */
export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isSuperAdmin = useIsSuperAdmin();

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await rbacAPI.user.getCompanies();
      setCompanies(response.companies);
      setError(null);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch companies');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return {
    companies,
    loading,
    error,
    refetch: fetchCompanies,
    isSuperAdmin,
  };
}

/**
 * Get single company details
 */
export function useCompany(companyId: string | undefined) {
  const { companies, loading: companiesLoading } = useCompanies();
  const company = companies.find((c) => c.id === companyId);

  return {
    company,
    loading: companiesLoading,
    isOwner: company?.role === 'owner',
    isEmployee: company?.role === 'employee',
  };
}

// ============================================================================
// MODULE ACCESS HOOKS
// ============================================================================

/**
 * Get user's accessible modules in a company
 */
export function useCompanyModules(companyId: string | undefined) {
  const [modules, setModules] = useState<EmployeeModuleAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setModules([]);
      setLoading(false);
      return;
    }

    async function fetchModules() {
      try {
        setLoading(true);
        const response = await rbacAPI.user.getCompanyModules(companyId);
        setModules(response.modules as EmployeeModuleAccess[]);
        setError(null);
      } catch (err) {
        console.error('Error fetching company modules:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch modules');
        setModules([]);
      } finally {
        setLoading(false);
      }
    }

    fetchModules();
  }, [companyId]);

  return {
    modules,
    loading,
    error,
    hasModules: modules.length > 0,
  };
}

/**
 * Check module access for a specific module
 */
export function useModuleAccess(
  companyId: string | undefined,
  moduleName: string | undefined
) {
  const [access, setAccess] = useState<ModuleAccessCheck>({
    canRead: false,
    canWrite: false,
    canDelete: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !moduleName) {
      setAccess({ canRead: false, canWrite: false, canDelete: false });
      setLoading(false);
      return;
    }

    async function fetchAccess() {
      try {
        setLoading(true);
        const response = await rbacAPI.user.checkModuleAccess(companyId, moduleName);
        setAccess(response.access);
        setError(null);
      } catch (err) {
        console.error('Error checking module access:', err);
        setError(err instanceof Error ? err.message : 'Failed to check access');
        setAccess({ canRead: false, canWrite: false, canDelete: false });
      } finally {
        setLoading(false);
      }
    }

    fetchAccess();
  }, [companyId, moduleName]);

  return {
    ...access,
    hasAccess: access.canRead || access.canWrite || access.canDelete,
    loading,
    error,
  };
}

/**
 * Check if user has any access level to a module
 */
export function useHasModuleAccess(
  companyId: string | undefined,
  moduleName: string | undefined
): boolean {
  const { hasAccess, loading } = useModuleAccess(companyId, moduleName);
  return !loading && hasAccess;
}

// ============================================================================
// PERMISSION HOOKS
// ============================================================================

/**
 * Get user's effective permissions in a company
 */
export function usePermissions(companyId: string | undefined) {
  const [permissions, setPermissions] = useState<EffectivePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    async function fetchPermissions() {
      try {
        setLoading(true);
        const response = await rbacAPI.user.getEffectivePermissions(companyId);
        setPermissions(response.permissions);
        setError(null);
      } catch (err) {
        console.error('Error fetching permissions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [companyId]);

  const hasPermission = useCallback(
    (permissionName: string): boolean => {
      return permissions?.permissions.includes(permissionName) || false;
    },
    [permissions]
  );

  return {
    permissions,
    hasPermission,
    loading,
    error,
  };
}

/**
 * Check if user has a specific permission
 */
export function useHasPermission(
  companyId: string | undefined,
  permissionName: string
): boolean {
  const { hasPermission, loading } = usePermissions(companyId);
  return !loading && hasPermission(permissionName);
}

// ============================================================================
// COMBINED HOOKS
// ============================================================================

/**
 * Get comprehensive RBAC state for current user
 */
export function useRBAC(companyId?: string) {
  const { user } = useAuthStore();
  const isSuperAdmin = useIsSuperAdmin();
  const { role, isOwner, isEmployee, loading: roleLoading } = useCompanyRole(companyId);
  const { modules, loading: modulesLoading } = useCompanyModules(companyId);
  const { permissions, hasPermission, loading: permissionsLoading } = usePermissions(companyId);

  return {
    user,
    isSuperAdmin,
    role: role?.role,
    isOwner,
    isEmployee,
    modules,
    permissions: permissions?.permissions || [],
    hasPermission,
    loading: roleLoading || modulesLoading || permissionsLoading,
  };
}

/**
 * Authorization helper hook
 */
export function useAuthorization() {
  const isSuperAdmin = useIsSuperAdmin();

  const canManageUsers = useCallback(() => isSuperAdmin, [isSuperAdmin]);

  const canManageCompany = useCallback(
    (companyId: string) => {
      // SuperAdmin can manage all companies
      if (isSuperAdmin) return true;

      // Company owners can manage their own company
      // This will be checked separately using useCompanyRole
      return false;
    },
    [isSuperAdmin]
  );

  const canInviteEmployees = useCallback(
    (companyId: string, isOwner: boolean) => {
      return isSuperAdmin || isOwner;
    },
    [isSuperAdmin]
  );

  const canAccessModule = useCallback(
    (canRead: boolean) => {
      return isSuperAdmin || canRead;
    },
    [isSuperAdmin]
  );

  return {
    isSuperAdmin,
    canManageUsers,
    canManageCompany,
    canInviteEmployees,
    canAccessModule,
  };
}
