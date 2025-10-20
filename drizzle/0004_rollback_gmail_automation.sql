-- Rollback migration: Remove all Gmail/Email automation tables and types
-- This migration removes all tables and types created in 0002 and 0003

-- Drop indexes first to avoid foreign key conflicts
DROP INDEX IF EXISTS "draft_templates_rule_id_idx";
DROP INDEX IF EXISTS "email_accounts_user_id_idx";
DROP INDEX IF EXISTS "email_accounts_provider_idx";
DROP INDEX IF EXISTS "email_accounts_unique_user_provider";
DROP INDEX IF EXISTS "email_processing_logs_user_id_idx";
DROP INDEX IF EXISTS "email_processing_logs_email_id_idx";
DROP INDEX IF EXISTS "email_processing_logs_rule_id_idx";
DROP INDEX IF EXISTS "email_processing_logs_status_idx";
DROP INDEX IF EXISTS "email_processing_logs_processed_at_idx";
DROP INDEX IF EXISTS "email_rules_user_id_idx";
DROP INDEX IF EXISTS "email_rules_priority_idx";
DROP INDEX IF EXISTS "email_rules_active_idx";
DROP INDEX IF EXISTS "scheduled_jobs_user_id_idx";
DROP INDEX IF EXISTS "scheduled_jobs_job_type_idx";
DROP INDEX IF EXISTS "scheduled_jobs_status_idx";
DROP INDEX IF EXISTS "scheduled_jobs_next_run_at_idx";
DROP INDEX IF EXISTS "email_monitoring_logs_user_id_idx";
DROP INDEX IF EXISTS "email_monitoring_logs_account_id_idx";
DROP INDEX IF EXISTS "email_draft_history_user_id_idx";
DROP INDEX IF EXISTS "email_attachments_message_id_idx";
DROP INDEX IF EXISTS "email_connections_user_id_idx";

-- Drop tables in correct order (child tables first, respecting foreign keys)
DROP TABLE IF EXISTS "draft_templates" CASCADE;
DROP TABLE IF EXISTS "email_processing_logs" CASCADE;
DROP TABLE IF EXISTS "email_monitoring_logs" CASCADE;
DROP TABLE IF EXISTS "email_draft_history" CASCADE;
DROP TABLE IF EXISTS "email_attachments" CASCADE;
DROP TABLE IF EXISTS "email_connections" CASCADE;
DROP TABLE IF EXISTS "email_templates" CASCADE;
DROP TABLE IF EXISTS "email_rules" CASCADE;
DROP TABLE IF EXISTS "email_accounts" CASCADE;
DROP TABLE IF EXISTS "scheduled_jobs" CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS "email_provider" CASCADE;
DROP TYPE IF EXISTS "rule_action_type" CASCADE;
DROP TYPE IF EXISTS "rule_condition_type" CASCADE;
