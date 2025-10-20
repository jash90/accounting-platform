import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  stopSequences?: string[];
}

export interface CompletionResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  finishReason: string;
  processingTime: number;
}

@Injectable()
export class LLMService {
  private openai: OpenAI;
  private anthropic: Anthropic;

  constructor(private configService: ConfigService) {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY')
    });

    // Initialize Anthropic
    this.anthropic = new Anthropic({
      apiKey: this.configService.get('ANTHROPIC_API_KEY')
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();

    // Route to appropriate provider based on model
    if (request.model.startsWith('gpt')) {
      return this.completeWithOpenAI(request, startTime);
    } else if (request.model.startsWith('claude')) {
      return this.completeWithAnthropic(request, startTime);
    } else {
      throw new Error(`Unsupported model: ${request.model}`);
    }
  }

  private async completeWithOpenAI(
    request: CompletionRequest,
    startTime: number
  ): Promise<CompletionResponse> {
    try {
      if (request.stream) {
        // Handle streaming response
        const stream = await this.openai.chat.completions.create({
          model: request.model,
          messages: request.messages as any,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 2000,
          stream: true,
          stop: request.stopSequences
        });

        let content = '';
        for await (const chunk of stream) {
          content += chunk.choices[0]?.delta?.content || '';
        }

        return {
          content,
          usage: { promptTokens: 0, completionTokens: 0 }, // Estimate
          finishReason: 'stop',
          processingTime: Date.now() - startTime
        };
      } else {
        // Handle regular response
        const completion = await this.openai.chat.completions.create({
          model: request.model,
          messages: request.messages as any,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 2000,
          stop: request.stopSequences
        });

        return {
          content: completion.choices[0].message.content || '',
          usage: {
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0
          },
          finishReason: completion.choices[0].finish_reason,
          processingTime: Date.now() - startTime
        };
      }
    } catch (error) {
      console.error('OpenAI completion error:', error);
      throw new Error(`LLM completion failed: ${error.message}`);
    }
  }

  private async completeWithAnthropic(
    request: CompletionRequest,
    startTime: number
  ): Promise<CompletionResponse> {
    try {
      // Convert messages to Anthropic format
      const systemMessage = request.messages.find(m => m.role === 'system');
      const userMessages = request.messages.filter(m => m.role !== 'system');

      const completion = await this.anthropic.messages.create({
        model: request.model,
        system: systemMessage?.content,
        messages: userMessages as any,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
        stop_sequences: request.stopSequences
      });

      return {
        content: completion.content[0].type === 'text'
          ? completion.content[0].text
          : '',
        usage: {
          promptTokens: completion.usage.input_tokens,
          completionTokens: completion.usage.output_tokens
        },
        finishReason: completion.stop_reason || 'stop',
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Anthropic completion error:', error);
      throw new Error(`LLM completion failed: ${error.message}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: texts
      });

      return response.data.map(d => d.embedding);
    } catch (error) {
      console.error('Embeddings generation error:', error);
      throw new Error(`Embeddings generation failed: ${error.message}`);
    }
  }
}
