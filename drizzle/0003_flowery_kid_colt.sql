ALTER TYPE "public"."rule_action_type" ADD VALUE 'mark_as_unread' BEFORE 'move_to_folder';--> statement-breakpoint
ALTER TYPE "public"."rule_action_type" ADD VALUE 'add_label';--> statement-breakpoint
ALTER TYPE "public"."rule_action_type" ADD VALUE 'add_tag';--> statement-breakpoint
ALTER TYPE "public"."rule_action_type" ADD VALUE 'remove_label';--> statement-breakpoint
ALTER TYPE "public"."rule_action_type" ADD VALUE 'remove_tag';--> statement-breakpoint
ALTER TYPE "public"."rule_action_type" ADD VALUE 'star';--> statement-breakpoint
ALTER TYPE "public"."rule_action_type" ADD VALUE 'flag';--> statement-breakpoint
ALTER TYPE "public"."rule_action_type" ADD VALUE 'unstar';--> statement-breakpoint
ALTER TYPE "public"."rule_action_type" ADD VALUE 'unflag';--> statement-breakpoint
ALTER TYPE "public"."rule_action_type" ADD VALUE 'archive';--> statement-breakpoint
ALTER TYPE "public"."rule_action_type" ADD VALUE 'delete';--> statement-breakpoint
ALTER TABLE "email_accounts" ADD COLUMN "app_password" text;