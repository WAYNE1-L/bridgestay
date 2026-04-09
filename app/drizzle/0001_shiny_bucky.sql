CREATE TYPE "public"."outreach_status" AS ENUM('not_contacted', 'contacted', 'in_conversation', 'partnered', 'declined', 'expired');--> statement-breakpoint
ALTER TABLE "apartments" ADD COLUMN "outreachStatus" "outreach_status" DEFAULT 'not_contacted' NOT NULL;--> statement-breakpoint
ALTER TABLE "apartments" ADD COLUMN "outreachNotes" text;--> statement-breakpoint
ALTER TABLE "apartments" ADD COLUMN "outreachLastContactedAt" timestamp;