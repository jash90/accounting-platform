import React, { useState } from 'react';
import { Bot, MessageSquare, Zap, TrendingUp, Search, Filter, Grid, List, Plus } from 'lucide-react';
import { useAgents } from '../../api/aiAgentApi';
import { useAIAgentStore } from '../../stores/aiAgent';
import { AgentCard } from '../../components/ai-agents/AgentCard';
import { StatsCard } from '../../components/ai-agents/StatsCard';
import { CreateAgentModal } from '../../components/ai-agents/CreateAgentModal';

export function AIAgentDashboard() {
  const { viewMode, setViewMode, searchQuery, setSearchQuery } = useAIAgentStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Fetch agents from API
  const { data: agentsData, isLoading, error } = useAgents({
    page: 1,
    limit: 100,
    status: statusFilter,
  });

  // Filter agents based on search query
  const filteredAgents = React.useMemo(() => {
    if (!agentsData?.agents) return [];
    if (!searchQuery) return agentsData.agents;

    return agentsData.agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [agentsData?.agents, searchQuery]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const agents = agentsData?.agents || [];
    const totalAgents = agents.length;
    const activeAgents = agents.filter((a) => a.status === 'active').length;
    const totalConversations = agents.reduce((sum, a) => sum + (a.conversations || 0), 0);
    const avgSuccessRate =
      agents.length > 0
        ? agents.reduce((sum, a) => sum + (a.successRate || 0), 0) / agents.length
        : 0;

    return {
      totalAgents,
      activeAgents,
      totalConversations,
      avgSuccessRate: avgSuccessRate.toFixed(1),
    };
  }, [agentsData?.agents]);

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Agents Dashboard</h2>
          <p className="text-gray-600">
            Manage and monitor your AI agents for accounting automation
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            label="Total Agents"
            value={stats.totalAgents}
            change={`${stats.activeAgents} active`}
            icon={Bot}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
          />
          <StatsCard
            label="Active Chats"
            value={stats.totalConversations}
            change="Live now"
            icon={MessageSquare}
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
          />
          <StatsCard
            label="Token Usage"
            value="145.2k"
            change="This month"
            icon={Zap}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-50"
          />
          <StatsCard
            label="Success Rate"
            value={`${stats.avgSuccessRate}%`}
            change="↑ 3.2%"
            icon={TrendingUp}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
          />
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-80"
              />
            </div>

            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || undefined)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
                aria-label="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
                aria-label="List view"
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

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading agents...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Failed to load agents: {error.message}
          </div>
        )}

        {/* Agents Grid/List */}
        {!isLoading && !error && (
          <>
            {filteredAgents.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-1">No agents found</p>
                <p className="text-gray-500 mb-4">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Get started by creating your first AI agent'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Your First Agent
                  </button>
                )}
              </div>
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-4'
                }
              >
                {filteredAgents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Agent Modal */}
      <CreateAgentModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
