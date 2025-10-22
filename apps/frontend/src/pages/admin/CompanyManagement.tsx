/**
 * Company Management Page
 *
 * SuperAdmin page for managing all companies in the system
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rbacAPI } from '../../services/rbac-api';
import type { Company, User } from '@accounting-platform/shared-types';
import { Building2, Plus, Search, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface CompanyWithOwner extends Company {
  owner?: User;
}

export function CompanyManagement() {
  const [companies, setCompanies] = useState<CompanyWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, [searchQuery]);

  async function loadCompanies() {
    try {
      setLoading(true);
      const response = await rbacAPI.superAdmin.getCompanies({ search: searchQuery || undefined });
      setCompanies(response.companies);
      setError(null);
    } catch (err) {
      console.error('Failed to load companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCompany(companyId: string) {
    if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      return;
    }

    try {
      await rbacAPI.superAdmin.deleteCompany(companyId);
      await loadCompanies();
    } catch (err) {
      console.error('Failed to delete company:', err);
      alert('Failed to delete company: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  if (error && companies.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Companies</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <button
                onClick={loadCompanies}
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
          <h1 className="text-3xl font-bold text-gray-900">Company Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all companies in the system</p>
        </div>
        <Link
          to="/admin/companies/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Company
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search companies by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading companies...</p>
          </div>
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No companies</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new company.</p>
          <div className="mt-6">
            <Link
              to="/admin/companies/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Company
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{company.name}</h3>
                      <p className="text-sm text-gray-500">/{company.slug}</p>
                    </div>
                  </div>
                  {company.isActive ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Plan:</span>
                    <span className="font-medium text-gray-900 capitalize">{company.planType}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {company.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {company.owner && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Owner:</span>
                      <span className="text-gray-900">
                        {company.owner.firstName} {company.owner.lastName}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Created:</span>
                    <span className="text-gray-900">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
                <Link
                  to={`/admin/companies/${company.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-900"
                >
                  View Details
                </Link>
                <button
                  onClick={() => handleDeleteCompany(company.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Total Companies</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{companies.length}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Active Companies</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">
              {companies.filter((c) => c.isActive).length}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Inactive Companies</dt>
            <dd className="mt-1 text-3xl font-semibold text-red-600">
              {companies.filter((c) => !c.isActive).length}
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
}
