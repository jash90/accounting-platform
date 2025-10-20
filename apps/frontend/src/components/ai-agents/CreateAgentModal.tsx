import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateAgent } from '../../api/aiAgentApi';
import type { CreateAgentInput, ModelConfig } from '../../types/aiAgent';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateAgentModal({ isOpen, onClose }: CreateAgentModalProps) {
  const createAgent = useCreateAgent();
  const [formData, setFormData] = useState<CreateAgentInput>({
    name: '',
    description: '',
    model: {
      name: 'gpt-4-turbo',
      provider: 'openai',
    },
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: {
      content: '',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    }
    if (!formData.model.name) {
      newErrors.model = 'Please select a model';
    }
    if (!formData.systemPrompt?.content?.trim()) {
      newErrors.systemPrompt = 'System prompt is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await createAgent.mutateAsync(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        model: {
          name: 'gpt-4-turbo',
          provider: 'openai',
        },
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: {
          content: '',
        },
      });
      setErrors({});
    } catch (error) {
      console.error('Failed to create agent:', error);
      setErrors({ submit: 'Failed to create agent. Please try again.' });
    }
  };

  const handleModelChange = (modelName: string) => {
    const provider = modelName.startsWith('gpt') ? 'openai' : 'anthropic';
    setFormData({
      ...formData,
      model: {
        name: modelName,
        provider,
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Create New AI Agent</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Tax Assistant"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Model <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.model.name}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="OpenAI">
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </optgroup>
                  <optgroup label="Anthropic">
                    <option value="claude-3-opus">Claude 3 Opus</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    <option value="claude-3-haiku">Claude 3 Haiku</option>
                  </optgroup>
                </select>
                {errors.model && <p className="text-xs text-red-600 mt-1">{errors.model}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature: {formData.temperature?.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({ ...formData, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Precise (0)</span>
                  <span>Balanced (1)</span>
                  <span>Creative (2)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={formData.maxTokens}
                  onChange={(e) =>
                    setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 2000 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="100"
                  max="10000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum tokens for response generation (100-10,000)
                </p>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              System Prompt <span className="text-red-500">*</span>
            </h3>
            <textarea
              value={formData.systemPrompt?.content || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  systemPrompt: { content: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={8}
              placeholder="Define the agent's behavior, expertise, and constraints...&#10;&#10;Example:&#10;You are a professional tax assistant specializing in Polish tax law.&#10;Help users with:&#10;- VAT calculations&#10;- Tax filing guidance&#10;- Compliance questions&#10;&#10;Always provide accurate, clear, and actionable information."
            />
            {errors.systemPrompt && (
              <p className="text-xs text-red-600 mt-1">{errors.systemPrompt}</p>
            )}
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={createAgent.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={createAgent.isPending}
            >
              {createAgent.isPending ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
