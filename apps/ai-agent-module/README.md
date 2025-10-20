# AI Agent Module

A comprehensive AI Agent system for the Accounting CRM Platform, enabling intelligent automation and contextual assistance powered by Large Language Models (LLMs).

## Features

- **Multi-LLM Support**: Integrates with OpenAI (GPT-4, GPT-3.5) and Anthropic (Claude) models
- **Knowledge Base Management**: Upload and index documents (PDF, TXT, JSON) with vector embeddings
- **Contextual Awareness**: Seamlessly integrates with other CRM modules for context-aware responses
- **Conversation Management**: Track and manage multi-turn conversations with full history
- **Agent Marketplace**: Pre-built agent templates for common use cases
- **Cost Tracking**: Monitor token usage and LLM costs per agent and user
- **Rate Limiting**: Built-in protection against API abuse
- **Scalable Architecture**: Microservices-ready with Docker support

## Architecture

### Technology Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with TypeORM
- **Vector Database**: Qdrant for knowledge embeddings
- **Cache**: Redis for rate limiting and session management
- **Message Queue**: RabbitMQ for async processing
- **LLM Providers**: OpenAI, Anthropic
- **Deployment**: Docker & Docker Compose

### Project Structure

```
ai-agent-module/
├── src/
│   ├── controllers/       # API endpoints
│   ├── services/          # Business logic
│   ├── models/            # Database entities
│   ├── dto/               # Data transfer objects
│   ├── guards/            # Authentication & authorization
│   ├── decorators/        # Custom decorators
│   ├── utils/             # Utility functions
│   └── database/
│       └── migrations/    # Database schema
├── config/                # Configuration files
├── tests/                 # Unit & integration tests
├── docker-compose.yml     # Docker orchestration
├── Dockerfile            # Container definition
└── package.json          # Dependencies

```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 7+
- OpenAI API Key
- Anthropic API Key (optional)

### Installation

1. **Clone the repository**

```bash
cd ai-agent-module
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start infrastructure with Docker**

```bash
docker-compose up -d
```

5. **Run database migrations**

```bash
npm run migrate
```

6. **Start the development server**

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`
Swagger documentation at `http://localhost:3000/api/docs`

## Configuration

### Environment Variables

Key environment variables to configure:

```env
# LLM API Keys (Required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Database (Required)
DATABASE_URL=postgresql://agent_user:agent_pass@localhost:5433/agentdb

# Vector Database (Required)
VECTOR_DB_URL=http://localhost:6333

# Redis (Required)
REDIS_URL=redis://localhost:6380

# Optional
AWS_REGION=eu-central-1
S3_BUCKET=your-bucket-name
RATE_LIMIT_MAX_REQUESTS=100
```

See `.env.example` for all configuration options.

## API Documentation

### Agent Management

#### Create an Agent

```bash
POST /api/v1/agents
Content-Type: application/json

{
  "name": "Financial Assistant",
  "description": "Helps with financial queries",
  "model": {
    "name": "gpt-4-turbo",
    "provider": "openai"
  },
  "temperature": 0.7,
  "maxTokens": 2000,
  "systemPrompt": {
    "content": "You are a helpful financial assistant..."
  }
}
```

#### List Agents

```bash
GET /api/v1/agents?page=1&limit=10&status=active
```

#### Get Agent Details

```bash
GET /api/v1/agents/:id
```

#### Update Agent

```bash
PUT /api/v1/agents/:id
Content-Type: application/json

{
  "temperature": 0.8,
  "status": "active"
}
```

#### Delete Agent

```bash
DELETE /api/v1/agents/:id
```

### Knowledge Base Management

#### Upload Knowledge Files

```bash
POST /api/v1/agents/:id/knowledge
Content-Type: multipart/form-data

files: [file1.pdf, file2.txt]
```

#### List Knowledge Bases

```bash
GET /api/v1/knowledge-bases?agentId=xxx
```

### Chat with Agent

#### Send Message

```bash
POST /api/v1/agents/:id/chat
Content-Type: application/json

{
  "message": "What is the current balance for client ABC?",
  "conversationId": "optional-conversation-id",
  "context": {
    "clientId": "123"
  }
}
```

**Response:**

```json
{
  "id": "response-id",
  "agentId": "agent-id",
  "message": "Based on the latest records, client ABC has a balance of...",
  "sources": [
    {
      "type": "knowledge_base",
      "name": "financial_reports.pdf",
      "relevance": 0.85
    }
  ],
  "metadata": {
    "model": "gpt-4-turbo",
    "executionTime": 1250,
    "confidence": 0.9
  },
  "usage": {
    "promptTokens": 1500,
    "completionTokens": 350,
    "totalTokens": 1850,
    "cost": 0.0275
  }
}
```

### Agent Analytics

```bash
GET /api/v1/agents/:id/analytics?period=30d
```

## Usage Examples

### Example 1: Creating a Financial Assistant

```typescript
const agent = await fetch('http://localhost:3000/api/v1/agents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    name: 'Financial Assistant',
    description: 'Expert in accounting and financial analysis',
    model: {
      name: 'gpt-4-turbo',
      provider: 'openai'
    },
    temperature: 0.7,
    systemPrompt: {
      content: `You are a professional financial assistant.
      Help users with:
      - Financial analysis and reporting
      - Budget planning and forecasting
      - Invoice management
      - Client account inquiries

      Always provide accurate, clear, and actionable information.`
    },
    integrations: [
      {
        moduleId: 'client-management',
        enabled: true,
        permissions: ['read_clients', 'read_invoices'],
        dataMapping: [
          { source: 'clients', target: 'context.clients' }
        ]
      }
    ]
  })
});
```

### Example 2: Uploading Knowledge Base

```typescript
const formData = new FormData();
formData.append('files', pdfFile);
formData.append('files', txtFile);

const response = await fetch(`http://localhost:3000/api/v1/agents/${agentId}/knowledge`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
});
```

### Example 3: Chat with Context

```typescript
const response = await fetch(`http://localhost:3000/api/v1/agents/${agentId}/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    message: 'What are the outstanding invoices for client XYZ?',
    context: {
      clientId: 'xyz-123',
      dateRange: '2024-01-01 to 2024-12-31'
    }
  })
});
```

## Development

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Code Style

```bash
# Lint
npm run lint

# Format
npm run format
```

### Database Migrations

```bash
# Run migrations
npm run migrate

# Revert migration
npm run migrate:revert

# Create new migration
npm run migrate:create -- -n MigrationName
```

## Deployment

### Docker Production Deployment

1. **Build the image**

```bash
docker build -t ai-agent-module:latest .
```

2. **Run with Docker Compose**

```bash
docker-compose -f docker-compose.yml up -d
```

3. **Check health**

```bash
curl http://localhost:3005/health
```

### Environment-Specific Configuration

For production deployments:

- Set `NODE_ENV=production`
- Use secure secrets for `JWT_SECRET` and `ENCRYPTION_KEY`
- Configure proper database backups
- Set up monitoring and logging (Sentry, CloudWatch, etc.)
- Enable HTTPS/TLS
- Configure proper CORS origins

## Security

- All endpoints require authentication (Bearer token)
- Rate limiting enabled by default (100 requests/minute per user)
- Input validation on all endpoints
- SQL injection protection via TypeORM
- XSS protection via input sanitization
- Secrets management via environment variables

## Monitoring & Observability

### Metrics

The module tracks:
- Token usage per agent/user
- Cost per execution
- Execution time
- Success/failure rates
- Model performance

### Health Check

```bash
GET /health
```

### Logs

Logs are structured in JSON format and include:
- Request/response details
- Error traces
- Performance metrics
- Security events

## Cost Management

Monitor and control LLM costs:

- Set monthly budgets in configuration
- Alert thresholds for cost overruns
- Per-user and per-agent cost tracking
- Token usage analytics

```env
MONTHLY_BUDGET_USD=1000
COST_ALERT_THRESHOLD=0.8
```

## Troubleshooting

### Common Issues

**Vector database connection failed**
- Ensure Qdrant is running: `docker ps | grep qdrant`
- Check VECTOR_DB_URL configuration

**LLM API errors**
- Verify API keys are correct
- Check rate limits on provider side
- Review token limits for models

**Knowledge base indexing stuck**
- Check RabbitMQ is running
- Review file format compatibility
- Check disk space for embeddings

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Link to issues]
- Documentation: [Link to docs]
- Email: support@yourcompany.com

## Roadmap

- [ ] Support for more LLM providers (Cohere, Azure OpenAI)
- [ ] Agent-to-agent communication
- [ ] Advanced prompt engineering UI
- [ ] Multi-language support
- [ ] Voice interface integration
- [ ] Custom function calling
- [ ] Fine-tuning support
- [ ] Advanced analytics dashboard
