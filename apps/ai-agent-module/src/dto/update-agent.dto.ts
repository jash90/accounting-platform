import { PartialType } from '@nestjs/swagger';
import { CreateAgentDto } from './create-agent.dto';
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAgentDto extends PartialType(CreateAgentDto) {
  @ApiPropertyOptional({ description: 'Agent status', enum: ['active', 'inactive', 'deleted'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Agent version' })
  @IsString()
  @IsOptional()
  version?: string;

  updatedBy?: string;
}
