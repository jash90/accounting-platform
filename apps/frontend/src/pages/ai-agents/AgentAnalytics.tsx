import React from 'react';
import { TrendingUp, DollarSign, Clock, Zap } from 'lucide-react';
import { useAgents } from '../../api/aiAgentApi';
import { StatsCard } from '../../components/ai-agents/StatsCard';

export function AgentAnalytics() {
  const { data: agentsData } = useAgents();

  // Sample analytics data (in real app, fetch from API)
  const monthlyTrend = [
    { month: 'Jan', conversations: 320, tokens: 45000 },
    { month: 'Feb', conversations: 380, tokens: 52000 },
    { month: 'Mar', conversations: 420, tokens: 58000 },
  ];

  const stats = {
    totalTokens: '145.2k',
    totalCost: '$12.45',
    avgResponseTime: '1.2s',
    totalConversations: 1120,
  };

  const topAgents = agentsData?.agents.slice(0, 5) || [];

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
          <p className="text-gray-600">Monitor usage, performance, and costs</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            label="Total Tokens"
            value={stats.totalTokens}
            change="This month"
            icon={Zap}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-50"
          />
          <StatsCard
            label="Total Cost"
            value={stats.totalCost}
            change="+$2.34 this month"
            icon={DollarSign}
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
          />
          <StatsCard
            label="Avg Response Time"
            value={stats.avgResponseTime}
            change="↓ 0.3s"
            icon={Clock}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
          />
          <StatsCard
            label="Conversations"
            value={stats.totalConversations}
            change="+156 this month"
            icon={TrendingUp}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Token Usage Trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Token Usage Trend</h3>
            <div className="h-48 flex items-end space-x-2">
              {monthlyTrend.map((data, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="bg-blue-600 rounded-t w-full"
                    style={{ height: `${(data.tokens / 60000) * 100}%` }}
                    title={`${data.tokens.toLocaleString()} tokens`}
                  />
                  <p className="text-xs text-gray-600 mt-2">{data.month}</p>
                  <p className="text-xs text-gray-500">{(data.tokens / 1000).toFixed(0)}k</p>
                </div>
              ))}
            </div>
          </div>

          {/* Conversation Trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Conversation Trend</h3>
            <div className="h-48 flex items-end space-x-2">
              {monthlyTrend.map((data, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="bg-green-600 rounded-t w-full"
                    style={{ height: `${(data.conversations / 450) * 100}%` }}
                    title={`${data.conversations} conversations`}
                  />
                  <p className="text-xs text-gray-600 mt-2">{data.month}</p>
                  <p className="text-xs text-gray-500">{data.conversations}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Agent Performance</h3>
          <div className="space-y-3">
            {topAgents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center text-xl">
                    {agent.avatar || '🤖'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.model.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Conversations</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {agent.conversations || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Success Rate</p>
                    <p className="text-sm font-semibold text-green-600">
                      {agent.successRate || 0}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
