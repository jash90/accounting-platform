import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface Source {
  type: string;
  name: string;
  relevance: number;
  metadata: Record<string, any>;
}

export interface SuggestedAction {
  type: string;
  parameters: Record<string, any>;
}

export interface ResponseMetadata {
  model: string;
  temperature: number;
  executionTime: number;
  confidence: number;
  knowledgeUsed: boolean;
}

export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

export class AgentResponseDto {
  @ApiProperty({ description: 'Response ID' })
  id: string;

  @ApiProperty({ description: 'Agent ID' })
  agentId: string;

  @ApiProperty({ description: 'Generated message' })
  message: string;

  @ApiPropertyOptional({ description: 'Sources used for the response', type: [Object] })
  sources?: Source[];

  @ApiPropertyOptional({ description: 'Suggested actions', type: [Object] })
  actions?: SuggestedAction[];

  @ApiProperty({ description: 'Response metadata' })
  metadata: ResponseMetadata;

  @ApiProperty({ description: 'Token usage and cost information' })
  usage: UsageInfo;

  @ApiPropertyOptional({ description: 'Conversation ID if part of a conversation' })
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Created timestamp' })
  createdAt?: Date;
}
