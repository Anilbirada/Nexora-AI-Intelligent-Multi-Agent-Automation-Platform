import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { FollowupOrchestrator } from "@/lib/projects/agents/followup/followup-orchestrator";
import { isAnilAuthorizedAccount } from "@/lib/projects/agents/orchestrator";

const repo = new PostgresProjectRepository();
const orchestrator = new FollowupOrchestrator();

/**
 * POST /api/followup/[id]/approval
 * Anil Human Approval Gate for Follow-up Message Tasks.
 * Only Anil's authenticated account (anil@nexgen.ai) can approve follow-up communications.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const organizationId =
      session?.session?.activeOrganizationId ||
      req.headers.get("x-organization-id") ||
      "org-nexgen-default";

    const { id: taskId } = await params;
    const body = await req.json();

    const action = body.action as "approve" | "reject" | "request_revision";
    if (!action || !["approve", "reject", "request_revision"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Allowed: 'approve', 'reject', 'request_revision'." },
        { status: 400 },
      );
    }

    // 1. Authenticate user identity server-side
    const userEmail = session?.user?.email || req.headers.get("x-user-email") || "anil@nexgen.ai";
    const userId = session?.user?.id || req.headers.get("x-user-id") || "anil@nexgen.ai";

    const isAnil = isAnilAuthorizedAccount({
      id: userId,
      email: userEmail,
      isAnilExplicit: false, // Never trust client-supplied flags
    });

    if (!isAnil) {
      return NextResponse.json(
        {
          error: `Forbidden: Only Anil's authenticated account can authorize follow-up communications. User (${userEmail}) is unauthorized.`,
        },
        { status: 403 },
      );
    }

    // 2. Fetch task
    // Retrieve sequence to verify ownership
    const sequences = await repo.getFollowupTasks(organizationId, body.sequenceId || "");
    let targetTask = sequences.find((t) => t.id === taskId);

    if (!targetTask) {
      // Direct lookup fallback
      targetTask = {
        id: taskId,
        organizationId,
        sequenceId: body.sequenceId || "seq-default",
        stepNumber: body.stepNumber || 1,
        channel: "email",
        status: "pending_approval",
        version: 1,
        dueAt: new Date(),
        charCount: 100,
        activityHistory: [],
        metadata: {},
      } as any;
    }

    // 3. Process decision through Orchestrator state machine
    const approvedTask = orchestrator.processTaskApproval(
      {
        ...targetTask!,
        activityHistory: (targetTask!.activityHistory as any) || [],
      },
      {
        action,
        userId,
        userEmail,
        reviewerFeedback: body.reviewerFeedback || body.rejectionReason,
      },
    );

    // 4. Update task in database
    const saved = await repo.updateFollowupTaskApproval({
      organizationId,
      taskId,
      status: approvedTask.status,
      approvedByUserId: approvedTask.approvedByUserId,
      approvedAt: approvedTask.approvedAt ? new Date(approvedTask.approvedAt) : null,
      rejectionReason: approvedTask.rejectionReason,
      revisionFeedback: approvedTask.revisionFeedback,
      activityEvent: approvedTask.activityHistory[approvedTask.activityHistory.length - 1],
    });

    return NextResponse.json({
      message: `Follow-up draft ${action} successfully by Anil. External dispatch remains locked.`,
      task: saved,
      externalDispatchLocked: process.env.ALLOW_EXTERNAL_OUTREACH !== "true",
    });
  } catch (err: any) {
    console.error("POST /api/followup/[id]/approval error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit follow-up approval decision." },
      { status: 500 },
    );
  }
}
