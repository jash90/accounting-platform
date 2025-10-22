/**
 * Zod Validation Schemas for CRM Module
 * Type-safe validation for client data with Polish-specific validators
 */

import { z } from 'zod';
import { validateNIP } from '../utils/nip';
import { validateREGON } from '../utils/regon';
import { validatePESEL } from '../utils/pesel';
import { validatePostalCode } from '../utils/postal-code';

// ============================================================================
// Base Schemas
// ============================================================================

const nipSchema = z
  .string()
  .trim()
  .length(10, 'NIP musi składać się z 10 cyfr')
  .regex(/^\d{10}$/, 'NIP może zawierać tylko cyfry')
  .refine(validateNIP, 'Nieprawidłowa suma kontrolna NIP')
  .optional();

const regonSchema = z
  .string()
  .trim()
  .refine(
    (val) => val.length === 9 || val.length === 14,
    'REGON musi składać się z 9 lub 14 cyfr'
  )
  .refine((val) => /^\d+$/.test(val), 'REGON może zawierać tylko cyfry')
  .refine(validateREGON, 'Nieprawidłowa suma kontrolna REGON')
  .optional();

const peselSchema = z
  .string()
  .trim()
  .length(11, 'PESEL musi składać się z 11 cyfr')
  .regex(/^\d{11}$/, 'PESEL może zawierać tylko cyfry')
  .refine(validatePESEL, 'Nieprawidłowy PESEL')
  .optional();

const krsSchema = z
  .string()
  .trim()
  .length(10, 'KRS musi składać się z 10 cyfr')
  .regex(/^\d{10}$/, 'KRS może zawierać tylko cyfry')
  .optional();

const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}-\d{3}$/, 'Kod pocztowy musi być w formacie XX-XXX')
  .refine(validatePostalCode, 'Nieprawidłowy kod pocztowy')
  .optional();

const emailSchema = z
  .string()
  .email('Nieprawidłowy adres email')
  .toLowerCase()
  .optional();

const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(\+48)?[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}$/,
    'Nieprawidłowy numer telefonu'
  )
  .optional();

// ============================================================================
// Enums
// ============================================================================

export const clientStatusEnum = z.enum([
  'active',
  'inactive',
  'suspended',
  'archived',
]);

export const clientTypeEnum = z.enum([
  'company',
  'sole_proprietor',
  'individual',
  'ngo',
  'public',
]);

export const taxFormEnum = z.enum([
  'CIT',
  'PIT',
  'VAT',
  'FLAT_TAX',
  'LUMP_SUM',
  'TAX_CARD',
]);

export const vatRateEnum = z.enum([
  '23',
  '8',
  '5',
  '0',
  'EXEMPT',
  'NOT_APPLICABLE',
]);

export const contactRoleEnum = z.enum([
  'owner',
  'ceo',
  'cfo',
  'accountant',
  'assistant',
  'other',
]);

export const riskLevelEnum = z.enum(['low', 'medium', 'high']);

// ============================================================================
// Client Schema
// ============================================================================

export const createClientSchema = z
  .object({
    // Basic Information
    companyName: z
      .string()
      .trim()
      .min(1, 'Nazwa firmy jest wymagana')
      .max(255, 'Nazwa firmy jest za długa'),
    shortName: z.string().trim().max(100).optional(),
    clientType: clientTypeEnum.default('company'),
    status: clientStatusEnum.default('active'),

    // Polish Tax Identifiers
    nip: nipSchema,
    regon: regonSchema,
    krs: krsSchema,
    pesel: peselSchema,

    // PKD Codes
    pkdPrimary: z.string().trim().max(10).optional(),
    pkdSecondary: z.array(z.string().trim()).default([]),

    // EU VAT
    vatEu: z.string().trim().max(15).optional(),

    // Address Information
    addressStreet: z.string().trim().max(255).optional(),
    addressCity: z.string().trim().max(100).optional(),
    addressPostalCode: postalCodeSchema,
    addressProvince: z.string().trim().max(100).optional(),
    addressCountry: z.string().length(2).default('PL'),

    // Correspondence Address
    correspondenceStreet: z.string().trim().max(255).optional(),
    correspondenceCity: z.string().trim().max(100).optional(),
    correspondencePostalCode: postalCodeSchema,
    correspondenceProvince: z.string().trim().max(100).optional(),
    correspondenceCountry: z.string().length(2).optional(),

    // Contact Information
    email: emailSchema,
    phone: phoneSchema,
    website: z.string().url('Nieprawidłowy adres URL').optional(),

    // Tax Configuration
    taxForm: taxFormEnum.default('CIT'),
    vatRate: vatRateEnum.default('23'),
    vatPayer: z.boolean().default(true),
    vatExempt: z.boolean().default(false),
    smallTaxpayer: z.boolean().default(false),

    // ZUS
    zusReportingRequired: z.boolean().default(false),
    zusNumber: z.string().trim().max(20).optional(),

    // Tax Office
    taxOffice: z.string().trim().max(255).optional(),
    taxOfficeCode: z.string().trim().max(10).optional(),

    // Business Details
    industry: z.string().trim().max(100).optional(),
    employeeCount: z.number().int().min(0).optional(),
    annualRevenue: z.number().min(0).optional(),

    // Custom Fields
    customFields: z.record(z.string(), z.any()).default({}),
    tags: z.array(z.string().trim()).default([]),

    // Notes
    notes: z.string().optional(),
    internalNotes: z.string().optional(),

    // Assignment
    assignedUserId: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      // At least one tax identifier is required for companies
      if (
        data.clientType === 'company' ||
        data.clientType === 'sole_proprietor'
      ) {
        return data.nip || data.regon || data.krs;
      }
      return true;
    },
    {
      message:
        'Wymagany jest co najmniej jeden identyfikator podatkowy (NIP, REGON lub KRS)',
      path: ['nip'],
    }
  )
  .refine(
    (data) => {
      // PESEL is required for individuals
      if (data.clientType === 'individual') {
        return !!data.pesel;
      }
      return true;
    },
    {
      message: 'PESEL jest wymagany dla klientów indywidualnych',
      path: ['pesel'],
    }
  );

export const updateClientSchema = createClientSchema.partial().extend({
  id: z.string().uuid(),
  version: z.number().int().min(1).optional(), // For optimistic locking
});

export const clientIdSchema = z.object({
  id: z.string().uuid('Nieprawidłowy identyfikator klienta'),
});

// ============================================================================
// Client Contact Schema
// ============================================================================

export const createClientContactSchema = z.object({
  clientId: z.string().uuid(),
  firstName: z.string().trim().min(1, 'Imię jest wymagane').max(100),
  lastName: z.string().trim().min(1, 'Nazwisko jest wymagane').max(100),
  position: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  role: contactRoleEnum.default('other'),
  email: emailSchema,
  phone: phoneSchema,
  mobile: phoneSchema,
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
  canSign: z.boolean().default(false),
  notes: z.string().optional(),
});

export const updateClientContactSchema = createClientContactSchema
  .partial()
  .extend({
    id: z.string().uuid(),
  });

// ============================================================================
// Query Schemas
// ============================================================================

export const listClientsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  // Sorting
  sortBy: z
    .enum([
      'companyName',
      'createdAt',
      'updatedAt',
      'status',
      'riskScore',
      'annualRevenue',
    ])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // Filtering
  status: clientStatusEnum.optional(),
  clientType: clientTypeEnum.optional(),
  taxForm: taxFormEnum.optional(),
  assignedUserId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().trim().optional(),

  // Risk filtering
  minRiskScore: z.coerce.number().int().min(0).max(100).optional(),
  maxRiskScore: z.coerce.number().int().min(0).max(100).optional(),
  riskLevel: riskLevelEnum.optional(),

  // Date filtering
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),

  // Include soft-deleted
  includeDeleted: z.coerce.boolean().default(false),
});

export const searchClientsQuerySchema = z.object({
  query: z.string().trim().min(1, 'Zapytanie wyszukiwania jest wymagane'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  includeDeleted: z.coerce.boolean().default(false),
});

// ============================================================================
// Validation Schemas
// ============================================================================

export const validateNIPSchema = z.object({
  nip: z.string().trim().min(10).max(10),
});

export const validateREGONSchema = z.object({
  regon: z.string().trim().refine((val) => val.length === 9 || val.length === 14),
});

export const validateVATEUSchema = z.object({
  vatNumber: z.string().trim().min(8).max(15),
  countryCode: z.string().length(2),
});

export const enrichFromGUSSchema = z.object({
  nip: z.string().trim().length(10),
});

// ============================================================================
// Bulk Operations Schemas
// ============================================================================

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Wymagany co najmniej jeden identyfikator'),
  permanent: z.boolean().default(false),
});

export const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Wymagany co najmniej jeden identyfikator'),
  data: updateClientSchema.partial().omit({ id: true, version: true }),
});

export const bulkArchiveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Wymagany co najmniej jeden identyfikator'),
});

export const bulkRestoreSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Wymagany co najmniej jeden identyfikator'),
});

// ============================================================================
// Export/Import Schemas
// ============================================================================

export const exportClientsSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json']).default('csv'),
  filters: listClientsQuerySchema.partial().optional(),
  fields: z.array(z.string()).optional(),
});

export const importClientsSchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
  file: z.any(), // File upload
  skipDuplicates: z.boolean().default(true),
  validateOnly: z.boolean().default(false),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientIdInput = z.infer<typeof clientIdSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
export type SearchClientsQuery = z.infer<typeof searchClientsQuerySchema>;
export type CreateClientContactInput = z.infer<typeof createClientContactSchema>;
export type UpdateClientContactInput = z.infer<typeof updateClientContactSchema>;
export type ValidateNIPInput = z.infer<typeof validateNIPSchema>;
export type ValidateREGONInput = z.infer<typeof validateREGONSchema>;
export type ValidateVATEUInput = z.infer<typeof validateVATEUSchema>;
export type EnrichFromGUSInput = z.infer<typeof enrichFromGUSSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
export type ExportClientsInput = z.infer<typeof exportClientsSchema>;
