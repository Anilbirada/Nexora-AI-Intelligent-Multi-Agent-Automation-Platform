import { NextResponse } from "next/server";
import { authContextErrorResponse, withOrgContext } from "@/lib/auth/context";
import { currentOrganizationId } from "@/lib/tenancy/scope";
import { PostgresProjectRepository } from "@/lib/projects/repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]
 * Retrieves full details of a specific project opportunity with strict tenant isolation.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return await withOrgContext(request, async () => {
      const orgId = currentOrganizationId();
      const repository = new PostgresProjectRepository();

      const record = await repository.getOpportunityById(orgId, id);
      if (!record) {
        return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
      }

      const opp = record.opportunity;
      const sc = record.score;
      const meta = (opp.metadata || {}) as Record<string, unknown>;
      const raw = (opp.rawPayload || {}) as Record<string, unknown>;

      return NextResponse.json({
        id: opp.id,
        organizationId: opp.organizationId,
        title: opp.title,
        description: opp.description,
        category: opp.category,
        subcategories: opp.subcategories,
        sourcePlatform: opp.sourcePlatform,
        sourceUrl: opp.sourceUrl,
        clientName: opp.clientName,
        clientDomain: opp.clientDomain,
        clientCountry: opp.clientCountry,
        clientRegion: opp.clientRegion,
        estimatedBudgetMin: opp.estimatedBudgetMin ? Number(opp.estimatedBudgetMin) : null,
        estimatedBudgetMax: opp.estimatedBudgetMax ? Number(opp.estimatedBudgetMax) : null,
        currency: opp.currency,
        budgetType: opp.budgetType,
        requiredSkills: opp.requiredSkills,
        scopeComplexity: opp.scopeComplexity,
        timelineDays: opp.timelineDays,
        status: opp.status,
        discoveredAt: opp.discoveredAt,
        // Client Research
        clientProfile: {
          companyName: opp.clientName,
          domain: opp.clientDomain,
          country: opp.clientCountry,
          credibilityScore: meta.credibilityScore ? Number(meta.credibilityScore) : 50,
          credibilityTier: meta.credibilityTier || "unverified",
          isVerified: Boolean(meta.isVerified),
          riskFlags: meta.riskFlags || [],
          missingInformation: meta.missingInformation || [],
          researchSummary: meta.researchSummary || null,
          evidenceUrls: raw.evidenceUrls || [],
          techStackDetected: raw.techStackDetected || [],
        },
        // Technical Analysis
        technicalAnalysis: {
          summary: meta.analysisSummary || null,
          complexityLevel: opp.scopeComplexity || "medium",
          recommendedArchitecture: meta.recommendedArchitecture || null,
          technologyRecommendations: meta.technologyRecommendations || null,
          milestones: meta.milestones || [],
          deliveryRisks: meta.deliveryRisks || [],
        },
        // Opportunity Scoring
        scoring: sc
          ? {
              overallScore: Number(sc.overallScore),
              qualificationGrade: sc.qualificationGrade,
              isQualified: sc.isQualified,
              budgetViabilityScore: Number(sc.budgetViabilityScore),
              techStackAlignmentScore: Number(sc.techStackAlignmentScore),
              clientLegitimacyScore: Number(sc.clientLegitimacyScore),
              competitionScore: Number(sc.competitionScore),
              timelineFeasibilityScore: Number(sc.timelineFeasibilityScore),
              confidenceLevel: Number(sc.confidenceLevel),
              recommendedAction: sc.recommendedAction,
              reasoningSummary: sc.reasoningSummary,
              scoringFactors: sc.scoringFactors,
            }
          : {
              overallScore: meta.overallScore ? Number(meta.overallScore) : null,
              qualificationGrade: meta.qualificationGrade || "N/A",
              isQualified: Boolean(meta.isQualified),
              recommendedAction: meta.recommendedAction || "review",
              reasoningSummary: meta.scoringSummary || null,
            },
      });
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:projects:id:GET]", error);
    return NextResponse.json({ error: "Failed to fetch opportunity details" }, { status: 500 });
  }
}
