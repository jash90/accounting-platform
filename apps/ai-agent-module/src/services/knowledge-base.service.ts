import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBase } from '../models/knowledge-base.model';
import { VectorDBService } from './vector-db.service';

export interface CreateKnowledgeBaseDto {
  agentId: string;
  name: string;
  description?: string;
  files: Array<{
    fileName: string;
    fileType: string;
    fileSize: number;
  }>;
  createdBy?: string;
}

@Injectable()
export class KnowledgeBaseService {
  constructor(
    @InjectRepository(KnowledgeBase)
    private knowledgeBaseRepository: Repository<KnowledgeBase>,
    private vectorDBService: VectorDBService
  ) {}

  async create(dto: CreateKnowledgeBaseDto): Promise<KnowledgeBase> {
    const knowledgeBase = this.knowledgeBaseRepository.create({
      ...dto,
      status: 'pending',
      totalChunks: 0,
      totalTokens: 0
    });

    return this.knowledgeBaseRepository.save(knowledgeBase);
  }

  async findById(id: string): Promise<KnowledgeBase> {
    const kb = await this.knowledgeBaseRepository.findOne({
      where: { id }
    });

    if (!kb) {
      throw new NotFoundException(`Knowledge base ${id} not found`);
    }

    return kb;
  }

  async findByAgent(agentId: string): Promise<KnowledgeBase[]> {
    return this.knowledgeBaseRepository.find({
      where: { agentId },
      order: { createdAt: 'DESC' }
    });
  }

  async updateStatus(
    id: string,
    status: string,
    metadata?: Record<string, any>
  ): Promise<KnowledgeBase> {
    const kb = await this.findById(id);

    kb.status = status;
    kb.updatedAt = new Date();

    if (metadata) {
      kb.metadata = { ...kb.metadata, ...metadata };
    }

    return this.knowledgeBaseRepository.save(kb);
  }

  async updateFileStatus(
    id: string,
    fileName: string,
    status: string,
    metadata?: Record<string, any>
  ): Promise<KnowledgeBase> {
    const kb = await this.findById(id);

    const fileIndex = kb.files.findIndex(f => f.fileName === fileName);
    if (fileIndex !== -1) {
      kb.files[fileIndex].status = status as any;

      if (metadata) {
        kb.files[fileIndex] = { ...kb.files[fileIndex], ...metadata };
      }
    }

    return this.knowledgeBaseRepository.save(kb);
  }

  async incrementChunks(id: string, chunkCount: number, tokenCount: number): Promise<void> {
    await this.knowledgeBaseRepository.increment(
      { id },
      'totalChunks',
      chunkCount
    );

    await this.knowledgeBaseRepository.increment(
      { id },
      'totalTokens',
      tokenCount
    );
  }

  async delete(id: string): Promise<void> {
    const kb = await this.findById(id);

    // Delete from vector database
    await this.vectorDBService.deleteByKnowledgeBase(id);

    // Soft delete
    kb.deletedAt = new Date();
    await this.knowledgeBaseRepository.save(kb);
  }

  async deleteAllForAgent(agentId: string): Promise<void> {
    const knowledgeBases = await this.findByAgent(agentId);

    for (const kb of knowledgeBases) {
      await this.delete(kb.id);
    }
  }
}
