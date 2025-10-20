import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Agent } from './agent.model';

export interface PromptVariable {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
}

export interface PromptExample {
  input: string;
  output: string;
  context?: Record<string, any>;
}

@Entity('system_prompts')
export class SystemPrompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', default: [] })
  variables: PromptVariable[];

  @Column({ type: 'jsonb', default: [] })
  examples: PromptExample[];

  @Column({ type: 'jsonb', default: [] })
  constraints: string[];

  @Column({ type: 'varchar', length: 50 })
  version: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Agent, agent => agent.systemPrompts)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  constructor(partial?: Partial<SystemPrompt>) {
    Object.assign(this, partial);
  }
}
