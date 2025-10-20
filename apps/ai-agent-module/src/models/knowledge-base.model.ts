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

export interface KnowledgeFile {
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key?: string;
  status?: 'pending' | 'processing' | 'indexed' | 'error';
  chunkCount?: number;
  errorMessage?: string;
}

@Entity('knowledge_bases')
export class KnowledgeBase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  files: KnowledgeFile[];

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string; // 'pending', 'processing', 'indexed', 'error'

  @Column({ type: 'integer', default: 0 })
  totalChunks: number;

  @Column({ type: 'integer', default: 0 })
  totalTokens: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  // Relations
  @ManyToOne(() => Agent, agent => agent.knowledgeBases)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;
}
