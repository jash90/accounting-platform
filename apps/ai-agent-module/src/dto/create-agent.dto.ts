import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentIntegration, SearchSettings, ModelConfig } from '../models/agent.model';

export class SystemPromptDto {
  @ApiProperty({ description: 'System prompt content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Prompt variables', type: [Object] })
  @IsOptional()
  @IsArray()
  variables?: any[];

  @ApiPropertyOptional({ description: 'Prompt examples', type: [Object] })
  @IsOptional()
  @IsArray()
  examples?: any[];

  @ApiPropertyOptional({ description: 'Prompt constraints', type: [String] })
  @IsOptional()
  @IsArray()
  constraints?: string[];
}

export class CreateAgentDto {
  @ApiProperty({ description: 'Agent name', example: 'Financial Assistant' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Agent description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'LLM model configuration',
    example: { name: 'gpt-4', provider: 'openai', version: 'turbo' }
  })
  @IsObject()
  @IsNotEmpty()
  model: ModelConfig;

  @ApiPropertyOptional({
    description: 'Temperature for response generation',
    minimum: 0,
    maximum: 2,
    default: 0.7
  })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Maximum tokens for completion',
    default: 2000
  })
  @IsNumber()
  @IsOptional()
  maxTokens?: number;

  @ApiPropertyOptional({
    description: 'Maximum input tokens',
    default: 8000
  })
  @IsNumber()
  @IsOptional()
  maxInputTokens?: number;

  @ApiPropertyOptional({ description: 'Stop sequences for completion' })
  @IsArray()
  @IsOptional()
  stopSequences?: string[];

  @ApiPropertyOptional({ description: 'Module integrations', type: [Object] })
  @IsArray()
  @IsOptional()
  integrations?: AgentIntegration[];

  @ApiPropertyOptional({ description: 'Knowledge search settings' })
  @IsObject()
  @IsOptional()
  knowledgeSearchSettings?: SearchSettings;

  @ApiPropertyOptional({ description: 'System prompt configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SystemPromptDto)
  systemPrompt?: SystemPromptDto;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  createdBy?: string;
}
