import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/outreach/[id]
 * Retrieves details, audit history, and proposal context for a specific outreach message.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;
    const ctx = await requireOrgContext(request);
    const repository = new PostgresProjectRepository();

    const record = await repository.getOutreachMessageById(ctx.organizationId, messageId);
    if (!record) {
      return NextResponse.json({ error: "Outreach message not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: record.message,
      opportunity: record.opportunity,
      proposal: record.proposal,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:outreach:[id]:GET]", error);
    return NextResponse.json({ error: "Failed to retrieve outreach message" }, { status: 500 });
  }
}

/**
 * PATCH /api/outreach/[id]
 * Updates subject or body of an outreach draft before approval.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;
    const ctx = await requireOrgContext(request);
    const repository = new PostgresProjectRepository();

    const existing = await repository.getOutreachMessageById(ctx.organizationId, messageId);
    if (!existing) {
      return NextResponse.json({ error: "Outreach message not found" }, { status: 404 });
    }

    // Editable only when in draft, pending_approval, or revision_requested
    const editableStatuses = ["draft", "pending_approval", "revision_requested"];
    if (!editableStatuses.includes(existing.message.status)) {
      return NextResponse.json(
        {
          error: `Cannot edit outreach message with status '${existing.message.status}'. Only drafts, pending, or revision-requested messages may be modified.`,
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const newSubject = body?.subject !== undefined ? body.subject : undefined;
    const newBody = body?.body as string | undefined;

    if (!newBody || typeof newBody !== "string" || newBody.trim().length === 0) {
      return NextResponse.json({ error: "Message body cannot be empty" }, { status: 400 });
    }

    const updated = await repository.updateOutreachDraft({
      organizationId: ctx.organizationId,
      messageId,
      subject: newSubject,
      body: newBody.trim(),
      activityEvent: {
        action: "edited",
        performedByUserId: ctx.userId,
        performedByUserEmail: ctx.userEmail,
        timestamp: new Date().toISOString(),
        notes: "Draft content modified by reviewer",
      },
    });

    return NextResponse.json({
      success: true,
      message: updated,
    });
  } catch (error: any) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:outreach:[id]:PATCH]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update outreach draft" },
      { status: 500 },
    );
  }
}
