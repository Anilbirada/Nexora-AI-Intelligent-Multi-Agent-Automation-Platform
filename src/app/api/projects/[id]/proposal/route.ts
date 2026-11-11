import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { AIProposalGenerator } from "@/lib/projects/agents/proposal/generator";
import { ProjectAnalyzer } from "@/lib/projects/agents/analyzer/analyzer";
import { OpportunityScoringAgent } from "@/lib/projects/agents/scoring/scoring";
import { ClientResearcher } from "@/lib/projects/agents/researcher/researcher";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/proposal
 * Retrieves the latest generated technical proposal for the opportunity.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: opportunityId } = await params;
    const ctx = await requireOrgContext(request);
    const repository = new PostgresProjectRepository();

    const proposal = await repository.getProposalByOpportunityId(ctx.organizationId, opportunityId);
    if (!proposal) {
      return NextResponse.json({ proposal: null, exists: false });
    }

    return NextResponse.json({
      exists: true,
      proposal,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:proposal:GET]", error);
    return NextResponse.json({ error: "Failed to retrieve proposal" }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/proposal
 * Generates an AI technical proposal using Agent 5 (AI Proposal Generator).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: opportunityId } = await params;
    const ctx = await requireOrgContext(request);
    const repository = new PostgresProjectRepository();

    const oppRecord = await repository.getOpportunityById(ctx.organizationId, opportunityId);
    if (!oppRecord) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const opp = oppRecord.opportunity;
    const sc = oppRecord.score;
    const meta = (opp.metadata || {}) as Record<string, any>;
    const raw = (opp.rawPayload || {}) as Record<string, any>;

    // Parse optional body for revision feedback
    let revisionFeedback: string | undefined;
    try {
      const body = await request.json();
      if (body?.revisionFeedback && typeof body.revisionFeedback === "string") {
        revisionFeedback = body.revisionFeedback.trim();
      }
    } catch {
      // Empty body is valid for initial generation
    }

    // Determine next version number
    const nextVersion = await repository.getNextProposalVersion(ctx.organizationId, opportunityId);

    // Formulate Agent 3 Analysis if not stored in metadata
    let analysis = meta.analysisReport;
    if (!analysis) {
      const analyzer = new ProjectAnalyzer();
      analysis = await analyzer.analyzeProject({
        contentHash: raw.contentHash || opp.id,
        sourcePlatform: opp.sourcePlatform,
        sourceUrl: opp.sourceUrl || "",
        title: opp.title,
        description: opp.description,
        primaryCategory: opp.category as any,
        subcategories: (opp.subcategories as string[]) || [],
        clientName: opp.clientName || undefined,
        clientDomain: opp.clientDomain || undefined,
        clientCountry: opp.clientCountry || undefined,
        budgetMin: opp.estimatedBudgetMin ? Number(opp.estimatedBudgetMin) : undefined,
        budgetMax: opp.estimatedBudgetMax ? Number(opp.estimatedBudgetMax) : undefined,
        budgetType: opp.budgetType as any,
        currency: opp.currency,
        requiredSkills: (opp.requiredSkills as string[]) || [],
        discoveryDate: opp.discoveredAt,
        classificationConfidence: 0.9,
      });
    }

    // Formulate Agent 4 Scoring if not in metadata or DB
    let scoring = sc;
    if (!scoring) {
      const scoringAgent = new OpportunityScoringAgent();
      const scored = await scoringAgent.scoreOpportunity({
        project: {
          contentHash: raw.contentHash || opp.id,
          sourcePlatform: opp.sourcePlatform,
          sourceUrl: opp.sourceUrl || "",
          title: opp.title,
          description: opp.description,
          primaryCategory: opp.category as any,
          subcategories: (opp.subcategories as string[]) || [],
          clientName: opp.clientName || undefined,
          clientDomain: opp.clientDomain || undefined,
          clientCountry: opp.clientCountry || undefined,
          budgetMin: opp.estimatedBudgetMin ? Number(opp.estimatedBudgetMin) : undefined,
          budgetMax: opp.estimatedBudgetMax ? Number(opp.estimatedBudgetMax) : undefined,
          budgetType: opp.budgetType as any,
          currency: opp.currency,
          requiredSkills: (opp.requiredSkills as string[]) || [],
          discoveryDate: opp.discoveredAt,
          classificationConfidence: 0.9,
        },
        analysis,
      });
      scoring = scored as any;
    }

    // Execute Agent 5: AI Proposal Generator
    const generator = new AIProposalGenerator();
    const proposalDoc = await generator.generateProposal({
      organizationId: ctx.organizationId,
      opportunityId,
      title: opp.title,
      description: opp.description,
      category: opp.category,
      sourcePlatform: opp.sourcePlatform,
      sourceUrl: opp.sourceUrl || undefined,
      currency: opp.currency,
      budgetMin: opp.estimatedBudgetMin ? Number(opp.estimatedBudgetMin) : null,
      budgetMax: opp.estimatedBudgetMax ? Number(opp.estimatedBudgetMax) : null,
      analysis,
      scoring: scoring as any,
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
      version: nextVersion,
      revisionFeedback,
    });

    // Save to PostgreSQL project_proposals table
    const saved = await repository.saveProposal({
      organizationId: ctx.organizationId,
      opportunityId,
      version: proposalDoc.version,
      title: proposalDoc.title,
      executiveSummary: proposalDoc.executiveSummary,
      problemAnalysis: proposalDoc.requirementsUnderstanding.technicalRequirements.join("\n"),
      proposedSolution: proposalDoc.proposedSolution.summary,
      architectureBlueprint: proposalDoc as any,
      techStackRecommendations: proposalDoc.recommendedTechStack,
      milestones: proposalDoc.milestones,
      estimatedDurationWeeks: proposalDoc.estimatedTimeline.weeksMax,
      totalCostEstimate: proposalDoc.budgetRecommendation.recommendedCost,
      currency: proposalDoc.budgetRecommendation.currency,
      status: "pending_approval",
    });

    // Log Execution Telemetry
    await repository.logAgentExecution({
      organizationId: ctx.organizationId,
      agentType: "proposal_generator" as any,
      status: "completed",
      inputPayload: { opportunityId, version: proposalDoc.version, hasFeedback: Boolean(revisionFeedback) },
      outputPayload: {
        proposalId: saved.id,
        version: proposalDoc.version,
        costEstimate: proposalDoc.budgetRecommendation.recommendedCost,
        status: "pending_approval",
      },
      durationMs: proposalDoc.metadata.generationDurationMs,
      tokensUsed: proposalDoc.metadata.tokensUsed,
      costEstimate: 0.005,
    });

    return NextResponse.json({
      success: true,
      proposalId: saved.id,
      proposal: proposalDoc,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:proposal:POST]", error);
    return NextResponse.json({ error: "Failed to generate proposal" }, { status: 500 });
  }
}
