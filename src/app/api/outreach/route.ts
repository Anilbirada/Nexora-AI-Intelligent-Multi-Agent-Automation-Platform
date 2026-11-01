import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/outreach
 * Retrieves all outreach messages and status metrics for the organization.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireOrgContext(request);
    const repository = new PostgresProjectRepository();

    const { searchParams } = new URL(request.url);
    const filterChannel = searchParams.get("channel") || undefined;
    const filterStatus = searchParams.get("status") || undefined;
    const filterOpportunity = searchParams.get("opportunityId") || undefined;

    const rows = await repository.getOutreachMessages(ctx.organizationId, {
      channel: filterChannel,
      status: filterStatus,
      opportunityId: filterOpportunity,
    });

    const messages = rows.map((r) => ({
      id: r.message.id,
      opportunityId: r.message.opportunityId,
      opportunityTitle: r.opportunity.title,
      category: r.opportunity.category,
      clientName: r.opportunity.clientName || "Confidential",
      clientCompany: r.message.recipientCompany || "your organization",
      proposalId: r.message.proposalId,
      proposalTitle: r.proposal.title,
      proposalVersion: r.proposal.version,
      channel: r.message.channel,
      status: r.message.status,
      version: r.message.version,
      subject: r.message.subject,
      body: r.message.body,
      recipientName: r.message.recipientName,
      recipientContact: r.message.recipientContact,
      approvedByUserId: r.message.approvedByUserId,
      approvedAt: r.message.approvedAt,
      reviewerFeedback: r.message.reviewerFeedback,
      activityHistory: r.message.activityHistory,
      scheduledFor: r.message.scheduledFor,
      sentAt: r.message.sentAt,
      failedReason: r.message.failedReason,
      createdAt: r.message.createdAt,
      updatedAt: r.message.updatedAt,
    }));

    // Status aggregation
    const counts = {
      total: messages.length,
      drafts: messages.filter((m) => m.status === "draft").length,
      pendingApproval: messages.filter((m) => m.status === "pending_approval").length,
      approved: messages.filter((m) => m.status === "approved").length,
      rejected: messages.filter((m) => m.status === "rejected").length,
      revisionRequested: messages.filter((m) => m.status === "revision_requested").length,
      scheduled: messages.filter((m) => m.status === "scheduled").length,
      sent: messages.filter((m) => m.status === "sent").length,
      failed: messages.filter((m) => m.status === "failed").length,
      cancelled: messages.filter((m) => m.status === "cancelled").length,
    };

    // Channel breakdown
    const channelCounts = {
      email: messages.filter((m) => m.channel === "email").length,
      linkedin: messages.filter((m) => m.channel === "linkedin").length,
      whatsapp: messages.filter((m) => m.channel === "whatsapp").length,
    };

    return NextResponse.json({
      counts,
      channelCounts,
      messages,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:outreach:GET]", error);
    return NextResponse.json({ error: "Failed to fetch outreach messages" }, { status: 500 });
  }
}
