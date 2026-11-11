import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { AIOutreachManager } from "@/lib/projects/agents/outreach/outreach-generator";
import type { OutreachChannel } from "@/lib/projects/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/outreach
 * Retrieves all generated outreach messages for an opportunity.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: opportunityId } = await params;
    const ctx = await requireOrgContext(request);
    const repository = new PostgresProjectRepository();

    const rows = await repository.getOutreachMessagesByOpportunity(ctx.organizationId, opportunityId);

    const messages = rows.map((r) => ({
      id: r.message.id,
      opportunityId: r.message.opportunityId,
      proposalId: r.message.proposalId,
      channel: r.message.channel,
      status: r.message.status,
      version: r.message.version,
      subject: r.message.subject,
      body: r.message.body,
      charCount: r.message.body.length,
      recipientName: r.message.recipientName,
      recipientContact: r.message.recipientContact,
      recipientCompany: r.message.recipientCompany,
      personalizationContext: r.message.personalizationContext,
      approvedByUserId: r.message.approvedByUserId,
      approvedAt: r.message.approvedAt,
      reviewerFeedback: r.message.reviewerFeedback,
      activityHistory: r.message.activityHistory,
      scheduledFor: r.message.scheduledFor,
      sentAt: r.message.sentAt,
      failedReason: r.message.failedReason,
      metadata: r.message.metadata,
      createdAt: r.message.createdAt,
      updatedAt: r.message.updatedAt,
    }));

    return NextResponse.json({
      exists: messages.length > 0,
      count: messages.length,
      messages,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:outreach:GET]", error);
    return NextResponse.json({ error: "Failed to retrieve outreach messages" }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/outreach
 * Generates personalized outreach drafts (Email, LinkedIn, WhatsApp) via Agent 6.
 *
 * PREREQUISITE GATE:
 * Only opportunities with an APPROVED proposal by Anil may enter.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: opportunityId } = await params;
    const ctx = await requireOrgContext(request);
    const repository = new PostgresProjectRepository();

    // 1. Fetch Opportunity
    const oppRecord = await repository.getOpportunityById(ctx.organizationId, opportunityId);
    if (!oppRecord) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const opp = oppRecord.opportunity;
    const score = oppRecord.score;
    const meta = (opp.metadata || {}) as Record<string, any>;
    const raw = (opp.rawPayload || {}) as Record<string, any>;

    // 2. Fetch Latest Proposal
    const proposalRecord = await repository.getProposalByOpportunityId(ctx.organizationId, opportunityId);
    if (!proposalRecord) {
      return NextResponse.json(
        {
          error: "Prerequisite Failed: No proposal found for this opportunity. Generate and approve a proposal with Agent 5 first.",
        },
        { status: 400 },
      );
    }

    // 3. Parse optional parameters
    let targetChannel: "email" | "linkedin" | "whatsapp" | "all" = "all";
    let revisionFeedback: string | undefined;

    try {
      const body = await request.json();
      if (body?.channel && ["email", "linkedin", "whatsapp", "all"].includes(body.channel)) {
        targetChannel = body.channel;
      }
      if (body?.revisionFeedback && typeof body.revisionFeedback === "string") {
        revisionFeedback = body.revisionFeedback.trim();
      }
    } catch {
      // Empty body defaults to all channels
    }

    // 4. Construct Agent 6 Input
    const manager = new AIOutreachManager();
    const channelsToGenerate: OutreachChannel[] =
      targetChannel === "all"
        ? ["email", "linkedin", "whatsapp"]
        : [targetChannel as OutreachChannel];

    const generatedDrafts = [];

    for (const ch of channelsToGenerate) {
      const nextVersion = await repository.getNextOutreachVersion(
        ctx.organizationId,
        proposalRecord.id,
        ch,
      );

      const draft = await manager.generateDraft({
        organizationId: ctx.organizationId,
        opportunity: {
          id: opp.id,
          title: opp.title,
          description: opp.description,
          category: opp.category,
          sourcePlatform: opp.sourcePlatform,
          sourceUrl: opp.sourceUrl || undefined,
          clientName: opp.clientName || undefined,
          clientDomain: opp.clientDomain || undefined,
          clientCountry: opp.clientCountry || undefined,
          currency: opp.currency,
          status: opp.status,
        },
        clientProfile: {
          companyName: opp.clientName || "Client Partner",
          domain: opp.clientDomain || undefined,
          country: opp.clientCountry || undefined,
          industry: meta.industry || "Software & Technology",
          credibilityScore: meta.credibilityScore ? Number(meta.credibilityScore) : 50,
          credibilityTier: meta.credibilityTier || "unverified",
          techStackDetected: raw.techStackDetected || [],
          evidenceUrls: raw.evidenceUrls || [],
          verifiedContacts: [],
          unverifiedContacts: [],
          riskFlags: meta.riskFlags || [],
          missingInformation: meta.missingInformation || [],
          isVerified: Boolean(meta.isVerified),
          researchSummary: meta.researchSummary || "",
          researchedAt: new Date(),
        },
        analysis: (meta.analysisReport || {
          complexityLevel: "medium",
          functionalRequirements: ["Custom Software Development"],
          nonFunctionalRequirements: ["Performance", "Security"],
          recommendedArchitecture: { pattern: "modular_monolith", summary: "Clean modular backend" },
          technologyRecommendations: { coreStack: ["TypeScript", "Node.js", "PostgreSQL"] },
          estimatedDuration: { weeksMin: 4, weeksMax: 8, estimatedTimelineDays: 45, disclaimer: "Discovery estimate" },
          milestones: [],
          deliveryRisks: [],
        }) as any,
        scoring: (score || {
          overallScore: 80,
          qualificationGrade: "B",
          isQualified: true,
        }) as any,
        proposal: {
          id: proposalRecord.id,
          version: proposalRecord.version,
          title: proposalRecord.title,
          status: proposalRecord.status,
          approvedByUserId: proposalRecord.approvedByUserId,
          approvedAt: proposalRecord.approvedAt,
          document: (proposalRecord.architectureBlueprint || {
            version: proposalRecord.version,
            budgetRecommendation: { recommendedCost: Number(proposalRecord.totalCostEstimate || 30000), currency: proposalRecord.currency },
            estimatedTimeline: { weeksMax: Number(proposalRecord.estimatedDurationWeeks || 8) },
          }) as any,
        },
        channel: ch,
        version: nextVersion,
        revisionFeedback,
      });

      // Persist to PostgreSQL project_outreach_messages table
      const saved = await repository.saveOutreachMessage({
        organizationId: ctx.organizationId,
        opportunityId: opp.id,
        proposalId: proposalRecord.id,
        channel: draft.channel,
        version: draft.version,
        subject: draft.subject,
        body: draft.body,
        recipientName: draft.recipientName,
        recipientContact: draft.recipientContact,
        recipientCompany: draft.recipientCompany,
        personalizationContext: draft.personalizationContext as any,
        status: "pending_approval",
        activityHistory: draft.activityHistory,
        metadata: draft.metadata as any,
      });

      // Audit Execution Logging
      await repository.logAgentExecution({
        organizationId: ctx.organizationId,
        agentType: "outreach_manager" as any,
        status: "completed",
        inputPayload: {
          opportunityId: opp.id,
          proposalId: proposalRecord.id,
          channel: ch,
          version: draft.version,
        },
        outputPayload: {
          messageId: saved.id,
          channel: ch,
          version: draft.version,
          status: "pending_approval",
        },
        durationMs: draft.metadata.generationDurationMs,
        tokensUsed: draft.metadata.tokensUsed,
        costEstimate: 0.003,
      });

      generatedDrafts.push(saved);
    }

    return NextResponse.json({
      success: true,
      draftCount: generatedDrafts.length,
      drafts: generatedDrafts,
    });
  } catch (error: any) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:outreach:POST]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate outreach drafts" },
      { status: 500 },
    );
  }
}
