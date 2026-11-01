import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import {
  isAnilAuthorizedAccount,
  NexgenAgentOrchestrator,
} from "@/lib/projects/agents/orchestrator";

export const dynamic = "force-dynamic";

/**
 * POST /api/projects/[id]/proposal/approval
 *
 * HUMAN APPROVAL GATE — STRICT SECURITY POLICY:
 * Only Anil's authenticated account (anil@nexgen.ai) can approve, reject,
 * or request revisions on proposals.
 * Ordinary members or non-Anil admins are strictly blocked with 403 Forbidden.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: opportunityId } = await params;
    const ctx = await requireOrgContext(request);
    const repository = new PostgresProjectRepository();

    const body = await request.json();
    const action = body?.action as "approve" | "reject" | "request_revision";
    const reviewerFeedback = body?.reviewerFeedback as string | undefined;
    const approvedDispatchChannel = body?.approvedDispatchChannel as "email" | "linkedin" | "whatsapp" | "portal" | undefined;

    if (!action || !["approve", "reject", "request_revision"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve', 'reject', or 'request_revision'." },
        { status: 400 },
      );
    }

    // 1. Strict Server-Side Identity Verification: Check if session user is Anil
    const isAnil = isAnilAuthorizedAccount({
      id: ctx.userId,
      email: ctx.userEmail,
    });

    if (!isAnil) {
      return NextResponse.json(
        {
          error: `Authorization Denied: Only Anil's authenticated account can authorize external communications or approve proposals. User (${ctx.userEmail}) is not authorized. Ordinary admins or members cannot approve on his behalf.`,
        },
        { status: 403 },
      );
    }

    // 2. Fetch latest proposal for this opportunity
    const proposal = await repository.getProposalByOpportunityId(ctx.organizationId, opportunityId);
    if (!proposal) {
      return NextResponse.json({ error: "No proposal found for this opportunity." }, { status: 404 });
    }

    // 3. Apply state machine transition via Orchestrator
    const updated = NexgenAgentOrchestrator.applyProposalApprovalDecision(
      {
        id: proposal.id,
        opportunityId: proposal.opportunityId,
        organizationId: proposal.organizationId,
        status: proposal.status as any,
        approvedByUserId: proposal.approvedByUserId,
        approvedAt: proposal.approvedAt,
        reviewerFeedback: proposal.reviewerFeedback,
        dispatchChannel: proposal.dispatchChannel as any,
      },
      {
        proposalId: proposal.id,
        action,
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        userRoles: ctx.roles,
        reviewerFeedback,
        approvedDispatchChannel,
        isTrustedServerContext: true,
      },
    );

    // 4. Persist updated decision in PostgreSQL
    await repository.updateProposalDecision({
      organizationId: ctx.organizationId,
      proposalId: proposal.id,
      status: updated.status as any,
      approvedByUserId: updated.approvedByUserId,
      approvedAt: updated.approvedAt ? new Date(updated.approvedAt) : null,
      reviewerFeedback: updated.reviewerFeedback,
      dispatchChannel: updated.dispatchChannel as any,
    });

    // 5. Audit Log in agent_executions
    await repository.logAgentExecution({
      organizationId: ctx.organizationId,
      agentType: "proposal_generator" as any,
      status: "completed",
      inputPayload: { proposalId: proposal.id, action, reviewerId: ctx.userId },
      outputPayload: {
        newStatus: updated.status,
        approvedByUserId: updated.approvedByUserId,
        approvedAt: updated.approvedAt,
        feedback: updated.reviewerFeedback,
      },
      durationMs: 15,
      tokensUsed: 0,
      costEstimate: 0,
    });

    return NextResponse.json({
      success: true,
      status: updated.status,
      approvedByUserId: updated.approvedByUserId,
      approvedAt: updated.approvedAt,
      reviewerFeedback: updated.reviewerFeedback,
    });
  } catch (error: any) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:proposal:approval:POST]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process proposal approval decision" },
      { status: 500 },
    );
  }
}
