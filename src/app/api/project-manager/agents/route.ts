import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { AgentMonitor, AGENT_DESCRIPTORS } from "@/lib/projects/agents/project-manager/agent-monitor";
import { ALL_EIGHT_AGENTS } from "@/lib/projects/agents/project-manager/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/project-manager/agents
 * Returns real telemetry and execution statistics for all 8 agents.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireOrgContext(request);
    const repo = new PostgresProjectRepository();

    const executions = await repo.getAgentExecutions(ctx.organizationId, 100);

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

    const agentsList = ALL_EIGHT_AGENTS.map((agentType) => {
      const descriptor = AGENT_DESCRIPTORS[agentType];
      const telemetry = fleetStatus[agentType];
      return {
        ...descriptor,
        telemetry,
      };
    });

    return NextResponse.json({
      totalAgents: 8,
      agents: agentsList,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:project-manager:agents]", error);
    return NextResponse.json({ error: "Failed to retrieve agents telemetry" }, { status: 500 });
  }
}
