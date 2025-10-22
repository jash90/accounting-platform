/**
 * Client Detail Page
 * Comprehensive view of single client with tabbed interface
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useClient, useEnrichFromGUS, useValidateVATEU, useDeleteClient } from '../hooks/useCRM';
import { ArrowLeft, Edit, Trash2, RefreshCw, CheckCircle, AlertCircle, Database } from 'lucide-react';
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_COLORS,
  CLIENT_TYPE_LABELS,
  TAX_FORM_LABELS,
  FIELD_LABELS,
  TAB_LABELS,
  ACTION_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
} from '../constants/crm';
import { formatDate, formatOrPlaceholder, formatAddress, formatBoolean } from '../utils/formatters';
import { formatNIP, formatREGON, formatPESEL, formatKRS } from '../utils/validators';

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'timeline' | 'documents' | 'risk'>('overview');

  const { data, isLoading, error, refetch } = useClient(id!);
  const enrichFromGUS = useEnrichFromGUS();
  const validateVAT = useValidateVATEU();
  const deleteClient = useDeleteClient();

  const client = data?.data;
  const contacts = client?.contacts || [];
  const timeline = client?.timeline || [];

  const handleEnrichFromGUS = async () => {
    if (!id) return;
    try {
      await enrichFromGUS.mutateAsync(id);
      alert('Dane zaktualizowane z bazy GUS');
    } catch (error) {
      alert('Błąd podczas pobierania danych z GUS');
    }
  };

  const handleValidateVAT = async () => {
    if (!id) return;
    try {
      const result = await validateVAT.mutateAsync(id);
      alert(result.message);
    } catch (error) {
      alert('Błąd podczas walidacji VAT');
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Czy na pewno chcesz usunąć tego klienta?')) return;
    try {
      await deleteClient.mutateAsync(id);
      alert('Klient usunięty');
      navigate('/clients');
    } catch (error) {
      alert('Błąd podczas usuwania klienta');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">Błąd podczas ładowania klienta</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/clients" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {ACTION_LABELS.back}
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.companyName}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {client.nip && `NIP: ${formatNIP(client.nip)}`}
              {client.regon && ` | REGON: ${formatREGON(client.regon)}`}
            </p>
          </div>
          <div className="flex gap-2">
            {client.nip && (
              <button
                onClick={handleEnrichFromGUS}
                disabled={enrichFromGUS.isPending}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <Database className="h-5 w-5 inline mr-2" />
                {ACTION_LABELS.enrichFromGUS}
              </button>
            )}
            <Link
              to={`/clients/${id}/edit`}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-5 w-5 inline mr-2" />
              {ACTION_LABELS.edit}
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              <Trash2 className="h-5 w-5 inline mr-2" />
              {ACTION_LABELS.delete}
            </button>
          </div>
        </div>

        {/* Status Badges */}
        <div className="mt-4 flex gap-2">
          {client.status && (
            <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${CLIENT_STATUS_COLORS[client.status].bg} ${CLIENT_STATUS_COLORS[client.status].text}`}>
              {CLIENT_STATUS_LABELS[client.status]}
            </span>
          )}
          {client.riskLevel && (
            <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${RISK_LEVEL_COLORS[client.riskLevel as keyof typeof RISK_LEVEL_COLORS].bg} ${RISK_LEVEL_COLORS[client.riskLevel as keyof typeof RISK_LEVEL_COLORS].text}`}>
              Ryzyko: {RISK_LEVEL_LABELS[client.riskLevel as keyof typeof RISK_LEVEL_LABELS]}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {(['overview', 'contacts', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informacje podstawowe</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">{FIELD_LABELS.companyName}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{client.companyName}</dd>
                </div>
                {client.shortName && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{FIELD_LABELS.shortName}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.shortName}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">{FIELD_LABELS.clientType}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{CLIENT_TYPE_LABELS[client.clientType]}</dd>
                </div>
                {client.nip && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{FIELD_LABELS.nip}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatNIP(client.nip)}</dd>
                  </div>
                )}
                {client.regon && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{FIELD_LABELS.regon}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatREGON(client.regon)}</dd>
                  </div>
                )}
                {client.krs && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{FIELD_LABELS.krs}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatKRS(client.krs)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Kontakt</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">{FIELD_LABELS.email}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatOrPlaceholder(client.email)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">{FIELD_LABELS.phone}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatOrPlaceholder(client.phone)}</dd>
                </div>
                {client.website && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{FIELD_LABELS.website}</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800">
                        {client.website}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Adres</h3>
              <p className="text-sm text-gray-900">
                {formatAddress({
                  street: client.addressStreet,
                  city: client.addressCity,
                  postalCode: client.addressPostalCode,
                  province: client.addressProvince,
                  country: client.addressCountry,
                })}
              </p>
            </div>

            {/* Tax Configuration */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Konfiguracja podatkowa</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                {client.taxForm && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{FIELD_LABELS.taxForm}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{TAX_FORM_LABELS[client.taxForm]}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">{FIELD_LABELS.vatPayer}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatBoolean(client.vatPayer)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{TAB_LABELS.contacts}</h3>
            {contacts.length === 0 ? (
              <p className="text-sm text-gray-500">Brak kontaktów</p>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {contact.firstName} {contact.lastName}
                          {contact.isPrimary && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-primary-100 text-primary-800 rounded">Główny</span>
                          )}
                        </p>
                        {contact.position && <p className="text-sm text-gray-500">{contact.position}</p>}
                        {contact.email && <p className="text-sm text-gray-600 mt-1">{contact.email}</p>}
                        {contact.phone && <p className="text-sm text-gray-600">{contact.phone}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{TAB_LABELS.timeline}</h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-500">Brak wydarzeń w historii</p>
            ) : (
              <div className="space-y-4">
                {timeline.map((event) => (
                  <div key={event.id} className="border-l-2 border-gray-200 pl-4">
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">{formatDate(event.occurredAt, 'relative')}</p>
                    {event.description && <p className="text-sm text-gray-600 mt-1">{event.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
