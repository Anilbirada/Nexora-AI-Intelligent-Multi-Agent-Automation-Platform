import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/proposals
 * Retrieves all technical proposals and their status metrics for the organization.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireOrgContext(request);
    const repository = new PostgresProjectRepository();

    const { searchParams } = new URL(request.url);
    const filterStatus = searchParams.get("status") || undefined;

    const rows = await repository.getProposals(ctx.organizationId, filterStatus);

    const proposals = rows.map((r) => ({
      id: r.proposal.id,
      opportunityId: r.proposal.opportunityId,
      opportunityTitle: r.opportunity.title,
      category: r.opportunity.category,
      clientName: r.opportunity.clientName || "Confidential",
      version: r.proposal.version,
      title: r.proposal.title,
      executiveSummary: r.proposal.executiveSummary,
      totalCostEstimate: r.proposal.totalCostEstimate ? Number(r.proposal.totalCostEstimate) : null,
      estimatedDurationWeeks: r.proposal.estimatedDurationWeeks ? Number(r.proposal.estimatedDurationWeeks) : null,
      currency: r.proposal.currency,
      status: r.proposal.status,
      approvedByUserId: r.proposal.approvedByUserId,
      approvedAt: r.proposal.approvedAt,
      reviewerFeedback: r.proposal.reviewerFeedback,
      createdAt: r.proposal.createdAt,
      updatedAt: r.proposal.updatedAt,
    }));

    // Status aggregation
    const counts = {
      total: proposals.length,
      pendingApproval: proposals.filter((p) => p.status === "pending_approval").length,
      approved: proposals.filter((p) => p.status === "approved").length,
      rejected: proposals.filter((p) => p.status === "rejected").length,
      revisionRequested: proposals.filter((p) => p.status === "revision_requested").length,
      dispatched: proposals.filter((p) => p.status === "dispatched").length,
    };

    return NextResponse.json({
      counts,
      proposals,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:proposals:GET]", error);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}
