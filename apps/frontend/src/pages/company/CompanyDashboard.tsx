/**
 * Company Dashboard
 *
 * Main dashboard for company members showing company-specific information
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { rbacAPI } from '../../services/rbac-api';
import { useRBAC } from '../../hooks/useRBAC';
import type { Company, EmployeeModuleAccess } from '@accounting-platform/shared-types';
import { Building2, Users, Package, Settings, AlertCircle } from 'lucide-react';
import { IfSuperAdminOrOwner } from '../../components/rbac/PermissionComponents';

export function CompanyDashboard() {
  const { companyId } = useParams<{ companyId: string }>();
  const { isSuperAdmin, isOwner, loading: rbacLoading } = useRBAC(companyId);
  const [company, setCompany] = useState<Company | null>(null);
  const [modules, setModules] = useState<EmployeeModuleAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadCompanyData();
    }
  }, [companyId]);

  async function loadCompanyData() {
    try {
      setLoading(true);
      const [companiesResponse, modulesResponse] = await Promise.all([
        rbacAPI.user.getCompanies(),
        rbacAPI.user.getCompanyModules(companyId!),
      ]);

      const currentCompany = companiesResponse.companies.find((c) => c.id === companyId);
      setCompany(currentCompany || null);
      setModules(modulesResponse.modules as EmployeeModuleAccess[]);
      setError(null);
    } catch (err) {
      console.error('Failed to load company data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load company data');
    } finally {
      setLoading(false);
    }
  }

  if (loading || rbacLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
              <p className="mt-2 text-sm text-red-700">{error || 'Company not found'}</p>
              <button
                onClick={loadCompanyData}
                className="mt-3 text-sm text-red-800 underline hover:text-red-900"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Company Dashboard</p>
        </div>
        <IfSuperAdminOrOwner companyId={companyId!}>
          <Link
            to={`/company/${companyId}/settings`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </IfSuperAdminOrOwner>
      </div>

      {/* Company Info Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center">
          <Building2 className="h-12 w-12 text-blue-600" />
          <div className="ml-4">
            <h2 className="text-xl font-semibold text-gray-900">{company.name}</h2>
            <p className="text-sm text-gray-500">/{company.slug}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Plan Type</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900 capitalize">{company.planType}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${
                company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {company.isActive ? 'Active' : 'Inactive'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Your Role</dt>
            <dd className="mt-1">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {isSuperAdmin ? 'SuperAdmin' : isOwner ? 'Owner' : 'Employee'}
              </span>
            </dd>
          </div>
        </div>
      </div>

      {/* Available Modules */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Available Modules</h2>
        {modules.length === 0 ? (
          <p className="text-sm text-gray-500">No modules available. Contact your company owner to activate modules.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <div
                key={module.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900">{module.displayName}</h3>
                  <Package className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {module.canRead && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Read
                    </span>
                  )}
                  {module.canWrite && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Write
                    </span>
                  )}
                  {module.canDelete && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Delete
                    </span>
                  )}
                  {!module.canRead && !module.canWrite && !module.canDelete && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      No Access
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions (for owners) */}
      <IfSuperAdminOrOwner companyId={companyId!}>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              to={`/company/${companyId}/employees`}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
            >
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Manage Employees</p>
                <p className="text-sm text-gray-500 truncate">Invite and manage team members</p>
              </div>
            </Link>

            <Link
              to={`/company/${companyId}/modules`}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
            >
              <div className="flex-shrink-0">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Manage Modules</p>
                <p className="text-sm text-gray-500 truncate">Activate and configure modules</p>
              </div>
            </Link>

            <Link
              to={`/company/${companyId}/settings`}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
            >
              <div className="flex-shrink-0">
                <Settings className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Company Settings</p>
                <p className="text-sm text-gray-500 truncate">Configure company details</p>
              </div>
            </Link>
          </div>
        </div>
      </IfSuperAdminOrOwner>
    </div>
  );
}
