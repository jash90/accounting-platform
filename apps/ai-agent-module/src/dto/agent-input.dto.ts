import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgentInputDto {
  @ApiProperty({ description: 'User message', example: 'What is the current balance for client X?' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Conversation ID for context continuity' })
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Enable streaming response', default: false })
  @IsBoolean()
  @IsOptional()
  stream?: boolean;

  @ApiPropertyOptional({ description: 'Additional context for the agent' })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Specific knowledge base IDs to search' })
  @IsOptional()
  knowledgeBaseIds?: string[];

  userId?: string;
}
