/**
 * Permission-Aware Components
 *
 * Components for conditional rendering based on roles and permissions
 */

import { useIsSuperAdmin, useCompanyRole, useModuleAccess, useHasPermission } from '../../hooks/useRBAC';

// ============================================================================
// ROLE-BASED COMPONENTS
// ============================================================================

interface IfRoleProps {
  role: 'super_admin' | 'company_owner' | 'employee';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children only if user has specific role
 */
export function IfRole({ role, children, fallback = null }: IfRoleProps) {
  const isSuperAdmin = useIsSuperAdmin();

  if (role === 'super_admin') {
    return isSuperAdmin ? <>{children}</> : <>{fallback}</>;
  }

  // For company-specific roles, we need companyId from context or props
  // This component should be used inside a company context
  return <>{fallback}</>;
}

interface IfSuperAdminProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children only if user is SuperAdmin
 */
export function IfSuperAdmin({ children, fallback = null }: IfSuperAdminProps) {
  const isSuperAdmin = useIsSuperAdmin();
  return isSuperAdmin ? <>{children}</> : <>{fallback}</>;
}

interface IfCompanyOwnerProps {
  companyId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children only if user is Company Owner
 */
export function IfCompanyOwner({ companyId, children, fallback = null }: IfCompanyOwnerProps) {
  const isSuperAdmin = useIsSuperAdmin();
  const { isOwner, loading } = useCompanyRole(companyId);

  if (loading) return null;

  return isSuperAdmin || isOwner ? <>{children}</> : <>{fallback}</>;
}

interface IfCompanyMemberProps {
  companyId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children only if user is Company Member (Owner or Employee)
 */
export function IfCompanyMember({ companyId, children, fallback = null }: IfCompanyMemberProps) {
  const isSuperAdmin = useIsSuperAdmin();
  const { role, loading } = useCompanyRole(companyId);

  if (loading) return null;

  return isSuperAdmin || role ? <>{children}</> : <>{fallback}</>;
}

// ============================================================================
// MODULE ACCESS COMPONENTS
// ============================================================================

interface IfModuleAccessProps {
  companyId: string;
  moduleName: string;
  permission?: 'read' | 'write' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children only if user has module access
 */
export function IfModuleAccess({
  companyId,
  moduleName,
  permission = 'read',
  children,
  fallback = null,
}: IfModuleAccessProps) {
  const isSuperAdmin = useIsSuperAdmin();
  const { canRead, canWrite, canDelete, loading } = useModuleAccess(companyId, moduleName);

  if (loading) return null;

  if (isSuperAdmin) return <>{children}</>;

  const hasAccess =
    (permission === 'read' && canRead) ||
    (permission === 'write' && canWrite) ||
    (permission === 'delete' && canDelete);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// ============================================================================
// PERMISSION-BASED COMPONENTS
// ============================================================================

interface IfPermissionProps {
  companyId: string;
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children only if user has specific permission
 */
export function IfPermission({ companyId, permission, children, fallback = null }: IfPermissionProps) {
  const isSuperAdmin = useIsSuperAdmin();
  const hasPermission = useHasPermission(companyId, permission);

  return isSuperAdmin || hasPermission ? <>{children}</> : <>{fallback}</>;
}

// ============================================================================
// COMBINATION COMPONENTS
// ============================================================================

interface IfSuperAdminOrOwnerProps {
  companyId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children if user is either SuperAdmin or Company Owner
 */
export function IfSuperAdminOrOwner({
  companyId,
  children,
  fallback = null,
}: IfSuperAdminOrOwnerProps) {
  const isSuperAdmin = useIsSuperAdmin();
  const { isOwner, loading } = useCompanyRole(companyId);

  if (loading) return null;

  return isSuperAdmin || isOwner ? <>{children}</> : <>{fallback}</>;
}

// ============================================================================
// BUTTON & ACTION COMPONENTS
// ============================================================================

interface RestrictedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  companyId?: string;
  requireRole?: 'super_admin' | 'company_owner';
  requireModule?: { name: string; permission: 'read' | 'write' | 'delete' };
  requirePermission?: string;
  children: React.ReactNode;
  disabledMessage?: string;
}

/**
 * Button that is disabled if user doesn't have required access
 */
export function RestrictedButton({
  companyId,
  requireRole,
  requireModule,
  requirePermission,
  children,
  disabledMessage = 'You do not have permission for this action',
  ...buttonProps
}: RestrictedButtonProps) {
  const isSuperAdmin = useIsSuperAdmin();
  const { isOwner } = useCompanyRole(companyId);
  const moduleAccess = useModuleAccess(
    companyId,
    requireModule?.name || ''
  );
  const hasPermission = useHasPermission(companyId || '', requirePermission || '');

  let isAllowed = isSuperAdmin;

  if (!isAllowed && requireRole === 'company_owner') {
    isAllowed = isOwner;
  }

  if (!isAllowed && requireModule && companyId) {
    const { canRead, canWrite, canDelete } = moduleAccess;
    isAllowed =
      (requireModule.permission === 'read' && canRead) ||
      (requireModule.permission === 'write' && canWrite) ||
      (requireModule.permission === 'delete' && canDelete);
  }

  if (!isAllowed && requirePermission) {
    isAllowed = hasPermission;
  }

  return (
    <button
      {...buttonProps}
      disabled={!isAllowed || buttonProps.disabled}
      title={!isAllowed ? disabledMessage : buttonProps.title}
      className={`${buttonProps.className} ${!isAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

// ============================================================================
// BADGE COMPONENTS
// ============================================================================

interface RoleBadgeProps {
  role?: string;
  isSuperAdmin?: boolean;
  className?: string;
}

/**
 * Display role badge
 */
export function RoleBadge({ role, isSuperAdmin, className = '' }: RoleBadgeProps) {
  if (isSuperAdmin) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ${className}`}>
        SuperAdmin
      </span>
    );
  }

  if (role === 'company_owner') {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${className}`}>
        Owner
      </span>
    );
  }

  if (role === 'employee') {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ${className}`}>
        Employee
      </span>
    );
  }

  return null;
}

// ============================================================================
// NO ACCESS MESSAGE COMPONENT
// ============================================================================

interface NoAccessMessageProps {
  title?: string;
  message?: string;
  contactAdmin?: boolean;
}

/**
 * Display "no access" message
 */
export function NoAccessMessage({
  title = 'Access Restricted',
  message = 'You do not have access to this resource.',
  contactAdmin = true,
}: NoAccessMessageProps) {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">{title}</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>{message}</p>
            {contactAdmin && (
              <p className="mt-1">
                Contact your administrator or company owner to gain access.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
