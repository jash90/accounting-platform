import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LLMService, Message } from './llm.service';
import { VectorDBService } from './vector-db.service';
import { ContextBuilderService } from './context-builder.service';
import { PromptTemplate } from '../utils/prompt-template';
import { TokenCounter } from '../utils/token-counter';
import { CostCalculator } from '../utils/cost-calculator';
import { Agent } from '../models/agent.model';
import { ConversationTurn } from '../models/conversation.model';
import { AgentInputDto } from '../dto/agent-input.dto';
import { AgentResponseDto, Source, SuggestedAction } from '../dto/agent-response.dto';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeResult {
  text: string;
  score: number;
  metadata: Record<string, any>;
}

interface PromptBuildParams {
  systemPrompt: string;
  userMessage: string;
  context: Record<string, any>;
  knowledge: KnowledgeResult[];
  history: ConversationTurn[];
  variables: Record<string, any>;
}

@Injectable()
export class AgentExecutorService {
  constructor(
    @InjectRepository(ConversationTurn)
    private conversationTurnRepository: Repository<ConversationTurn>,
    private llmService: LLMService,
    private vectorDB: VectorDBService,
    private contextBuilder: ContextBuilderService,
    private tokenCounter: TokenCounter,
    private costCalculator: CostCalculator
  ) {}

  async execute(
    agent: Agent,
    input: AgentInputDto
  ): Promise<AgentResponseDto> {
    // Build execution context
    const context = await this.buildContext(agent, input);

    // Search relevant knowledge
    const knowledge = await this.searchKnowledge(
      agent.id,
      input.message,
      agent.knowledgeSearchSettings
    );

    // Get conversation history if exists
    const history = input.conversationId
      ? await this.getConversationHistory(input.conversationId)
      : [];

    // Build the final prompt
    const prompt = this.buildPrompt({
      systemPrompt: agent.systemPrompt?.content || 'You are a helpful AI assistant.',
      userMessage: input.message,
      context,
      knowledge,
      history,
      variables: await this.resolveVariables(agent, input)
    });

    // Count tokens
    const promptTokens = this.tokenCounter.count(prompt);

    // Check token limits
    if (promptTokens > agent.maxInputTokens) {
      throw new Error(`Prompt exceeds token limit: ${promptTokens} > ${agent.maxInputTokens}`);
    }

    // Execute LLM call
    const startTime = Date.now();
    const llmResponse = await this.llmService.complete({
      model: agent.model.name,
      messages: this.formatMessages(prompt, history),
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      stream: input.stream,
      stopSequences: agent.stopSequences
    });
    const executionTime = Date.now() - startTime;

    // Count completion tokens
    const completionTokens = this.tokenCounter.count(llmResponse.content);

    // Calculate cost
    const cost = this.costCalculator.calculate({
      model: agent.model.name,
      promptTokens,
      completionTokens
    });

    // Extract actions and sources
    const actions = this.extractActions(llmResponse.content);
    const sources = this.identifySources(llmResponse.content, knowledge);

    // Save conversation turn
    if (input.conversationId) {
      await this.saveConversationTurn({
        conversationId: input.conversationId,
        userMessage: input.message,
        assistantMessage: llmResponse.content,
        tokens: { prompt: promptTokens, completion: completionTokens },
        cost,
        executionTime,
        sources,
        actions,
        context
      });
    }

    // Log metrics (in production, this would go to a metrics service)
    await this.logMetrics({
      agentId: agent.id,
      userId: input.userId,
      promptTokens,
      completionTokens,
      cost,
      executionTime,
      model: agent.model.name
    });

    return {
      id: uuidv4(),
      agentId: agent.id,
      message: llmResponse.content,
      sources,
      actions,
      metadata: {
        model: agent.model.name,
        temperature: agent.temperature,
        executionTime,
        confidence: this.calculateConfidence(llmResponse),
        knowledgeUsed: knowledge.length > 0
      },
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        cost
      },
      conversationId: input.conversationId,
      createdAt: new Date()
    };
  }

  private async buildContext(
    agent: Agent,
    input: AgentInputDto
  ): Promise<Record<string, any>> {
    const context: Record<string, any> = {};

    // Add user context
    context.user = await this.contextBuilder.getUserContext(input.userId!);

    // Add module contexts based on integrations
    for (const integration of agent.integrations || []) {
      if (integration.enabled) {
        const moduleData = await this.contextBuilder.getModuleContext(
          integration.moduleId,
          integration.permissions,
          input.userId!
        );

        // Apply data mapping
        for (const mapping of integration.dataMapping) {
          const value = this.contextBuilder.getNestedValue(moduleData, mapping.source);
          this.contextBuilder.setNestedValue(context, mapping.target, value);
        }
      }
    }

    // Add custom context from input
    if (input.context) {
      Object.assign(context, input.context);
    }

    return context;
  }

  private async searchKnowledge(
    agentId: string,
    query: string,
    settings: any
  ): Promise<KnowledgeResult[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.llmService.generateEmbedding(query);

      // Search in vector database
      const results = await this.vectorDB.search({
        collection: agentId,
        vector: queryEmbedding,
        limit: settings?.maxResults || 5,
        threshold: settings?.threshold || 0.7,
        filter: settings?.filter
      });

      // Format results
      return results.map(result => ({
        text: result.payload.text,
        score: result.score,
        metadata: result.payload.metadata
      }));
    } catch (error) {
      console.error('Error searching knowledge:', error);
      return [];
    }
  }

  private buildPrompt(params: PromptBuildParams): string {
    const template = new PromptTemplate(params.systemPrompt);

    // Add knowledge context
    if (params.knowledge && params.knowledge.length > 0) {
      template.addSection('Knowledge Base',
        params.knowledge.map(k => k.text).join('\n\n')
      );
    }

    // Add module context
    if (params.context && Object.keys(params.context).length > 0) {
      template.addSection('Context',
        JSON.stringify(params.context, null, 2)
      );
    }

    // Add conversation history
    if (params.history && params.history.length > 0) {
      template.addSection('Conversation History',
        params.history.map(h => `User: ${h.userMessage}\nAssistant: ${h.assistantMessage}`).join('\n\n')
      );
    }

    // Add user message
    template.addSection('User Message', params.userMessage);

    // Apply variables
    return template.render(params.variables);
  }

  private formatMessages(prompt: string, history: ConversationTurn[]): Message[] {
    const messages: Message[] = [];

    // Add system message
    messages.push({
      role: 'system',
      content: prompt
    });

    // Add history
    for (const turn of history) {
      messages.push({
        role: 'user',
        content: turn.userMessage
      });
      messages.push({
        role: 'assistant',
        content: turn.assistantMessage
      });
    }

    return messages;
  }

  private extractActions(response: string): SuggestedAction[] {
    const actions: SuggestedAction[] = [];

    // Look for action patterns in response
    const actionRegex = /\[ACTION: (.*?)\]/g;
    let match;

    while ((match = actionRegex.exec(response)) !== null) {
      const actionText = match[1];
      const [type, ...params] = actionText.split('|');

      actions.push({
        type: type.trim(),
        parameters: params.map(p => {
          const [key, value] = p.split('=');
          return { [key.trim()]: value.trim() };
        }).reduce((acc, curr) => ({ ...acc, ...curr }), {})
      });
    }

    return actions;
  }

  private identifySources(
    response: string,
    knowledge: KnowledgeResult[]
  ): Source[] {
    const sources: Source[] = [];
    const seen = new Set<string>();

    // Check which knowledge pieces were likely used
    for (const item of knowledge) {
      // Simple heuristic: check if key phrases from knowledge appear in response
      const keywords = this.extractKeywords(item.text);
      const responseKeywords = this.extractKeywords(response);

      const overlap = keywords.filter(k => responseKeywords.includes(k)).length;
      const relevance = keywords.length > 0 ? overlap / keywords.length : 0;

      if (relevance > 0.3 && !seen.has(item.metadata.fileName)) {
        sources.push({
          type: 'knowledge_base',
          name: item.metadata.fileName,
          relevance: relevance,
          metadata: item.metadata
        });
        seen.add(item.metadata.fileName);
      }
    }

    return sources;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction (in production, use NLP library)
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 4)
      .slice(0, 20);
  }

  private async getConversationHistory(conversationId: string): Promise<ConversationTurn[]> {
    return this.conversationTurnRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      take: 10 // Last 10 turns
    });
  }

  private async saveConversationTurn(params: {
    conversationId: string;
    userMessage: string;
    assistantMessage: string;
    tokens: { prompt: number; completion: number };
    cost: number;
    executionTime: number;
    sources?: Source[];
    actions?: SuggestedAction[];
    context?: Record<string, any>;
  }): Promise<void> {
    const turn = this.conversationTurnRepository.create({
      conversationId: params.conversationId,
      userMessage: params.userMessage,
      assistantMessage: params.assistantMessage,
      tokens: params.tokens,
      cost: params.cost,
      executionTime: params.executionTime,
      sources: params.sources || [],
      actions: params.actions || [],
      context: params.context || {}
    });

    await this.conversationTurnRepository.save(turn);
  }

  private async resolveVariables(agent: Agent, input: AgentInputDto): Promise<Record<string, any>> {
    const variables: Record<string, any> = {};

    // Add system variables
    variables.currentDate = new Date().toISOString();
    variables.userId = input.userId;
    variables.agentName = agent.name;

    // Add custom variables from agent configuration
    if (agent.systemPrompt?.variables) {
      for (const varDef of agent.systemPrompt.variables) {
        if (input.context?.[varDef.name]) {
          variables[varDef.name] = input.context[varDef.name];
        } else if (varDef.default !== undefined) {
          variables[varDef.name] = varDef.default;
        }
      }
    }

    return variables;
  }

  private calculateConfidence(llmResponse: any): number {
    // Simple confidence calculation based on finish reason
    if (llmResponse.finishReason === 'stop') {
      return 0.9;
    } else if (llmResponse.finishReason === 'length') {
      return 0.7;
    }
    return 0.5;
  }

  private async logMetrics(metrics: any): Promise<void> {
    // In production, this would send metrics to a monitoring service
    console.log('Agent Execution Metrics:', metrics);
  }
}
