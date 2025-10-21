CREATE TYPE "public"."email_provider" AS ENUM('gmail', 'outlook', 'office365');--> statement-breakpoint
CREATE TYPE "public"."rule_action_type" AS ENUM('create_draft', 'forward_email', 'add_attachment', 'remove_attachment', 'categorize', 'mark_as_read', 'move_to_folder');--> statement-breakpoint
CREATE TYPE "public"."rule_condition_type" AS ENUM('sender', 'subject', 'keywords', 'has_attachment', 'attachment_name', 'recipient');--> statement-breakpoint
CREATE TABLE "draft_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"body_html" text,
	"attachments" jsonb,
	"variables" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_provider" "email_provider" NOT NULL,
	"email_address" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"provider_user_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp,
	"sync_cursor" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_processing_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_id" varchar(255) NOT NULL,
	"email_provider" "email_provider" NOT NULL,
	"rule_id" uuid,
	"status" varchar(50) NOT NULL,
	"email_subject" text,
	"email_sender" text,
	"actions_executed" jsonb,
	"error_message" text,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_type" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "draft_templates" ADD CONSTRAINT "draft_templates_rule_id_email_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."email_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_processing_logs" ADD CONSTRAINT "email_processing_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_processing_logs" ADD CONSTRAINT "email_processing_logs_rule_id_email_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."email_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_rules" ADD CONSTRAINT "email_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "draft_templates_rule_id_idx" ON "draft_templates" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "email_accounts_user_id_idx" ON "email_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_accounts_provider_idx" ON "email_accounts" USING btree ("email_provider");--> statement-breakpoint
CREATE INDEX "email_accounts_unique_user_provider" ON "email_accounts" USING btree ("user_id","email_provider","email_address");--> statement-breakpoint
CREATE INDEX "email_processing_logs_user_id_idx" ON "email_processing_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_processing_logs_email_id_idx" ON "email_processing_logs" USING btree ("email_id");--> statement-breakpoint
CREATE INDEX "email_processing_logs_rule_id_idx" ON "email_processing_logs" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "email_processing_logs_status_idx" ON "email_processing_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_processing_logs_processed_at_idx" ON "email_processing_logs" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "email_rules_user_id_idx" ON "email_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_rules_priority_idx" ON "email_rules" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "email_rules_active_idx" ON "email_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_user_id_idx" ON "scheduled_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_job_type_idx" ON "scheduled_jobs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_status_idx" ON "scheduled_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_next_run_at_idx" ON "scheduled_jobs" USING btree ("next_run_at");