import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Paperclip,
  Mic,
  Settings,
  Download,
  RefreshCw,
  ChevronLeft,
} from 'lucide-react';
import { useAgent, useSendMessage } from '../../api/aiAgentApi';
import { useAIAgentStore } from '../../stores/aiAgent';
import { ChatMessage, TypingIndicator } from '../../components/ai-agents/ChatMessage';
import { ConversationHistory } from '../../components/ai-agents/ConversationHistory';
import type { ChatMessage as ChatMessageType } from '../../types/aiAgent';

export function AgentChat() {
  const { agentId } = useParams<{ agentId?: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { selectedAgent, setSelectedAgent, conversations, addMessage, chatDrafts, setChatDraft } =
    useAIAgentStore();

  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Fetch agent details if agentId is provided
  const { data: agent, isLoading: isLoadingAgent } = useAgent(agentId);
  const sendMessage = useSendMessage();

  // Update selected agent when fetched
  useEffect(() => {
    if (agent && (!selectedAgent || selectedAgent.id !== agent.id)) {
      setSelectedAgent(agent);
    }
  }, [agent, selectedAgent, setSelectedAgent]);

  // Load chat draft when agent changes
  useEffect(() => {
    if (agentId && chatDrafts[agentId]) {
      setInputMessage(chatDrafts[agentId]);
    } else {
      setInputMessage('');
    }
  }, [agentId, chatDrafts]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, agentId]);

  // Current messages for this agent
  const currentMessages = agentId ? conversations[agentId] || [] : [];

  // Sample conversation history (in real app, fetch from API)
  const conversationHistory = [
    { id: '1', title: 'VAT Calculation Query', timestamp: 'Today at 10:30 AM', preview: 'Can you help me calculate VAT...' },
    { id: '2', title: 'Invoice Processing Help', timestamp: 'Yesterday at 2:15 PM', preview: 'How do I process this invoice...' },
    { id: '3', title: 'Tax Report Generation', timestamp: 'Mar 15 at 9:45 AM', preview: 'Generate a report for Q1...' },
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !agentId || !selectedAgent) return;

    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Add user message immediately
    addMessage(agentId, userMessage);
    setInputMessage('');
    setChatDraft(agentId, '');
    setIsStreaming(true);

    try {
      // Send to API
      const response = await sendMessage.mutateAsync({
        agentId,
        input: {
          message: inputMessage,
        },
      });

      // Add AI response
      const aiMessage: ChatMessageType = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metadata: response.metadata,
        sources: response.sources,
      };

      addMessage(agentId, aiMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage: ChatMessageType = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addMessage(agentId, errorMessage);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (value: string) => {
    setInputMessage(value);
    if (agentId) {
      setChatDraft(agentId, value);
    }
  };

  if (!agentId) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">No agent selected</p>
          <p className="text-gray-500 mb-4">Select an agent to start chatting</p>
          <button
            onClick={() => navigate('/ai-agents')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse Agents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex h-[calc(100vh-4rem)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/ai-agents')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {isLoadingAgent ? (
              <div className="animate-pulse flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center text-xl">
                  {selectedAgent?.avatar || '🤖'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedAgent?.name || 'Unknown Agent'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedAgent?.model.name || 'No model'}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {currentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start a conversation with your AI agent</p>
            </div>
          ) : (
            <>
              {currentMessages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isStreaming && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-end space-x-3">
            <button className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors">
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={1}
                disabled={!selectedAgent || isStreaming}
              />
            </div>

            <button className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors">
              <Mic className="w-5 h-5 text-gray-600" />
            </button>

            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isStreaming || !selectedAgent}
              className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Conversation History */}
      <div className="hidden lg:block">
        <ConversationHistory
          conversations={conversationHistory}
          activeId={null}
          onSelect={(id) => console.log('Load conversation:', id)}
        />
      </div>
    </div>
  );
}
