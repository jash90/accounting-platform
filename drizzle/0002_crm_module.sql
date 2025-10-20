-- CRM Module Migration for Polish Accounting Platform
-- Creates comprehensive client management system with Polish-specific fields

-- Create ENUM types
DO $$ BEGIN
 CREATE TYPE "public"."client_status" AS ENUM('active', 'inactive', 'suspended', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."client_type" AS ENUM('company', 'sole_proprietor', 'individual', 'ngo', 'public');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."tax_form" AS ENUM('CIT', 'PIT', 'VAT', 'FLAT_TAX', 'LUMP_SUM', 'TAX_CARD');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."vat_rate" AS ENUM('23', '8', '5', '0', 'EXEMPT', 'NOT_APPLICABLE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."contact_role" AS ENUM('owner', 'ceo', 'cfo', 'accountant', 'assistant', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."timeline_event_type" AS ENUM('created', 'updated', 'status_changed', 'note_added', 'document_uploaded', 'email_sent', 'meeting', 'call', 'task_completed', 'payment_received');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Main clients table
CREATE TABLE IF NOT EXISTS "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

	-- Basic Information
	"company_name" text NOT NULL,
	"short_name" text,
	"client_type" "client_type" DEFAULT 'company' NOT NULL,
	"status" "client_status" DEFAULT 'active' NOT NULL,

	-- Polish Tax Identifiers
	"nip" varchar(10),
	"regon" varchar(14),
	"krs" varchar(10),
	"pesel" varchar(11),

	-- PKD Codes
	"pkd_primary" varchar(10),
	"pkd_secondary" jsonb DEFAULT '[]'::jsonb,

	-- EU VAT Information
	"vat_eu" varchar(15),
	"vat_eu_validated" boolean DEFAULT false,
	"vat_eu_validated_at" timestamp,

	-- Address Information
	"address_street" text,
	"address_city" text,
	"address_postal_code" varchar(6),
	"address_province" text,
	"address_country" varchar(2) DEFAULT 'PL',

	-- Correspondence Address
	"correspondence_street" text,
	"correspondence_city" text,
	"correspondence_postal_code" varchar(6),
	"correspondence_province" text,
	"correspondence_country" varchar(2),

	-- Contact Information
	"email" text,
	"phone" varchar(20),
	"website" text,

	-- Tax Configuration
	"tax_form" "tax_form" DEFAULT 'CIT',
	"vat_rate" "vat_rate" DEFAULT '23',
	"vat_payer" boolean DEFAULT true,
	"vat_exempt" boolean DEFAULT false,
	"small_taxpayer" boolean DEFAULT false,

	-- ZUS (Polish Social Insurance)
	"zus_reporting_required" boolean DEFAULT false,
	"zus_number" varchar(20),

	-- Tax Office Information
	"tax_office" text,
	"tax_office_code" varchar(10),

	-- Business Details
	"industry" text,
	"employee_count" integer,
	"annual_revenue" numeric(15, 2),

	-- Risk Assessment
	"risk_score" integer DEFAULT 0,
	"risk_level" text DEFAULT 'low',
	"risk_factors" jsonb DEFAULT '[]'::jsonb,
	"last_risk_assessment" timestamp,

	-- GUS Data Enrichment
	"gus_data_fetched" boolean DEFAULT false,
	"gus_data_fetched_at" timestamp,
	"gus_data" jsonb,

	-- Custom Fields
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,

	-- Notes
	"notes" text,
	"internal_notes" text,

	-- Relationships
	"assigned_user_id" uuid,

	-- Audit fields
	"version" integer DEFAULT 1,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,

	CONSTRAINT "clients_nip_unique" UNIQUE("nip")
);

--> statement-breakpoint
-- Client Contacts table
CREATE TABLE IF NOT EXISTS "client_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,

	-- Personal Information
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"position" text,
	"department" text,
	"role" "contact_role" DEFAULT 'other',

	-- Contact Details
	"email" text,
	"phone" varchar(20),
	"mobile" varchar(20),

	-- Flags
	"is_primary" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"can_sign" boolean DEFAULT false,

	-- Notes
	"notes" text,

	-- Audit
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- Client Timeline Events table
CREATE TABLE IF NOT EXISTS "client_timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,

	-- Event Details
	"event_type" "timeline_event_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,

	-- Related Data
	"metadata" jsonb DEFAULT '{}'::jsonb,

	-- User who performed the action
	"user_id" uuid,

	-- Timestamp
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- Client Documents table
CREATE TABLE IF NOT EXISTS "client_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,

	-- Document Information
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_type" text NOT NULL,
	"file_path" text NOT NULL,

	-- Categorization
	"category" text,
	"tags" jsonb DEFAULT '[]'::jsonb,

	-- Metadata
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,

	-- Upload Information
	"uploaded_by" uuid,

	-- Audit
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- Client Validation History table
CREATE TABLE IF NOT EXISTS "client_validation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,

	-- Validation Details
	"validation_type" text NOT NULL,
	"is_valid" boolean NOT NULL,
	"validation_data" jsonb,

	-- Error information
	"error_message" text,

	-- Audit
	"validated_by" uuid,
	"validated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- Add Foreign Key Constraints
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_user_id_users_id_fk"
	FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_users_id_fk"
	FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "clients" ADD CONSTRAINT "clients_updated_by_users_id_fk"
	FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "clients" ADD CONSTRAINT "clients_deleted_by_users_id_fk"
	FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_clients_id_fk"
	FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "client_timeline_events" ADD CONSTRAINT "client_timeline_events_client_id_clients_id_fk"
	FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "client_timeline_events" ADD CONSTRAINT "client_timeline_events_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_clients_id_fk"
	FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_uploaded_by_users_id_fk"
	FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "client_validation_history" ADD CONSTRAINT "client_validation_history_client_id_clients_id_fk"
	FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "client_validation_history" ADD CONSTRAINT "client_validation_history_validated_by_users_id_fk"
	FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS "clients_nip_idx" ON "clients" ("nip");
CREATE INDEX IF NOT EXISTS "clients_status_idx" ON "clients" ("status");
CREATE INDEX IF NOT EXISTS "clients_assigned_user_idx" ON "clients" ("assigned_user_id");
CREATE INDEX IF NOT EXISTS "clients_created_at_idx" ON "clients" ("created_at");
CREATE INDEX IF NOT EXISTS "clients_deleted_at_idx" ON "clients" ("deleted_at");

CREATE INDEX IF NOT EXISTS "client_contacts_client_id_idx" ON "client_contacts" ("client_id");
CREATE INDEX IF NOT EXISTS "client_contacts_is_primary_idx" ON "client_contacts" ("is_primary");

CREATE INDEX IF NOT EXISTS "client_timeline_client_id_idx" ON "client_timeline_events" ("client_id");
CREATE INDEX IF NOT EXISTS "client_timeline_event_type_idx" ON "client_timeline_events" ("event_type");
CREATE INDEX IF NOT EXISTS "client_timeline_occurred_at_idx" ON "client_timeline_events" ("occurred_at");

CREATE INDEX IF NOT EXISTS "client_documents_client_id_idx" ON "client_documents" ("client_id");
CREATE INDEX IF NOT EXISTS "client_documents_category_idx" ON "client_documents" ("category");

CREATE INDEX IF NOT EXISTS "client_validation_client_id_idx" ON "client_validation_history" ("client_id");
CREATE INDEX IF NOT EXISTS "client_validation_type_idx" ON "client_validation_history" ("validation_type");
