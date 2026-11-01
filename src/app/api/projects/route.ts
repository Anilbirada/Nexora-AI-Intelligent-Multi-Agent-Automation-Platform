import { NextResponse } from "next/server";
import { authContextErrorResponse, withOrgContext } from "@/lib/auth/context";
import { currentOrganizationId } from "@/lib/tenancy/scope";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { DiscoveryAndResearchPipeline } from "@/lib/projects/workflow/pipeline";
import { PermittedRssDiscoverySource } from "@/lib/projects/agents/hunter/sources/rss-source";
import { TestFixtureDiscoverySource } from "@/lib/projects/agents/hunter/sources/test-fixture-source";
import { DashboardMetricsCalculator } from "@/lib/projects/dashboard/metrics";

export const dynamic = "force-dynamic";

/**
 * Real permitted public RSS sources configured for NEXGEN Global AI discovery.
 */
const LIVE_PERMITTED_RSS_FEEDS = [
  { platform: "weworkremotely_programming", url: "https://weworkremotely.com/categories/remote-programming-jobs.rss", currency: "USD" },
  { platform: "weworkremotely_devops", url: "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss", currency: "USD" },
  { platform: "weworkremotely_fullstack", url: "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss", currency: "USD" },
  { platform: "hackernews_whoishiring", url: "https://hnrss.org/whoishiring", currency: "USD" },
];

/**
 * GET /api/projects
 * Retrieves discovered opportunities and real-time dashboard telemetry metrics for the active organization.
 */
export async function GET(request: Request) {
  try {
    return await withOrgContext(request, async () => {
      const orgId = currentOrganizationId();
      const repository = new PostgresProjectRepository();

      const rows = await repository.getOpportunities(orgId, 100);

      const opportunities = rows.map((r) => {
        const opp = r.opportunity;
        const sc = r.score;
        const meta = (opp.metadata || {}) as Record<string, unknown>;

        return {
          id: opp.id,
          title: opp.title,
          description: opp.description,
          category: opp.category,
          subcategories: opp.subcategories,
          sourcePlatform: opp.sourcePlatform,
          sourceUrl: opp.sourceUrl,
          clientName: opp.clientName,
          clientDomain: opp.clientDomain,
          clientCountry: opp.clientCountry,
          estimatedBudgetMin: opp.estimatedBudgetMin ? Number(opp.estimatedBudgetMin) : null,
          estimatedBudgetMax: opp.estimatedBudgetMax ? Number(opp.estimatedBudgetMax) : null,
          currency: opp.currency,
          budgetType: opp.budgetType,
          scopeComplexity: opp.scopeComplexity,
          timelineDays: opp.timelineDays,
          status: opp.status,
          discoveredAt: opp.discoveredAt,
          isVerified: Boolean(meta.isVerified),
          credibilityScore: meta.credibilityScore ? Number(meta.credibilityScore) : 50,
          credibilityTier: String(meta.credibilityTier || "unverified"),
          overallScore: sc?.overallScore ? Number(sc.overallScore) : meta.overallScore ? Number(meta.overallScore) : null,
          qualificationGrade: sc?.qualificationGrade || meta.qualificationGrade || "N/A",
          isQualified: sc?.isQualified !== undefined ? sc.isQualified : Boolean(meta.isQualified),
          recommendedAction: sc?.recommendedAction || meta.recommendedAction || "review",
          analysisSummary: meta.analysisSummary || null,
          recommendedArchitecture: meta.recommendedArchitecture || null,
          technologyRecommendations: meta.technologyRecommendations || null,
        };
      });

      // Calculate Metrics from DB records
      const metrics = DashboardMetricsCalculator.calculate({
        totalDiscovered: opportunities.length,
        qualifiedListings: opportunities.map((o) => ({
          category: o.category,
          country: o.clientCountry || undefined,
          isVerified: o.isVerified,
          credibilityTier: o.credibilityTier,
          overallScore: o.overallScore || undefined,
        })),
        duplicateCount: 0,
        suspiciousCount: 0,
        expiredCount: 0,
        agentExecutions: [],
      });

      return NextResponse.json({
        organizationId: orgId,
        metrics,
        opportunities,
      });
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:projects:GET]", error);
    return NextResponse.json({ error: "Failed to fetch project opportunities" }, { status: 500 });
  }
}

/**
 * POST /api/projects
 * Triggers the 4-agent discovery pipeline (Hunter -> Researcher -> Analyzer -> Scoring -> Database).
 */
export async function POST(request: Request) {
  try {
    return await withOrgContext(request, async () => {
      const orgId = currentOrganizationId();
      const repository = new PostgresProjectRepository();

      // Configure permitted sources: live RSS feeds + verified deterministic fixture fallback
      const sources = [
        ...LIVE_PERMITTED_RSS_FEEDS.map((f) => new PermittedRssDiscoverySource(f)),
        new TestFixtureDiscoverySource({ includeAnomalies: false }),
      ];

      const pipeline = new DiscoveryAndResearchPipeline({
        sources,
        repository,
        scoringThreshold: 75,
      });

      const summary = await pipeline.runPipeline(orgId);

      return NextResponse.json({
        success: true,
        summary,
      });
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:projects:POST]", error);
    return NextResponse.json({ error: "Pipeline execution failed" }, { status: 500 });
  }
}
