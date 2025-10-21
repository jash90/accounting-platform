-- Migration: Comprehensive RBAC and Company Management System
-- This migration adds:
-- 1. Enhanced users table with additional fields
-- 2. Complete RBAC system (roles, permissions, user_roles, etc.)
-- 3. Company management and module system
-- 4. Invitation system for employee onboarding
-- 5. Session management, MFA, audit logging, and security features

-- ============================================================================
-- STEP 1: Alter existing users table (add new fields)
-- ============================================================================

-- Add new fields to users table
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_normalized" varchar(255),
  ADD COLUMN IF NOT EXISTS "profile_picture" text,
  ADD COLUMN IF NOT EXISTS "auth_provider" varchar(50) DEFAULT 'local' NOT NULL,
  ADD COLUMN IF NOT EXISTS "provider_id" varchar(255),
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "is_locked" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "locked_until" timestamp,
  ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_failed_login_at" timestamp,
  ADD COLUMN IF NOT EXISTS "mfa_enabled" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "mfa_methods" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "timezone" varchar(50) DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS "locale" varchar(10) DEFAULT 'en-US',
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

-- Update email_normalized for existing rows
UPDATE "users" SET "email_normalized" = LOWER("email") WHERE "email_normalized" IS NULL;

-- Make email_normalized NOT NULL after populating
ALTER TABLE "users" ALTER COLUMN "email_normalized" SET NOT NULL;

-- Add unique constraint on email_normalized
ALTER TABLE "users" ADD CONSTRAINT "users_email_normalized_unique" UNIQUE("email_normalized");

-- Change password to nullable (for OAuth users)
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- Change email type from text to varchar(255)
ALTER TABLE "users" ALTER COLUMN "email" TYPE varchar(255);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_users_email_normalized" ON "users"("email_normalized");
CREATE INDEX IF NOT EXISTS "idx_users_provider" ON "users"("auth_provider", "provider_id");
CREATE INDEX IF NOT EXISTS "idx_users_active" ON "users"("is_active");
CREATE INDEX IF NOT EXISTS "idx_users_locked" ON "users"("is_locked", "locked_until");

-- ============================================================================
-- STEP 2: Create RBAC tables
-- ============================================================================

-- Roles table
CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL UNIQUE,
  "description" text,
  "parent_role_id" uuid,
  "level" integer DEFAULT 0 NOT NULL,
  "is_system_role" boolean DEFAULT false NOT NULL,
  "is_assignable" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_roles_parent" ON "roles"("parent_role_id");
CREATE INDEX IF NOT EXISTS "idx_roles_level" ON "roles"("level");

-- Add foreign key for parent_role_id
ALTER TABLE "roles" ADD CONSTRAINT "roles_parent_role_id_roles_id_fk"
  FOREIGN KEY ("parent_role_id") REFERENCES "roles"("id") ON DELETE set null ON UPDATE no action;

-- Insert default system roles
INSERT INTO "roles" ("name", "description", "level", "is_system_role") VALUES
  ('super_admin', 'Super Administrator - Full system access', 0, true),
  ('company_owner', 'Company Owner - Full company access', 1, true),
  ('employee', 'Employee - Limited company access', 2, true)
ON CONFLICT ("name") DO NOTHING;

-- Permissions table
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL UNIQUE,
  "resource" varchar(100) NOT NULL,
  "action" varchar(50) NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_permissions_resource" ON "permissions"("resource");
CREATE INDEX IF NOT EXISTS "idx_permissions_resource_action" ON "permissions"("resource", "action");

-- Insert default permissions
INSERT INTO "permissions" ("name", "resource", "action", "description") VALUES
  -- User management
  ('users.create', 'users', 'create', 'Create new users'),
  ('users.read', 'users', 'read', 'View user information'),
  ('users.update', 'users', 'update', 'Update user information'),
  ('users.delete', 'users', 'delete', 'Delete users'),

  -- Company management
  ('companies.create', 'companies', 'create', 'Create companies'),
  ('companies.read', 'companies', 'read', 'View companies'),
  ('companies.update', 'companies', 'update', 'Update companies'),
  ('companies.delete', 'companies', 'delete', 'Delete companies'),
  ('companies.assign_users', 'companies', 'assign_users', 'Assign users to companies'),

  -- Module management
  ('modules.activate', 'modules', 'activate', 'Activate company modules'),
  ('modules.deactivate', 'modules', 'deactivate', 'Deactivate company modules'),
  ('modules.grant_access', 'modules', 'grant_access', 'Grant employee module access'),
  ('modules.revoke_access', 'modules', 'revoke_access', 'Revoke employee module access'),

  -- Invitation management
  ('invitations.send', 'invitations', 'send', 'Send employee invitations'),
  ('invitations.revoke', 'invitations', 'revoke', 'Revoke invitations'),

  -- Role management
  ('roles.create', 'roles', 'create', 'Create roles'),
  ('roles.read', 'roles', 'read', 'View roles'),
  ('roles.update', 'roles', 'update', 'Update roles'),
  ('roles.delete', 'roles', 'delete', 'Delete roles'),
  ('roles.assign', 'roles', 'assign', 'Assign roles to users')
ON CONFLICT ("name") DO NOTHING;

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("role_id", "permission_id")
);

CREATE INDEX IF NOT EXISTS "idx_role_permissions_role_id" ON "role_permissions"("role_id");
CREATE INDEX IF NOT EXISTS "idx_role_permissions_permission_id" ON "role_permissions"("permission_id");

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk"
  FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE cascade ON UPDATE no action;

-- Assign all permissions to super_admin
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- Assign company management permissions to company_owner
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'company_owner'
  AND p.name IN (
    'users.read', 'companies.read', 'companies.update',
    'modules.activate', 'modules.deactivate', 'modules.grant_access', 'modules.revoke_access',
    'invitations.send', 'invitations.revoke'
  )
ON CONFLICT DO NOTHING;

-- User-Role mapping
CREATE TABLE IF NOT EXISTS "user_roles" (
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "organization_id" uuid,
  "valid_from" timestamp DEFAULT now(),
  "valid_until" timestamp,
  "assigned_by" uuid,
  "assigned_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "role_id")
);

CREATE INDEX IF NOT EXISTS "idx_user_roles_user_id" ON "user_roles"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_role_id" ON "user_roles"("role_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_org" ON "user_roles"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_valid" ON "user_roles"("valid_from", "valid_until");

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk"
  FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;

-- User-Permission mapping (direct permissions)
CREATE TABLE IF NOT EXISTS "user_permissions" (
  "user_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "is_granted" boolean DEFAULT true NOT NULL,
  "organization_id" uuid,
  "resource_id" uuid,
  "granted_by" uuid,
  "granted_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp,
  PRIMARY KEY ("user_id", "permission_id")
);

CREATE INDEX IF NOT EXISTS "idx_user_permissions_user_id" ON "user_permissions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_permissions_expires" ON "user_permissions"("expires_at");

ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_permissions_id_fk"
  FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_granted_by_users_id_fk"
  FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;

-- ============================================================================
-- STEP 3: Create Company Management tables
-- ============================================================================

-- Companies table
CREATE TABLE IF NOT EXISTS "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL UNIQUE,
  "description" text,
  "logo" text,
  "website" varchar(255),
  "email" varchar(255),
  "phone" varchar(50),
  "address" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "plan_type" varchar(50) DEFAULT 'basic',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_companies_slug" ON "companies"("slug");
CREATE INDEX IF NOT EXISTS "idx_companies_active" ON "companies"("is_active");

-- Company-User mapping
CREATE TABLE IF NOT EXISTS "company_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" varchar(50) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "joined_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_company_user" ON "company_users"("company_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_company_users_company_id" ON "company_users"("company_id");
CREATE INDEX IF NOT EXISTS "idx_company_users_user_id" ON "company_users"("user_id");
CREATE INDEX IF NOT EXISTS "idx_company_users_role" ON "company_users"("role");

ALTER TABLE "company_users" ADD CONSTRAINT "company_users_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

-- Modules table
CREATE TABLE IF NOT EXISTS "modules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL UNIQUE,
  "display_name" varchar(100) NOT NULL,
  "description" text,
  "icon" varchar(50),
  "is_core" boolean DEFAULT false NOT NULL,
  "requires_plan" varchar(50),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_modules_name" ON "modules"("name");

-- Insert default modules
INSERT INTO "modules" ("name", "display_name", "description", "icon", "is_core") VALUES
  ('invoices', 'Invoices', 'Create and manage invoices', 'file-text', true),
  ('expenses', 'Expenses', 'Track business expenses', 'receipt', true),
  ('clients', 'Clients', 'Manage client relationships', 'users', true),
  ('reports', 'Reports', 'Generate financial reports', 'bar-chart', true),
  ('dashboard', 'Dashboard', 'Overview and analytics', 'layout-dashboard', true),
  ('settings', 'Settings', 'System configuration', 'settings', true)
ON CONFLICT ("name") DO NOTHING;

-- Company-Module mapping (activation status)
CREATE TABLE IF NOT EXISTS "company_modules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "module_id" uuid NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "enabled_by" uuid,
  "enabled_at" timestamp DEFAULT now() NOT NULL,
  "configuration" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_company_module" ON "company_modules"("company_id", "module_id");
CREATE INDEX IF NOT EXISTS "idx_company_modules_company_id" ON "company_modules"("company_id");
CREATE INDEX IF NOT EXISTS "idx_company_modules_module_id" ON "company_modules"("module_id");
CREATE INDEX IF NOT EXISTS "idx_company_modules_enabled" ON "company_modules"("is_enabled");

ALTER TABLE "company_modules" ADD CONSTRAINT "company_modules_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "company_modules" ADD CONSTRAINT "company_modules_module_id_modules_id_fk"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "company_modules" ADD CONSTRAINT "company_modules_enabled_by_users_id_fk"
  FOREIGN KEY ("enabled_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;

-- Employee-Module access (granular permissions)
CREATE TABLE IF NOT EXISTS "employee_module_access" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "module_id" uuid NOT NULL,
  "can_read" boolean DEFAULT true NOT NULL,
  "can_write" boolean DEFAULT false NOT NULL,
  "can_delete" boolean DEFAULT false NOT NULL,
  "granted_by" uuid,
  "granted_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_employee_module" ON "employee_module_access"("company_id", "user_id", "module_id");
CREATE INDEX IF NOT EXISTS "idx_employee_module_access_company_id" ON "employee_module_access"("company_id");
CREATE INDEX IF NOT EXISTS "idx_employee_module_access_user_id" ON "employee_module_access"("user_id");
CREATE INDEX IF NOT EXISTS "idx_employee_module_access_module_id" ON "employee_module_access"("module_id");
CREATE INDEX IF NOT EXISTS "idx_employee_module_access_expires" ON "employee_module_access"("expires_at");

ALTER TABLE "employee_module_access" ADD CONSTRAINT "employee_module_access_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "employee_module_access" ADD CONSTRAINT "employee_module_access_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "employee_module_access" ADD CONSTRAINT "employee_module_access_module_id_modules_id_fk"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "employee_module_access" ADD CONSTRAINT "employee_module_access_granted_by_users_id_fk"
  FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;

-- ============================================================================
-- STEP 4: Create Invitation System
-- ============================================================================

-- Invitation tokens table
CREATE TABLE IF NOT EXISTS "invitation_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "company_id" uuid NOT NULL,
  "role" varchar(50) DEFAULT 'employee' NOT NULL,
  "token" varchar(512) NOT NULL UNIQUE,
  "token_hash" varchar(255) NOT NULL,
  "is_used" boolean DEFAULT false NOT NULL,
  "used_at" timestamp,
  "used_by" uuid,
  "invited_by" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "ip_address" inet,
  "user_agent" text
);

CREATE INDEX IF NOT EXISTS "idx_invitation_tokens_email" ON "invitation_tokens"("email");
CREATE INDEX IF NOT EXISTS "idx_invitation_tokens_company_id" ON "invitation_tokens"("company_id");
CREATE INDEX IF NOT EXISTS "idx_invitation_tokens_token_hash" ON "invitation_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "idx_invitation_tokens_expires_at" ON "invitation_tokens"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_invitation_tokens_is_used" ON "invitation_tokens"("is_used");

ALTER TABLE "invitation_tokens" ADD CONSTRAINT "invitation_tokens_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invitation_tokens" ADD CONSTRAINT "invitation_tokens_used_by_users_id_fk"
  FOREIGN KEY ("used_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invitation_tokens" ADD CONSTRAINT "invitation_tokens_invited_by_users_id_fk"
  FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

-- ============================================================================
-- STEP 5: Update existing oauth_sessions table
-- ============================================================================

-- Alter oauth_sessions if it exists, create if not
CREATE TABLE IF NOT EXISTS "oauth_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "provider" text NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add new columns if table already exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'oauth_sessions') THEN
    ALTER TABLE "oauth_sessions" ADD COLUMN IF NOT EXISTS "id_token" text;
    ALTER TABLE "oauth_sessions" ADD COLUMN IF NOT EXISTS "token_type" varchar(50) DEFAULT 'Bearer';
    ALTER TABLE "oauth_sessions" ADD COLUMN IF NOT EXISTS "scope" text;
    ALTER TABLE "oauth_sessions" ADD COLUMN IF NOT EXISTS "provider_user_id" varchar(255);
    ALTER TABLE "oauth_sessions" ADD COLUMN IF NOT EXISTS "provider_profile" jsonb;
  END IF;
END $$;

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS "idx_oauth_sessions_user_id" ON "oauth_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_oauth_sessions_provider" ON "oauth_sessions"("provider", "provider_user_id");
CREATE INDEX IF NOT EXISTS "idx_oauth_sessions_expires_at" ON "oauth_sessions"("expires_at");

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_provider" ON "oauth_sessions"("user_id", "provider");

-- Add foreign key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'oauth_sessions_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "oauth_sessions" ADD CONSTRAINT "oauth_sessions_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Update existing password_reset_tokens table
-- ============================================================================

ALTER TABLE "password_reset_tokens"
  ADD COLUMN IF NOT EXISTS "token_hash" varchar(255),
  ADD COLUMN IF NOT EXISTS "ip_address" inet,
  ADD COLUMN IF NOT EXISTS "user_agent" text,
  ADD COLUMN IF NOT EXISTS "is_used" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "used_at" timestamp;

-- Change token type
ALTER TABLE "password_reset_tokens" ALTER COLUMN "token" TYPE varchar(512);

CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_user_id" ON "password_reset_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_token_hash" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_expires_at" ON "password_reset_tokens"("expires_at");

-- ============================================================================
-- STEP 7: Update existing email_verification_tokens table
-- ============================================================================

ALTER TABLE "email_verification_tokens"
  ADD COLUMN IF NOT EXISTS "token_hash" varchar(255),
  ADD COLUMN IF NOT EXISTS "email" varchar(255),
  ADD COLUMN IF NOT EXISTS "is_used" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "used_at" timestamp;

-- Change token type
ALTER TABLE "email_verification_tokens" ALTER COLUMN "token" TYPE varchar(512);

CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_user_id" ON "email_verification_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_token_hash" ON "email_verification_tokens"("token_hash");

-- ============================================================================
-- STEP 8: Create Audit Logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "session_id" uuid,
  "event_type" varchar(100) NOT NULL,
  "event_category" varchar(50) NOT NULL,
  "event_severity" varchar(20) NOT NULL,
  "resource_type" varchar(100),
  "resource_id" uuid,
  "action" varchar(50),
  "result" varchar(20) NOT NULL,
  "failure_reason" text,
  "ip_address" inet,
  "user_agent" text,
  "request_id" uuid,
  "old_values" jsonb,
  "new_values" jsonb,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_event_type" ON "audit_logs"("event_type");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_resource" ON "audit_logs"("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_severity" ON "audit_logs"("event_severity");

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;

-- ============================================================================
-- STEP 9: Create Sessions table (for advanced session management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "refresh_token" varchar(512) NOT NULL UNIQUE,
  "refresh_token_hash" varchar(255) NOT NULL,
  "access_token_family" uuid NOT NULL,
  "device_fingerprint" varchar(255),
  "device_name" varchar(255),
  "device_type" varchar(50),
  "ip_address" inet,
  "user_agent" text,
  "country_code" varchar(2),
  "city" varchar(100),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "last_activity_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "revocation_reason" varchar(255)
);

CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_refresh_token_hash" ON "sessions"("refresh_token_hash");
CREATE INDEX IF NOT EXISTS "idx_sessions_active" ON "sessions"("user_id", "is_active");
CREATE INDEX IF NOT EXISTS "idx_sessions_expires_at" ON "sessions"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_sessions_device" ON "sessions"("device_fingerprint");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

-- ============================================================================
-- STEP 10: Create triggers for updated_at timestamps
-- ============================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tables with updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON "roles"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON "companies"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_modules_updated_at
BEFORE UPDATE ON "company_modules"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_sessions_updated_at
BEFORE UPDATE ON "oauth_sessions"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to update email_normalized
CREATE OR REPLACE FUNCTION update_email_normalized()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_normalized = LOWER(NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_normalized
BEFORE INSERT OR UPDATE OF email ON "users"
FOR EACH ROW
EXECUTE FUNCTION update_email_normalized();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
