import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MessageSquare, Settings, MoreVertical } from 'lucide-react';
import type { Agent } from '../../types/aiAgent';

interface AgentCardProps {
  agent: Agent;
  onChatClick?: (agent: Agent) => void;
  onSettingsClick?: (agent: Agent) => void;
}

export function AgentCard({ agent, onChatClick, onSettingsClick }: AgentCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/ai-agents/chat/${agent.id}`);
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChatClick) {
      onChatClick(agent);
    } else {
      navigate(`/ai-agents/chat/${agent.id}`);
    }
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSettingsClick) {
      onSettingsClick(agent);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center text-2xl">
            {agent.avatar || '🤖'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-500">{agent.model.name}</p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
            agent.status === 'active'
              ? 'bg-green-100 text-green-700'
              : agent.status === 'inactive'
              ? 'bg-gray-100 text-gray-600'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {agent.status}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">
        {agent.description || 'No description available'}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Conversations</p>
          <p className="font-semibold text-gray-900">{agent.conversations || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Success Rate</p>
          <p className="font-semibold text-gray-900">{agent.successRate || 0}%</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
        <span className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{agent.lastActive || 'Never'}</span>
        </span>
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleChatClick}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Chat with agent"
          >
            <MessageSquare className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleSettingsClick}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Agent settings"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
