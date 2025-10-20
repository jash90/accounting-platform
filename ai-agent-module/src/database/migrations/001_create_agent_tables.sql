-- AI Agent Module Database Schema
-- Version: 1.0.0
-- Description: Creates all tables for the AI Agent Module

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: agents
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    model JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    version VARCHAR(50) NOT NULL,
    temperature DECIMAL(3, 2) NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 2000,
    max_input_tokens INTEGER NOT NULL DEFAULT 8000,
    stop_sequences JSONB,
    integrations JSONB NOT NULL DEFAULT '[]'::jsonb,
    knowledge_search_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB,
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT chk_temperature CHECK (temperature >= 0 AND temperature <= 2),
    CONSTRAINT chk_status CHECK (status IN ('active', 'inactive', 'deleted'))
);

-- Index for agents
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_created_by ON agents(created_by);
CREATE INDEX idx_agents_deleted_at ON agents(deleted_at);

-- Table: system_prompts
CREATE TABLE system_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    content TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    examples JSONB NOT NULL DEFAULT '[]'::jsonb,
    constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
    version VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_system_prompts_agent FOREIGN KEY (agent_id)
        REFERENCES agents(id) ON DELETE CASCADE
);

-- Index for system_prompts
CREATE INDEX idx_system_prompts_agent_id ON system_prompts(agent_id);
CREATE INDEX idx_system_prompts_is_active ON system_prompts(is_active);
CREATE UNIQUE INDEX idx_system_prompts_active_agent ON system_prompts(agent_id, is_active)
    WHERE is_active = true;

-- Table: knowledge_bases
CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    files JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_chunks INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_knowledge_bases_agent FOREIGN KEY (agent_id)
        REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT chk_kb_status CHECK (status IN ('pending', 'processing', 'indexed', 'error'))
);

-- Index for knowledge_bases
CREATE INDEX idx_knowledge_bases_agent_id ON knowledge_bases(agent_id);
CREATE INDEX idx_knowledge_bases_status ON knowledge_bases(status);
CREATE INDEX idx_knowledge_bases_deleted_at ON knowledge_bases(deleted_at);

-- Table: conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP,
    CONSTRAINT fk_conversations_agent FOREIGN KEY (agent_id)
        REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT chk_conversation_status CHECK (status IN ('active', 'archived', 'deleted'))
);

-- Index for conversations
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);

-- Table: conversation_turns
CREATE TABLE conversation_turns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    user_message TEXT NOT NULL,
    assistant_message TEXT NOT NULL,
    context JSONB,
    sources JSONB,
    actions JSONB,
    tokens JSONB,
    cost DECIMAL(10, 6),
    execution_time INTEGER,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversation_turns_conversation FOREIGN KEY (conversation_id)
        REFERENCES conversations(id) ON DELETE CASCADE
);

-- Index for conversation_turns
CREATE INDEX idx_conversation_turns_conversation_id ON conversation_turns(conversation_id);
CREATE INDEX idx_conversation_turns_created_at ON conversation_turns(created_at);

-- Table: agent_metrics (for analytics and monitoring)
CREATE TABLE agent_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    user_id UUID,
    model VARCHAR(255) NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    cost DECIMAL(10, 6) NOT NULL,
    execution_time INTEGER NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agent_metrics_agent FOREIGN KEY (agent_id)
        REFERENCES agents(id) ON DELETE CASCADE
);

-- Index for agent_metrics
CREATE INDEX idx_agent_metrics_agent_id ON agent_metrics(agent_id);
CREATE INDEX idx_agent_metrics_user_id ON agent_metrics(user_id);
CREATE INDEX idx_agent_metrics_created_at ON agent_metrics(created_at);
CREATE INDEX idx_agent_metrics_model ON agent_metrics(model);

-- Table: agent_templates (for marketplace)
CREATE TABLE agent_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    system_prompt TEXT NOT NULL,
    model JSONB NOT NULL,
    temperature DECIMAL(3, 2) NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 2000,
    integrations JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    rating DECIMAL(3, 2),
    downloads INTEGER NOT NULL DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for agent_templates
CREATE INDEX idx_agent_templates_category ON agent_templates(category);
CREATE INDEX idx_agent_templates_is_public ON agent_templates(is_public);
CREATE INDEX idx_agent_templates_rating ON agent_templates(rating);

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_prompts_updated_at BEFORE UPDATE ON system_prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_bases_updated_at BEFORE UPDATE ON knowledge_bases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_templates_updated_at BEFORE UPDATE ON agent_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample agent templates
INSERT INTO agent_templates (name, description, category, system_prompt, model, created_by) VALUES
(
    'Financial Assistant',
    'Helps with financial queries, analysis, and reporting for accounting professionals',
    'finance',
    'You are a knowledgeable financial assistant specializing in accounting and bookkeeping. Your role is to help users with financial queries, generate reports, and provide insights based on their data. Always be accurate, professional, and clear in your responses.',
    '{"name": "gpt-4-turbo", "provider": "openai"}'::jsonb,
    '00000000-0000-0000-0000-000000000000'
),
(
    'Invoice Processor',
    'Automates invoice processing, validation, and data extraction',
    'automation',
    'You are an invoice processing assistant. Your role is to help extract information from invoices, validate data, identify discrepancies, and automate invoice workflows. Be precise and thorough in your analysis.',
    '{"name": "gpt-4-turbo", "provider": "openai"}'::jsonb,
    '00000000-0000-0000-0000-000000000000'
),
(
    'Client Support Agent',
    'Handles client inquiries and support tickets with context from the CRM',
    'support',
    'You are a professional client support agent for an accounting firm. Your role is to help answer client questions, provide status updates, and guide them through processes. Always be courteous, helpful, and accurate.',
    '{"name": "gpt-3.5-turbo", "provider": "openai"}'::jsonb,
    '00000000-0000-0000-0000-000000000000'
);

-- Grant permissions (adjust as needed)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO agent_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO agent_user;
