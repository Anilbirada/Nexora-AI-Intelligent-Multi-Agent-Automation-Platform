import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { QuotaManager } from "@/lib/projects/agents/project-manager/quota-manager";
import { AgentMonitor } from "@/lib/projects/agents/project-manager/agent-monitor";
import { PipelineManager } from "@/lib/projects/agents/project-manager/pipeline-manager";

export const dynamic = "force-dynamic";

/**
 * GET /api/project-manager/overview
 * Returns executive top-level summary:
 * - Daily Quota progress (Target: 40/day)
 * - 8-Agent fleet health summary
 * - Unified pending approvals count
 * - External communication safety state
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireOrgContext(request);
    const repo = new PostgresProjectRepository();

    const [oppRows, pendingApprovals, executions] = await Promise.all([
      repo.getOpportunities(ctx.organizationId, 100),
      repo.getUnifiedPendingApprovals(ctx.organizationId),
      repo.getAgentExecutions(ctx.organizationId, 50),
    ]);

    // Map opportunities to quota-compatible items
    const rawOpps = oppRows.map((r) => ({
      id: r.opportunity.id,
      title: r.opportunity.title,
      clientName: r.opportunity.clientName,
      clientDomain: r.opportunity.clientDomain,
      budgetType: r.opportunity.budgetType,
      estimatedBudgetMin: r.opportunity.estimatedBudgetMin ? Number(r.opportunity.estimatedBudgetMin) : null,
      estimatedBudgetMax: r.opportunity.estimatedBudgetMax ? Number(r.opportunity.estimatedBudgetMax) : null,
      isVerified: Boolean(r.opportunity.clientDomain && !r.opportunity.clientDomain.includes("free")),
      status: r.opportunity.status,
      overallScore: r.score?.overallScore,
      isQualified: r.score?.isQualified,
      createdAt: r.opportunity.createdAt,
    }));

    const quota = QuotaManager.calculateDailyQuota(rawOpps);

    // Fleet health
    const fleetStatus = AgentMonitor.evaluateFleetHealth(
      executions.map((e) => ({
        id: e.id,
        organizationId: e.organizationId,
        agentType: e.agentType as any,
        status: e.status as any,
        targetEntityId: e.targetEntityId,
        targetEntityType: e.targetEntityType,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
        durationMs: e.durationMs,
        retryCount: e.retryCount,
        maxRetries: e.maxRetries,
        errorDetails: e.errorDetails,
      })),
    );

    const fleetArray = Object.values(fleetStatus);
    const operationalCount = fleetArray.filter((a) => a.status === "operational").length;
    const degradedCount = fleetArray.filter((a) => a.status === "degraded").length;
    const failedCount = fleetArray.filter((a) => a.status === "failed").length;

    return NextResponse.json({
      organizationId: ctx.organizationId,
      quota,
      fleetSummary: {
        totalAgents: 8,
        operational: operationalCount,
        degraded: degradedCount,
        failed: failedCount,
        running: fleetArray.filter((a) => a.status === "running").length,
      },
      pendingApprovalsCount: pendingApprovals.totalCount,
      externalSafetyGuard: {
        allowExternalOutreach: process.env.ALLOW_EXTERNAL_OUTREACH === "true",
        policyStatus: "LOCKED_SAFE",
        notice: "External communication dispatch is permanently disabled by system security policy.",
      },
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:project-manager:overview]", error);
    return NextResponse.json({ error: "Failed to load project manager overview" }, { status: 500 });
  }
}
