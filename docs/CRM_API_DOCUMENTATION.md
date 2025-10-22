# CRM Module API Documentation

## Overview

The CRM (Customer Relationship Management) module provides comprehensive client management functionality tailored for Polish accounting offices. It includes Polish-specific features such as NIP/REGON/PESEL validation, GUS API integration, and EU VAT verification.

## Base URL

```
http://localhost:3001/api/crm
```

## Authentication

All endpoints require authentication via JWT token or user ID header:

```http
x-user-id: <user-uuid>
```

---

## Client Management Endpoints

### 1. List Clients

**GET** `/clients`

Retrieve a paginated list of clients with filtering and sorting options.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 20 | Results per page (1-100) |
| `sortBy` | string | 'createdAt' | Sort field (companyName, createdAt, updatedAt, status, riskScore, annualRevenue) |
| `sortOrder` | string | 'desc' | Sort direction (asc, desc) |
| `status` | enum | - | Filter by status (active, inactive, suspended, archived) |
| `clientType` | enum | - | Filter by type (company, sole_proprietor, individual, ngo, public) |
| `taxForm` | enum | - | Filter by tax form (CIT, PIT, VAT, FLAT_TAX, LUMP_SUM, TAX_CARD) |
| `assignedUserId` | uuid | - | Filter by assigned user |
| `tags` | array | - | Filter by tags |
| `search` | string | - | Search in company name, NIP, email |
| `minRiskScore` | number | - | Minimum risk score (0-100) |
| `maxRiskScore` | number | - | Maximum risk score (0-100) |
| `riskLevel` | enum | - | Risk level (low, medium, high) |
| `createdAfter` | date | - | Created after date |
| `createdBefore` | date | - | Created before date |
| `includeDeleted` | boolean | false | Include soft-deleted clients |

#### Example Request

```bash
curl -X GET "http://localhost:3001/api/crm/clients?page=1&limit=20&status=active&sortBy=companyName&sortOrder=asc" \
  -H "x-user-id: 123e4567-e89b-12d3-a456-426614174000"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "companyName": "Example Sp. z o.o.",
      "shortName": "Example",
      "clientType": "company",
      "status": "active",
      "nip": "5260250274",
      "regon": "010531112",
      "krs": "0000123456",
      "email": "contact@example.pl",
      "phone": "+48123456789",
      "addressStreet": "ul. Przykładowa 1",
      "addressCity": "Warszawa",
      "addressPostalCode": "00-001",
      "addressProvince": "mazowieckie",
      "taxForm": "CIT",
      "vatRate": "23",
      "vatPayer": true,
      "riskScore": 15,
      "riskLevel": "low",
      "assignedUserId": "123e4567-e89b-12d3-a456-426614174000",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z",
      "contacts": [...],
      "timeline": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasMore": true
  }
}
```

---

### 2. Get Client by ID

**GET** `/clients/:id`

Retrieve detailed information about a specific client including all relations.

#### Example Request

```bash
curl -X GET "http://localhost:3001/api/crm/clients/550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 123e4567-e89b-12d3-a456-426614174000"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "companyName": "Example Sp. z o.o.",
    "nip": "5260250274",
    // ... all client fields
    "contacts": [
      {
        "id": "contact-uuid",
        "firstName": "Jan",
        "lastName": "Kowalski",
        "position": "Prezes",
        "role": "ceo",
        "email": "jan.kowalski@example.pl",
        "phone": "+48123456789",
        "isPrimary": true
      }
    ],
    "timeline": [
      {
        "id": "event-uuid",
        "eventType": "created",
        "title": "Klient utworzony",
        "description": "Klient Example Sp. z o.o. został dodany do systemu",
        "occurredAt": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

### 3. Create Client

**POST** `/clients`

Create a new client in the system.

#### Request Body

```json
{
  "companyName": "Nowa Firma Sp. z o.o.",
  "shortName": "Nowa Firma",
  "clientType": "company",
  "status": "active",
  "nip": "5260250274",
  "regon": "010531112",
  "krs": "0000123456",
  "pkdPrimary": "62.01.Z",
  "pkdSecondary": ["62.02.Z", "62.03.Z"],
  "vatEu": "PL5260250274",
  "addressStreet": "ul. Testowa 10",
  "addressCity": "Warszawa",
  "addressPostalCode": "00-001",
  "addressProvince": "mazowieckie",
  "addressCountry": "PL",
  "email": "kontakt@nowafirma.pl",
  "phone": "+48123456789",
  "website": "https://www.nowafirma.pl",
  "taxForm": "CIT",
  "vatRate": "23",
  "vatPayer": true,
  "vatExempt": false,
  "smallTaxpayer": false,
  "zusReportingRequired": true,
  "zusNumber": "ZUS123456",
  "taxOffice": "Urząd Skarbowy Warszawa-Śródmieście",
  "industry": "IT",
  "employeeCount": 15,
  "annualRevenue": 1500000.00,
  "tags": ["vip", "technology"],
  "notes": "Klient premium",
  "assignedUserId": "123e4567-e89b-12d3-a456-426614174000"
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "new-client-uuid",
    "companyName": "Nowa Firma Sp. z o.o.",
    // ... all fields
    "riskScore": 10,
    "riskLevel": "low",
    "createdAt": "2025-01-15T10:00:00Z"
  },
  "message": "Klient utworzony pomyślnie"
}
```

---

### 4. Update Client

**PUT** `/clients/:id`

Update an existing client. Supports optimistic locking via version field.

#### Request Body

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "version": 1,
  "companyName": "Updated Sp. z o.o.",
  "email": "new@example.pl",
  "employeeCount": 20
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "version": 2,
    // ... updated fields
  },
  "message": "Klient zaktualizowany pomyślnie"
}
```

---

### 5. Delete Client (Soft Delete)

**DELETE** `/clients/:id`

Soft delete a client (marks as deleted but keeps in database).

#### Example Request

```bash
curl -X DELETE "http://localhost:3001/api/crm/clients/550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 123e4567-e89b-12d3-a456-426614174000"
```

#### Example Response

```json
{
  "success": true,
  "message": "Klient usunięty pomyślnie"
}
```

---

### 6. Restore Client

**POST** `/clients/:id/restore`

Restore a soft-deleted client.

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "inactive",
    "deletedAt": null
  },
  "message": "Klient przywrócony pomyślnie"
}
```

---

## Data Enrichment & Validation

### 7. Enrich from GUS

**POST** `/clients/:id/enrich-gus`

Fetch and update client data from Polish GUS (Central Statistical Office) API.

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "gusDataFetched": true,
    "gusDataFetchedAt": "2025-01-15T10:00:00Z",
    "gusData": {
      "name": "Example Sp. z o.o.",
      "regon": "010531112",
      "address": "ul. Przykładowa 1, 00-001 Warszawa"
    }
  },
  "message": "Dane zaktualizowane z bazy GUS"
}
```

---

### 8. Validate EU VAT

**POST** `/clients/:id/validate-vat`

Validate client's EU VAT number via VIES system.

#### Example Response

```json
{
  "success": true,
  "data": {
    "valid": true,
    "details": {
      "countryCode": "PL",
      "vatNumber": "5260250274",
      "name": "Example Sp. z o.o.",
      "address": "ul. Przykładowa 1, 00-001 Warszawa",
      "requestDate": "2025-01-15T10:00:00Z"
    }
  },
  "message": "Numer VAT UE jest prawidłowy"
}
```

---

### 9. Validate NIP

**POST** `/validate/nip`

Validate Polish NIP number (standalone validation).

#### Request Body

```json
{
  "nip": "5260250274"
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "valid": true,
    "formatted": "526-025-02-74",
    "original": "5260250274"
  }
}
```

---

### 10. Validate REGON

**POST** `/validate/regon`

Validate Polish REGON number (standalone validation).

#### Request Body

```json
{
  "regon": "010531112"
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "valid": true,
    "formatted": "010-531-112",
    "original": "010531112"
  }
}
```

---

### 11. GUS Lookup

**POST** `/gus/lookup`

Look up company data from GUS by NIP (without creating/updating a client).

#### Request Body

```json
{
  "nip": "5260250274"
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "name": "Example Sp. z o.o.",
    "regon": "010531112",
    "nip": "5260250274",
    "street": "ul. Przykładowa 1",
    "city": "Warszawa",
    "postalCode": "00-001",
    "province": "mazowieckie",
    "pkdMain": "62.01.Z",
    "status": "active"
  }
}
```

---

## Contact Management

### 12. Add Contact to Client

**POST** `/clients/:id/contacts`

Add a contact person to a client.

#### Request Body

```json
{
  "firstName": "Anna",
  "lastName": "Nowak",
  "position": "Księgowa",
  "department": "Finanse",
  "role": "accountant",
  "email": "anna.nowak@example.pl",
  "phone": "+48123456789",
  "mobile": "+48987654321",
  "isPrimary": false,
  "isActive": true,
  "canSign": false,
  "notes": "Kontakt główny ds. księgowych"
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "contact-uuid",
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Anna",
    "lastName": "Nowak",
    // ... all contact fields
  },
  "message": "Kontakt dodany pomyślnie"
}
```

---

## Search

### 13. Search Clients

**GET** `/search`

Full-text search across clients.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `limit` | number | No | Max results (default: 10, max: 50) |
| `includeDeleted` | boolean | No | Include deleted clients |

#### Example Request

```bash
curl -X GET "http://localhost:3001/api/crm/search?query=Example&limit=10" \
  -H "x-user-id: 123e4567-e89b-12d3-a456-426614174000"
```

---

## Health Check

### 14. Health Check

**GET** `/health`

Check CRM module health and service availability.

#### Example Response

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "services": {
    "database": "connected",
    "gus": "configured",
    "vies": "available"
  }
}
```

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message in Polish or English"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

---

## Polish Tax Identifiers

### NIP (Numer Identyfikacji Podatkowej)
- Format: 10 digits
- Example: `5260250274`
- Formatted: `526-025-02-74`
- Used for: All tax purposes

### REGON (Rejestr Gospodarki Narodowej)
- Format: 9 or 14 digits
- Example: `010531112` (9-digit) or `01053111200000` (14-digit)
- Formatted: `010-531-112` or `010-531-112-00000`
- Used for: Business registry identification

### PESEL (Powszechny Elektroniczny System Ewidencji Ludności)
- Format: 11 digits
- Example: `44051401458`
- Formatted: `440514 01458`
- Used for: Individual identification

### KRS (Krajowy Rejestr Sądowy)
- Format: 10 digits
- Example: `0000123456`
- Used for: Court registry number

---

## Rate Limiting

The GUS and VIES API integrations implement automatic retry logic with exponential backoff:

- Max retries: 3
- Initial delay: 1 second
- Backoff multiplier: 2x

Results are cached for 24 hours to minimize API calls.

---

## Data Privacy & GDPR

The CRM module supports GDPR compliance with:

- Soft delete functionality
- Complete data export capability
- Audit trails for all modifications
- Field-level encryption support (configurable)

---

## Best Practices

1. **Always validate** NIP/REGON before creating clients
2. **Use GUS enrichment** to auto-fill company data
3. **Validate EU VAT** for international clients
4. **Implement optimistic locking** using version field for updates
5. **Monitor risk scores** and reassess periodically
6. **Tag clients** for easy categorization and filtering
7. **Use timeline events** to track all interactions

---

## Examples

### Complete Client Creation Workflow

```javascript
// 1. Validate NIP
const nipValidation = await fetch('/api/crm/validate/nip', {
  method: 'POST',
  body: JSON.stringify({ nip: '5260250274' })
});

// 2. Fetch GUS data
const gusData = await fetch('/api/crm/gus/lookup', {
  method: 'POST',
  body: JSON.stringify({ nip: '5260250274' })
});

// 3. Create client with enriched data
const client = await fetch('/api/crm/clients', {
  method: 'POST',
  body: JSON.stringify({
    companyName: gusData.data.name,
    nip: '5260250274',
    regon: gusData.data.regon,
    addressStreet: gusData.data.street,
    addressCity: gusData.data.city,
    // ... other fields
  })
});

// 4. Add primary contact
const contact = await fetch(`/api/crm/clients/${client.data.id}/contacts`, {
  method: 'POST',
  body: JSON.stringify({
    firstName: 'Jan',
    lastName: 'Kowalski',
    isPrimary: true,
    role: 'ceo'
  })
});
```

---

## Support

For issues or questions, please refer to the main project documentation or create an issue in the project repository.
