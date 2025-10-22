/**
 * CRM API Client
 * Type-safe API client for CRM backend (http://localhost:3002/api/crm)
 */

import type {
  Client,
  ClientContact,
  ClientTimelineEvent,
  ClientDocument,
  CreateClientRequest,
  UpdateClientRequest,
  ListClientsQuery,
  ClientsListResponse,
  ClientDetailResponse,
  ValidationResponse,
} from '@accounting-platform/shared-types';

const CRM_API_BASE = 'http://localhost:3002/api/crm';

// Helper to get user ID (temporary until auth integration)
const getUserId = (): string => {
  // TODO: Get from auth store when integrated
  return 'temp-user-id';
};

// Helper for fetch with error handling
async function fetchCRM<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${CRM_API_BASE}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': getUserId(),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Create enhanced error with structured backend error
      const errorMessage = typeof data.error === 'string'
        ? data.error
        : data.error?.message || 'Błąd walidacji danych';

      const error: any = new Error(errorMessage);
      error.backendError = data.error; // Preserve full backend error structure
      error.statusCode = response.status;
      error.response = data;

      throw error;
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Nieoczekiwany błąd podczas komunikacji z serwerem');
  }
}

// ============================================================================
// Client CRUD Operations
// ============================================================================

export const crmApi = {
  /**
   * List clients with pagination and filtering
   */
  async listClients(query: ListClientsQuery = {}): Promise<ClientsListResponse> {
    const params = new URLSearchParams();

    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.status) params.append('status', query.status);
    if (query.search) params.append('search', query.search);
    if (query.clientType) params.append('clientType', query.clientType);
    if (query.assignedUserId) params.append('assignedUserId', query.assignedUserId);

    const queryString = params.toString();
    const endpoint = queryString ? `/clients?${queryString}` : '/clients';

    return fetchCRM<ClientsListResponse>(endpoint);
  },

  /**
   * Get single client with all relations
   */
  async getClient(id: string): Promise<ClientDetailResponse> {
    return fetchCRM<ClientDetailResponse>(`/clients/${id}`);
  },

  /**
   * Create new client
   */
  async createClient(data: CreateClientRequest): Promise<{ success: boolean; data: Client; message: string }> {
    return fetchCRM<{ success: boolean; data: Client; message: string }>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update existing client
   */
  async updateClient(
    id: string,
    data: UpdateClientRequest
  ): Promise<{ success: boolean; data: Client; message: string }> {
    return fetchCRM<{ success: boolean; data: Client; message: string }>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Soft delete client
   */
  async deleteClient(id: string): Promise<{ success: boolean; message: string }> {
    return fetchCRM<{ success: boolean; message: string }>(`/clients/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Restore soft-deleted client
   */
  async restoreClient(id: string): Promise<{ success: boolean; data: Client; message: string }> {
    return fetchCRM<{ success: boolean; data: Client; message: string }>(`/clients/${id}/restore`, {
      method: 'POST',
    });
  },

  // ============================================================================
  // Search Operations
  // ============================================================================

  /**
   * Full-text search clients
   */
  async searchClients(query: string, limit = 10): Promise<{ success: boolean; data: Client[] }> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
    });

    return fetchCRM<{ success: boolean; data: Client[] }>(`/search?${params.toString()}`);
  },

  // ============================================================================
  // Data Enrichment & Validation
  // ============================================================================

  /**
   * Enrich client data from GUS API
   */
  async enrichFromGUS(clientId: string): Promise<{ success: boolean; data: Client; message: string }> {
    return fetchCRM<{ success: boolean; data: Client; message: string }>(
      `/clients/${clientId}/enrich-gus`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Validate EU VAT number via VIES
   */
  async validateVATEU(
    clientId: string
  ): Promise<{ success: boolean; data: ValidationResponse; message: string }> {
    return fetchCRM<{ success: boolean; data: ValidationResponse; message: string }>(
      `/clients/${clientId}/validate-vat`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Validate NIP number
   */
  async validateNIP(nip: string): Promise<{
    success: boolean;
    data: { valid: boolean; formatted: string; original: string };
  }> {
    return fetchCRM<{
      success: boolean;
      data: { valid: boolean; formatted: string; original: string };
    }>('/validate/nip', {
      method: 'POST',
      body: JSON.stringify({ nip }),
    });
  },

  /**
   * Validate REGON number
   */
  async validateREGON(regon: string): Promise<{
    success: boolean;
    data: { valid: boolean; formatted: string; original: string };
  }> {
    return fetchCRM<{
      success: boolean;
      data: { valid: boolean; formatted: string; original: string };
    }>('/validate/regon', {
      method: 'POST',
      body: JSON.stringify({ regon }),
    });
  },

  /**
   * Lookup company data from GUS by NIP
   */
  async lookupGUS(nip: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return fetchCRM<{
      success: boolean;
      data?: any;
      error?: string;
    }>('/gus/lookup', {
      method: 'POST',
      body: JSON.stringify({ nip }),
    });
  },

  // ============================================================================
  // Contact Management
  // ============================================================================

  /**
   * Add contact to client
   */
  async addContact(
    clientId: string,
    contact: Omit<ClientContact, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; data: ClientContact; message: string }> {
    return fetchCRM<{ success: boolean; data: ClientContact; message: string }>(
      `/clients/${clientId}/contacts`,
      {
        method: 'POST',
        body: JSON.stringify(contact),
      }
    );
  },

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * Health check endpoint
   */
  async health(): Promise<{
    success: boolean;
    status: string;
    timestamp: string;
    services: Record<string, string>;
  }> {
    return fetchCRM<{
      success: boolean;
      status: string;
      timestamp: string;
      services: Record<string, string>;
    }>('/health');
  },
};

export default crmApi;
