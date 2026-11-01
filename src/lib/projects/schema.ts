import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "@/lib/auth/schema";
import { users } from "@/lib/auth/schema";
import { companies, people } from "@/lib/leads/schema";
import { crmRecords } from "@/lib/crm/schema";

/**
 * NEXGEN GLOBAL AI — Core Data Models (Hardened Multi-Tenant Specification)
 * 
 * 1. project_opportunities: Global discovered software projects across categories.
 * 2. opportunity_scores: Multi-factor qualification matrix and confidence grading.
 * 3. project_proposals: Customized technical proposals, architecture specs, milestones.
 * 4. daily_business_reports: Daily executive intelligence reporting (target 40 qualified/day).
 * 5. agent_executions: Telemetry, audit trail, and latency tracking for all 8 AI agents.
 */

// ── 1. Project Opportunities ──────────────────────────────────────────────────

export type ProjectCategory =
  | "web_development"
  | "mobile_development"
  | "ai_machine_learning"
  | "cloud_devops"
  | "enterprise_systems"
  | "blockchain_web3"
  | "cybersecurity"
  | "embedded_iot"
  | "api_backend"
  | "fullstack";

export type ProjectSourcePlatform =
  | "upwork"
  | "freelancer"
  | "github"
  | "reddit"
  | "rfp"
  | "linkedin"
  | "contra"
  | "hackernews"
  | "direct"
  | "other";

export type ProjectScopeComplexity = "low" | "medium" | "high" | "enterprise";
export type ProjectBudgetType = "fixed_price" | "hourly" | "retainer" | "unknown";
export type ProjectUrgency = "urgent" | "normal" | "low";

export type ProjectOpportunityStatus =
  | "discovered"
  | "analyzing"
  | "scored"
  | "proposal_generating"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "outreach_queued"
  | "contacted"
  | "archived";

export const projectOpportunities = pgTable(
  "project_opportunities",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull().$type<ProjectCategory>(),
    subcategories: jsonb("subcategories").$type<string[]>().default([]),
    sourcePlatform: text("source_platform").notNull().$type<ProjectSourcePlatform>(),
    sourceUrl: text("source_url"),
    sourceExternalId: text("source_external_id"),
    clientName: text("client_name"),
    clientDomain: text("client_domain"),
    clientCountry: text("client_country"),
    clientRegion: text("client_region"),
    estimatedBudgetMin: numeric("estimated_budget_min", { precision: 12, scale: 2 }),
    estimatedBudgetMax: numeric("estimated_budget_max", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    budgetType: text("budget_type").notNull().default("unknown").$type<ProjectBudgetType>(),
    requiredSkills: jsonb("required_skills").$type<string[]>().default([]),
    scopeComplexity: text("scope_complexity").$type<ProjectScopeComplexity>(),
    timelineDays: integer("timeline_days"),
    urgency: text("urgency").notNull().default("normal").$type<ProjectUrgency>(),
    status: text("status").notNull().default("discovered").$type<ProjectOpportunityStatus>(),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().default({}),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_opportunities_organization_idx").on(table.organizationId),
    index("project_opportunities_status_idx").on(table.organizationId, table.status),
    index("project_opportunities_category_idx").on(table.organizationId, table.category),
    index("project_opportunities_discovered_idx").on(table.organizationId, table.discoveredAt),
    uniqueIndex("project_opportunities_source_uq")
      .on(table.organizationId, table.sourcePlatform, table.sourceExternalId)
      .where(sql`${table.sourceExternalId} IS NOT NULL`),
    // Gold Standard: Compound unique key for cross-tenant FK enforcement
    unique("project_opportunities_id_org_uq").on(table.id, table.organizationId),
    check("project_opportunities_title_chk", sql`length(btrim(${table.title})) > 0`),
    check("project_opportunities_description_chk", sql`length(btrim(${table.description})) > 0`),
    check(
      "project_opportunities_status_chk",
      sql`${table.status} IN ('discovered', 'analyzing', 'scored', 'proposal_generating', 'pending_approval', 'approved', 'rejected', 'outreach_queued', 'contacted', 'archived')`,
    ),
    check(
      "project_opportunities_urgency_chk",
      sql`${table.urgency} IN ('urgent', 'normal', 'low')`,
    ),
    check(
      "project_opportunities_budget_type_chk",
      sql`${table.budgetType} IN ('fixed_price', 'hourly', 'retainer', 'unknown')`,
    ),
    check(
      "project_opportunities_budget_min_chk",
      sql`${table.estimatedBudgetMin} IS NULL OR ${table.estimatedBudgetMin} >= 0`,
    ),
    check(
      "project_opportunities_budget_max_chk",
      sql`${table.estimatedBudgetMax} IS NULL OR ${table.estimatedBudgetMax} >= 0`,
    ),
    check(
      "project_opportunities_budget_range_chk",
      sql`(${table.estimatedBudgetMin} IS NULL OR ${table.estimatedBudgetMax} IS NULL) OR (${table.estimatedBudgetMax} >= ${table.estimatedBudgetMin})`,
    ),
    check(
      "project_opportunities_timeline_chk",
      sql`${table.timelineDays} IS NULL OR ${table.timelineDays} > 0`,
    ),
  ],
);

// ── 2. Opportunity Scores ─────────────────────────────────────────────────────

export type QualificationGrade = "A" | "B" | "C" | "D" | "F";
export type RecommendedAction = "priority_proposal" | "standard_proposal" | "monitor" | "pass";

export const opportunityScores = pgTable(
  "opportunity_scores",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    id: uuid("id").primaryKey().defaultRandom(),
    opportunityId: uuid("opportunity_id").notNull(),
    overallScore: numeric("overall_score", { precision: 5, scale: 2 }).notNull(),
    qualificationGrade: text("qualification_grade").notNull().$type<QualificationGrade>(),
    isQualified: boolean("is_qualified").notNull().default(false),
    budgetViabilityScore: numeric("budget_viability_score", { precision: 5, scale: 2 }).notNull().default("0"),
    techStackAlignmentScore: numeric("tech_stack_alignment_score", { precision: 5, scale: 2 }).notNull().default("0"),
    clientLegitimacyScore: numeric("client_legitimacy_score", { precision: 5, scale: 2 }).notNull().default("0"),
    competitionScore: numeric("competition_score", { precision: 5, scale: 2 }).notNull().default("0"),
    timelineFeasibilityScore: numeric("timeline_feasibility_score", { precision: 5, scale: 2 }).notNull().default("0"),
    confidenceLevel: numeric("confidence_level", { precision: 4, scale: 3 }).notNull().default("0.850"),
    reasoningSummary: text("reasoning_summary"),
    scoringFactors: jsonb("scoring_factors").$type<Record<string, unknown>>().default({}),
    recommendedAction: text("recommended_action").notNull().default("standard_proposal").$type<RecommendedAction>(),
    scoredByAgent: text("scored_by_agent").notNull().default("Opportunity Scoring Agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("opportunity_scores_organization_idx").on(table.organizationId),
    uniqueIndex("opportunity_scores_opp_uq").on(table.opportunityId),
    index("opportunity_scores_qualified_idx").on(table.organizationId, table.isQualified, table.overallScore),
    // Multi-tenant Foreign Key: mathematically prevents cross-organization assignment
    foreignKey({
      columns: [table.opportunityId, table.organizationId],
      foreignColumns: [projectOpportunities.id, projectOpportunities.organizationId],
      name: "opportunity_scores_opportunity_org_fk",
    }).onDelete("cascade"),
    check(
      "opportunity_scores_overall_chk",
      sql`${table.overallScore} >= 0 AND ${table.overallScore} <= 100`,
    ),
    check(
      "opportunity_scores_budget_chk",
      sql`${table.budgetViabilityScore} >= 0 AND ${table.budgetViabilityScore} <= 100`,
    ),
    check(
      "opportunity_scores_tech_chk",
      sql`${table.techStackAlignmentScore} >= 0 AND ${table.techStackAlignmentScore} <= 100`,
    ),
    check(
      "opportunity_scores_client_chk",
      sql`${table.clientLegitimacyScore} >= 0 AND ${table.clientLegitimacyScore} <= 100`,
    ),
    check(
      "opportunity_scores_comp_chk",
      sql`${table.competitionScore} >= 0 AND ${table.competitionScore} <= 100`,
    ),
    check(
      "opportunity_scores_time_chk",
      sql`${table.timelineFeasibilityScore} >= 0 AND ${table.timelineFeasibilityScore} <= 100`,
    ),
    check(
      "opportunity_scores_confidence_chk",
      sql`${table.confidenceLevel} >= 0 AND ${table.confidenceLevel} <= 1`,
    ),
    check(
      "opportunity_scores_grade_chk",
      sql`${table.qualificationGrade} IN ('A', 'B', 'C', 'D', 'F')`,
    ),
    check(
      "opportunity_scores_action_chk",
      sql`${table.recommendedAction} IN ('priority_proposal', 'standard_proposal', 'monitor', 'pass')`,
    ),
  ],
);

// ── 3. Project Proposals ──────────────────────────────────────────────────────

export type ProposalStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "dispatched";

export type ProposalDispatchChannel = "email" | "linkedin" | "whatsapp" | "portal";

export type ProposalMilestone = {
  phase: number;
  title: string;
  deliverables: string[];
  durationWeeks: number;
  costEstimate: number;
};

export const projectProposals = pgTable(
  "project_proposals",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    id: uuid("id").primaryKey().defaultRandom(),
    opportunityId: uuid("opportunity_id").notNull(),
    version: integer("version").notNull().default(1),
    title: text("title").notNull(),
    executiveSummary: text("executive_summary").notNull(),
    problemAnalysis: text("problem_analysis").notNull(),
    proposedSolution: text("proposed_solution").notNull(),
    architectureBlueprint: jsonb("architecture_blueprint").$type<Record<string, unknown>>().default({}),
    techStackRecommendations: jsonb("tech_stack_recommendations").$type<string[]>().notNull().default([]),
    milestones: jsonb("milestones").$type<ProposalMilestone[]>().notNull().default([]),
    estimatedDurationWeeks: numeric("estimated_duration_weeks", { precision: 5, scale: 2 }),
    totalCostEstimate: numeric("total_cost_estimate", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    caseStudyCitations: jsonb("case_study_citations").$type<string[]>().default([]),
    status: text("status").notNull().default("pending_approval").$type<ProposalStatus>(),
    approvalNotes: text("approval_notes"),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    reviewerFeedback: text("reviewer_feedback"),
    dispatchChannel: text("dispatch_channel").$type<ProposalDispatchChannel>(),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    crmRecordId: uuid("crm_record_id").references(() => crmRecords.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_proposals_organization_idx").on(table.organizationId),
    index("project_proposals_opp_idx").on(table.opportunityId),
    index("project_proposals_status_idx").on(table.organizationId, table.status),
    // Multi-tenant Foreign Key: mathematically prevents cross-organization assignment
    foreignKey({
      columns: [table.opportunityId, table.organizationId],
      foreignColumns: [projectOpportunities.id, projectOpportunities.organizationId],
      name: "project_proposals_opportunity_org_fk",
    }).onDelete("cascade"),
    check("project_proposals_title_chk", sql`length(btrim(${table.title})) > 0`),
    check("project_proposals_version_chk", sql`${table.version} >= 1`),
    check(
      "project_proposals_status_chk",
      sql`${table.status} IN ('draft', 'pending_approval', 'approved', 'rejected', 'revision_requested', 'dispatched')`,
    ),
    check(
      "project_proposals_cost_chk",
      sql`${table.totalCostEstimate} IS NULL OR ${table.totalCostEstimate} >= 0`,
    ),
    check(
      "project_proposals_duration_chk",
      sql`${table.estimatedDurationWeeks} IS NULL OR ${table.estimatedDurationWeeks} > 0`,
    ),
    check(
      "project_proposals_channel_chk",
      sql`${table.dispatchChannel} IS NULL OR ${table.dispatchChannel} IN ('email', 'linkedin', 'whatsapp', 'portal')`,
    ),
    // Strict Human Approval Guard: An approved proposal MUST carry the approver's user ID and timestamp
    check(
      "project_proposals_approval_state_chk",
      sql`(${table.status} = 'approved' AND ${table.approvedByUserId} IS NOT NULL AND ${table.approvedAt} IS NOT NULL) OR (${table.status} != 'approved')`,
    ),
  ],
);

// ── 4. Daily Business Reports ─────────────────────────────────────────────────

export const dailyBusinessReports = pgTable(
  "daily_business_reports",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    id: uuid("id").primaryKey().defaultRandom(),
    reportDate: date("report_date", { mode: "string" }).notNull(), // PostgreSQL native DATE type
    projectsDiscoveredCount: integer("projects_discovered_count").notNull().default(0),
    projectsQualifiedCount: integer("projects_qualified_count").notNull().default(0), // Target: 40
    proposalsGeneratedCount: integer("proposals_generated_count").notNull().default(0),
    proposalsApprovedCount: integer("proposals_approved_count").notNull().default(0),
    proposalsDispatchedCount: integer("proposals_dispatched_count").notNull().default(0),
    responsesReceivedCount: integer("responses_received_count").notNull().default(0),
    meetingsBookedCount: integer("meetings_booked_count").notNull().default(0),
    pipelineValueTotal: numeric("pipeline_value_total", { precision: 14, scale: 2 }).notNull().default("0.00"),
    topCategoriesSummary: jsonb("top_categories_summary").$type<Record<string, number>>().default({}),
    agentPerformanceMetrics: jsonb("agent_performance_metrics").$type<Record<string, unknown>>().default({}),
    executiveSummary: text("executive_summary"),
    keyBottlenecks: jsonb("key_bottlenecks").$type<string[]>().default([]),
    dispatchedToAnilAt: timestamp("dispatched_to_anil_at", { withTimezone: true }),
    dispatchChannel: text("dispatch_channel").default("internal"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("daily_business_reports_organization_idx").on(table.organizationId),
    uniqueIndex("daily_business_reports_org_date_uq").on(table.organizationId, table.reportDate),
    check(
      "daily_business_reports_pipeline_chk",
      sql`${table.pipelineValueTotal} >= 0`,
    ),
    check(
      "daily_business_reports_counts_chk",
      sql`${table.projectsDiscoveredCount} >= 0 AND ${table.projectsQualifiedCount} >= 0 AND ${table.proposalsGeneratedCount} >= 0 AND ${table.proposalsApprovedCount} >= 0 AND ${table.proposalsDispatchedCount} >= 0 AND ${table.responsesReceivedCount} >= 0 AND ${table.meetingsBookedCount} >= 0`,
    ),
  ],
);

// ── 5. Agent Executions & Monitoring ──────────────────────────────────────────

export type AgentType =
  | "global_project_hunter"
  | "client_researcher"
  | "project_analyzer"
  | "opportunity_scoring"
  | "proposal_generator"
  | "outreach_manager"
  | "followup_manager"
  | "ai_project_manager";

export type AgentExecutionStatus = "pending" | "running" | "completed" | "failed" | "paused";
export type AgentTriggerSource = "scheduled" | "manual" | "event" | "webhook";
export type AgentTargetEntityType = "opportunity" | "proposal" | "batch" | "report";

export const agentExecutions = pgTable(
  "agent_executions",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    id: uuid("id").primaryKey().defaultRandom(),
    agentType: text("agent_type").notNull().$type<AgentType>(),
    status: text("status").notNull().default("pending").$type<AgentExecutionStatus>(),
    triggerSource: text("trigger_source").notNull().default("scheduled").$type<AgentTriggerSource>(),
    targetEntityId: uuid("target_entity_id"),
    targetEntityType: text("target_entity_type").$type<AgentTargetEntityType>(),
    inputPayload: jsonb("input_payload").$type<Record<string, unknown>>().default({}),
    outputPayload: jsonb("output_payload").$type<Record<string, unknown>>().default({}),
    errorDetails: text("error_details"),
    tokensUsed: integer("tokens_used").notNull().default(0),
    costEstimate: numeric("cost_estimate", { precision: 8, scale: 4 }).notNull().default("0.0000"),
    modelUsed: text("model_used"),
    durationMs: integer("duration_ms"),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("agent_executions_organization_idx").on(table.organizationId),
    index("agent_executions_agent_status_idx").on(table.organizationId, table.agentType, table.status),
    index("agent_executions_started_idx").on(table.organizationId, table.startedAt),
    // Atomic duplicate execution lock at DB level: prevents multiple workers from processing the same job
    uniqueIndex("agent_executions_active_lock_uq")
      .on(table.organizationId, table.agentType, table.targetEntityId)
      .where(sql`${table.status} = 'running' AND ${table.targetEntityId} IS NOT NULL`),
    check("agent_executions_tokens_chk", sql`${table.tokensUsed} >= 0`),
    check("agent_executions_cost_chk", sql`${table.costEstimate} >= 0`),
    check("agent_executions_retries_chk", sql`${table.retryCount} >= 0 AND ${table.maxRetries} >= 0`),
    check(
      "agent_executions_duration_chk",
      sql`${table.durationMs} IS NULL OR ${table.durationMs} >= 0`,
    ),
    check(
      "agent_executions_status_chk",
      sql`${table.status} IN ('pending', 'running', 'completed', 'failed', 'paused')`,
    ),
    check(
      "agent_executions_trigger_chk",
      sql`${table.triggerSource} IN ('scheduled', 'manual', 'event', 'webhook')`,
    ),
    check(
      "agent_executions_type_chk",
      sql`${table.agentType} IN ('global_project_hunter', 'client_researcher', 'project_analyzer', 'opportunity_scoring', 'proposal_generator', 'outreach_manager', 'followup_manager', 'ai_project_manager')`,
    ),
    check(
      "agent_executions_target_type_chk",
      sql`${table.targetEntityType} IS NULL OR ${table.targetEntityType} IN ('opportunity', 'proposal', 'batch', 'report')`,
    ),
  ],
);

// ── 6. Project Outreach Messages ──────────────────────────────────────────────

export type OutreachChannel = "email" | "linkedin" | "whatsapp";

export type OutreachMessageStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "scheduled"
  | "sent"
  | "failed"
  | "cancelled";

export type OutreachActivityEvent = {
  action: "created" | "edited" | "approved" | "rejected" | "revision_requested" | "scheduled" | "dispatch_blocked";
  performedByUserId: string;
  performedByUserEmail?: string;
  timestamp: string;
  notes?: string;
};

export const projectOutreachMessages = pgTable(
  "project_outreach_messages",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    id: uuid("id").primaryKey().defaultRandom(),
    opportunityId: uuid("opportunity_id").notNull(),
    proposalId: uuid("proposal_id").notNull(),
    channel: text("channel").notNull().$type<OutreachChannel>(),
    status: text("status").notNull().default("draft").$type<OutreachMessageStatus>(),
    version: integer("version").notNull().default(1),
    subject: text("subject"),
    body: text("body").notNull(),
    recipientName: text("recipient_name"),
    recipientContact: text("recipient_contact"),
    recipientCompany: text("recipient_company"),
    personalizationContext: jsonb("personalization_context").$type<Record<string, unknown>>().default({}),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    reviewerFeedback: text("reviewer_feedback"),
    activityHistory: jsonb("activity_history").$type<OutreachActivityEvent[]>().notNull().default([]),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    failedReason: text("failed_reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_outreach_messages_organization_idx").on(table.organizationId),
    index("project_outreach_messages_opp_idx").on(table.organizationId, table.opportunityId),
    index("project_outreach_messages_proposal_idx").on(table.organizationId, table.proposalId),
    index("project_outreach_messages_status_idx").on(table.organizationId, table.status),
    index("project_outreach_messages_channel_idx").on(table.organizationId, table.channel),
    // Multi-tenant Foreign Key to opportunities
    foreignKey({
      columns: [table.opportunityId, table.organizationId],
      foreignColumns: [projectOpportunities.id, projectOpportunities.organizationId],
      name: "project_outreach_messages_opportunity_org_fk",
    }).onDelete("cascade"),
    // Foreign Key to proposals
    foreignKey({
      columns: [table.proposalId],
      foreignColumns: [projectProposals.id],
      name: "project_outreach_messages_proposal_fk",
    }).onDelete("cascade"),
    // Unique version per opportunity, proposal, channel, and version
    uniqueIndex("project_outreach_messages_prop_channel_ver_uq").on(
      table.organizationId,
      table.proposalId,
      table.channel,
      table.version,
    ),
    check("project_outreach_messages_version_chk", sql`${table.version} >= 1`),
    check("project_outreach_messages_body_chk", sql`length(btrim(${table.body})) > 0`),
    check(
      "project_outreach_messages_channel_chk",
      sql`${table.channel} IN ('email', 'linkedin', 'whatsapp')`,
    ),
    check(
      "project_outreach_messages_status_chk",
      sql`${table.status} IN ('draft', 'pending_approval', 'approved', 'rejected', 'revision_requested', 'scheduled', 'sent', 'failed', 'cancelled')`,
    ),
    // Human Approval Guard: An approved message MUST carry approver ID and approval timestamp
    check(
      "project_outreach_messages_approval_chk",
      sql`(${table.status} = 'approved' AND ${table.approvedByUserId} IS NOT NULL AND ${table.approvedAt} IS NOT NULL) OR (${table.status} != 'approved')`,
    ),
    // Sent Guard: A sent message MUST carry sent_at
    check(
      "project_outreach_messages_sent_chk",
      sql`(${table.status} = 'sent' AND ${table.sentAt} IS NOT NULL) OR (${table.status} != 'sent')`,
    ),
  ],
);

// ── 7. Agent 7: Follow-up Manager & Response Tracking ────────────────────────

export type FollowupSequenceStatus =
  | "active"
  | "waiting_for_response"
  | "response_received"
  | "followup_due"
  | "draft_generated"
  | "pending_approval"
  | "approved"
  | "paused"
  | "completed"
  | "opted_out"
  | "cancelled"
  | "failed";

export type FollowupTaskStatus =
  | "scheduled"
  | "draft_generated"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "sent"
  | "cancelled"
  | "skipped"
  | "failed";

export type ClientResponseClassification =
  | "interested"
  | "requesting_more_information"
  | "meeting_requested"
  | "negotiating_budget"
  | "not_interested"
  | "no_response"
  | "out_of_office"
  | "opt_out_request"
  | "unclear_response";

export type FollowupActivityEvent = {
  action: string;
  performedByUserId?: string;
  performedByUserEmail?: string;
  timestamp: string;
  notes?: string;
  metadata?: Record<string, unknown>;
};

export const projectFollowupSequences = pgTable(
  "project_followup_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    opportunityId: uuid("opportunity_id").notNull(),
    proposalId: uuid("proposal_id").notNull(),
    outreachMessageId: uuid("outreach_message_id").notNull(),
    channel: text("channel").notNull(),
    status: text("status").notNull().default("active"),
    currentStep: integer("current_step").notNull().default(1),
    maxSteps: integer("max_steps").notNull().default(3),
    nextFollowupDue: timestamp("next_followup_due", { withTimezone: true }),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    clientContact: text("client_contact"),
    clientTimezone: text("client_timezone").default("UTC"),
    pauseReason: text("pause_reason"),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    activityHistory: jsonb("activity_history").$type<FollowupActivityEvent[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_followup_sequences_organization_idx").on(table.organizationId),
    index("project_followup_sequences_opp_idx").on(table.organizationId, table.opportunityId),
    index("project_followup_sequences_status_idx").on(table.organizationId, table.status),
    index("project_followup_sequences_due_idx").on(table.organizationId, table.nextFollowupDue),
    // Compound Foreign Key for Multi-Tenant Opportunity
    foreignKey({
      columns: [table.opportunityId, table.organizationId],
      foreignColumns: [projectOpportunities.id, projectOpportunities.organizationId],
      name: "project_followup_sequences_opp_org_fk",
    }).onDelete("cascade"),
    // Foreign Key to outreach messages
    foreignKey({
      columns: [table.outreachMessageId],
      foreignColumns: [projectOutreachMessages.id],
      name: "project_followup_sequences_outreach_msg_fk",
    }).onDelete("cascade"),
    // Check constraints
    check(
      "project_followup_sequences_channel_chk",
      sql`${table.channel} IN ('email', 'linkedin', 'whatsapp')`,
    ),
    check(
      "project_followup_sequences_status_chk",
      sql`${table.status} IN ('active', 'waiting_for_response', 'response_received', 'followup_due', 'draft_generated', 'pending_approval', 'approved', 'paused', 'completed', 'opted_out', 'cancelled', 'failed')`,
    ),
    check("project_followup_sequences_steps_chk", sql`${table.currentStep} >= 1 AND ${table.maxSteps} >= 1`),
  ],
);

export const projectFollowupTasks = pgTable(
  "project_followup_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    sequenceId: uuid("sequence_id").notNull(),
    stepNumber: integer("step_number").notNull().default(1),
    channel: text("channel").notNull(),
    status: text("status").notNull().default("scheduled"),
    version: integer("version").notNull().default(1),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    subject: text("subject"),
    body: text("body"),
    charCount: integer("char_count").notNull().default(0),
    approvedByUserId: text("approved_by_user_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    revisionFeedback: text("revision_feedback"),
    activityHistory: jsonb("activity_history").$type<FollowupActivityEvent[]>().notNull().default([]),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    failedReason: text("failed_reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_followup_tasks_organization_idx").on(table.organizationId),
    index("project_followup_tasks_sequence_idx").on(table.organizationId, table.sequenceId),
    index("project_followup_tasks_status_idx").on(table.organizationId, table.status),
    index("project_followup_tasks_due_idx").on(table.organizationId, table.dueAt),
    // Foreign key to sequence
    foreignKey({
      columns: [table.sequenceId],
      foreignColumns: [projectFollowupSequences.id],
      name: "project_followup_tasks_sequence_fk",
    }).onDelete("cascade"),
    uniqueIndex("project_followup_tasks_seq_step_ver_uq").on(
      table.organizationId,
      table.sequenceId,
      table.stepNumber,
      table.version,
    ),
    check(
      "project_followup_tasks_channel_chk",
      sql`${table.channel} IN ('email', 'linkedin', 'whatsapp')`,
    ),
    check(
      "project_followup_tasks_status_chk",
      sql`${table.status} IN ('scheduled', 'draft_generated', 'pending_approval', 'approved', 'rejected', 'revision_requested', 'sent', 'cancelled', 'skipped', 'failed')`,
    ),
    check("project_followup_tasks_step_chk", sql`${table.stepNumber} >= 1`),
    check("project_followup_tasks_version_chk", sql`${table.version} >= 1`),
    check(
      "project_followup_tasks_approval_chk",
      sql`(${table.status} = 'approved' AND ${table.approvedByUserId} IS NOT NULL AND ${table.approvedAt} IS NOT NULL) OR (${table.status} != 'approved')`,
    ),
  ],
);

export const projectClientResponses = pgTable(
  "project_client_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    opportunityId: uuid("opportunity_id").notNull(),
    sequenceId: uuid("sequence_id"),
    channel: text("channel").notNull(),
    providerMessageId: text("provider_message_id").notNull(),
    senderContact: text("sender_contact").notNull(),
    recipientContact: text("recipient_contact"),
    subject: text("subject"),
    content: text("content").notNull(),
    isManual: boolean("is_manual").notNull().default(false),
    classification: text("classification").notNull().default("unclear_response"),
    confidence: numeric("confidence", { precision: 5, scale: 2 }).notNull().default("0.50"),
    explanation: text("explanation"),
    evidence: text("evidence"),
    recommendedAction: text("recommended_action"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_client_responses_org_idx").on(table.organizationId),
    index("project_client_responses_opp_idx").on(table.organizationId, table.opportunityId),
    index("project_client_responses_seq_idx").on(table.organizationId, table.sequenceId),
    index("project_client_responses_class_idx").on(table.organizationId, table.classification),
    uniqueIndex("project_client_responses_provider_msg_uq").on(
      table.organizationId,
      table.providerMessageId,
    ),
    foreignKey({
      columns: [table.opportunityId, table.organizationId],
      foreignColumns: [projectOpportunities.id, projectOpportunities.organizationId],
      name: "project_client_responses_opp_org_fk",
    }).onDelete("cascade"),
    check(
      "project_client_responses_channel_chk",
      sql`${table.channel} IN ('email', 'linkedin', 'whatsapp')`,
    ),
    check(
      "project_client_responses_classification_chk",
      sql`${table.classification} IN ('interested', 'requesting_more_information', 'meeting_requested', 'negotiating_budget', 'not_interested', 'no_response', 'out_of_office', 'opt_out_request', 'unclear_response')`,
    ),
  ],
);


