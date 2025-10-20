import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Agent, ChatMessage, ViewMode } from '../types/aiAgent';

interface AIAgentState {
  // Selected agent
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;

  // Active conversations (agent ID -> messages)
  conversations: Record<string, ChatMessage[]>;
  addMessage: (agentId: string, message: ChatMessage) => void;
  setConversation: (agentId: string, messages: ChatMessage[]) => void;
  clearConversation: (agentId: string) => void;

  // Chat input drafts (agent ID -> draft text)
  chatDrafts: Record<string, string>;
  setChatDraft: (agentId: string, draft: string) => void;

  // UI Preferences
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Active conversation ID
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Reset all state
  reset: () => void;
}

const initialState = {
  selectedAgent: null,
  conversations: {},
  chatDrafts: {},
  viewMode: 'grid' as ViewMode,
  searchQuery: '',
  activeConversationId: null,
};

export const useAIAgentStore = create<AIAgentState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSelectedAgent: (agent) => set({ selectedAgent: agent }),

      addMessage: (agentId, message) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [agentId]: [...(state.conversations[agentId] || []), message],
          },
        })),

      setConversation: (agentId, messages) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [agentId]: messages,
          },
        })),

      clearConversation: (agentId) =>
        set((state) => {
          const conversations = { ...state.conversations };
          delete conversations[agentId];
          return { conversations };
        }),

      setChatDraft: (agentId, draft) =>
        set((state) => ({
          chatDrafts: {
            ...state.chatDrafts,
            [agentId]: draft,
          },
        })),

      setViewMode: (mode) => set({ viewMode: mode }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setActiveConversationId: (id) => set({ activeConversationId: id }),

      reset: () => set(initialState),
    }),
    {
      name: 'ai-agent-storage',
      partialize: (state) => ({
        selectedAgent: state.selectedAgent,
        viewMode: state.viewMode,
        conversations: state.conversations,
        chatDrafts: state.chatDrafts,
      }),
    }
  )
);
