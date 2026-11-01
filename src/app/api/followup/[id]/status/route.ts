import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { FollowupOrchestrator } from "@/lib/projects/agents/followup/followup-orchestrator";

const repo = new PostgresProjectRepository();
const orchestrator = new FollowupOrchestrator();

/**
 * PATCH /api/followup/[id]/status
 * Updates follow-up sequence lifecycle status (pause, resume, cancel).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const organizationId =
      session?.session?.activeOrganizationId ||
      req.headers.get("x-organization-id") ||
      "org-nexgen-default";

    const { id: sequenceId } = await params;
    const body = await req.json();

    const action = body.action as "pause" | "resume" | "cancel";
    if (!action || !["pause", "resume", "cancel"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Allowed: 'pause', 'resume', 'cancel'." },
        { status: 400 },
      );
    }

    const sequence = await repo.getFollowupSequenceById(organizationId, sequenceId);
    if (!sequence) {
      return NextResponse.json({ error: "Follow-up sequence not found." }, { status: 404 });
    }

    const userId = session?.user?.email || req.headers.get("x-user-email") || "user:system";
    let updatedSeq: any;

    const seqTyped = {
      ...sequence,
      channel: sequence.channel as any,
      activityHistory: (sequence.activityHistory as any) || [],
      metadata: (sequence.metadata as any) || {},
    };

    if (action === "pause") {
      updatedSeq = orchestrator.pauseSequence(seqTyped, body.reason || "Manual pause by user", userId);
    } else if (action === "resume") {
      updatedSeq = orchestrator.resumeSequence(seqTyped, userId);
    } else {
      updatedSeq = orchestrator.cancelSequence(seqTyped, body.reason || "Cancelled by user", userId);
    }

    const saved = await repo.updateFollowupSequenceStatus({
      organizationId,
      sequenceId,
      status: updatedSeq.status,
      pauseReason: updatedSeq.pauseReason,
      activityEvent: updatedSeq.activityHistory[updatedSeq.activityHistory.length - 1],
    });

    return NextResponse.json({
      message: `Follow-up sequence ${action}d successfully.`,
      sequence: saved,
    });
  } catch (err: any) {
    console.error("PATCH /api/followup/[id]/status error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update sequence status." },
      { status: 500 },
    );
  }
}
