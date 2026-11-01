import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { isAnilAuthorizedAccount } from "@/lib/projects/agents/orchestrator";
import { OutreachApprovalGate } from "@/lib/projects/agents/outreach/approval-gate";
import type { OutreachActivityEvent } from "@/lib/projects/schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/outreach/[id]/approval
 *
 * HUMAN APPROVAL GATE — STRICT SECURITY POLICY:
 * Only Anil's authenticated account (anil@nexgen.ai) can authorize, reject,
 * or request revisions on client outreach messages.
 * Ordinary members or non-Anil admins are strictly blocked with 403 Forbidden.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;
    const ctx = await requireOrgContext(request);
    const repository = new PostgresProjectRepository();

    const body = await request.json();
    const action = body?.action as "approve" | "reject" | "request_revision";
    const reviewerFeedback = body?.reviewerFeedback as string | undefined;
    const scheduledFor = body?.scheduledFor ? new Date(body.scheduledFor) : undefined;

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
      userRoles: ctx.roles,
    });

    if (!isAnil) {
      return NextResponse.json(
        {
          error: `Authorization Denied: Only Anil's authenticated account can authorize outreach communications. User (${ctx.userEmail}) is not authorized. Ordinary admins or members cannot approve on his behalf.`,
        },
        { status: 403 },
      );
    }

    // 2. Fetch Message
    const existing = await repository.getOutreachMessageById(ctx.organizationId, messageId);
    if (!existing) {
      return NextResponse.json({ error: "Outreach message not found." }, { status: 404 });
    }

    // 3. Apply state transition via OutreachApprovalGate
    const updated = OutreachApprovalGate.applyDecision(
      {
        id: existing.message.id,
        organizationId: existing.message.organizationId,
        opportunityId: existing.message.opportunityId,
        proposalId: existing.message.proposalId,
        channel: existing.message.channel,
        status: existing.message.status as any,
        version: existing.message.version,
        subject: existing.message.subject,
        body: existing.message.body,
        charCount: existing.message.body.length,
        recipientName: existing.message.recipientName,
        recipientContact: existing.message.recipientContact,
        recipientCompany: existing.message.recipientCompany || "your organization",
        personalizationContext: existing.message.personalizationContext as any,
        approvedByUserId: existing.message.approvedByUserId,
        approvedAt: existing.message.approvedAt,
        reviewerFeedback: existing.message.reviewerFeedback,
        activityHistory: (existing.message.activityHistory as OutreachActivityEvent[]) || [],
        scheduledFor: existing.message.scheduledFor,
        sentAt: existing.message.sentAt,
        metadata: existing.message.metadata as any,
      },
      {
        messageId: existing.message.id,
        action,
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        userRoles: ctx.roles,
        reviewerFeedback,
        scheduledFor,
        isTrustedServerContext: true,
      },
    );

    // 4. Persist updated decision and activity log in PostgreSQL
    const lastActivity = updated.activityHistory[updated.activityHistory.length - 1];
    const saved = await repository.updateOutreachApprovalDecision({
      organizationId: ctx.organizationId,
      messageId: existing.message.id,
      status: updated.status,
      approvedByUserId: updated.approvedByUserId,
      approvedAt: updated.approvedAt ? new Date(updated.approvedAt) : null,
      reviewerFeedback: updated.reviewerFeedback,
      scheduledFor: updated.scheduledFor ? new Date(updated.scheduledFor) : null,
      activityEvent: lastActivity,
    });

    // 5. Audit Log in agent_executions
    await repository.logAgentExecution({
      organizationId: ctx.organizationId,
      agentType: "outreach_manager",
      status: "completed",
      inputPayload: {
        messageId: existing.message.id,
        channel: existing.message.channel,
        action,
        reviewerId: ctx.userId,
      },
      outputPayload: {
        newStatus: updated.status,
        approvedByUserId: updated.approvedByUserId,
        approvedAt: updated.approvedAt,
        reviewerFeedback: updated.reviewerFeedback,
      },
      durationMs: 12,
      tokensUsed: 0,
      costEstimate: 0,
    });

    return NextResponse.json({
      success: true,
      status: saved.status,
      approvedByUserId: saved.approvedByUserId,
      approvedAt: saved.approvedAt,
      reviewerFeedback: saved.reviewerFeedback,
      activityHistory: saved.activityHistory,
    });
  } catch (error: any) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:outreach:[id]:approval:POST]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process outreach approval decision" },
      { status: 500 },
    );
  }
}
