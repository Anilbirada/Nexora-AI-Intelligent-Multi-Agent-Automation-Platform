import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { FailureDetector } from "@/lib/projects/agents/project-manager/failure-detector";

export const dynamic = "force-dynamic";

/**
 * POST /api/project-manager/jobs/[id]/retry
 * Idempotently retries a failed or stalled agent execution with exponential backoff.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: executionId } = await params;
    const ctx = await requireOrgContext(request);
    const repo = new PostgresProjectRepository();

    const executions = await repo.getAgentExecutions(ctx.organizationId, 100);
    const targetExec = executions.find((e) => e.id === executionId);

    if (!targetExec) {
      return NextResponse.json({ error: `Execution ${executionId} not found` }, { status: 404 });
    }

    if (!FailureDetector.isRetryEligible(targetExec)) {
      return NextResponse.json(
        {
          error: "Retry ineligible",
          message: `Execution ${executionId} has exceeded max retries (${targetExec.retryCount}/${targetExec.maxRetries}). Marked terminal dead-letter.`,
        },
        { status: 400 },
      );
    }

    const retryParams = FailureDetector.prepareRetry({
      id: targetExec.id,
      organizationId: targetExec.organizationId,
      agentType: targetExec.agentType as any,
      status: targetExec.status as any,
      startedAt: targetExec.startedAt,
      completedAt: targetExec.completedAt,
      durationMs: targetExec.durationMs,
      retryCount: targetExec.retryCount,
      maxRetries: targetExec.maxRetries,
      errorDetails: targetExec.errorDetails,
    });

    const updated = await repo.updateAgentExecution({
      organizationId: ctx.organizationId,
      executionId: targetExec.id,
      status: retryParams.status,
      retryCount: retryParams.retryCount,
      nextRetryAt: retryParams.nextRetryAt,
      errorDetails: retryParams.errorDetails,
    });

    return NextResponse.json({
      success: true,
      message: `Job ${executionId} scheduled for retry ${retryParams.retryCount}/${targetExec.maxRetries}.`,
      nextRetryAt: retryParams.nextRetryAt,
      execution: updated,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:project-manager:jobs:retry]", error);
    return NextResponse.json({ error: "Failed to retry job execution" }, { status: 500 });
  }
}
