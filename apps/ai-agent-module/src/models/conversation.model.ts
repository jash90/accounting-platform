import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn
} from 'typeorm';
import { Agent } from './agent.model';

export interface MessageMetadata {
  model?: string;
  temperature?: number;
  executionTime?: number;
  confidence?: number;
  knowledgeUsed?: boolean;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total?: number;
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string; // 'active', 'archived', 'deleted'

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  // Relations
  @ManyToOne(() => Agent, agent => agent.conversations)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @OneToMany(() => ConversationTurn, turn => turn.conversation)
  turns: ConversationTurn[];
}

@Entity('conversation_turns')
export class ConversationTurn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversationId: string;

  @Column({ type: 'text' })
  userMessage: string;

  @Column({ type: 'text' })
  assistantMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  sources: any[];

  @Column({ type: 'jsonb', nullable: true })
  actions: any[];

  @Column({ type: 'jsonb', nullable: true })
  tokens: TokenUsage;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  cost: number;

  @Column({ type: 'integer', nullable: true })
  executionTime: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: MessageMetadata;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Conversation, conversation => conversation.turns)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;
}
