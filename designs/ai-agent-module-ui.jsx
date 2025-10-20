import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, Plus, Bot, MessageSquare, Database, Settings, BarChart, Search, Filter, Grid, List, Send, Paperclip, Mic, Download, Upload, FileText, Brain, Sparkles, AlertCircle, CheckCircle, Clock, TrendingUp, Users, DollarSign, Zap, Book, Code, Globe, Lock, Star, MoreVertical, X, ChevronDown, Copy, RefreshCw, Trash2, Edit, Eye, Play, Pause, Archive } from 'lucide-react';

const AIAgentModule = () => {
  // State Management
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [agents, setAgents] = useState([
    {
      id: 1,
      name: 'Tax Assistant',
      description: 'Specialized in tax calculations and compliance',
      status: 'active',
      model: 'GPT-4 Turbo',
      avatar: '🧮',
      conversations: 156,
      successRate: 94,
      lastActive: '2 hours ago',
      temperature: 0.7,
      maxTokens: 2000,
      knowledge: ['Tax Laws 2024', 'Polish Tax System', 'VAT Guidelines'],
      systemPrompt: 'You are a tax specialist assistant...'
    },
    {
      id: 2,
      name: 'Invoice Processor',
      description: 'Automated invoice processing and data extraction',
      status: 'active',
      model: 'Claude 3 Opus',
      avatar: '📄',
      conversations: 89,
      successRate: 97,
      lastActive: '5 mins ago',
      temperature: 0.3,
      maxTokens: 1500,
      knowledge: ['Invoice Templates', 'OCR Training Data'],
      systemPrompt: 'You process and extract data from invoices...'
    },
    {
      id: 3,
      name: 'Client Support Bot',
      description: '24/7 client support for accounting queries',
      status: 'inactive',
      model: 'GPT-4',
      avatar: '💬',
      conversations: 234,
      successRate: 88,
      lastActive: '1 day ago',
      temperature: 0.8,
      maxTokens: 1000,
      knowledge: ['FAQ Database', 'Support Scripts'],
      systemPrompt: 'You are a friendly support assistant...'
    },
    {
      id: 4,
      name: 'Report Generator',
      description: 'Generates financial reports and analytics',
      status: 'active',
      model: 'GPT-4 Turbo',
      avatar: '📊',
      conversations: 67,
      successRate: 92,
      lastActive: '30 mins ago',
      temperature: 0.5,
      maxTokens: 3000,
      knowledge: ['Report Templates', 'Financial Metrics'],
      systemPrompt: 'You generate comprehensive financial reports...'
    }
  ]);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    model: 'GPT-4 Turbo',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: '',
    knowledge: []
  });

  // Sample messages for chat
  const sampleMessages = [
    { id: 1, role: 'user', content: 'Can you help me calculate VAT for my latest invoice?', timestamp: '10:30 AM' },
    { id: 2, role: 'assistant', content: 'Of course! I\'d be happy to help you calculate VAT. Could you please provide me with the invoice details including the net amount and the applicable VAT rate?', timestamp: '10:31 AM' },
    { id: 3, role: 'user', content: 'The net amount is 5000 PLN and it\'s standard 23% VAT rate', timestamp: '10:32 AM' },
    { id: 4, role: 'assistant', content: 'Based on your invoice details:\n\n**Net Amount:** 5,000 PLN\n**VAT Rate:** 23%\n**VAT Amount:** 1,150 PLN\n**Gross Amount:** 6,150 PLN\n\nThe VAT calculation is: 5,000 PLN × 23% = 1,150 PLN\n\nWould you like me to help you with anything else regarding this invoice?', timestamp: '10:32 AM' }
  ];

  // Analytics data
  const analyticsData = {
    totalAgents: 4,
    activeConversations: 12,
    tokensUsed: '145.2k',
    successRate: 92.75,
    monthlyTrend: [
      { month: 'Jan', conversations: 320, tokens: 45000 },
      { month: 'Feb', conversations: 380, tokens: 52000 },
      { month: 'Mar', conversations: 420, tokens: 58000 }
    ]
  };

  // Filtered agents based on search
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [agents, searchQuery]);

  // Send message handler
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const newMessage = {
      id: messages.length + 1,
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, newMessage]);
    setInputMessage('');
    setIsStreaming(true);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        role: 'assistant',
        content: 'I understand your request. Let me help you with that...',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsStreaming(false);
    }, 1500);
  };

  // Create agent handler
  const handleCreateAgent = () => {
    const agent = {
      id: agents.length + 1,
      ...newAgent,
      status: 'active',
      avatar: '🤖',
      conversations: 0,
      successRate: 0,
      lastActive: 'Just created',
      knowledge: []
    };
    setAgents([...agents, agent]);
    setShowCreateModal(false);
    setNewAgent({
      name: '',
      description: '',
      model: 'GPT-4 Turbo',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: '',
      knowledge: []
    });
  };

  // Component: Navigation Sidebar
  const Sidebar = () => (
    <div className="w-64 bg-gray-900 text-white h-full flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold">AI Agent Hub</h1>
            <p className="text-xs text-gray-400">Accounting CRM Platform</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
              activeView === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            <Grid className="w-5 h-5" />
            <span>Agent Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveView('chat')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
              activeView === 'chat' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Chat Interface</span>
          </button>
          
          <button
            onClick={() => setActiveView('knowledge')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
              activeView === 'knowledge' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            <Database className="w-5 h-5" />
            <span>Knowledge Base</span>
          </button>
          
          <button
            onClick={() => setActiveView('analytics')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
              activeView === 'analytics' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            <BarChart className="w-5 h-5" />
            <span>Analytics</span>
          </button>
          
          <button
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
              activeView === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-800">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4">
          <p className="text-sm font-medium mb-1">Token Usage</p>
          <p className="text-2xl font-bold">145.2k</p>
          <div className="w-full bg-white/20 rounded-full h-2 mt-2">
            <div className="bg-white rounded-full h-2 w-3/4"></div>
          </div>
          <p className="text-xs mt-1 opacity-90">75% of monthly limit</p>
        </div>
      </div>
    </div>
  );

  // Component: Agent Card
  const AgentCard = ({ agent }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center text-2xl">
            {agent.avatar}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-500">{agent.model}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
          agent.status === 'active' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {agent.status}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{agent.description}</p>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Conversations</p>
          <p className="font-semibold text-gray-900">{agent.conversations}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Success Rate</p>
          <p className="font-semibold text-gray-900">{agent.successRate}%</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{agent.lastActive}</span>
        </span>
        <div className="flex space-x-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAgent(agent);
              setActiveView('chat');
              setMessages(sampleMessages);
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );

  // Component: Dashboard View
  const DashboardView = () => (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Agents Dashboard</h2>
          <p className="text-gray-600">Manage and monitor your AI agents for accounting automation</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Total Agents</span>
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analyticsData.totalAgents}</p>
            <p className="text-xs text-green-600 mt-1">+2 this month</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Active Chats</span>
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analyticsData.activeConversations}</p>
            <p className="text-xs text-gray-500 mt-1">Live now</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Token Usage</span>
              <Zap className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analyticsData.tokensUsed}</p>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Success Rate</span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analyticsData.successRate}%</p>
            <p className="text-xs text-green-600 mt-1">↑ 3.2%</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
              />
            </div>
            
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Agent</span>
            </button>
          </div>
        </div>

        {/* Agents Grid */}
        <div className={viewMode === 'grid' ? "grid grid-cols-3 gap-4" : "space-y-4"}>
          {filteredAgents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );

  // Component: Chat View
  const ChatView = () => (
    <div className="flex-1 bg-gray-50 flex">
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center text-xl">
              {selectedAgent?.avatar || '🤖'}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{selectedAgent?.name || 'Select an Agent'}</h3>
              <p className="text-sm text-gray-500">{selectedAgent?.model || 'No agent selected'}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Download className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4" />
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Start a conversation with your AI agent</p>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`rounded-lg px-4 py-2.5 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className={`text-xs text-gray-500 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    {message.timestamp}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {isStreaming && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2.5">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-end space-x-3">
            <button className="p-2.5 hover:bg-gray-100 rounded-lg">
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={1}
              />
            </div>
            
            <button className="p-2.5 hover:bg-gray-100 rounded-lg">
              <Mic className="w-5 h-5 text-gray-600" />
            </button>
            
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isStreaming}
              className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Conversation History */}
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Conversation History</h3>
        <div className="space-y-2">
          <div className="p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300">
            <p className="text-sm font-medium text-gray-900">VAT Calculation Query</p>
            <p className="text-xs text-gray-500 mt-1">Today at 10:30 AM</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300">
            <p className="text-sm font-medium text-gray-900">Invoice Processing Help</p>
            <p className="text-xs text-gray-500 mt-1">Yesterday at 2:15 PM</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300">
            <p className="text-sm font-medium text-gray-900">Tax Report Generation</p>
            <p className="text-xs text-gray-500 mt-1">Mar 15 at 9:45 AM</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Component: Create Agent Modal
  const CreateAgentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Create New AI Agent</h2>
            <button 
              onClick={() => setShowCreateModal(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Tax Assistant"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({...newAgent, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe what this agent will do..."
                />
              </div>
            </div>
          </div>

          {/* Model Configuration */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Model Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
                <select
                  value={newAgent.model}
                  onChange={(e) => setNewAgent({...newAgent, model: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>GPT-4 Turbo</option>
                  <option>GPT-4</option>
                  <option>Claude 3 Opus</option>
                  <option>Claude 3 Sonnet</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature: {newAgent.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={newAgent.temperature}
                  onChange={(e) => setNewAgent({...newAgent, temperature: parseFloat(e.target.value)})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
                <input
                  type="number"
                  value={newAgent.maxTokens}
                  onChange={(e) => setNewAgent({...newAgent, maxTokens: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">System Prompt</h3>
            <textarea
              value={newAgent.systemPrompt}
              onChange={(e) => setNewAgent({...newAgent, systemPrompt: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Define the agent's behavior, expertise, and constraints..."
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => setShowCreateModal(false)}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateAgent}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Agent
          </button>
        </div>
      </div>
    </div>
  );

  // Main Render
  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      
      {activeView === 'dashboard' && <DashboardView />}
      {activeView === 'chat' && <ChatView />}
      
      {activeView === 'knowledge' && (
        <div className="flex-1 bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Knowledge Base Manager</h2>
            
            {/* Upload Area */}
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center mb-6">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drop files here or click to browse</p>
              <p className="text-sm text-gray-500">Supported: PDF, DOCX, TXT, CSV</p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Select Files
              </button>
            </div>

            {/* Document List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Uploaded Documents</h3>
              </div>
              <div className="divide-y divide-gray-200">
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Tax Laws 2024.pdf</p>
                      <p className="text-sm text-gray-500">2.4 MB • Uploaded 2 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Indexed</span>
                    <button className="p-1.5 hover:bg-gray-100 rounded">
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-100 rounded">
                      <Trash2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeView === 'analytics' && (
        <div className="flex-1 bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Token Usage Trend</h3>
                <div className="h-48 flex items-end space-x-2">
                  {analyticsData.monthlyTrend.map((data, i) => (
                    <div key={i} className="flex-1">
                      <div 
                        className="bg-blue-600 rounded-t"
                        style={{height: `${(data.tokens / 60000) * 100}%`}}
                      ></div>
                      <p className="text-xs text-center mt-2">{data.month}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Agent Performance</h3>
                <div className="space-y-3">
                  {agents.slice(0, 3).map(agent => (
                    <div key={agent.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{agent.avatar}</span>
                        <span className="text-sm font-medium">{agent.name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">{agent.conversations} chats</span>
                        <span className="text-sm font-semibold text-green-600">{agent.successRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeView === 'settings' && (
        <div className="flex-1 bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">API Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
                    <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="sk-..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anthropic API Key</label>
                    <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="sk-..." />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Usage Limits</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Token Limit</label>
                    <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="200000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Concurrent Chats</label>
                    <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && <CreateAgentModal />}
      
      <style jsx>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }
        .animate-bounce { animation: bounce 1.4s infinite; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default AIAgentModule;