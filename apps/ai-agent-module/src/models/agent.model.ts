import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { SystemPrompt } from './prompt.model';
import { KnowledgeBase } from './knowledge-base.model';
import { Conversation } from './conversation.model';

export interface AgentIntegration {
  moduleId: string;
  moduleName: string;
  enabled: boolean;
  permissions: string[];
  dataMapping: Array<{
    source: string;
    target: string;
    transform?: string;
  }>;
}

export interface SearchSettings {
  maxResults?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export interface ModelConfig {
  name: string;
  provider: 'openai' | 'anthropic' | 'custom';
  version?: string;
}

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  model: ModelConfig;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string; // 'active', 'inactive', 'deleted'

  @Column({ type: 'varchar', length: 50 })
  version: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.7 })
  temperature: number;

  @Column({ type: 'integer', default: 2000 })
  maxTokens: number;

  @Column({ type: 'integer', default: 8000 })
  maxInputTokens: number;

  @Column({ type: 'jsonb', nullable: true })
  stopSequences: string[];

  @Column({ type: 'jsonb', default: [] })
  integrations: AgentIntegration[];

  @Column({ type: 'jsonb', default: {} })
  knowledgeSearchSettings: SearchSettings;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  // Relations
  @OneToMany(() => SystemPrompt, prompt => prompt.agent)
  systemPrompts: SystemPrompt[];

  @OneToMany(() => KnowledgeBase, kb => kb.agent)
  knowledgeBases: KnowledgeBase[];

  @OneToMany(() => Conversation, conversation => conversation.agent)
  conversations: Conversation[];

  // Virtual field for active system prompt
  get systemPrompt(): SystemPrompt | undefined {
    return this.systemPrompts?.find(p => p.isActive);
  }

  // Virtual field for permissions
  permissions: any[];
}
