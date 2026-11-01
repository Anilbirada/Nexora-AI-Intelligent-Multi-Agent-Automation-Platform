import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { isAnilAuthorizedAccount } from "@/lib/projects/agents/outreach/approval-gate";
import type { UnifiedApprovalItem } from "@/lib/projects/agents/project-manager/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/project-manager/approvals
 * Retrieves all items across proposals, outreach, and follow-ups awaiting human approval.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireOrgContext(request);
    const repo = new PostgresProjectRepository();

    const unified = await repo.getUnifiedPendingApprovals(ctx.organizationId);

    const items: UnifiedApprovalItem[] = [];

    // Map pending proposals
    for (const row of unified.proposals) {
      const p = row.proposal;
      const opp = row.opportunity;
      const hoursOld = Math.round((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 3600));

      items.push({
        id: p.id,
        type: "proposal",
        opportunityId: opp.id,
        clientName: opp.clientName || "Discovered Client",
        title: p.title,
        version: p.version,
        priority: row.score && row.score.overallScore >= 85 ? "urgent" : "high",
        score: row.score ? row.score.overallScore : null,
        budgetFormatted: p.totalCostEstimate ? `${p.currency} ${p.totalCostEstimate}` : null,
        pendingAgeHours: hoursOld,
        recommendedNextAction: "Review executive summary and milestone breakdown, then approve for Agent 6 outreach drafting.",
        summaryOrPreview: p.executiveSummary.slice(0, 160) + "...",
        submittedAt: p.createdAt,
        status: p.status,
      });
    }

    // Map pending outreach drafts
    for (const row of unified.outreachMessages) {
      const m = row.message;
      const opp = row.opportunity;
      const hoursOld = Math.round((Date.now() - new Date(m.createdAt).getTime()) / (1000 * 3600));

      items.push({
        id: m.id,
        type: "outreach",
        opportunityId: opp.id,
        clientName: opp.clientName || m.recipientName || "Discovered Client",
        title: `${m.channel.toUpperCase()} Outreach Draft (v${m.version})`,
        channel: m.channel,
        version: m.version,
        priority: "normal",
        pendingAgeHours: hoursOld,
        recommendedNextAction: "Review draft personalization and tone. Approve to queue for scheduled dispatch.",
        summaryOrPreview: m.body.slice(0, 160) + "...",
        submittedAt: m.createdAt,
        status: m.status,
      });
    }

    // Map pending follow-up tasks
    for (const row of unified.followupTasks) {
      const t = row.task;
      const opp = row.opportunity;
      const hoursOld = Math.round((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 3600));

      items.push({
        id: t.id,
        type: "followup",
        opportunityId: opp.id,
        clientName: opp.clientName || "Discovered Client",
        title: `Step ${t.stepNumber} Follow-up (${t.channel.toUpperCase()})`,
        channel: t.channel,
        version: t.version,
        priority: t.stepNumber === 1 ? "normal" : "high",
        pendingAgeHours: hoursOld,
        recommendedNextAction: "Review cadence follow-up message before client delivery.",
        summaryOrPreview: (t.body || "Follow-up message").slice(0, 160) + "...",
        submittedAt: t.createdAt,
        status: t.status,
      });
    }

    return NextResponse.json({
      totalCount: items.length,
      items,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:project-manager:approvals:GET]", error);
    return NextResponse.json({ error: "Failed to retrieve pending approvals" }, { status: 500 });
  }
}

/**
 * POST /api/project-manager/approvals
 * Applies human approval/rejection decision.
 *
 * SECURITY RULE:
 * Only Anil's verified account (anil@nexgen.ai) can approve.
 * Ordinary admins or members receive HTTP 403 Forbidden.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireOrgContext(request);
    const body = await request.json().catch(() => ({}));

    // 1. Strict Server-Side Identity Check
    const isAnil = isAnilAuthorizedAccount({
      userId: ctx.userId,
      userEmail: ctx.userEmail,
    });

    if (!isAnil) {
      return NextResponse.json(
        {
          error: `Authorization Denied: Only Anil's authenticated account (anil@nexgen.ai) can authorize commercial items. User (${ctx.userEmail}) is not authorized. Ordinary admins or members cannot approve on his behalf.`,
        },
        { status: 403 },
      );
    }

    const { itemId, itemType, action, reviewerFeedback } = body;
    if (!itemId || !itemType || !action) {
      return NextResponse.json(
        { error: "Missing required fields: itemId, itemType, and action are required." },
        { status: 400 },
      );
    }

    const repo = new PostgresProjectRepository();

    if (itemType === "proposal") {
      await repo.updateProposalApproval({
        organizationId: ctx.organizationId,
        proposalId: itemId,
        status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "revision_requested",
        approvedByUserId: action === "approve" ? ctx.userId : undefined,
        reviewerFeedback: reviewerFeedback || `Decision ${action} by Anil.`,
      });
    } else if (itemType === "outreach") {
      await repo.updateOutreachMessageApproval({
        organizationId: ctx.organizationId,
        messageId: itemId,
        status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "revision_requested",
        approvedByUserId: action === "approve" ? ctx.userId : undefined,
        reviewerFeedback: reviewerFeedback || `Decision ${action} by Anil.`,
        activityEvent: {
          action: "approval_decision",
          performedByUserId: ctx.userId,
          performedByUserEmail: ctx.userEmail,
          timestamp: new Date().toISOString(),
          notes: reviewerFeedback || `Decision ${action} by Anil.`,
        },
      });
    } else if (itemType === "followup") {
      await repo.updateFollowupTaskApproval({
        organizationId: ctx.organizationId,
        taskId: itemId,
        status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending_approval",
        approvedByUserId: action === "approve" ? ctx.userId : undefined,
        reviewerFeedback: reviewerFeedback || `Decision ${action} by Anil.`,
        activityEvent: {
          action: "approval_decision",
          performedByUserId: ctx.userId,
          timestamp: new Date().toISOString(),
          notes: reviewerFeedback || `Decision ${action} by Anil.`,
        },
      });
    } else {
      return NextResponse.json({ error: `Unknown itemType: ${itemType}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Item ${itemId} (${itemType}) successfully ${action}d by Anil.`,
      approvedBy: ctx.userEmail,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:project-manager:approvals:POST]", error);
    return NextResponse.json({ error: "Failed to apply approval decision" }, { status: 500 });
  }
}
