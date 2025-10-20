// AI Agent Module TypeScript Interfaces

export interface ModelConfig {
  name: string;
  provider: 'openai' | 'anthropic';
  version?: string;
}

export interface SystemPrompt {
  id: string;
  agentId: string;
  content: string;
  variables?: any[];
  examples?: any[];
  constraints?: string[];
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'archived';
  model: ModelConfig;
  temperature?: number;
  maxTokens?: number;
  maxInputTokens?: number;
  stopSequences?: string[];
  integrations?: AgentIntegration[];
  knowledgeSearchSettings?: SearchSettings;
  metadata?: Record<string, any>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  // Virtual fields for UI
  conversations?: number;
  successRate?: number;
  lastActive?: string;
  avatar?: string;
}

export interface AgentIntegration {
  moduleId: string;
  enabled: boolean;
  permissions: string[];
  dataMapping: DataMapping[];
}

export interface DataMapping {
  source: string;
  target: string;
}

export interface SearchSettings {
  enabled: boolean;
  topK: number;
  scoreThreshold: number;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  model: ModelConfig;
  temperature?: number;
  maxTokens?: number;
  maxInputTokens?: number;
  stopSequences?: string[];
  integrations?: AgentIntegration[];
  knowledgeSearchSettings?: SearchSettings;
  systemPrompt?: {
    content: string;
    variables?: any[];
    examples?: any[];
    constraints?: string[];
  };
  metadata?: Record<string, any>;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';
  temperature?: number;
  maxTokens?: number;
  maxInputTokens?: number;
  stopSequences?: string[];
  integrations?: AgentIntegration[];
  knowledgeSearchSettings?: SearchSettings;
  metadata?: Record<string, any>;
}

export interface KnowledgeBase {
  id: string;
  agentId: string;
  name: string;
  files: KnowledgeFile[];
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  totalChunks: number;
  totalTokens: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface KnowledgeFile {
  fileName: string;
  fileType: string;
  fileSize: number;
  status?: 'pending' | 'processing' | 'indexed' | 'failed';
  chunks?: number;
  tokens?: number;
}

export interface Conversation {
  id: string;
  agentId: string;
  userId: string;
  title?: string;
  status: 'active' | 'completed' | 'archived';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
}

export interface ConversationTurn {
  id: string;
  conversationId: string;
  userMessage: string;
  assistantMessage: string;
  sources?: any[];
  metadata?: any;
  usage?: TokenUsage;
  executionTime?: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
  sources?: any[];
}

export interface ChatInput {
  message: string;
  conversationId?: string;
  context?: Record<string, any>;
}

export interface ChatResponse {
  id: string;
  agentId: string;
  message: string;
  sources?: any[];
  metadata?: {
    model: string;
    executionTime: number;
    confidence: number;
  };
  usage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

export interface AgentAnalytics {
  agentId: string;
  period: string;
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageExecutionTime: number;
  successRate: number;
  popularQueries: string[];
}

export interface AgentListResponse {
  agents: Agent[];
  total: number;
  page: number;
  limit: number;
}

export interface AgentListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

// UI-specific types
export type ViewMode = 'grid' | 'list';

export interface AIAgentUIState {
  selectedAgent: Agent | null;
  activeConversation: string | null;
  viewMode: ViewMode;
  sidebarCollapsed: boolean;
}
