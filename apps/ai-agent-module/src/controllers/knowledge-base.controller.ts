import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KnowledgeBaseService } from '../services/knowledge-base.service';

@ApiTags('Knowledge Base')
@Controller('api/v1/knowledge-bases')
@ApiBearerAuth()
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  @ApiOperation({ summary: 'List knowledge bases' })
  async listKnowledgeBases(
    @Query('agentId') agentId?: string
  ) {
    if (agentId) {
      return this.knowledgeBaseService.findByAgent(agentId);
    }

    // TODO: Implement list all
    return [];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get knowledge base details' })
  async getKnowledgeBase(@Param('id') id: string) {
    return this.knowledgeBaseService.findById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a knowledge base' })
  async deleteKnowledgeBase(@Param('id') id: string) {
    await this.knowledgeBaseService.delete(id);
    return { message: 'Knowledge base deleted successfully' };
  }

  @Post(':id/reindex')
  @ApiOperation({ summary: 'Reindex knowledge base' })
  async reindexKnowledgeBase(@Param('id') id: string) {
    // TODO: Implement reindexing
    return { message: 'Reindexing started' };
  }
}
