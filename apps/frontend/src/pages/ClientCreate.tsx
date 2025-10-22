/**
 * Client Create Page
 * Form for creating new client with GUS integration
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCreateClient, useGUSLookup } from '../hooks/useCRM';
import { ArrowLeft, Save, Database, Loader } from 'lucide-react';
import {
  CLIENT_TYPE_LABELS,
  TAX_FORM_LABELS,
  PROVINCES,
  FIELD_LABELS,
  ACTION_LABELS,
} from '../constants/crm';
import { validateNIP, cleanNIP, formatNIP, formatPostalCode } from '../utils/validators';
import { parseBackendError } from '../utils/errorParser';
import { ErrorBanner } from '../components/ErrorBanner';
import type { CreateClientRequest, ClientType, TaxForm } from '@accounting-platform/shared-types';

export function ClientCreate() {
  const navigate = useNavigate();
  const createClient = useCreateClient();
  const gusLookup = useGUSLookup();

  const [formData, setFormData] = useState<CreateClientRequest>({
    companyName: '',
    clientType: 'company',
    nip: '',
    regon: '',
    email: '',
    phone: '',
    addressStreet: '',
    addressCity: '',
    addressPostalCode: '',
    taxForm: 'CIT',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleChange = (field: keyof CreateClientRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    // Clear general error when user makes changes
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handleNIPChange = (value: string) => {
    const cleaned = cleanNIP(value);
    handleChange('nip', cleaned);
  };

  const handleGUSLookup = async () => {
    if (!formData.nip) {
      alert('Wprowadź NIP');
      return;
    }

    if (!validateNIP(formData.nip)) {
      setErrors({ nip: 'Nieprawidłowy NIP' });
      return;
    }

    try {
      const result = await gusLookup.mutateAsync(formData.nip);
      if (result.success && result.data) {
        // Auto-fill from GUS data
        setFormData((prev) => ({
          ...prev,
          companyName: result.data.nazwa || prev.companyName,
          regon: result.data.regon || prev.regon,
          addressStreet: result.data.ulica ? `${result.data.ulica} ${result.data.nrNieruchomosci || ''}`.trim() : prev.addressStreet,
          addressCity: result.data.miasto || prev.addressCity,
          addressPostalCode: result.data.kodPocztowy || prev.addressPostalCode,
          addressProvince: result.data.wojewodztwo || prev.addressProvince,
        }));
        alert('Dane pobrane z GUS');
      } else {
        alert(result.error || 'Nie znaleziono danych w GUS');
      }
    } catch (error) {
      alert('Błąd podczas pobierania danych z GUS');
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName?.trim()) {
      newErrors.companyName = 'Nazwa firmy jest wymagana';
    }

    if (formData.clientType === 'company' || formData.clientType === 'sole_proprietor') {
      if (!formData.nip && !formData.regon) {
        newErrors.nip = 'Wymagany NIP lub REGON';
      }
    }

    if (formData.nip && !validateNIP(formData.nip)) {
      newErrors.nip = 'Nieprawidłowy NIP';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Nieprawidłowy adres e-mail';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});
    setGeneralError(null);

    // Run client-side validation first
    if (!validate()) {
      return;
    }

    try {
      const result = await createClient.mutateAsync(formData);
      // Success - navigate to client detail page
      navigate(`/clients/${result.data.id}`);
    } catch (error: any) {
      // Parse backend errors
      const parsed = parseBackendError(error.backendError || error);

      // Set field-specific errors
      if (Object.keys(parsed.fieldErrors).length > 0) {
        setErrors(parsed.fieldErrors);
      }

      // Set general error if present
      if (parsed.generalError) {
        setGeneralError(parsed.generalError);
      }

      // Scroll to top to show error banner
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/clients" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {ACTION_LABELS.back}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{ACTION_LABELS.newClient}</h1>
      </div>

      {/* Error Banner */}
      {generalError && (
        <ErrorBanner message={generalError} onDismiss={() => setGeneralError(null)} />
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Informacje podstawowe</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {FIELD_LABELS.companyName} *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className={`block w-full px-3 py-2 border ${errors.companyName ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {FIELD_LABELS.clientType}
              </label>
              <select
                value={formData.clientType}
                onChange={(e) => handleChange('clientType', e.target.value as ClientType)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                {Object.entries(CLIENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {FIELD_LABELS.taxForm}
              </label>
              <select
                value={formData.taxForm}
                onChange={(e) => handleChange('taxForm', e.target.value as TaxForm)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                {Object.entries(TAX_FORM_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tax Identifiers */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Identyfikatory podatkowe</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {FIELD_LABELS.nip}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.nip ? formatNIP(formData.nip) : ''}
                  onChange={(e) => handleNIPChange(e.target.value)}
                  placeholder="1234567890"
                  className={`block flex-1 px-3 py-2 border ${errors.nip ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500`}
                />
                <button
                  type="button"
                  onClick={handleGUSLookup}
                  disabled={gusLookup.isPending}
                  className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  title="Pobierz dane z GUS"
                >
                  {gusLookup.isPending ? <Loader className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
                </button>
              </div>
              {errors.nip && <p className="mt-1 text-sm text-red-600">{errors.nip}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {FIELD_LABELS.regon}
              </label>
              <input
                type="text"
                value={formData.regon || ''}
                onChange={(e) => handleChange('regon', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Kontakt</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {FIELD_LABELS.email}
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {FIELD_LABELS.phone}
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Adres</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {FIELD_LABELS.addressStreet}
              </label>
              <input
                type="text"
                value={formData.addressStreet || ''}
                onChange={(e) => handleChange('addressStreet', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {FIELD_LABELS.addressCity}
              </label>
              <input
                type="text"
                value={formData.addressCity || ''}
                onChange={(e) => handleChange('addressCity', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {FIELD_LABELS.addressPostalCode}
              </label>
              <input
                type="text"
                value={formData.addressPostalCode ? formatPostalCode(formData.addressPostalCode) : ''}
                onChange={(e) => handleChange('addressPostalCode', e.target.value.replace(/\D/g, ''))}
                placeholder="00-000"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Link
            to="/clients"
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            {ACTION_LABELS.cancel}
          </Link>
          <button
            type="submit"
            disabled={createClient.isPending}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {createClient.isPending ? (
              <>
                <Loader className="h-5 w-5 inline animate-spin mr-2" />
                Zapisywanie...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 inline mr-2" />
                {ACTION_LABELS.save}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
