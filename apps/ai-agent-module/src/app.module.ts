import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import agentConfig from '../config/agent.config';

// Models
import { Agent } from './models/agent.model';
import { SystemPrompt } from './models/prompt.model';
import { KnowledgeBase } from './models/knowledge-base.model';
import { Conversation, ConversationTurn } from './models/conversation.model';

// Controllers
import { AgentController } from './controllers/agent.controller';
import { ConversationController } from './controllers/conversation.controller';
import { KnowledgeBaseController } from './controllers/knowledge-base.controller';
import { MarketplaceController } from './controllers/marketplace.controller';

// Services
import { AgentService } from './services/agent.service';
import { AgentExecutorService } from './services/agent-executor.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { LLMService } from './services/llm.service';
import { VectorDBService } from './services/vector-db.service';
import { ContextBuilderService } from './services/context-builder.service';

// Utilities
import { TokenCounter } from './utils/token-counter';
import { CostCalculator } from './utils/cost-calculator';

// Guards
import { SuperAdminGuard } from './guards/super-admin.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { AgentAccessGuard } from './guards/agent-access.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [agentConfig],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('database.url'),
        entities: [Agent, SystemPrompt, KnowledgeBase, Conversation, ConversationTurn],
        synchronize: configService.get('database.synchronize'),
        logging: configService.get('database.logging'),
      }),
      inject: [ConfigService],
    }),

    // TypeORM Repositories
    TypeOrmModule.forFeature([
      Agent,
      SystemPrompt,
      KnowledgeBase,
      Conversation,
      ConversationTurn,
    ]),

    // HTTP Module for external API calls
    HttpModule,
  ],
  controllers: [
    AgentController,
    ConversationController,
    KnowledgeBaseController,
    MarketplaceController,
  ],
  providers: [
    // Services
    AgentService,
    AgentExecutorService,
    KnowledgeBaseService,
    LLMService,
    VectorDBService,
    ContextBuilderService,

    // Utilities
    TokenCounter,
    CostCalculator,

    // Guards
    SuperAdminGuard,
    RateLimitGuard,
    AgentAccessGuard,
  ],
})
export class AppModule {}
