import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { AgentMonitor } from "@/lib/projects/agents/project-manager/agent-monitor";
import { FailureDetector } from "@/lib/projects/agents/project-manager/failure-detector";

export const dynamic = "force-dynamic";

/**
 * GET /api/project-manager/health
 * Global system health check and stalled execution detector.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireOrgContext(request);
    const repo = new PostgresProjectRepository();

    const executions = await repo.getAgentExecutions(ctx.organizationId, 50);

    const mappedExecs = executions.map((e) => ({
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
    }));

    const fleetStatus = AgentMonitor.evaluateFleetHealth(mappedExecs);
    const stalledJobs = FailureDetector.detectStalledJobs(mappedExecs);

    const hasCriticalFailure = Object.values(fleetStatus).some((a) => a.status === "failed");
    const isDegraded = Object.values(fleetStatus).some((a) => a.status === "degraded") || stalledJobs.length > 0;

    const overallHealth = hasCriticalFailure ? "critical" : isDegraded ? "degraded" : "healthy";

    return NextResponse.json({
      status: overallHealth,
      timestamp: new Date().toISOString(),
      stalledJobsCount: stalledJobs.length,
      stalledJobs,
      fleetSummary: Object.values(fleetStatus).map((a) => ({
        agentType: a.agentType,
        status: a.status,
        consecutiveFailures: a.consecutiveFailures,
        averageDurationMs: a.averageDurationMs,
      })),
      externalSafetyGuard: {
        allowExternalOutreach: process.env.ALLOW_EXTERNAL_OUTREACH === "true",
        safe: true,
      },
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:project-manager:health]", error);
    return NextResponse.json({ error: "Failed to evaluate system health" }, { status: 500 });
  }
}
