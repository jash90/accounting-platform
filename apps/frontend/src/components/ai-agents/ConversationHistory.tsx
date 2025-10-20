import React from 'react';
import { MessageSquare } from 'lucide-react';

interface ConversationItem {
  id: string;
  title: string;
  timestamp: string;
  preview?: string;
}

interface ConversationHistoryProps {
  conversations: ConversationItem[];
  activeId?: string | null;
  onSelect: (id: string) => void;
}

export function ConversationHistory({
  conversations,
  activeId,
  onSelect,
}: ConversationHistoryProps) {
  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
        <MessageSquare className="w-5 h-5" />
        <span>Conversation History</span>
      </h3>

      {conversations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">No conversations yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all
                ${
                  activeId === conversation.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-200 hover:border-blue-200'
                }
              `}
            >
              <p className="text-sm font-medium text-gray-900 line-clamp-1">
                {conversation.title}
              </p>
              {conversation.preview && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {conversation.preview}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{conversation.timestamp}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
