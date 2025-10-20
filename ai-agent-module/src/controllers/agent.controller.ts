import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFiles,
  UseInterceptors
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AgentService } from '../services/agent.service';
import { CreateAgentDto, SystemPromptDto } from '../dto/create-agent.dto';
import { UpdateAgentDto } from '../dto/update-agent.dto';
import { AgentInputDto } from '../dto/agent-input.dto';

// User interface for type safety
interface User {
  id: string;
  email: string;
  role: string;
}

@ApiTags('AI Agents')
@Controller('api/v1/agents')
@ApiBearerAuth()
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post()
  // @UseGuards(SuperAdminGuard) // Uncomment when guard is implemented
  @ApiOperation({ summary: 'Create a new AI agent' })
  @ApiResponse({ status: 201, description: 'Agent created successfully' })
  async createAgent(
    @Body() createAgentDto: CreateAgentDto
    // @CurrentUser() user: User // Uncomment when decorator is implemented
  ) {
    // For now, use a mock user ID
    const mockUserId = '00000000-0000-0000-0000-000000000000';

    return this.agentService.createAgent({
      ...createAgentDto,
      createdBy: mockUserId
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all agents' })
  async listAgents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string
  ) {
    return this.agentService.listAgents({ page, limit, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent details' })
  async getAgent(@Param('id') id: string) {
    return this.agentService.getAgent(id);
  }

  @Put(':id')
  // @UseGuards(SuperAdminGuard) // Uncomment when guard is implemented
  @ApiOperation({ summary: 'Update agent configuration' })
  async updateAgent(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto
  ) {
    return this.agentService.updateAgent(id, updateAgentDto);
  }

  @Delete(':id')
  // @UseGuards(SuperAdminGuard) // Uncomment when guard is implemented
  @ApiOperation({ summary: 'Delete an agent' })
  async deleteAgent(@Param('id') id: string) {
    await this.agentService.deleteAgent(id);
    return { message: 'Agent deleted successfully' };
  }

  @Post(':id/prompt')
  // @UseGuards(SuperAdminGuard) // Uncomment when guard is implemented
  @ApiOperation({ summary: 'Update agent system prompt' })
  async updateSystemPrompt(
    @Param('id') id: string,
    @Body() promptDto: SystemPromptDto
  ) {
    return this.agentService.setSystemPrompt(id, promptDto);
  }

  @Post(':id/knowledge')
  // @UseGuards(SuperAdminGuard) // Uncomment when guard is implemented
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: 'Upload knowledge base files' })
  async uploadKnowledge(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    return this.agentService.addKnowledgeBase(id, files);
  }

  @Post(':id/chat')
  // @UseGuards(RateLimitGuard) // Uncomment when guard is implemented
  @ApiOperation({ summary: 'Send message to agent' })
  async chat(
    @Param('id') id: string,
    @Body() input: AgentInputDto
    // @CurrentUser() user: User // Uncomment when decorator is implemented
  ) {
    // For now, use a mock user ID
    const mockUserId = '00000000-0000-0000-0000-000000000000';

    return this.agentService.executeAgent(id, {
      ...input,
      userId: mockUserId
    });
  }

  @Get(':id/analytics')
  // @UseGuards(SuperAdminGuard) // Uncomment when guard is implemented
  @ApiOperation({ summary: 'Get agent analytics' })
  async getAnalytics(
    @Param('id') id: string,
    @Query('period') period: string = '30d'
  ) {
    return this.agentService.getAgentAnalytics(id, period);
  }
}
