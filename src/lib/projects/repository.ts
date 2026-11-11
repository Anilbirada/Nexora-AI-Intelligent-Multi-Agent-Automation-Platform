/**
 * NEXGEN GLOBAL AI — Postgres Multi-Tenant Project Repository
 *
 * Provides database operations for project opportunities, opportunity scores,
 * and agent execution telemetry with strict organization isolation.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agentExecutions,
  opportunityScores,
  projectOpportunities,
  projectProposals,
  projectOutreachMessages,
  projectFollowupSequences,
  projectFollowupTasks,
  projectClientResponses,
  dailyBusinessReports,
  type AgentType,
  type OutreachChannel,
  type OutreachMessageStatus,
  type OutreachActivityEvent,
  type FollowupSequenceStatus,
  type FollowupTaskStatus,
  type ClientResponseClassification,
  type FollowupActivityEvent,
} from "@/lib/projects/schema";
import type { IDatabaseOpportunityRepository } from "./workflow/pipeline";

export class PostgresProjectRepository implements IDatabaseOpportunityRepository {
  /**
   * Retrieves all existing source external IDs and content hashes for an organization to prevent duplicates.
   */
  public async findExistingFingerprints(organizationId: string): Promise<string[]> {
    try {
      const records = await db
        .select({
          rawPayload: projectOpportunities.rawPayload,
          sourceExternalId: projectOpportunities.sourceExternalId,
        })
        .from(projectOpportunities)
        .where(eq(projectOpportunities.organizationId, organizationId));

      const fingerprints: string[] = [];
      for (const rec of records) {
        if (rec.sourceExternalId) fingerprints.push(rec.sourceExternalId);
        const payload = rec.rawPayload as Record<string, unknown> | null;
        if (payload?.contentHash && typeof payload.contentHash === "string") {
          fingerprints.push(payload.contentHash);
        }
      }
      return fingerprints;
    } catch (err) {
      console.warn("[PostgresProjectRepository] findExistingFingerprints warning:", err);
      return [];
    }
  }

  /**
   * Ingests a discovered project opportunity into the database.
   */
  public async saveOpportunity(record: {
    organizationId: string;
    title: string;
    description: string;
    category: string;
    subcategories: string[];
    sourcePlatform: string;
    sourceUrl: string;
    sourceExternalId?: string;
    clientName?: string;
    clientDomain?: string;
    clientCountry?: string;
    clientRegion?: string;
    estimatedBudgetMin?: number;
    estimatedBudgetMax?: number;
    currency: string;
    budgetType: "fixed_price" | "hourly" | "retainer" | "unknown";
    requiredSkills: string[];
    scopeComplexity?: "low" | "medium" | "high" | "enterprise";
    timelineDays?: number;
    status: "discovered" | "scored" | "rejected";
    rawPayload: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const [inserted] = await db
      .insert(projectOpportunities)
      .values({
        organizationId: record.organizationId,
        title: record.title,
        description: record.description,
        category: record.category as any,
        subcategories: record.subcategories,
        sourcePlatform: record.sourcePlatform as any,
        sourceUrl: record.sourceUrl,
        sourceExternalId: record.sourceExternalId,
        clientName: record.clientName,
        clientDomain: record.clientDomain,
        clientCountry: record.clientCountry,
        clientRegion: record.clientRegion,
        estimatedBudgetMin: record.estimatedBudgetMin !== undefined ? String(record.estimatedBudgetMin) : null,
        estimatedBudgetMax: record.estimatedBudgetMax !== undefined ? String(record.estimatedBudgetMax) : null,
        currency: record.currency,
        budgetType: record.budgetType,
        requiredSkills: record.requiredSkills,
        scopeComplexity: record.scopeComplexity,
        timelineDays: record.timelineDays,
        status: record.status as any,
        rawPayload: record.rawPayload,
        metadata: record.metadata,
      })
      .returning({ id: projectOpportunities.id });

    return { id: inserted.id };
  }

  /**
   * Saves or updates opportunity qualification score with compound tenant constraint.
   */
  public async saveOpportunityScore(record: {
    opportunityId: string;
    organizationId: string;
    overallScore: number;
    qualificationGrade: "A" | "B" | "C" | "D" | "F";
    isQualified: boolean;
    budgetViabilityScore: number;
    techStackAlignmentScore: number;
    clientLegitimacyScore: number;
    competitionScore: number;
    timelineFeasibilityScore: number;
    confidenceLevel: number;
    reasoningSummary: string;
    scoringFactors: Record<string, unknown>;
    recommendedAction: "priority_proposal" | "standard_proposal" | "monitor" | "pass";
    scoredByAgent: string;
  }): Promise<{ id: string }> {
    const [inserted] = await db
      .insert(opportunityScores)
      .values({
        opportunityId: record.opportunityId,
        organizationId: record.organizationId,
        overallScore: String(record.overallScore ?? 0),
        qualificationGrade: record.qualificationGrade || "C",
        isQualified: Boolean(record.isQualified),
        budgetViabilityScore: String(record.budgetViabilityScore ?? 0),
        techStackAlignmentScore: String(record.techStackAlignmentScore ?? 0),
        clientLegitimacyScore: String(record.clientLegitimacyScore ?? 0),
        competitionScore: String(record.competitionScore ?? 0),
        timelineFeasibilityScore: String(record.timelineFeasibilityScore ?? 0),
        confidenceLevel: String(record.confidenceLevel ?? 1.0),
        reasoningSummary: record.reasoningSummary || "",
        scoringFactors: record.scoringFactors || {},
        recommendedAction: record.recommendedAction || "monitor",
        scoredByAgent: record.scoredByAgent || "opportunity_scoring",
      })
      .returning({ id: opportunityScores.id });

    return { id: inserted.id };
  }

  /**
   * Logs an execution audit event in agent_executions table.
   */
  public async logAgentExecution(execution: {
    organizationId: string;
    agentType: "global_project_hunter" | "client_researcher" | "project_analyzer" | "opportunity_scoring";
    status: "completed" | "failed";
    inputPayload: Record<string, unknown>;
    outputPayload: Record<string, unknown>;
    durationMs: number;
    tokensUsed?: number;
    costEstimate?: number;
  }): Promise<void> {
    try {
      await db.insert(agentExecutions).values({
        organizationId: execution.organizationId,
        agentType: execution.agentType,
        status: execution.status,
        inputPayload: execution.inputPayload,
        outputPayload: execution.outputPayload,
        durationMs: execution.durationMs,
        tokensUsed: execution.tokensUsed ?? 0,
        costEstimate: String(execution.costEstimate ?? 0.0),
        startedAt: new Date(Date.now() - execution.durationMs),
        completedAt: new Date(),
      });
    } catch (err) {
      console.warn("[PostgresProjectRepository] logAgentExecution notice:", err);
    }
  }

  /**
   * Retrieves opportunities and their attached scores for the organization.
   */
  public async getOpportunities(organizationId: string, limit = 50) {
    return await db
      .select({
        opportunity: projectOpportunities,
        score: opportunityScores,
      })
      .from(projectOpportunities)
      .leftJoin(
        opportunityScores,
        and(
          eq(opportunityScores.opportunityId, projectOpportunities.id),
          eq(opportunityScores.organizationId, organizationId),
        ),
      )
      .where(eq(projectOpportunities.organizationId, organizationId))
      .orderBy(desc(projectOpportunities.discoveredAt))
      .limit(limit);
  }

  /**
   * Retrieves a single opportunity by ID with strict tenant isolation.
   */
  public async getOpportunityById(organizationId: string, opportunityId: string) {
    const [result] = await db
      .select({
        opportunity: projectOpportunities,
        score: opportunityScores,
      })
      .from(projectOpportunities)
      .leftJoin(
        opportunityScores,
        and(
          eq(opportunityScores.opportunityId, projectOpportunities.id),
          eq(opportunityScores.organizationId, organizationId),
        ),
      )
      .where(
        and(
          eq(projectOpportunities.id, opportunityId),
          eq(projectOpportunities.organizationId, organizationId),
        ),
      )
      .limit(1);

    return result || null;
  }

  /**
   * Computes the next version number for an opportunity proposal.
   */
  public async getNextProposalVersion(organizationId: string, opportunityId: string): Promise<number> {
    const [row] = await db
      .select({
        maxVer: sql<number>`coalesce(max(${projectProposals.version}), 0)`,
      })
      .from(projectProposals)
      .where(
        and(
          eq(projectProposals.organizationId, organizationId),
          eq(projectProposals.opportunityId, opportunityId),
        ),
      );

    return (Number(row?.maxVer) || 0) + 1;
  }

  /**
   * Inserts a generated proposal with multi-tenant compound foreign key enforcement.
   */
  public async saveProposal(record: {
    organizationId: string;
    opportunityId: string;
    version: number;
    title: string;
    executiveSummary: string;
    problemAnalysis: string;
    proposedSolution: string;
    architectureBlueprint: Record<string, unknown>;
    techStackRecommendations: string[];
    milestones: any[];
    estimatedDurationWeeks?: number | null;
    totalCostEstimate?: number | null;
    currency: string;
    caseStudyCitations?: string[];
    status?: "draft" | "pending_approval" | "approved" | "rejected" | "revision_requested" | "dispatched";
    approvedByUserId?: string | null;
    approvedAt?: Date | null;
    reviewerFeedback?: string | null;
  }): Promise<{ id: string }> {
    const [inserted] = await db
      .insert(projectProposals)
      .values({
        organizationId: record.organizationId,
        opportunityId: record.opportunityId,
        version: record.version,
        title: record.title,
        executiveSummary: record.executiveSummary,
        problemAnalysis: record.problemAnalysis,
        proposedSolution: record.proposedSolution,
        architectureBlueprint: record.architectureBlueprint,
        techStackRecommendations: record.techStackRecommendations,
        milestones: record.milestones,
        estimatedDurationWeeks: record.estimatedDurationWeeks !== undefined && record.estimatedDurationWeeks !== null ? String(record.estimatedDurationWeeks) : null,
        totalCostEstimate: record.totalCostEstimate !== undefined && record.totalCostEstimate !== null ? String(record.totalCostEstimate) : null,
        currency: record.currency,
        caseStudyCitations: record.caseStudyCitations || [],
        status: record.status || "pending_approval",
        approvedByUserId: record.approvedByUserId,
        approvedAt: record.approvedAt,
        reviewerFeedback: record.reviewerFeedback,
      })
      .returning({ id: projectProposals.id });

    return { id: inserted.id };
  }

  /**
   * Retrieves the latest proposal for a given opportunity.
   */
  public async getProposalByOpportunityId(organizationId: string, opportunityId: string) {
    const [row] = await db
      .select()
      .from(projectProposals)
      .where(
        and(
          eq(projectProposals.organizationId, organizationId),
          eq(projectProposals.opportunityId, opportunityId),
        ),
      )
      .orderBy(desc(projectProposals.version))
      .limit(1);

    return row || null;
  }

  /**
   * Retrieves a proposal by its unique ID with organization isolation.
   */
  public async getProposalById(organizationId: string, proposalId: string) {
    const [row] = await db
      .select({
        proposal: projectProposals,
        opportunity: projectOpportunities,
      })
      .from(projectProposals)
      .innerJoin(
        projectOpportunities,
        and(
          eq(projectOpportunities.id, projectProposals.opportunityId),
          eq(projectOpportunities.organizationId, organizationId),
        ),
      )
      .where(
        and(
          eq(projectProposals.id, proposalId),
          eq(projectProposals.organizationId, organizationId),
        ),
      )
      .limit(1);

    return row || null;
  }

  /**
   * Retrieves all proposals for the organization with optional status filtering.
   */
  public async getProposals(organizationId: string, filterStatus?: string) {
    const query = db
      .select({
        proposal: projectProposals,
        opportunity: projectOpportunities,
      })
      .from(projectProposals)
      .innerJoin(
        projectOpportunities,
        and(
          eq(projectOpportunities.id, projectProposals.opportunityId),
          eq(projectOpportunities.organizationId, organizationId),
        ),
      )
      .where(
        filterStatus
          ? and(
              eq(projectProposals.organizationId, organizationId),
              eq(projectProposals.status, filterStatus as any),
            )
          : eq(projectProposals.organizationId, organizationId),
      )
      .orderBy(desc(projectProposals.createdAt));

    return await query;
  }

  /**
   * Updates proposal approval status, ensuring check constraint invariants.
   */
  public async updateProposalDecision(params: {
    organizationId: string;
    proposalId: string;
    status: "draft" | "pending_approval" | "approved" | "rejected" | "revision_requested" | "dispatched";
    approvedByUserId?: string | null;
    approvedAt?: Date | null;
    reviewerFeedback?: string | null;
    dispatchChannel?: "email" | "linkedin" | "whatsapp" | "portal" | null;
  }) {
    await db
      .update(projectProposals)
      .set({
        status: params.status,
        approvedByUserId: params.approvedByUserId ?? null,
        approvedAt: params.approvedAt ?? null,
        reviewerFeedback: params.reviewerFeedback ?? null,
        dispatchChannel: params.dispatchChannel ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectProposals.id, params.proposalId),
          eq(projectProposals.organizationId, params.organizationId),
        ),
      );
  }

  /**
   * Calculates next outreach version number for an opportunity, proposal, and channel.
   */
  public async getNextOutreachVersion(
    organizationId: string,
    proposalId: string,
    channel: OutreachChannel,
  ): Promise<number> {
    const [row] = await db
      .select({ version: projectOutreachMessages.version })
      .from(projectOutreachMessages)
      .where(
        and(
          eq(projectOutreachMessages.organizationId, organizationId),
          eq(projectOutreachMessages.proposalId, proposalId),
          eq(projectOutreachMessages.channel, channel),
        ),
      )
      .orderBy(desc(projectOutreachMessages.version))
      .limit(1);

    return row ? row.version + 1 : 1;
  }

  /**
   * Saves a new outreach message draft.
   */
  public async saveOutreachMessage(params: {
    organizationId: string;
    opportunityId: string;
    proposalId: string;
    channel: OutreachChannel;
    version: number;
    subject?: string | null;
    body: string;
    recipientName?: string | null;
    recipientContact?: string | null;
    recipientCompany?: string | null;
    personalizationContext?: Record<string, unknown>;
    status?: OutreachMessageStatus;
    activityHistory?: OutreachActivityEvent[];
    metadata?: Record<string, unknown>;
  }) {
    const [saved] = await db
      .insert(projectOutreachMessages)
      .values({
        organizationId: params.organizationId,
        opportunityId: params.opportunityId,
        proposalId: params.proposalId,
        channel: params.channel,
        version: params.version,
        subject: params.subject ?? null,
        body: params.body,
        recipientName: params.recipientName ?? null,
        recipientContact: params.recipientContact ?? null,
        recipientCompany: params.recipientCompany ?? null,
        personalizationContext: params.personalizationContext ?? {},
        status: params.status ?? "pending_approval",
        activityHistory: params.activityHistory ?? [],
        metadata: params.metadata ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return saved;
  }

  /**
   * Retrieves an outreach message by ID with organization scoping.
   */
  public async getOutreachMessageById(organizationId: string, messageId: string) {
    const [row] = await db
      .select({
        message: projectOutreachMessages,
        opportunity: projectOpportunities,
        proposal: projectProposals,
      })
      .from(projectOutreachMessages)
      .innerJoin(
        projectOpportunities,
        and(
          eq(projectOpportunities.id, projectOutreachMessages.opportunityId),
          eq(projectOpportunities.organizationId, organizationId),
        ),
      )
      .innerJoin(
        projectProposals,
        and(
          eq(projectProposals.id, projectOutreachMessages.proposalId),
          eq(projectProposals.organizationId, organizationId),
        ),
      )
      .where(
        and(
          eq(projectOutreachMessages.id, messageId),
          eq(projectOutreachMessages.organizationId, organizationId),
        ),
      )
      .limit(1);

    return row || null;
  }

  /**
   * Retrieves all outreach messages for an opportunity with organization scoping.
   */
  public async getOutreachMessagesByOpportunity(
    organizationId: string,
    opportunityId: string,
  ) {
    const rows = await db
      .select({
        message: projectOutreachMessages,
        opportunity: projectOpportunities,
        proposal: projectProposals,
      })
      .from(projectOutreachMessages)
      .innerJoin(
        projectOpportunities,
        and(
          eq(projectOpportunities.id, projectOutreachMessages.opportunityId),
          eq(projectOpportunities.organizationId, organizationId),
        ),
      )
      .innerJoin(
        projectProposals,
        and(
          eq(projectProposals.id, projectOutreachMessages.proposalId),
          eq(projectProposals.organizationId, organizationId),
        ),
      )
      .where(
        and(
          eq(projectOutreachMessages.organizationId, organizationId),
          eq(projectOutreachMessages.opportunityId, opportunityId),
        ),
      )
      .orderBy(desc(projectOutreachMessages.createdAt));

    return rows;
  }

  /**
   * Lists all outreach messages for an organization with optional filters.
   */
  public async getOutreachMessages(
    organizationId: string,
    filters?: {
      channel?: string;
      status?: string;
      opportunityId?: string;
    },
  ) {
    const conditions = [eq(projectOutreachMessages.organizationId, organizationId)];

    if (filters?.channel) {
      conditions.push(eq(projectOutreachMessages.channel, filters.channel as any));
    }
    if (filters?.status) {
      conditions.push(eq(projectOutreachMessages.status, filters.status as any));
    }
    if (filters?.opportunityId) {
      conditions.push(eq(projectOutreachMessages.opportunityId, filters.opportunityId));
    }

    const rows = await db
      .select({
        message: projectOutreachMessages,
        opportunity: projectOpportunities,
        proposal: projectProposals,
      })
      .from(projectOutreachMessages)
      .innerJoin(
        projectOpportunities,
        and(
          eq(projectOpportunities.id, projectOutreachMessages.opportunityId),
          eq(projectOpportunities.organizationId, organizationId),
        ),
      )
      .innerJoin(
        projectProposals,
        and(
          eq(projectProposals.id, projectOutreachMessages.proposalId),
          eq(projectProposals.organizationId, organizationId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(projectOutreachMessages.createdAt));

    return rows;
  }

  /**
   * Updates an outreach message draft (editing subject or body).
   */
  public async updateOutreachDraft(params: {
    organizationId: string;
    messageId: string;
    subject?: string | null;
    body: string;
    activityEvent: OutreachActivityEvent;
  }) {
    const existing = await this.getOutreachMessageById(params.organizationId, params.messageId);
    if (!existing) throw new Error("Outreach message not found.");

    const currentHistory = (existing.message.activityHistory as OutreachActivityEvent[]) || [];
    const updatedHistory = [...currentHistory, params.activityEvent];

    const [updated] = await db
      .update(projectOutreachMessages)
      .set({
        subject: params.subject !== undefined ? params.subject : existing.message.subject,
        body: params.body,
        activityHistory: updatedHistory,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectOutreachMessages.id, params.messageId),
          eq(projectOutreachMessages.organizationId, params.organizationId),
        ),
      )
      .returning();

    return updated;
  }

  /**
   * Updates outreach message approval status and audit history.
   */
  public async updateOutreachApprovalDecision(params: {
    organizationId: string;
    messageId: string;
    status: OutreachMessageStatus;
    approvedByUserId?: string | null;
    approvedAt?: Date | null;
    reviewerFeedback?: string | null;
    scheduledFor?: Date | null;
    activityEvent: OutreachActivityEvent;
  }) {
    const existing = await this.getOutreachMessageById(params.organizationId, params.messageId);
    if (!existing) throw new Error("Outreach message not found.");

    const currentHistory = (existing.message.activityHistory as OutreachActivityEvent[]) || [];
    const updatedHistory = [...currentHistory, params.activityEvent];

    const [updated] = await db
      .update(projectOutreachMessages)
      .set({
        status: params.status,
        approvedByUserId: params.approvedByUserId ?? null,
        approvedAt: params.approvedAt ?? null,
        reviewerFeedback: params.reviewerFeedback ?? null,
        scheduledFor: params.scheduledFor ?? existing.message.scheduledFor,
        activityHistory: updatedHistory,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectOutreachMessages.id, params.messageId),
          eq(projectOutreachMessages.organizationId, params.organizationId),
        ),
      )
      .returning();

    return updated;
  }

  // ── AGENT 7: FOLLOW-UP MANAGER REPOSITORY METHODS ──────────────────────────

  /**
   * Retrieves a follow-up sequence by opportunity ID.
   */
  public async getFollowupSequenceByOpportunity(organizationId: string, opportunityId: string) {
    const [sequence] = await db
      .select()
      .from(projectFollowupSequences)
      .where(
        and(
          eq(projectFollowupSequences.opportunityId, opportunityId),
          eq(projectFollowupSequences.organizationId, organizationId),
        ),
      );
    return sequence || null;
  }

  /**
   * Retrieves a follow-up sequence by ID.
   */
  public async getFollowupSequenceById(organizationId: string, sequenceId: string) {
    const [sequence] = await db
      .select()
      .from(projectFollowupSequences)
      .where(
        and(
          eq(projectFollowupSequences.id, sequenceId),
          eq(projectFollowupSequences.organizationId, organizationId),
        ),
      );
    return sequence || null;
  }

  /**
   * Retrieves all follow-up sequences for an organization.
   */
  public async getFollowupSequences(organizationId: string, limit = 100) {
    return db
      .select()
      .from(projectFollowupSequences)
      .where(eq(projectFollowupSequences.organizationId, organizationId))
      .orderBy(desc(projectFollowupSequences.updatedAt))
      .limit(limit);
  }

  /**
   * Creates a new follow-up sequence.
   */
  public async createFollowupSequence(params: {
    organizationId: string;
    opportunityId: string;
    proposalId: string;
    outreachMessageId: string;
    channel: OutreachChannel;
    status: FollowupSequenceStatus;
    currentStep: number;
    maxSteps: number;
    nextFollowupDue: Date;
    clientContact?: string | null;
    clientTimezone?: string;
    activityHistory: FollowupActivityEvent[];
    metadata?: Record<string, unknown>;
  }) {
    const [created] = await db
      .insert(projectFollowupSequences)
      .values({
        organizationId: params.organizationId,
        opportunityId: params.opportunityId,
        proposalId: params.proposalId,
        outreachMessageId: params.outreachMessageId,
        channel: params.channel,
        status: params.status,
        currentStep: params.currentStep,
        maxSteps: params.maxSteps,
        nextFollowupDue: params.nextFollowupDue,
        clientContact: params.clientContact || null,
        clientTimezone: params.clientTimezone || "UTC",
        activityHistory: params.activityHistory,
        metadata: params.metadata || {},
      })
      .returning();

    return created;
  }

  /**
   * Retrieves all tasks for a sequence.
   */
  public async getFollowupTasks(organizationId: string, sequenceId: string) {
    return db
      .select()
      .from(projectFollowupTasks)
      .where(
        and(
          eq(projectFollowupTasks.organizationId, organizationId),
          eq(projectFollowupTasks.sequenceId, sequenceId),
        ),
      )
      .orderBy(projectFollowupTasks.stepNumber, projectFollowupTasks.version);
  }

  /**
   * Creates or registers a follow-up task.
   */
  public async createFollowupTask(params: {
    organizationId: string;
    sequenceId: string;
    stepNumber: number;
    channel: OutreachChannel;
    status: FollowupTaskStatus;
    dueAt: Date;
    version?: number;
    subject?: string | null;
    body?: string | null;
    charCount?: number;
    activityHistory?: FollowupActivityEvent[];
    metadata?: Record<string, unknown>;
  }) {
    const [created] = await db
      .insert(projectFollowupTasks)
      .values({
        organizationId: params.organizationId,
        sequenceId: params.sequenceId,
        stepNumber: params.stepNumber,
        channel: params.channel,
        status: params.status,
        version: params.version || 1,
        dueAt: params.dueAt,
        subject: params.subject || null,
        body: params.body || null,
        charCount: params.charCount || (params.body ? params.body.length : 0),
        activityHistory: params.activityHistory || [],
        metadata: params.metadata || {},
      })
      .returning();

    return created;
  }

  /**
   * Updates a follow-up task draft with subject, body, or revision feedback.
   */
  public async updateFollowupTaskDraft(params: {
    organizationId: string;
    taskId: string;
    subject?: string | null;
    body?: string | null;
    status?: FollowupTaskStatus;
    activityEvent?: FollowupActivityEvent;
  }) {
    const [task] = await db
      .select()
      .from(projectFollowupTasks)
      .where(
        and(
          eq(projectFollowupTasks.id, params.taskId),
          eq(projectFollowupTasks.organizationId, params.organizationId),
        ),
      );
    if (!task) throw new Error("Follow-up task not found.");

    const currentHistory = (task.activityHistory as FollowupActivityEvent[]) || [];
    const updatedHistory = params.activityEvent ? [...currentHistory, params.activityEvent] : currentHistory;

    const [updated] = await db
      .update(projectFollowupTasks)
      .set({
        subject: params.subject !== undefined ? params.subject : task.subject,
        body: params.body !== undefined ? params.body : task.body,
        charCount: params.body ? params.body.length : task.charCount,
        status: params.status || task.status,
        activityHistory: updatedHistory,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectFollowupTasks.id, params.taskId),
          eq(projectFollowupTasks.organizationId, params.organizationId),
        ),
      )
      .returning();

    return updated;
  }

  /**
   * Updates follow-up task approval state.
   */
  public async updateFollowupTaskApproval(params: {
    organizationId: string;
    taskId: string;
    status: FollowupTaskStatus;
    approvedByUserId?: string | null;
    approvedAt?: Date | null;
    rejectionReason?: string | null;
    revisionFeedback?: string | null;
    activityEvent: FollowupActivityEvent;
  }) {
    const [task] = await db
      .select()
      .from(projectFollowupTasks)
      .where(
        and(
          eq(projectFollowupTasks.id, params.taskId),
          eq(projectFollowupTasks.organizationId, params.organizationId),
        ),
      );
    if (!task) throw new Error("Follow-up task not found.");

    const currentHistory = (task.activityHistory as FollowupActivityEvent[]) || [];
    const updatedHistory = [...currentHistory, params.activityEvent];

    const [updated] = await db
      .update(projectFollowupTasks)
      .set({
        status: params.status,
        approvedByUserId: params.approvedByUserId ?? null,
        approvedAt: params.approvedAt ?? null,
        rejectionReason: params.rejectionReason ?? null,
        revisionFeedback: params.revisionFeedback ?? null,
        activityHistory: updatedHistory,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectFollowupTasks.id, params.taskId),
          eq(projectFollowupTasks.organizationId, params.organizationId),
        ),
      )
      .returning();

    return updated;
  }

  /**
   * Updates sequence status (e.g. paused, resumed, cancelled, response_received).
   */
  public async updateFollowupSequenceStatus(params: {
    organizationId: string;
    sequenceId: string;
    status: FollowupSequenceStatus;
    pauseReason?: string | null;
    activityEvent: FollowupActivityEvent;
  }) {
    const [seq] = await db
      .select()
      .from(projectFollowupSequences)
      .where(
        and(
          eq(projectFollowupSequences.id, params.sequenceId),
          eq(projectFollowupSequences.organizationId, params.organizationId),
        ),
      );
    if (!seq) throw new Error("Follow-up sequence not found.");

    const currentHistory = (seq.activityHistory as FollowupActivityEvent[]) || [];
    const updatedHistory = [...currentHistory, params.activityEvent];

    const [updated] = await db
      .update(projectFollowupSequences)
      .set({
        status: params.status,
        pauseReason: params.pauseReason !== undefined ? params.pauseReason : seq.pauseReason,
        pausedAt: params.status === "paused" ? new Date() : null,
        activityHistory: updatedHistory,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectFollowupSequences.id, params.sequenceId),
          eq(projectFollowupSequences.organizationId, params.organizationId),
        ),
      )
      .returning();

    return updated;
  }

  /**
   * Saves an inbound client response.
   */
  public async saveClientResponse(params: {
    organizationId: string;
    opportunityId: string;
    sequenceId?: string | null;
    channel: OutreachChannel;
    providerMessageId: string;
    senderContact: string;
    recipientContact?: string | null;
    subject?: string | null;
    content: string;
    isManual?: boolean;
    classification: ClientResponseClassification;
    confidence: number;
    explanation?: string | null;
    evidence?: string | null;
    recommendedAction?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const [saved] = await db
      .insert(projectClientResponses)
      .values({
        organizationId: params.organizationId,
        opportunityId: params.opportunityId,
        sequenceId: params.sequenceId || null,
        channel: params.channel,
        providerMessageId: params.providerMessageId,
        senderContact: params.senderContact,
        recipientContact: params.recipientContact || null,
        subject: params.subject || null,
        content: params.content,
        isManual: Boolean(params.isManual),
        classification: params.classification,
        confidence: String(params.confidence),
        explanation: params.explanation || null,
        evidence: params.evidence || null,
        recommendedAction: params.recommendedAction || null,
        metadata: params.metadata || {},
      })
      .returning();

    return saved;
  }

  /**
   * Retrieves all client responses for an opportunity.
   */
  public async getClientResponses(organizationId: string, opportunityId: string) {
    return db
      .select()
      .from(projectClientResponses)
      .where(
        and(
          eq(projectClientResponses.organizationId, organizationId),
          eq(projectClientResponses.opportunityId, opportunityId),
        ),
      )
      .orderBy(desc(projectClientResponses.receivedAt));
  }

  // ── Agent 8 AI Project Manager Methods ─────────────────────────────────────

  /**
   * Retrieves all items currently pending Anil's human approval across Proposals,
   * Outreach drafts, and Follow-up tasks.
   */
  public async getUnifiedPendingApprovals(organizationId: string) {
    const [pendingProposals, pendingOutreach, pendingFollowup] = await Promise.all([
      db
        .select({
          proposal: projectProposals,
          opportunity: projectOpportunities,
          score: opportunityScores,
        })
        .from(projectProposals)
        .innerJoin(
          projectOpportunities,
          and(
            eq(projectOpportunities.id, projectProposals.opportunityId),
            eq(projectOpportunities.organizationId, organizationId),
          ),
        )
        .leftJoin(
          opportunityScores,
          and(
            eq(opportunityScores.opportunityId, projectOpportunities.id),
            eq(opportunityScores.organizationId, organizationId),
          ),
        )
        .where(
          and(
            eq(projectProposals.organizationId, organizationId),
            eq(projectProposals.status, "pending_approval"),
          ),
        )
        .orderBy(desc(projectProposals.createdAt)),

      db
        .select({
          message: projectOutreachMessages,
          opportunity: projectOpportunities,
        })
        .from(projectOutreachMessages)
        .innerJoin(
          projectOpportunities,
          and(
            eq(projectOpportunities.id, projectOutreachMessages.opportunityId),
            eq(projectOpportunities.organizationId, organizationId),
          ),
        )
        .where(
          and(
            eq(projectOutreachMessages.organizationId, organizationId),
            eq(projectOutreachMessages.status, "pending_approval"),
          ),
        )
        .orderBy(desc(projectOutreachMessages.createdAt)),

      db
        .select({
          task: projectFollowupTasks,
          sequence: projectFollowupSequences,
          opportunity: projectOpportunities,
        })
        .from(projectFollowupTasks)
        .innerJoin(
          projectFollowupSequences,
          and(
            eq(projectFollowupSequences.id, projectFollowupTasks.sequenceId),
            eq(projectFollowupSequences.organizationId, organizationId),
          ),
        )
        .innerJoin(
          projectOpportunities,
          and(
            eq(projectOpportunities.id, projectFollowupSequences.opportunityId),
            eq(projectOpportunities.organizationId, organizationId),
          ),
        )
        .where(
          and(
            eq(projectFollowupTasks.organizationId, organizationId),
            eq(projectFollowupTasks.status, "pending_approval"),
          ),
        )
        .orderBy(desc(projectFollowupTasks.createdAt)),
    ]);

    return {
      proposals: pendingProposals,
      outreachMessages: pendingOutreach,
      followupTasks: pendingFollowup,
      totalCount: pendingProposals.length + pendingOutreach.length + pendingFollowup.length,
    };
  }

  /**
   * Upserts a daily business report for an organization and date.
   */
  public async saveDailyBusinessReport(params: {
    organizationId: string;
    reportDate: string;
    projectsDiscoveredCount: number;
    projectsQualifiedCount: number;
    proposalsGeneratedCount: number;
    proposalsApprovedCount: number;
    proposalsDispatchedCount: number;
    responsesReceivedCount: number;
    meetingsBookedCount: number;
    pipelineValueTotal: number | string;
    topCategoriesSummary?: Record<string, number>;
    agentPerformanceMetrics?: Record<string, unknown>;
    executiveSummary?: string;
    keyBottlenecks?: string[];
  }) {
    const [saved] = await db
      .insert(dailyBusinessReports)
      .values({
        organizationId: params.organizationId,
        reportDate: params.reportDate,
        projectsDiscoveredCount: params.projectsDiscoveredCount,
        projectsQualifiedCount: params.projectsQualifiedCount,
        proposalsGeneratedCount: params.proposalsGeneratedCount,
        proposalsApprovedCount: params.proposalsApprovedCount,
        proposalsDispatchedCount: params.proposalsDispatchedCount,
        responsesReceivedCount: params.responsesReceivedCount,
        meetingsBookedCount: params.meetingsBookedCount,
        pipelineValueTotal: String(params.pipelineValueTotal || "0.00"),
        topCategoriesSummary: params.topCategoriesSummary || {},
        agentPerformanceMetrics: params.agentPerformanceMetrics || {},
        executiveSummary: params.executiveSummary || null,
        keyBottlenecks: params.keyBottlenecks || [],
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [dailyBusinessReports.organizationId, dailyBusinessReports.reportDate],
        set: {
          projectsDiscoveredCount: params.projectsDiscoveredCount,
          projectsQualifiedCount: params.projectsQualifiedCount,
          proposalsGeneratedCount: params.proposalsGeneratedCount,
          proposalsApprovedCount: params.proposalsApprovedCount,
          proposalsDispatchedCount: params.proposalsDispatchedCount,
          responsesReceivedCount: params.responsesReceivedCount,
          meetingsBookedCount: params.meetingsBookedCount,
          pipelineValueTotal: String(params.pipelineValueTotal || "0.00"),
          topCategoriesSummary: params.topCategoriesSummary || {},
          agentPerformanceMetrics: params.agentPerformanceMetrics || {},
          executiveSummary: params.executiveSummary || null,
          keyBottlenecks: params.keyBottlenecks || [],
          updatedAt: new Date(),
        },
      })
      .returning();

    return saved;
  }

  /**
   * Retrieves daily business report for an organization and date.
   */
  public async getDailyBusinessReport(organizationId: string, reportDate: string) {
    const [report] = await db
      .select()
      .from(dailyBusinessReports)
      .where(
        and(
          eq(dailyBusinessReports.organizationId, organizationId),
          eq(dailyBusinessReports.reportDate, reportDate),
        ),
      )
      .limit(1);

    return report || null;
  }

  /**
   * Lists historical daily reports for an organization.
   */
  public async listDailyBusinessReports(organizationId: string, limit = 30) {
    return db
      .select()
      .from(dailyBusinessReports)
      .where(eq(dailyBusinessReports.organizationId, organizationId))
      .orderBy(desc(dailyBusinessReports.reportDate))
      .limit(limit);
  }

  /**
   * Inserts an agent execution telemetry record.
   */
  public async recordAgentExecution(params: {
    organizationId: string;
    agentType: AgentType;
    status?: "pending" | "running" | "completed" | "failed" | "paused";
    triggerSource?: "scheduled" | "manual" | "event" | "webhook";
    targetEntityId?: string | null;
    targetEntityType?: "opportunity" | "proposal" | "batch" | "report";
    inputPayload?: Record<string, unknown>;
    tokensUsed?: number;
    costEstimate?: number | string;
    modelUsed?: string;
    maxRetries?: number;
  }) {
    const [inserted] = await db
      .insert(agentExecutions)
      .values({
        organizationId: params.organizationId,
        agentType: params.agentType,
        status: params.status || "running",
        triggerSource: params.triggerSource || "scheduled",
        targetEntityId: params.targetEntityId || null,
        targetEntityType: params.targetEntityType || null,
        inputPayload: params.inputPayload || {},
        tokensUsed: params.tokensUsed ?? 0,
        costEstimate: String(params.costEstimate ?? "0.0000"),
        modelUsed: params.modelUsed || null,
        maxRetries: params.maxRetries ?? 3,
        startedAt: new Date(),
      })
      .returning();

    return inserted;
  }

  /**
   * Updates an agent execution record upon completion, failure, or retry.
   */
  public async updateAgentExecution(params: {
    organizationId: string;
    executionId: string;
    status: "pending" | "running" | "completed" | "failed" | "paused";
    outputPayload?: Record<string, unknown>;
    errorDetails?: string | null;
    tokensUsed?: number;
    costEstimate?: number | string;
    durationMs?: number;
    retryCount?: number;
    nextRetryAt?: Date | null;
  }) {
    const [updated] = await db
      .update(agentExecutions)
      .set({
        status: params.status,
        outputPayload: params.outputPayload !== undefined ? params.outputPayload : undefined,
        errorDetails: params.errorDetails !== undefined ? params.errorDetails : undefined,
        tokensUsed: params.tokensUsed !== undefined ? params.tokensUsed : undefined,
        costEstimate: params.costEstimate !== undefined ? String(params.costEstimate) : undefined,
        durationMs: params.durationMs !== undefined ? params.durationMs : undefined,
        retryCount: params.retryCount !== undefined ? params.retryCount : undefined,
        nextRetryAt: params.nextRetryAt !== undefined ? params.nextRetryAt : undefined,
        completedAt: params.status === "completed" || params.status === "failed" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(agentExecutions.id, params.executionId),
          eq(agentExecutions.organizationId, params.organizationId),
        ),
      )
      .returning();

    return updated;
  }

  /**
   * Retrieves agent executions telemetry for an organization.
   */
  public async getAgentExecutions(organizationId: string, limit = 100) {
    return db
      .select()
      .from(agentExecutions)
      .where(eq(agentExecutions.organizationId, organizationId))
      .orderBy(desc(agentExecutions.startedAt))
      .limit(limit);
  }
}

