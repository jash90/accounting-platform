import { pgTable, text, timestamp, uuid, boolean, index, integer, decimal, jsonb, varchar, pgEnum } from 'drizzle-orm/pg-core';

// ============================================================================
// User Schema (minimal for CRM references)
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================================
// CRM MODULE - Polish Accounting Platform
// ============================================================================

// Enums for CRM module
export const clientStatusEnum = pgEnum('client_status', ['active', 'inactive', 'suspended', 'archived']);
export const clientTypeEnum = pgEnum('client_type', ['company', 'sole_proprietor', 'individual', 'ngo', 'public']);
export const taxFormEnum = pgEnum('tax_form', ['CIT', 'PIT', 'VAT', 'FLAT_TAX', 'LUMP_SUM', 'TAX_CARD']);
export const vatRateEnum = pgEnum('vat_rate', ['23', '8', '5', '0', 'EXEMPT', 'NOT_APPLICABLE']);
export const contactRoleEnum = pgEnum('contact_role', ['owner', 'ceo', 'cfo', 'accountant', 'assistant', 'other']);
export const timelineEventTypeEnum = pgEnum('timeline_event_type', ['created', 'updated', 'status_changed', 'note_added', 'document_uploaded', 'email_sent', 'meeting', 'call', 'task_completed', 'payment_received']);

// Main clients table
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Basic Information
  companyName: text('company_name').notNull(),
  shortName: text('short_name'), // Skrócona nazwa
  clientType: clientTypeEnum('client_type').notNull().default('company'),
  status: clientStatusEnum('status').notNull().default('active'),

  // Polish Tax Identifiers (Required for Polish companies)
  nip: varchar('nip', { length: 10 }).unique(), // 10-digit Polish tax ID
  regon: varchar('regon', { length: 14 }), // 9 or 14-digit business registry number
  krs: varchar('krs', { length: 10 }), // Court registry number (0000000000 format)
  pesel: varchar('pesel', { length: 11 }), // For individual clients

  // PKD Codes (Polish business classification)
  pkdPrimary: varchar('pkd_primary', { length: 10 }), // Primary PKD code
  pkdSecondary: jsonb('pkd_secondary').$type<string[]>().default([]), // Array of additional PKD codes

  // EU VAT Information
  vatEu: varchar('vat_eu', { length: 15 }), // EU VAT number (for intra-EU trade)
  vatEuValidated: boolean('vat_eu_validated').default(false),
  vatEuValidatedAt: timestamp('vat_eu_validated_at'),

  // Address Information
  addressStreet: text('address_street'),
  addressCity: text('address_city'),
  addressPostalCode: varchar('address_postal_code', { length: 6 }), // XX-XXX format
  addressProvince: text('address_province'), // Województwo
  addressCountry: varchar('address_country', { length: 2 }).default('PL'), // ISO 2-letter code

  // Correspondence Address (if different)
  correspondenceStreet: text('correspondence_street'),
  correspondenceCity: text('correspondence_city'),
  correspondencePostalCode: varchar('correspondence_postal_code', { length: 6 }),
  correspondenceProvince: text('correspondence_province'),
  correspondenceCountry: varchar('correspondence_country', { length: 2 }),

  // Contact Information
  email: text('email'),
  phone: varchar('phone', { length: 20 }),
  website: text('website'),

  // Tax Configuration
  taxForm: taxFormEnum('tax_form').default('CIT'),
  vatRate: vatRateEnum('vat_rate').default('23'),
  vatPayer: boolean('vat_payer').default(true), // Podatnik VAT
  vatExempt: boolean('vat_exempt').default(false), // Zwolniony z VAT
  smallTaxpayer: boolean('small_taxpayer').default(false), // Mały podatnik

  // ZUS (Polish Social Insurance)
  zusReportingRequired: boolean('zus_reporting_required').default(false),
  zusNumber: varchar('zus_number', { length: 20 }),

  // Tax Office Information
  taxOffice: text('tax_office'), // Urząd Skarbowy
  taxOfficeCode: varchar('tax_office_code', { length: 10 }),

  // Business Details
  industry: text('industry'), // Branża
  employeeCount: integer('employee_count'),
  annualRevenue: decimal('annual_revenue', { precision: 15, scale: 2 }),

  // Risk Assessment
  riskScore: integer('risk_score').default(0), // 0-100
  riskLevel: text('risk_level').default('low'), // low, medium, high
  riskFactors: jsonb('risk_factors').$type<string[]>().default([]),
  lastRiskAssessment: timestamp('last_risk_assessment'),

  // GUS Data Enrichment
  gusDataFetched: boolean('gus_data_fetched').default(false),
  gusDataFetchedAt: timestamp('gus_data_fetched_at'),
  gusData: jsonb('gus_data').$type<Record<string, any>>(), // Complete GUS API response

  // Custom Fields (for industry-specific data)
  customFields: jsonb('custom_fields').$type<Record<string, any>>().default({}),

  // Tags for categorization
  tags: jsonb('tags').$type<string[]>().default([]),

  // Notes
  notes: text('notes'),
  internalNotes: text('internal_notes'), // Not visible to client

  // Relationships
  assignedUserId: uuid('assigned_user_id').references(() => users.id), // Assigned accountant

  // Audit fields
  version: integer('version').default(1), // For optimistic locking
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  deletedAt: timestamp('deleted_at'), // Soft delete
  deletedBy: uuid('deleted_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nipIdx: index('clients_nip_idx').on(table.nip),
  statusIdx: index('clients_status_idx').on(table.status),
  assignedUserIdx: index('clients_assigned_user_idx').on(table.assignedUserId),
  createdAtIdx: index('clients_created_at_idx').on(table.createdAt),
  deletedAtIdx: index('clients_deleted_at_idx').on(table.deletedAt),
}));

// Client Contacts
export const clientContacts = pgTable('client_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),

  // Personal Information
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  position: text('position'), // Stanowisko
  department: text('department'), // Dział
  role: contactRoleEnum('role').default('other'),

  // Contact Details
  email: text('email'),
  phone: varchar('phone', { length: 20 }),
  mobile: varchar('mobile', { length: 20 }),

  // Flags
  isPrimary: boolean('is_primary').default(false), // Primary contact
  isActive: boolean('is_active').default(true),
  canSign: boolean('can_sign').default(false), // Osoba uprawniona do podpisywania dokumentów

  // Notes
  notes: text('notes'),

  // Audit fields
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  clientIdIdx: index('client_contacts_client_id_idx').on(table.clientId),
  isPrimaryIdx: index('client_contacts_is_primary_idx').on(table.isPrimary),
}));

// Client Timeline Events (Activity Log)
export const clientTimelineEvents = pgTable('client_timeline_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),

  // Event Details
  eventType: timelineEventTypeEnum('event_type').notNull(),
  title: text('title').notNull(),
  description: text('description'),

  // Related Data
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}), // Additional event data

  // User who performed the action
  userId: uuid('user_id').references(() => users.id),

  // Timestamp
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  clientIdIdx: index('client_timeline_client_id_idx').on(table.clientId),
  eventTypeIdx: index('client_timeline_event_type_idx').on(table.eventType),
  occurredAtIdx: index('client_timeline_occurred_at_idx').on(table.occurredAt),
}));

// Client Documents
export const clientDocuments = pgTable('client_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),

  // Document Information
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(), // in bytes
  fileType: text('file_type').notNull(), // MIME type
  filePath: text('file_path').notNull(), // Storage path

  // Categorization
  category: text('category'), // e.g., 'tax_documents', 'contracts', 'invoices'
  tags: jsonb('tags').$type<string[]>().default([]),

  // Metadata
  description: text('description'),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

  // Upload Information
  uploadedBy: uuid('uploaded_by').references(() => users.id),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  clientIdIdx: index('client_documents_client_id_idx').on(table.clientId),
  categoryIdx: index('client_documents_category_idx').on(table.category),
}));

// Client Validation History (for NIP, REGON, VAT validations)
export const clientValidationHistory = pgTable('client_validation_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),

  // Validation Details
  validationType: text('validation_type').notNull(), // 'NIP', 'REGON', 'VAT_EU', 'GUS'
  isValid: boolean('is_valid').notNull(),
  validationData: jsonb('validation_data').$type<Record<string, any>>(), // API response

  // Error information (if validation failed)
  errorMessage: text('error_message'),

  // Audit
  validatedBy: uuid('validated_by').references(() => users.id),
  validatedAt: timestamp('validated_at').notNull().defaultNow(),
}, (table) => ({
  clientIdIdx: index('client_validation_client_id_idx').on(table.clientId),
  validationTypeIdx: index('client_validation_type_idx').on(table.validationType),
}));

// Type exports for CRM module
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// CRM Types
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type ClientContact = typeof clientContacts.$inferSelect;
export type NewClientContact = typeof clientContacts.$inferInsert;
export type ClientTimelineEvent = typeof clientTimelineEvents.$inferSelect;
export type NewClientTimelineEvent = typeof clientTimelineEvents.$inferInsert;
export type ClientDocument = typeof clientDocuments.$inferSelect;
export type NewClientDocument = typeof clientDocuments.$inferInsert;
export type ClientValidationHistory = typeof clientValidationHistory.$inferSelect;
export type NewClientValidationHistory = typeof clientValidationHistory.$inferInsert;
