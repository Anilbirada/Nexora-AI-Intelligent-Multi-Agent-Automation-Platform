import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { DailyReportGenerator } from "@/lib/projects/agents/project-manager/daily-report-generator";
import type { PipelineEvidenceData } from "@/lib/projects/agents/project-manager/pipeline-manager";

export const dynamic = "force-dynamic";

/**
 * POST /api/project-manager/reports/generate
 * Generates and stores the daily executive business report for Anil.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireOrgContext(request);
    const body = await request.json().catch(() => ({}));
    const reportDate = body.reportDate || new Date().toISOString().slice(0, 10);

    const repo = new PostgresProjectRepository();

    const [oppRows, pendingApprovals, executions] = await Promise.all([
      repo.getOpportunities(ctx.organizationId, 100),
      repo.getUnifiedPendingApprovals(ctx.organizationId),
      repo.getAgentExecutions(ctx.organizationId, 50),
    ]);

    const scoredOpps = oppRows.map((r) => ({
      id: r.opportunity.id,
      title: r.opportunity.title,
      clientName: r.opportunity.clientName,
      category: r.opportunity.category,
      overallScore: r.score?.overallScore ?? 0,
      qualificationGrade: r.score?.qualificationGrade ?? "F",
      estimatedBudgetMax: r.opportunity.estimatedBudgetMax ? Number(r.opportunity.estimatedBudgetMax) : null,
      currency: r.opportunity.currency,
      isQualified: r.score?.isQualified ?? false,
    }));

    const totalDiscovered = oppRows.length;
    const totalQualified = scoredOpps.filter((o) => o.isQualified && o.overallScore >= 75).length;

    const pipelineEvidence: PipelineEvidenceData = {
      totalDiscovered,
      totalResearched: oppRows.filter((r) => r.opportunity.clientDomain).length,
      totalAnalyzed: oppRows.filter((r) => r.opportunity.metadata && (r.opportunity.metadata as any).analysis).length,
      totalScored: scoredOpps.filter((o) => o.overallScore > 0).length,
      totalQualified,
      proposalsDrafted: pendingApprovals.proposals.length,
      proposalsPendingApproval: pendingApprovals.proposals.filter((p) => p.proposal.status === "pending_approval").length,
      proposalsApproved: 0,
      outreachDraftsGenerated: pendingApprovals.outreachMessages.length,
      outreachPendingApproval: pendingApprovals.outreachMessages.filter((m) => m.message.status === "pending_approval").length,
      outreachApproved: 0,
      outreachDispatched: 0,
      clientResponsesTotal: 0,
      clientResponsesPendingAttention: 0,
      followupSequencesActive: 0,
      followupTasksPendingApproval: pendingApprovals.followupTasks.filter((t) => t.task.status === "pending_approval").length,
      followupTasksCompleted: 0,
    };

    const reportData = DailyReportGenerator.generateDailyReport({
      organizationId: ctx.organizationId,
      reportDate,
      opportunities: scoredOpps,
      pipelineEvidence,
      executionHistory: executions.map((e) => ({
        id: e.id,
        organizationId: e.organizationId,
        agentType: e.agentType as any,
        status: e.status as any,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
        durationMs: e.durationMs,
        retryCount: e.retryCount,
        maxRetries: e.maxRetries,
        errorDetails: e.errorDetails,
      })),
      pendingApprovals: [],
      clientResponses: [],
      dataSourceLabel: "production_verified",
    });

    // Upsert into PostgreSQL daily_business_reports table
    const saved = await repo.saveDailyBusinessReport({
      organizationId: ctx.organizationId,
      reportDate,
      projectsDiscoveredCount: reportData.discovery.totalDiscovered,
      projectsQualifiedCount: reportData.discovery.qualifiedOpportunities,
      proposalsGeneratedCount: reportData.commercialPipeline.proposalsGenerated,
      proposalsApprovedCount: reportData.commercialPipeline.proposalsApproved,
      proposalsDispatchedCount: reportData.commercialPipeline.messagesActuallyDispatched,
      responsesReceivedCount: reportData.commercialPipeline.clientResponsesReceived,
      meetingsBookedCount: 0,
      pipelineValueTotal: reportData.commercialPipeline.totalPipelineValue,
      topCategoriesSummary: reportData.globalCoverage.categoryBreakdown,
      agentPerformanceMetrics: reportData.agentPerformance as any,
      executiveSummary: reportData.executiveSummary,
      keyBottlenecks: reportData.recommendations.pipelineBottlenecks.map((b) => b.title),
    });

    return NextResponse.json({
      success: true,
      report: reportData,
      savedRecordId: saved?.id,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:project-manager:reports:generate]", error);
    return NextResponse.json({ error: "Failed to generate daily report" }, { status: 500 });
  }
}
