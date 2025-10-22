/**
 * Role-Based Route Guards
 *
 * Components that protect routes based on user roles and permissions
 */

import { Navigate, useParams } from 'react-router-dom';
import { useIsSuperAdmin, useCompanyRole, useModuleAccess } from '../../hooks/useRBAC';
import { useAuthStore } from '../../stores/auth';

// ============================================================================
// LOADING & ERROR COMPONENTS
// ============================================================================

function LoadingGuard() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Verifying access...</p>
      </div>
    </div>
  );
}

function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          {message || 'You do not have permission to access this page.'}
        </p>
        <p className="text-sm text-gray-500">
          Contact your administrator or company owner to gain access.
        </p>
        <div className="mt-6">
          <a
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUPER ADMIN GUARD
// ============================================================================

interface SuperAdminGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function SuperAdminGuard({ children, redirectTo = '/dashboard' }: SuperAdminGuardProps) {
  const { isAuthenticated } = useAuthStore();
  const isSuperAdmin = useIsSuperAdmin();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return <AccessDenied message="SuperAdmin access required for this page." />;
  }

  return <>{children}</>;
}

// ============================================================================
// COMPANY OWNER GUARD
// ============================================================================

interface CompanyOwnerGuardProps {
  children: React.ReactNode;
  companyId?: string;
  redirectTo?: string;
}

export function CompanyOwnerGuard({
  children,
  companyId: propCompanyId,
  redirectTo = '/dashboard',
}: CompanyOwnerGuardProps) {
  const { isAuthenticated } = useAuthStore();
  const isSuperAdmin = useIsSuperAdmin();
  const params = useParams();
  const companyId = propCompanyId || params.companyId;

  const { isOwner, loading, error } = useCompanyRole(companyId);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!companyId) {
    return <Navigate to={redirectTo} replace />;
  }

  if (loading) {
    return <LoadingGuard />;
  }

  if (error) {
    return <AccessDenied message="Error verifying company access. Please try again." />;
  }

  // SuperAdmin can access everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (!isOwner) {
    return <AccessDenied message="Company owner access required for this page." />;
  }

  return <>{children}</>;
}

// ============================================================================
// COMPANY MEMBER GUARD (Owner or Employee)
// ============================================================================

interface CompanyMemberGuardProps {
  children: React.ReactNode;
  companyId?: string;
  redirectTo?: string;
}

export function CompanyMemberGuard({
  children,
  companyId: propCompanyId,
  redirectTo = '/dashboard',
}: CompanyMemberGuardProps) {
  const { isAuthenticated } = useAuthStore();
  const isSuperAdmin = useIsSuperAdmin();
  const params = useParams();
  const companyId = propCompanyId || params.companyId;

  const { role, loading, error } = useCompanyRole(companyId);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!companyId) {
    return <Navigate to={redirectTo} replace />;
  }

  if (loading) {
    return <LoadingGuard />;
  }

  if (error) {
    return <AccessDenied message="Error verifying company membership. Please try again." />;
  }

  // SuperAdmin can access everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (!role) {
    return <AccessDenied message="You must be a company member to access this page." />;
  }

  return <>{children}</>;
}

// ============================================================================
// MODULE ACCESS GUARD
// ============================================================================

interface ModuleGuardProps {
  children: React.ReactNode;
  companyId?: string;
  moduleName: string;
  permission?: 'read' | 'write' | 'delete';
  redirectTo?: string;
}

export function ModuleGuard({
  children,
  companyId: propCompanyId,
  moduleName,
  permission = 'read',
  redirectTo = '/dashboard',
}: ModuleGuardProps) {
  const { isAuthenticated } = useAuthStore();
  const isSuperAdmin = useIsSuperAdmin();
  const params = useParams();
  const companyId = propCompanyId || params.companyId;

  const { canRead, canWrite, canDelete, loading, error } = useModuleAccess(companyId, moduleName);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!companyId) {
    return <Navigate to={redirectTo} replace />;
  }

  if (loading) {
    return <LoadingGuard />;
  }

  if (error) {
    return <AccessDenied message="Error verifying module access. Please try again." />;
  }

  // SuperAdmin can access everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check permission level
  const hasAccess =
    (permission === 'read' && canRead) ||
    (permission === 'write' && canWrite) ||
    (permission === 'delete' && canDelete);

  if (!hasAccess) {
    return (
      <AccessDenied
        message={`You need ${permission} access to the ${moduleName} module to view this page.`}
      />
    );
  }

  return <>{children}</>;
}

// ============================================================================
// COMPOSITE GUARDS
// ============================================================================

/**
 * Guard that requires either SuperAdmin or Company Owner
 */
export function SuperAdminOrOwnerGuard({
  children,
  companyId,
}: {
  children: React.ReactNode;
  companyId?: string;
}) {
  const isSuperAdmin = useIsSuperAdmin();
  const params = useParams();
  const effectiveCompanyId = companyId || params.companyId;

  const { isOwner, loading } = useCompanyRole(effectiveCompanyId);

  if (loading) {
    return <LoadingGuard />;
  }

  if (isSuperAdmin || isOwner) {
    return <>{children}</>;
  }

  return <AccessDenied message="SuperAdmin or Company Owner access required." />;
}
