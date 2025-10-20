import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
  AgentListParams,
  AgentListResponse,
  ChatInput,
  ChatResponse,
  KnowledgeBase,
  AgentAnalytics,
  SystemPrompt
} from '../types/aiAgent';

// Base URL for AI Agent Module API
const AI_AGENT_API_BASE = 'http://localhost:3005/api/v1';

// Helper function to make API requests
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Get auth token from localStorage (Zustand persisted state)
  const authStorage = localStorage.getItem('auth-storage');
  const token = authStorage ? JSON.parse(authStorage).state?.token : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };

  const response = await fetch(`${AI_AGENT_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// Agent API Functions
export const agentApi = {
  // List agents
  listAgents: (params?: AgentListParams): Promise<AgentListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.status) queryParams.set('status', params.status);

    const queryString = queryParams.toString();
    return fetchAPI(`/agents${queryString ? `?${queryString}` : ''}`);
  },

  // Get single agent
  getAgent: (id: string): Promise<Agent> => {
    return fetchAPI(`/agents/${id}`);
  },

  // Create agent
  createAgent: (data: CreateAgentInput): Promise<Agent> => {
    return fetchAPI('/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update agent
  updateAgent: (id: string, data: UpdateAgentInput): Promise<Agent> => {
    return fetchAPI(`/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete agent
  deleteAgent: (id: string): Promise<void> => {
    return fetchAPI(`/agents/${id}`, {
      method: 'DELETE',
    });
  },

  // Update system prompt
  updateSystemPrompt: (agentId: string, content: string): Promise<SystemPrompt> => {
    return fetchAPI(`/agents/${agentId}/prompt`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // Upload knowledge base files
  uploadKnowledge: async (agentId: string, files: File[]): Promise<KnowledgeBase> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const authStorage = localStorage.getItem('auth-storage');
    const token = authStorage ? JSON.parse(authStorage).state?.token : null;

    const response = await fetch(`${AI_AGENT_API_BASE}/agents/${agentId}/knowledge`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `Upload Error: ${response.status}`);
    }

    return response.json();
  },

  // Send chat message
  chat: (agentId: string, input: ChatInput): Promise<ChatResponse> => {
    return fetchAPI(`/agents/${agentId}/chat`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  // Get agent analytics
  getAnalytics: (agentId: string, period: string = '30d'): Promise<AgentAnalytics> => {
    return fetchAPI(`/agents/${agentId}/analytics?period=${period}`);
  },
};

// React Query Hooks

// List agents
export function useAgents(params?: AgentListParams) {
  return useQuery({
    queryKey: ['agents', params],
    queryFn: () => agentApi.listAgents(params),
    staleTime: 30000, // 30 seconds
  });
}

// Get single agent
export function useAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['agents', id],
    queryFn: () => agentApi.getAgent(id!),
    enabled: !!id,
  });
}

// Create agent mutation
export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: agentApi.createAgent,
    onSuccess: () => {
      // Invalidate and refetch agents list
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

// Update agent mutation
export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAgentInput }) =>
      agentApi.updateAgent(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific agent and list
      queryClient.invalidateQueries({ queryKey: ['agents', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

// Delete agent mutation
export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: agentApi.deleteAgent,
    onSuccess: () => {
      // Invalidate agents list
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

// Upload knowledge mutation
export function useUploadKnowledge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, files }: { agentId: string; files: File[] }) =>
      agentApi.uploadKnowledge(agentId, files),
    onSuccess: (_, variables) => {
      // Invalidate agent data
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId] });
    },
  });
}

// Chat mutation
export function useSendMessage() {
  return useMutation({
    mutationFn: ({ agentId, input }: { agentId: string; input: ChatInput }) =>
      agentApi.chat(agentId, input),
  });
}

// Get analytics
export function useAgentAnalytics(agentId: string | undefined, period: string = '30d') {
  return useQuery({
    queryKey: ['agents', agentId, 'analytics', period],
    queryFn: () => agentApi.getAnalytics(agentId!, period),
    enabled: !!agentId,
  });
}

// Update system prompt mutation
export function useUpdateSystemPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, content }: { agentId: string; content: string }) =>
      agentApi.updateSystemPrompt(agentId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId] });
    },
  });
}
