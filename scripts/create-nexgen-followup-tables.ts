/**
 * NEXGEN GLOBAL AI — Phase 3 Database Migration
 * Agent 7: Follow-up Sequences, Follow-up Tasks, and Client Responses
 *
 * Implements strict multi-tenant isolation, compound foreign keys, and hardened check constraints.
 * Purely additive and idempotent (IF NOT EXISTS).
 */

export const CREATE_FOLLOWUP_TABLES_SQL = `
-- 1. Follow-up Sequences
CREATE TABLE IF NOT EXISTS "project_followup_sequences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" text NOT NULL,
  "opportunity_id" uuid NOT NULL,
  "proposal_id" uuid NOT NULL,
  "outreach_message_id" uuid NOT NULL,
  "channel" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "current_step" integer NOT NULL DEFAULT 1,
  "max_steps" integer NOT NULL DEFAULT 3,
  "next_followup_due" timestamp with time zone,
  "last_contacted_at" timestamp with time zone,
  "client_contact" text,
  "client_timezone" text DEFAULT 'UTC',
  "pause_reason" text,
  "paused_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "activity_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  -- Mathematical Tenant Isolation (Compound Foreign Key)
  CONSTRAINT "project_followup_sequences_opp_org_fk"
    FOREIGN KEY ("opportunity_id", "organization_id")
    REFERENCES "project_opportunities"("id", "organization_id")
    ON DELETE CASCADE,

  -- Foreign Key to Outreach Message
  CONSTRAINT "project_followup_sequences_outreach_msg_fk"
    FOREIGN KEY ("outreach_message_id")
    REFERENCES "project_outreach_messages"("id")
    ON DELETE CASCADE,

  -- Check Constraints
  CONSTRAINT "project_followup_sequences_channel_chk"
    CHECK ("channel" IN ('email', 'linkedin', 'whatsapp')),
  CONSTRAINT "project_followup_sequences_status_chk"
    CHECK ("status" IN ('active', 'waiting_for_response', 'response_received', 'followup_due', 'draft_generated', 'pending_approval', 'approved', 'paused', 'completed', 'opted_out', 'cancelled', 'failed')),
  CONSTRAINT "project_followup_sequences_steps_chk"
    CHECK ("current_step" >= 1 AND "max_steps" >= 1)
);

CREATE INDEX IF NOT EXISTS "project_followup_sequences_organization_idx" ON "project_followup_sequences" ("organization_id");
CREATE INDEX IF NOT EXISTS "project_followup_sequences_opp_idx" ON "project_followup_sequences" ("organization_id", "opportunity_id");
CREATE INDEX IF NOT EXISTS "project_followup_sequences_status_idx" ON "project_followup_sequences" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "project_followup_sequences_due_idx" ON "project_followup_sequences" ("organization_id", "next_followup_due");

-- 2. Follow-up Tasks (Step Drafts & Approvals)
CREATE TABLE IF NOT EXISTS "project_followup_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" text NOT NULL,
  "sequence_id" uuid NOT NULL,
  "step_number" integer NOT NULL DEFAULT 1,
  "channel" text NOT NULL,
  "status" text NOT NULL DEFAULT 'scheduled',
  "version" integer NOT NULL DEFAULT 1,
  "due_at" timestamp with time zone NOT NULL,
  "subject" text,
  "body" text,
  "char_count" integer NOT NULL DEFAULT 0,
  "approved_by_user_id" text,
  "approved_at" timestamp with time zone,
  "rejection_reason" text,
  "revision_feedback" text,
  "activity_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "sent_at" timestamp with time zone,
  "failed_reason" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  -- Foreign Key to Sequence
  CONSTRAINT "project_followup_tasks_sequence_fk"
    FOREIGN KEY ("sequence_id")
    REFERENCES "project_followup_sequences"("id")
    ON DELETE CASCADE,

  -- Check Constraints
  CONSTRAINT "project_followup_tasks_channel_chk"
    CHECK ("channel" IN ('email', 'linkedin', 'whatsapp')),
  CONSTRAINT "project_followup_tasks_status_chk"
    CHECK ("status" IN ('scheduled', 'draft_generated', 'pending_approval', 'approved', 'rejected', 'revision_requested', 'sent', 'cancelled', 'skipped', 'failed')),
  CONSTRAINT "project_followup_tasks_step_chk" CHECK ("step_number" >= 1),
  CONSTRAINT "project_followup_tasks_version_chk" CHECK ("version" >= 1),
  CONSTRAINT "project_followup_tasks_approval_chk"
    CHECK (("status" = 'approved' AND "approved_by_user_id" IS NOT NULL AND "approved_at" IS NOT NULL) OR ("status" != 'approved'))
);

CREATE INDEX IF NOT EXISTS "project_followup_tasks_organization_idx" ON "project_followup_tasks" ("organization_id");
CREATE INDEX IF NOT EXISTS "project_followup_tasks_sequence_idx" ON "project_followup_tasks" ("organization_id", "sequence_id");
CREATE INDEX IF NOT EXISTS "project_followup_tasks_status_idx" ON "project_followup_tasks" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "project_followup_tasks_due_idx" ON "project_followup_tasks" ("organization_id", "due_at");

CREATE UNIQUE INDEX IF NOT EXISTS "project_followup_tasks_seq_step_ver_uq"
  ON "project_followup_tasks" ("organization_id", "sequence_id", "step_number", "version");

-- 3. Client Responses (Inbound Monitoring & Idempotency)
CREATE TABLE IF NOT EXISTS "project_client_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" text NOT NULL,
  "opportunity_id" uuid NOT NULL,
  "sequence_id" uuid,
  "channel" text NOT NULL,
  "provider_message_id" text NOT NULL,
  "sender_contact" text NOT NULL,
  "recipient_contact" text,
  "subject" text,
  "content" text NOT NULL,
  "is_manual" boolean NOT NULL DEFAULT false,
  "classification" text NOT NULL DEFAULT 'unclear_response',
  "confidence" numeric(5, 2) NOT NULL DEFAULT 0.50,
  "explanation" text,
  "evidence" text,
  "recommended_action" text,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,

  -- Multi-Tenant Compound Foreign Key
  CONSTRAINT "project_client_responses_opp_org_fk"
    FOREIGN KEY ("opportunity_id", "organization_id")
    REFERENCES "project_opportunities"("id", "organization_id")
    ON DELETE CASCADE,

  -- Check Constraints
  CONSTRAINT "project_client_responses_channel_chk"
    CHECK ("channel" IN ('email', 'linkedin', 'whatsapp')),
  CONSTRAINT "project_client_responses_classification_chk"
    CHECK ("classification" IN ('interested', 'requesting_more_information', 'meeting_requested', 'negotiating_budget', 'not_interested', 'no_response', 'out_of_office', 'opt_out_request', 'unclear_response'))
);

CREATE INDEX IF NOT EXISTS "project_client_responses_org_idx" ON "project_client_responses" ("organization_id");
CREATE INDEX IF NOT EXISTS "project_client_responses_opp_idx" ON "project_client_responses" ("organization_id", "opportunity_id");
CREATE INDEX IF NOT EXISTS "project_client_responses_seq_idx" ON "project_client_responses" ("organization_id", "sequence_id");
CREATE INDEX IF NOT EXISTS "project_client_responses_class_idx" ON "project_client_responses" ("organization_id", "classification");

-- Idempotency Unique Index: One response per provider message id within tenant
CREATE UNIQUE INDEX IF NOT EXISTS "project_client_responses_provider_msg_uq"
  ON "project_client_responses" ("organization_id", "provider_message_id");
`;

console.log("NEXGEN GLOBAL AI Agent 7 Migration SQL prepared.");
