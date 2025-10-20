import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../models/agent.model';
import { SystemPrompt } from '../models/prompt.model';
import { AgentExecutorService } from './agent-executor.service';
import { KnowledgeBaseService, CreateKnowledgeBaseDto } from './knowledge-base.service';
import { VectorDBService } from './vector-db.service';
import { LLMService } from './llm.service';
import { TokenCounter } from '../utils/token-counter';
import { CreateAgentDto, SystemPromptDto } from '../dto/create-agent.dto';
import { UpdateAgentDto } from '../dto/update-agent.dto';
import { AgentInputDto } from '../dto/agent-input.dto';
import { AgentResponseDto } from '../dto/agent-response.dto';
import { KnowledgeBase } from '../models/knowledge-base.model';
import pdfParse from 'pdf-parse';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(SystemPrompt)
    private systemPromptRepository: Repository<SystemPrompt>,
    private agentExecutor: AgentExecutorService,
    private knowledgeBaseService: KnowledgeBaseService,
    private vectorDBService: VectorDBService,
    private llmService: LLMService,
    private tokenCounter: TokenCounter
  ) {}

  async createAgent(createDto: CreateAgentDto): Promise<Agent> {
    // Validate model availability
    await this.validateModel(createDto.model.name);

    // Create agent entity
    const agent = this.agentRepository.create({
      ...createDto,
      status: 'active',
      version: '1.0.0',
      temperature: createDto.temperature || 0.7,
      maxTokens: createDto.maxTokens || 2000,
      maxInputTokens: createDto.maxInputTokens || 8000,
      integrations: createDto.integrations || [],
      knowledgeSearchSettings: createDto.knowledgeSearchSettings || {}
    });

    // Save to database
    const savedAgent = await this.agentRepository.save(agent);

    // Initialize vector database collection
    await this.vectorDBService.createCollection(savedAgent.id);

    // Set default system prompt if provided
    if (createDto.systemPrompt) {
      await this.setSystemPrompt(savedAgent.id, createDto.systemPrompt);
    }

    return savedAgent;
  }

  async listAgents(params: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ agents: Agent[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const query = this.agentRepository.createQueryBuilder('agent')
      .where('agent.deletedAt IS NULL');

    if (params.status) {
      query.andWhere('agent.status = :status', { status: params.status });
    }

    const [agents, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy('agent.createdAt', 'DESC')
      .getManyAndCount();

    return { agents, total, page, limit };
  }

  async getAgent(id: string): Promise<Agent> {
    return this.findAgentOrFail(id);
  }

  async updateAgent(id: string, updateDto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.findAgentOrFail(id);

    // Update fields
    Object.assign(agent, updateDto);
    agent.updatedAt = new Date();

    // Validate changes
    if (updateDto.model?.name) {
      await this.validateModel(updateDto.model.name);
    }

    return this.agentRepository.save(agent);
  }

  async deleteAgent(id: string): Promise<void> {
    const agent = await this.findAgentOrFail(id);

    // Delete vector database collection
    try {
      await this.vectorDBService.deleteCollection(id);
    } catch (error) {
      console.error('Error deleting vector collection:', error);
    }

    // Delete knowledge bases
    await this.knowledgeBaseService.deleteAllForAgent(id);

    // Soft delete agent
    agent.status = 'deleted';
    agent.deletedAt = new Date();
    await this.agentRepository.save(agent);
  }

  async executeAgent(
    agentId: string,
    input: AgentInputDto
  ): Promise<AgentResponseDto> {
    const agent = await this.findAgentOrFail(agentId);

    // Check agent status
    if (agent.status !== 'active') {
      throw new ForbiddenException('Agent is not active');
    }

    // Check permissions
    await this.validateAccess(agent, input.userId!);

    // Execute through agent executor
    return this.agentExecutor.execute(agent, input);
  }

  async setSystemPrompt(
    agentId: string,
    promptDto: SystemPromptDto
  ): Promise<SystemPrompt> {
    const agent = await this.findAgentOrFail(agentId);

    // Deactivate current prompt
    await this.deactivateCurrentPrompt(agentId);

    // Create new prompt version
    const prompt = new SystemPrompt({
      agentId,
      content: promptDto.content,
      variables: promptDto.variables || [],
      examples: promptDto.examples || [],
      constraints: promptDto.constraints || [],
      version: await this.getNextPromptVersion(agentId),
      isActive: true
    });

    return this.systemPromptRepository.save(prompt);
  }

  async addKnowledgeBase(
    agentId: string,
    files: Express.Multer.File[]
  ): Promise<KnowledgeBase> {
    const agent = await this.findAgentOrFail(agentId);

    // Create knowledge base entry
    const knowledgeBase = await this.knowledgeBaseService.create({
      agentId,
      name: `KB-${Date.now()}`,
      files: files.map(f => ({
        fileName: f.originalname,
        fileType: f.mimetype,
        fileSize: f.size
      }))
    });

    // Process files asynchronously
    this.processKnowledgeFiles(knowledgeBase.id, agentId, files);

    return knowledgeBase;
  }

  async getAgentAnalytics(agentId: string, period: string): Promise<any> {
    const agent = await this.findAgentOrFail(agentId);

    // In production, this would query a metrics database
    return {
      agentId,
      period,
      totalExecutions: 0,
      totalTokens: 0,
      totalCost: 0,
      averageExecutionTime: 0,
      successRate: 0,
      popularQueries: []
    };
  }

  private async processKnowledgeFiles(
    knowledgeBaseId: string,
    agentId: string,
    files: Express.Multer.File[]
  ): Promise<void> {
    for (const file of files) {
      try {
        // Update file status
        await this.knowledgeBaseService.updateFileStatus(
          knowledgeBaseId,
          file.originalname,
          'processing'
        );

        // Extract text content
        const content = await this.extractContent(file);

        // Split into chunks
        const chunks = this.chunkContent(content);

        // Generate embeddings
        const embeddings = await this.llmService.generateEmbeddings(chunks);

        // Store in vector database
        await this.vectorDBService.upsert({
          knowledgeBaseId: agentId, // Use agent ID as collection
          chunks: chunks.map((chunk, i) => ({
            text: chunk,
            embedding: embeddings[i],
            metadata: {
              fileName: file.originalname,
              fileType: file.mimetype,
              knowledgeBaseId,
              position: i,
              chunkCount: chunks.length
            }
          }))
        });

        // Calculate total tokens
        const totalTokens = chunks.reduce(
          (sum, chunk) => sum + this.tokenCounter.count(chunk),
          0
        );

        // Update knowledge base stats
        await this.knowledgeBaseService.incrementChunks(
          knowledgeBaseId,
          chunks.length,
          totalTokens
        );

        // Update file status to indexed
        await this.knowledgeBaseService.updateFileStatus(
          knowledgeBaseId,
          file.originalname,
          'indexed',
          { chunkCount: chunks.length }
        );

        console.log(`Processed ${file.originalname}: ${chunks.length} chunks`);
      } catch (error) {
        console.error(`Failed to process file ${file.originalname}:`, error);

        await this.knowledgeBaseService.updateFileStatus(
          knowledgeBaseId,
          file.originalname,
          'error',
          { errorMessage: error.message }
        );
      }
    }

    // Update overall knowledge base status
    await this.knowledgeBaseService.updateStatus(knowledgeBaseId, 'indexed');
  }

  private async extractContent(file: Express.Multer.File): Promise<string> {
    const fileType = file.mimetype;

    if (fileType === 'application/pdf') {
      const pdfData = await pdfParse(file.buffer);
      return pdfData.text;
    } else if (fileType === 'text/plain' || fileType.startsWith('text/')) {
      return file.buffer.toString('utf-8');
    } else if (fileType === 'application/json') {
      return file.buffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private chunkContent(content: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];

    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());

        // Add overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private async findAgentOrFail(id: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({
      where: { id, deletedAt: null as any },
      relations: ['systemPrompts', 'knowledgeBases']
    });

    if (!agent) {
      throw new NotFoundException(`Agent ${id} not found`);
    }

    return agent;
  }

  private async validateModel(modelName: string): Promise<void> {
    // In production, this would check available models
    const supportedModels = [
      'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo',
      'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'
    ];

    const isSupported = supportedModels.some(m => modelName.startsWith(m));

    if (!isSupported) {
      throw new Error(`Model ${modelName} is not supported`);
    }
  }

  private async validateAccess(agent: Agent, userId: string): Promise<void> {
    // In production, implement proper permission checking
    // For now, allow all access
    return;
  }

  private async deactivateCurrentPrompt(agentId: string): Promise<void> {
    await this.systemPromptRepository.update(
      { agentId, isActive: true },
      { isActive: false }
    );
  }

  private async getNextPromptVersion(agentId: string): Promise<string> {
    const count = await this.systemPromptRepository.count({
      where: { agentId }
    });

    return `v${count + 1}`;
  }
}
