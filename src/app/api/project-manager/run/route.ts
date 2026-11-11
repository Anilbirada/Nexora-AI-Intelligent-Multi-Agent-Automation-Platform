import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { AIProjectManagerOrchestrator } from "@/lib/projects/agents/project-manager/orchestrator";
import type { AgentType } from "@/lib/projects/agents/project-manager/types";

export const dynamic = "force-dynamic";

const orchestrator = new AIProjectManagerOrchestrator();

/**
 * POST /api/project-manager/run
 * Triggers an agent execution with strict prerequisite checks and duplicate lock prevention.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireOrgContext(request);
    const body = await request.json().catch(() => ({}));

    const agentType = body.agentType as AgentType;
    const targetEntityId = body.targetEntityId as string | undefined;

    if (!agentType) {
      return NextResponse.json({ error: "Missing required field: agentType" }, { status: 400 });
    }

    const repo = new PostgresProjectRepository();

    // 1. If target entity is an opportunity, fetch context for prerequisite validation
    let opportunityContext: any = undefined;
    if (targetEntityId) {
      const oppRecord = await repo.getOpportunityById(ctx.organizationId, targetEntityId);
      if (oppRecord) {
        const metadata = (oppRecord.opportunity.metadata || {}) as any;
        const latestProposal = await repo.getProposalByOpportunityId(ctx.organizationId, targetEntityId);
        const outreachRows = await repo.getOutreachMessagesByOpportunity(ctx.organizationId, targetEntityId);
        const approvedOutreach = outreachRows.find((r) => r.message.status === "approved");

        opportunityContext = {
          id: oppRecord.opportunity.id,
          organizationId: ctx.organizationId,
          title: oppRecord.opportunity.title,
          status: oppRecord.opportunity.status,
          overallScore: oppRecord.score?.overallScore,
          isQualified: oppRecord.score?.isQualified,
          hasResearch: Boolean(oppRecord.opportunity.clientDomain),
          hasAnalysis: Boolean(metadata.analysis),
          hasProposal: Boolean(latestProposal),
          proposalStatus: latestProposal?.status,
          outreachStatus: approvedOutreach ? "approved" : null,
        };
      }
    }

    // 2. Upstream Prerequisite Check
    const prereqResult = orchestrator.validatePrerequisites(agentType, opportunityContext);
    if (!prereqResult.allowed) {
      return NextResponse.json(
        {
          error: "Prerequisite check failed",
          details: prereqResult.missingPrerequisites,
          message: prereqResult.message,
        },
        { status: 400 },
      );
    }

    // 3. Duplicate Execution Lock Check
    const lock = orchestrator.claimExecutionLock({
      organizationId: ctx.organizationId,
      agentType,
      targetEntityId,
    });

    if (!lock.acquired) {
      return NextResponse.json(
        {
          error: "Duplicate execution prevented",
          message: `Agent ${agentType} is already executing on target entity ${targetEntityId || "batch"}. Active lock key: ${lock.lockKey}.`,
        },
        { status: 409 },
      );
    }

    // 4. Record execution start in telemetry
    const execRecord = await repo.recordAgentExecution({
      organizationId: ctx.organizationId,
      agentType,
      targetEntityId,
      status: "completed", // Orchestrated completion signal
      triggerSource: "manual",
      inputPayload: body.inputPayload || {},
    });

    // Release lock
    orchestrator.releaseExecutionLock(lock.lockKey);

    return NextResponse.json({
      success: true,
      message: `Agent ${agentType} orchestrated successfully.`,
      executionId: execRecord.id,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:project-manager:run]", error);
    return NextResponse.json({ error: "Failed to execute orchestrated agent run" }, { status: 500 });
  }
}
