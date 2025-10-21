# Polish Accounting CRM Backend

Production-ready CRM backend for Polish accounting offices with specialized features for the Polish market.

## 🚀 Features

### Polish Tax System Integration
- ✅ **NIP** (Tax ID) validation with checksum algorithm
- ✅ **REGON** (Business Registry) validation - 9 and 14-digit variants
- ✅ **PESEL** (Personal ID) validation with date extraction
- ✅ **KRS** (Court Registry) support
- ✅ **PKD codes** (Business classification)
- ✅ **Polish tax forms** (CIT, PIT, VAT, Ryczałt, Karta podatkowa)
- ✅ **VAT rates** (23%, 8%, 5%, 0%, Exempt, N/A)
- ✅ **ZUS** (Social Insurance) configuration

### External Integrations
- 🏛️ **GUS API** - Polish Central Statistical Office data enrichment
- 🇪🇺 **VIES** - EU VAT number validation (27 EU countries)
- 📦 **Redis** - Caching with 24-hour TTL
- 🔄 **Retry logic** - Exponential backoff for external APIs

### Core CRM Features
- 📋 Complete CRUD operations
- 🔍 Advanced search and filtering
- 📊 Automated risk assessment (0-100 scoring)
- 👥 Contact management with roles
- 📝 Timeline and activity tracking
- 📁 Document management
- 🏷️ Custom fields and tagging
- 🔒 Soft delete with restore
- ⚡ Optimistic locking for concurrent updates

## 📦 Tech Stack

- **Framework**: [Hono](https://hono.dev/) - Fast, lightweight web framework
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Validation**: [Zod](https://zod.dev/) - TypeScript-first schema validation
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest

## 🛠️ Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- npm/yarn/pnpm

### Setup

1. **Clone and install dependencies**

```bash
cd crm-backend
npm install
```

2. **Configure environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/crm_platform
PORT=3002
```

Optional variables:
```env
GUS_API_KEY=your-gus-api-key
REDIS_URL=redis://localhost:6379
```

3. **Set up the database**

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Or use Drizzle Studio to explore the database
npm run db:studio
```

4. **Start the development server**

```bash
npm run dev
```

The API will be available at: `http://localhost:3002`

## 📚 API Documentation

### Base URL
```
http://localhost:3002/api/crm
```

### Quick Start

```bash
# Health check
curl http://localhost:3002/health

# Validate NIP
curl -X POST http://localhost:3002/api/crm/validate/nip \
  -H "Content-Type: application/json" \
  -d '{"nip":"5260250274"}'

# List clients
curl http://localhost:3002/api/crm/clients \
  -H "x-user-id: your-user-uuid"
```

For complete API documentation, see:
- [`docs/CRM_API_DOCUMENTATION.md`](./docs/CRM_API_DOCUMENTATION.md)
- [`docs/CRM_MODULE_OVERVIEW.md`](./docs/CRM_MODULE_OVERVIEW.md)

## 🏗️ Project Structure

```
crm-backend/
├── src/
│   ├── db/
│   │   ├── schema.ts          # Database schema
│   │   └── index.ts           # Database connection
│   ├── modules/
│   │   └── crm/
│   │       ├── integrations/  # GUS, VIES services
│   │       ├── services/      # Business logic
│   │       ├── utils/         # Validators (NIP, REGON, etc.)
│   │       └── validators/    # Zod schemas
│   ├── routes/
│   │   └── crm.ts            # API routes
│   └── main.ts               # Application entry point
├── docs/                     # Documentation
├── drizzle/                  # Database migrations
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── .env.example
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test src/modules/crm/utils/__tests__/nip.spec.ts
```

## 📋 Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run lint         # Lint code
npm run format       # Format code with Prettier
npm run db:generate  # Generate database migrations
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Drizzle Studio
```

## 🔐 Authentication

The API currently uses a simple `x-user-id` header for user identification. For production, implement proper JWT authentication:

1. Add JWT middleware to `/src/middleware/auth.ts`
2. Update routes to use the authentication middleware
3. Configure JWT secret in `.env`

## 🌍 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3002 | Server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `NODE_ENV` | No | development | Environment (development/production) |
| `GUS_API_KEY` | No | - | Polish GUS API key |
| `GUS_API_URL` | No | - | GUS API endpoint |
| `REDIS_URL` | No | - | Redis connection string |
| `CORS_ORIGINS` | No | localhost:4200,... | Allowed CORS origins |
| `JWT_SECRET` | No | - | JWT signing secret |

## 📊 Database Schema

The CRM backend uses 5 main tables:

- **clients** - Main client entity (50+ fields)
- **client_contacts** - Contact persons
- **client_timeline_events** - Activity log
- **client_documents** - File attachments
- **client_validation_history** - Validation records

All tables include:
- UUID primary keys
- Timestamps (created_at, updated_at)
- Soft delete support (deleted_at)
- Audit trails (created_by, updated_by)

## 🚀 Deployment

### Docker

```bash
# Build Docker image
docker build -t crm-backend .

# Run container
docker run -p 3002:3002 \
  -e DATABASE_URL=postgresql://... \
  -e GUS_API_KEY=... \
  crm-backend
```

### Traditional Deployment

```bash
# Build
npm run build

# Start production server
NODE_ENV=production npm start
```

## 🔧 Development

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting
- Follow existing code patterns

### Adding New Features

1. Update database schema in `src/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Create validators in `src/modules/crm/validators/`
4. Implement business logic in `src/modules/crm/services/`
5. Add API routes in `src/routes/crm.ts`
6. Write tests in `__tests__/` directories
7. Update documentation

## 📖 Polish Tax System Reference

### Tax Forms

| Code | Name | Polish Name |
|------|------|-------------|
| CIT | Corporate Income Tax | Podatek dochodowy od osób prawnych |
| PIT | Personal Income Tax | Podatek dochodowy od osób fizycznych |
| VAT | Value Added Tax | Podatek od towarów i usług |
| FLAT_TAX | Flat Tax (19%) | Podatek liniowy |
| LUMP_SUM | Lump Sum | Ryczałt od przychodów ewidencjonowanych |
| TAX_CARD | Tax Card | Karta podatkowa |

### VAT Rates

- **23%** - Standard rate
- **8%** - Reduced rate (some foods, publications)
- **5%** - Super reduced rate (basic foods)
- **0%** - Zero rate (exports, intra-EU)
- **Exempt** - VAT exempt
- **N/A** - Not applicable

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues or questions:
- Check the [API Documentation](./docs/CRM_API_DOCUMENTATION.md)
- Review the [Module Overview](./docs/CRM_MODULE_OVERVIEW.md)
- Create an issue in the repository

## 🙏 Acknowledgments

- Polish GUS (Central Statistical Office) for company data
- European Commission VIES for VAT validation
- Drizzle ORM for excellent TypeScript support
- Hono framework for fast API development

---

**Made with ❤️ for Polish accounting offices**
