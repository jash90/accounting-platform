-- Comprehensive Authentication Enhancement Migration
-- Adds: refresh tokens, remember me tokens, login attempts tracking, sessions, and enhances users table

-- Add new columns to users table for account security
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp;

-- Update auth_provider comment to include microsoft
COMMENT ON COLUMN "users"."auth_provider" IS 'Authentication provider: local, google, github, microsoft';

-- Update oauth_sessions provider comment to include microsoft
COMMENT ON COLUMN "oauth_sessions"."provider" IS 'OAuth provider: google, github, microsoft';

-- Create refresh_tokens table for JWT session management
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);

-- Create remember_me_tokens table for persistent sessions
CREATE TABLE IF NOT EXISTS "remember_me_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "remember_me_tokens_token_unique" UNIQUE("token")
);

-- Create login_attempts table for rate limiting and security monitoring
CREATE TABLE IF NOT EXISTS "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"ip_address" text NOT NULL,
	"user_agent" text,
	"success" boolean NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);

-- Create sessions table for active session tracking
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);

-- Add foreign key constraints
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "remember_me_tokens" ADD CONSTRAINT "remember_me_tokens_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "remember_me_tokens_user_id_idx" ON "remember_me_tokens" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "login_attempts_email_idx" ON "login_attempts" USING btree ("email");
CREATE INDEX IF NOT EXISTS "login_attempts_ip_address_idx" ON "login_attempts" USING btree ("ip_address");
CREATE INDEX IF NOT EXISTS "login_attempts_attempted_at_idx" ON "login_attempts" USING btree ("attempted_at");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions" USING btree ("token");
