/**
 * Clients List Page
 * Main CRM page with client list, filters, and actions
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClients, useBulkDeleteClients } from '../hooks/useCRM';
import {
  Search,
  Plus,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_COLORS,
  CLIENT_TYPE_LABELS,
  TAX_FORM_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  ACTION_LABELS,
  TABLE_COLUMNS,
  EMPTY_STATES,
  PAGINATION,
} from '../constants/crm';
import { formatDate, formatOrPlaceholder } from '../utils/formatters';
import type { Client, ClientStatus, ClientType, TaxForm, ListClientsQuery } from '@accounting-platform/shared-types';

export function Clients() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ListClientsQuery>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const,
  });

  // Fetch clients
  const { data, isLoading, error, refetch } = useClients(filters);
  const bulkDelete = useBulkDeleteClients();

  // Toggle row selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Toggle all selection
  const toggleSelectAll = () => {
    if (selectedIds.size === data?.data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data?.data.map((c) => c.id) || []));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Czy na pewno chcesz usunąć ${selectedIds.size} klientów?`)) return;

    try {
      await bulkDelete.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
      refetch();
    } catch (error) {
      alert('Błąd podczas usuwania klientów');
    }
  };

  // Apply filters
  const handleFilterChange = (key: keyof ListClientsQuery, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    });
    setSearchQuery('');
  };

  // Handle search
  const handleSearch = () => {
    handleFilterChange('search', searchQuery);
  };

  // Pagination
  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const clients = data?.data || [];
  const pagination = data?.pagination;
  const hasActiveFilters = !!(filters.status || filters.clientType || filters.taxForm || filters.search);

  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Klienci</h1>
          <p className="mt-1 text-sm text-gray-600">
            Zarządzaj bazą klientów i ich danymi
          </p>
        </div>
        <Link
          to="/clients/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          {ACTION_LABELS.newClient}
        </Link>
      </div>

      {/* Filters and Actions Bar */}
      <div className="mb-4 flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[300px]">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Szukaj po nazwie, NIP, mieście..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {ACTION_LABELS.search}
            </button>
          </div>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
            showFilters || hasActiveFilters
              ? 'border-primary-600 text-primary-700 bg-primary-50 hover:bg-primary-100'
              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
          }`}
        >
          <Filter className="h-5 w-5 inline mr-2" />
          {ACTION_LABELS.filter}
          {hasActiveFilters && <span className="ml-2 bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">Aktywne</span>}
        </button>

        {/* Refresh */}
        <button
          onClick={() => refetch()}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <RefreshCw className="h-5 w-5" />
        </button>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-md">
            <span className="text-sm text-gray-700">
              Zaznaczono: {selectedIds.size}
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 text-sm text-red-700 hover:text-red-900 hover:bg-red-50 rounded"
            >
              <Trash2 className="h-4 w-4 inline mr-1" />
              {ACTION_LABELS.delete}
            </button>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">Wszystkie</option>
                {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Client Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Typ klienta
              </label>
              <select
                value={filters.clientType || ''}
                onChange={(e) => handleFilterChange('clientType', e.target.value || undefined)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">Wszystkie</option>
                {Object.entries(CLIENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Tax Form Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma opodatkowania
              </label>
              <select
                value={filters.taxForm || ''}
                onChange={(e) => handleFilterChange('taxForm', e.target.value || undefined)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">Wszystkie</option>
                {Object.entries(TAX_FORM_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
              >
                <X className="h-4 w-4 mr-1" />
                {ACTION_LABELS.clearFilters}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            Ładowanie...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">
            Błąd podczas ładowania klientów
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg font-medium text-gray-900">{EMPTY_STATES.noResults}</p>
            <p className="mt-1 text-sm text-gray-500">{EMPTY_STATES.noResultsDescription}</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sm text-primary-600 hover:text-primary-700"
              >
                {ACTION_LABELS.clearFilters}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === clients.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {TABLE_COLUMNS.companyName}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {TABLE_COLUMNS.nip}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {TABLE_COLUMNS.status}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {TABLE_COLUMNS.taxForm}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {TABLE_COLUMNS.city}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {TABLE_COLUMNS.riskLevel}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {TABLE_COLUMNS.createdAt}
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {TABLE_COLUMNS.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(client.id)}
                          onChange={() => toggleSelection(client.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {client.companyName}
                        </div>
                        {client.shortName && (
                          <div className="text-sm text-gray-500">{client.shortName}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatOrPlaceholder(client.nip)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.status && (
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${CLIENT_STATUS_COLORS[client.status].bg} ${CLIENT_STATUS_COLORS[client.status].text}`}
                          >
                            {CLIENT_STATUS_LABELS[client.status]}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.taxForm ? TAX_FORM_LABELS[client.taxForm] : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatOrPlaceholder(client.addressCity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.riskLevel && (
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${RISK_LEVEL_COLORS[client.riskLevel as keyof typeof RISK_LEVEL_COLORS].bg} ${RISK_LEVEL_COLORS[client.riskLevel as keyof typeof RISK_LEVEL_COLORS].text}`}
                          >
                            {RISK_LEVEL_LABELS[client.riskLevel as keyof typeof RISK_LEVEL_LABELS]}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(client.createdAt, 'short')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/clients/${client.id}`}
                            className="text-primary-600 hover:text-primary-900"
                            title="Zobacz szczegóły"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
                          <Link
                            to={`/clients/${client.id}/edit`}
                            className="text-gray-600 hover:text-gray-900"
                            title="Edytuj"
                          >
                            <Edit className="h-5 w-5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {ACTION_LABELS.previous}
                  </button>
                  <button
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={!pagination.hasMore}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {ACTION_LABELS.next}
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      {PAGINATION.showing(
                        (pagination.page - 1) * pagination.limit + 1,
                        Math.min(pagination.page * pagination.limit, pagination.total),
                        pagination.total
                      )}
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => goToPage(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {ACTION_LABELS.previous}
                      </button>
                      {/* Page numbers */}
                      {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pagination.page === pageNum
                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => goToPage(pagination.page + 1)}
                        disabled={!pagination.hasMore}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {ACTION_LABELS.next}
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
