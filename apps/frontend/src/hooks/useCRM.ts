/**
 * CRM React Query Hooks
 * Custom hooks for CRM data fetching with TanStack Query
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { crmApi } from '../api/crm.api';
import type {
  Client,
  ClientContact,
  CreateClientRequest,
  UpdateClientRequest,
  ListClientsQuery,
  ClientsListResponse,
  ClientDetailResponse,
} from '@accounting-platform/shared-types';

// ============================================================================
// Query Keys
// ============================================================================

export const crmKeys = {
  all: ['crm'] as const,
  clients: () => [...crmKeys.all, 'clients'] as const,
  clientsList: (filters?: ListClientsQuery) => [...crmKeys.clients(), 'list', filters] as const,
  client: (id: string) => [...crmKeys.clients(), id] as const,
  clientDetail: (id: string) => [...crmKeys.client(id), 'detail'] as const,
  search: (query: string) => [...crmKeys.clients(), 'search', query] as const,
};

// ============================================================================
// Client List Queries
// ============================================================================

/**
 * Fetch paginated client list with filters
 */
export function useClients(
  query: ListClientsQuery = {},
  options?: Omit<UseQueryOptions<ClientsListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: crmKeys.clientsList(query),
    queryFn: () => crmApi.listClients(query),
    ...options,
  });
}

/**
 * Search clients by query
 */
export function useClientSearch(
  searchQuery: string,
  options?: Omit<UseQueryOptions<{ success: boolean; data: Client[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: crmKeys.search(searchQuery),
    queryFn: () => crmApi.searchClients(searchQuery),
    enabled: searchQuery.length > 0,
    ...options,
  });
}

// ============================================================================
// Client Detail Queries
// ============================================================================

/**
 * Fetch single client with all relations
 */
export function useClient(
  id: string,
  options?: Omit<UseQueryOptions<ClientDetailResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: crmKeys.clientDetail(id),
    queryFn: () => crmApi.getClient(id),
    enabled: !!id,
    ...options,
  });
}

// ============================================================================
// Client Mutations
// ============================================================================

/**
 * Create new client
 */
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientRequest) => crmApi.createClient(data),
    onSuccess: () => {
      // Invalidate all client lists to refetch
      queryClient.invalidateQueries({ queryKey: crmKeys.clients() });
    },
  });
}

/**
 * Update existing client
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientRequest }) =>
      crmApi.updateClient(id, data),
    onSuccess: (response, variables) => {
      // Invalidate specific client
      queryClient.invalidateQueries({ queryKey: crmKeys.client(variables.id) });
      // Invalidate all client lists
      queryClient.invalidateQueries({ queryKey: crmKeys.clients() });
    },
  });
}

/**
 * Delete client (soft delete)
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmApi.deleteClient(id),
    onSuccess: (_, id) => {
      // Invalidate specific client
      queryClient.invalidateQueries({ queryKey: crmKeys.client(id) });
      // Invalidate all client lists
      queryClient.invalidateQueries({ queryKey: crmKeys.clients() });
    },
  });
}

/**
 * Restore soft-deleted client
 */
export function useRestoreClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmApi.restoreClient(id),
    onSuccess: (_, id) => {
      // Invalidate specific client
      queryClient.invalidateQueries({ queryKey: crmKeys.client(id) });
      // Invalidate all client lists
      queryClient.invalidateQueries({ queryKey: crmKeys.clients() });
    },
  });
}

// ============================================================================
// Data Enrichment Mutations
// ============================================================================

/**
 * Enrich client data from GUS
 */
export function useEnrichFromGUS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => crmApi.enrichFromGUS(clientId),
    onSuccess: (response, clientId) => {
      // Update client cache with enriched data
      queryClient.setQueryData(crmKeys.clientDetail(clientId), (old: ClientDetailResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            ...response.data,
          },
        };
      });
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: crmKeys.client(clientId) });
    },
  });
}

/**
 * Validate EU VAT number
 */
export function useValidateVATEU() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => crmApi.validateVATEU(clientId),
    onSuccess: (_, clientId) => {
      // Invalidate client to refetch with updated validation status
      queryClient.invalidateQueries({ queryKey: crmKeys.client(clientId) });
    },
  });
}

/**
 * Lookup company by NIP from GUS
 */
export function useGUSLookup() {
  return useMutation({
    mutationFn: (nip: string) => crmApi.lookupGUS(nip),
  });
}

// ============================================================================
// Validation Mutations
// ============================================================================

/**
 * Validate NIP number
 */
export function useValidateNIP() {
  return useMutation({
    mutationFn: (nip: string) => crmApi.validateNIP(nip),
  });
}

/**
 * Validate REGON number
 */
export function useValidateREGON() {
  return useMutation({
    mutationFn: (regon: string) => crmApi.validateREGON(regon),
  });
}

// ============================================================================
// Contact Mutations
// ============================================================================

/**
 * Add contact to client
 */
export function useAddContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      contact,
    }: {
      clientId: string;
      contact: Omit<ClientContact, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>;
    }) => crmApi.addContact(clientId, contact),
    onSuccess: (_, variables) => {
      // Invalidate client detail to refetch with new contact
      queryClient.invalidateQueries({ queryKey: crmKeys.clientDetail(variables.clientId) });
    },
  });
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Delete multiple clients
 */
export function useBulkDeleteClients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Execute delete for each client
      const results = await Promise.allSettled(ids.map((id) => crmApi.deleteClient(id)));
      return {
        succeeded: results.filter((r) => r.status === 'fulfilled').length,
        failed: results.filter((r) => r.status === 'rejected').length,
      };
    },
    onSuccess: () => {
      // Invalidate all client queries
      queryClient.invalidateQueries({ queryKey: crmKeys.clients() });
    },
  });
}

/**
 * Update multiple clients with same data
 */
export function useBulkUpdateClients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, data }: { ids: string[]; data: UpdateClientRequest }) => {
      // Execute update for each client
      const results = await Promise.allSettled(ids.map((id) => crmApi.updateClient(id, data)));
      return {
        succeeded: results.filter((r) => r.status === 'fulfilled').length,
        failed: results.filter((r) => r.status === 'rejected').length,
      };
    },
    onSuccess: () => {
      // Invalidate all client queries
      queryClient.invalidateQueries({ queryKey: crmKeys.clients() });
    },
  });
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check CRM backend health
 */
export function useCRMHealth() {
  return useQuery({
    queryKey: [...crmKeys.all, 'health'],
    queryFn: () => crmApi.health(),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}
