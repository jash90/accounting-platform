/**
 * Company Selector Component
 *
 * Dropdown component for switching between companies
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompanies } from '../../hooks/useRBAC';
import { Building2, ChevronDown, CheckCircle } from 'lucide-react';

export function CompanySelector() {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const { companies, loading } = useCompanies();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentCompany = companies.find((c) => c.id === companyId);

  function handleCompanySelect(selectedCompanyId: string) {
    setIsOpen(false);
    navigate(`/company/${selectedCompanyId}/dashboard`);
  }

  if (loading) {
    return (
      <div className="px-4 py-2">
        <div className="animate-pulse flex items-center space-x-2">
          <div className="h-4 w-4 bg-gray-300 rounded"></div>
          <div className="h-4 w-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <div className="flex items-center flex-1 min-w-0">
          <Building2 className="h-4 w-4 mr-2 flex-shrink-0 text-gray-400" />
          <span className="truncate">
            {currentCompany ? currentCompany.name : 'Select Company'}
          </span>
        </div>
        <ChevronDown className={`ml-2 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-full bg-white rounded-md shadow-lg border border-gray-200">
          <div className="py-1 max-h-60 overflow-auto">
            {companies.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                No companies available
              </div>
            ) : (
              companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleCompanySelect(company.id)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                    company.id === companyId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{company.name}</div>
                      <div className="text-xs text-gray-500 truncate">/{company.slug}</div>
                    </div>
                  </div>
                  <div className="ml-2 flex items-center space-x-2">
                    {company.role && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        company.role === 'owner' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {company.role === 'owner' ? 'Owner' : 'Employee'}
                      </span>
                    )}
                    {company.id === companyId && (
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
