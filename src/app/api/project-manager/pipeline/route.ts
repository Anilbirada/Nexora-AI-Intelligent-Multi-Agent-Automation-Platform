import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { PipelineManager, type PipelineEvidenceData } from "@/lib/projects/agents/project-manager/pipeline-manager";

export const dynamic = "force-dynamic";

/**
 * GET /api/project-manager/pipeline
 * Returns funnel metrics across all 9 stages:
 * Discovery → Research → Analysis → Scoring → Proposal → Approval → Outreach → Client Response → Follow-up
 * and evidence-based bottlenecks.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireOrgContext(request);
    const repo = new PostgresProjectRepository();

    const [oppRows, pendingApprovals] = await Promise.all([
      repo.getOpportunities(ctx.organizationId, 100),
      repo.getUnifiedPendingApprovals(ctx.organizationId),
    ]);

    const totalDiscovered = oppRows.length;
    const totalResearched = oppRows.filter((r) => r.opportunity.clientDomain && !r.opportunity.clientDomain.includes("free")).length;
    const totalAnalyzed = oppRows.filter((r) => r.opportunity.metadata && (r.opportunity.metadata as any).analysis).length;
    const totalScored = oppRows.filter((r) => r.score !== null).length;
    const totalQualified = oppRows.filter((r) => r.score?.isQualified).length;

    const pipelineEvidence: PipelineEvidenceData = {
      totalDiscovered,
      totalResearched,
      totalAnalyzed,
      totalScored,
      totalQualified,
      proposalsDrafted: pendingApprovals.proposals.length,
      proposalsPendingApproval: pendingApprovals.proposals.filter((p) => p.proposal.status === "pending_approval").length,
      proposalsApproved: 0,
      outreachDraftsGenerated: pendingApprovals.outreachMessages.length,
      outreachPendingApproval: pendingApprovals.outreachMessages.filter((m) => m.message.status === "pending_approval").length,
      outreachApproved: 0,
      outreachDispatched: 0, // Always 0 because safety policy blocks autonomous dispatch
      clientResponsesTotal: 0,
      clientResponsesPendingAttention: 0,
      followupSequencesActive: 0,
      followupTasksPendingApproval: pendingApprovals.followupTasks.filter((t) => t.task.status === "pending_approval").length,
      followupTasksCompleted: 0,
    };

    const stageMetrics = PipelineManager.calculateStageMetrics(pipelineEvidence);
    const bottlenecks = PipelineManager.detectBottlenecks(pipelineEvidence);

    return NextResponse.json({
      stageMetrics,
      bottlenecks,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:project-manager:pipeline]", error);
    return NextResponse.json({ error: "Failed to evaluate pipeline funnel" }, { status: 500 });
  }
}
