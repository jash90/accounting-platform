# CRM Module - Polish Accounting Platform

## Overview

The CRM (Customer Relationship Management) module is a comprehensive solution for managing client relationships in Polish accounting offices. It provides specialized features for the Polish market, including validation of Polish tax identifiers, integration with government databases, and support for Polish tax regulations.

---

## Key Features

### 🇵🇱 Polish-Specific Functionality

1. **Tax Identifier Validation**
   - NIP (Numer Identyfikacji Podatkowej) - 10-digit tax ID with checksum
   - REGON (Rejestr Gospodarki Narodowej) - 9 or 14-digit business registry number
   - PESEL (Individual identification) - 11-digit personal ID
   - KRS (Krajowy Rejestr Sądowy) - 10-digit court registry number

2. **GUS Integration**
   - Automatic company data enrichment from Polish Central Statistical Office
   - Fetch company details, addresses, and PKD codes
   - Cached responses for performance (24-hour TTL)

3. **VIES Integration**
   - EU VAT number validation via European Commission's VIES system
   - Support for all EU country codes
   - Validation history tracking

4. **Polish Tax Configuration**
   - Tax forms: CIT, PIT, VAT, Flat Tax (ryczałt), Lump Sum, Tax Card
   - VAT rates: 23%, 8%, 5%, 0%, Exempt, Not Applicable
   - ZUS (Social Insurance) reporting configuration
   - Tax office assignment

5. **PKD Codes**
   - Primary and secondary business classification codes
   - Polish business activity classification system

### 💼 Core CRM Features

1. **Client Management**
   - Full CRUD operations with soft delete
   - Multi-entity support (companies, sole proprietors, individuals, NGOs, public entities)
   - Custom fields for industry-specific data
   - Tagging system for categorization

2. **Contact Management**
   - Multiple contacts per client
   - Role-based contacts (CEO, CFO, Accountant, etc.)
   - Primary contact designation
   - Signing authority tracking

3. **Risk Assessment**
   - Automated risk scoring (0-100)
   - Risk levels: Low, Medium, High
   - Configurable risk factors
   - Periodic reassessment

4. **Timeline & Activity Tracking**
   - Comprehensive audit trail
   - Event types: Created, Updated, Status Changed, Notes, Documents, Emails, Meetings, Calls
   - User attribution for all actions
   - Historical data preservation

5. **Document Management**
   - File upload and categorization
   - Document metadata
   - Category-based organization
   - Tags for easy retrieval

6. **Advanced Filtering & Search**
   - Full-text search across multiple fields
   - Filter by status, type, tax form, risk level
   - Date range filtering
   - Tag-based filtering
   - Sorting by multiple criteria

7. **Data Validation**
   - Zod-based schema validation
   - Polish-specific validators
   - Comprehensive error messages in Polish and English
   - Client and server-side validation

---

## Technical Architecture

### Database Schema

The CRM module uses **Drizzle ORM** with PostgreSQL and includes:

- **clients** - Main client entity with 50+ fields
- **client_contacts** - Contact persons
- **client_timeline_events** - Activity log
- **client_documents** - File attachments
- **client_validation_history** - Validation records

All tables include:
- UUID primary keys
- Timestamps (created_at, updated_at)
- Soft delete support (deleted_at)
- Audit fields (created_by, updated_by)
- Optimistic locking (version field)

### API Architecture

**Framework**: Hono (Fast, lightweight web framework)

**Endpoints**: 14+ RESTful endpoints

**Validation**: Zod schemas with Polish-specific validators

**Error Handling**: Consistent error responses with i18n messages

### Service Layer

**ClientService** - Core business logic:
- CRUD operations
- Risk assessment
- Data normalization
- GUS/VIES integration
- Validation history

**GUSService** - Polish government database integration:
- Company data fetching
- Retry logic with exponential backoff
- Redis caching (24-hour TTL)
- SOAP protocol support (placeholder)

**VIESService** - EU VAT validation:
- SOAP API integration
- Country-specific format validation
- Caching mechanism
- Error handling

---

## Installation & Setup

### 1. Database Migration

Run the CRM module migration:

```bash
# Execute the migration SQL file directly
psql -d accounting_platform -f drizzle/0002_crm_module.sql

# Or use Drizzle migration tools (if configured)
npm run db:migrate
```

### 2. Environment Variables

Add to your `.env` file:

```env
# Optional: GUS API Configuration
GUS_API_KEY=your-gus-api-key
GUS_API_URL=https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/accounting_platform

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379
```

### 3. Start the Server

```bash
npm run dev
```

The CRM API will be available at: `http://localhost:3001/api/crm`

---

## Usage Examples

### Creating a Client with GUS Enrichment

```typescript
// 1. Validate NIP
const nipResponse = await fetch('/api/crm/validate/nip', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nip: '5260250274' })
});

// 2. Fetch GUS data
const gusResponse = await fetch('/api/crm/gus/lookup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nip: '5260250274' })
});

const gusData = await gusResponse.json();

// 3. Create client
const clientResponse = await fetch('/api/crm/clients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'user-uuid'
  },
  body: JSON.stringify({
    companyName: gusData.data.name,
    nip: '5260250274',
    regon: gusData.data.regon,
    addressStreet: gusData.data.street,
    addressCity: gusData.data.city,
    addressPostalCode: gusData.data.postalCode,
    taxForm: 'CIT',
    vatPayer: true,
    tags: ['new', 'verified']
  })
});
```

### Updating Client with Optimistic Locking

```typescript
// 1. Get current client
const client = await fetch('/api/crm/clients/client-uuid')
  .then(r => r.json());

// 2. Update with version check
const updateResponse = await fetch(`/api/crm/clients/${client.data.id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'user-uuid'
  },
  body: JSON.stringify({
    id: client.data.id,
    version: client.data.version,
    employeeCount: 25,
    annualRevenue: 2000000
  })
});
```

### Searching Clients

```typescript
const searchResponse = await fetch(
  '/api/crm/clients?' + new URLSearchParams({
    search: 'Example',
    status: 'active',
    taxForm: 'CIT',
    minRiskScore: '0',
    maxRiskScore: '30',
    page: '1',
    limit: '20',
    sortBy: 'companyName',
    sortOrder: 'asc'
  })
);
```

---

## Testing

### Unit Tests

Run validator tests:

```bash
npm test apps/backend/src/modules/crm/utils/__tests__
```

Tests cover:
- ✅ NIP validation and formatting
- ✅ REGON validation (9 and 14-digit)
- ✅ PESEL validation and data extraction
- ✅ Postal code validation
- ✅ Province code validation

### Integration Tests

```bash
npm test apps/backend/src/modules/crm/__tests__
```

### Manual Testing

Use the provided Postman/Insomnia collection or the API documentation examples.

---

## Performance Considerations

### Database Indexes

The module creates indexes on frequently queried fields:
- `clients.nip` - For NIP lookups
- `clients.status` - For status filtering
- `clients.assigned_user_id` - For user assignments
- `clients.created_at` - For date sorting
- `clients.deleted_at` - For soft delete queries

### Caching Strategy

- **GUS API responses**: 24 hours (Redis)
- **VIES validation**: 24 hours (Redis)
- **Client queries**: Application-level caching recommended

### Query Optimization

- Use pagination for large datasets
- Implement lazy loading for related data
- Use select specific fields when possible
- Monitor slow queries and add indexes as needed

---

## Security

### Row-Level Security (RLS)

Implement PostgreSQL RLS policies for multi-tenancy:

```sql
-- Example RLS policy
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_access_policy ON clients
  USING (organization_id = current_setting('app.current_organization')::uuid);
```

### Field-Level Encryption

Sensitive fields can be encrypted (implementation required):
- Bank account numbers
- PESEL numbers
- Internal notes

### Input Validation

All inputs are validated using Zod schemas with:
- Type checking
- Length constraints
- Format validation
- Custom business rules

### Audit Trail

All modifications are tracked:
- Who created/updated/deleted
- When the action occurred
- Version history for conflict detection

---

## Polish Tax System Reference

### Tax Forms

| Code | Name | Description |
|------|------|-------------|
| CIT | Corporate Income Tax | Podatek dochodowy od osób prawnych |
| PIT | Personal Income Tax | Podatek dochodowy od osób fizycznych |
| VAT | Value Added Tax | Podatek od towarów i usług |
| FLAT_TAX | Flat Tax | Podatek liniowy (19%) |
| LUMP_SUM | Lump Sum | Ryczałt od przychodów ewidencjonowanych |
| TAX_CARD | Tax Card | Karta podatkowa |

### VAT Rates

| Rate | Description |
|------|-------------|
| 23% | Standard rate |
| 8% | Reduced rate (some foods, publications) |
| 5% | Super reduced rate (basic foods) |
| 0% | Zero rate (exports, intra-EU) |
| Exempt | VAT exempt |
| N/A | Not applicable |

---

## Roadmap

### Planned Features

- [ ] Elasticsearch integration for full-text search
- [ ] Redis caching implementation
- [ ] Bulk import/export (CSV, Excel)
- [ ] Advanced reporting and analytics
- [ ] Email integration
- [ ] Calendar integration for meetings
- [ ] Mobile app support
- [ ] Real-time notifications
- [ ] Advanced role-based permissions
- [ ] Multi-language support (Polish/English)

---

## Contributing

### Code Style

- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Follow existing patterns

### Pull Request Process

1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit PR with description

---

## Support & Documentation

- **API Documentation**: `/docs/CRM_API_DOCUMENTATION.md`
- **Database Schema**: `/apps/backend/src/db/schema.ts`
- **Validation Schemas**: `/apps/backend/src/modules/crm/validators/`
- **Service Layer**: `/apps/backend/src/modules/crm/services/`
- **Integrations**: `/apps/backend/src/modules/crm/integrations/`

---

## License

MIT License - See LICENSE file for details

---

## Acknowledgments

- Polish GUS (Central Statistical Office) for company data
- European Commission VIES for VAT validation
- Drizzle ORM for excellent TypeScript support
- Hono framework for fast API development
