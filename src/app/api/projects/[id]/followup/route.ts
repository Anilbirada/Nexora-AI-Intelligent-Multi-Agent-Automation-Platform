import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { FollowupOrchestrator } from "@/lib/projects/agents/followup/followup-orchestrator";
import { ResponseMonitor } from "@/lib/projects/agents/followup/response-monitor";
import type { OutreachChannel } from "@/lib/projects/schema";

const repo = new PostgresProjectRepository();
const orchestrator = new FollowupOrchestrator();

/**
 * GET /api/projects/[id]/followup
 * Retrieves follow-up sequence, scheduled tasks, responses, and channel integration status.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const organizationId =
      session?.session?.activeOrganizationId ||
      req.headers.get("x-organization-id") ||
      "org-nexgen-default";

    const { id: opportunityId } = await params;

    const sequence = await repo.getFollowupSequenceByOpportunity(organizationId, opportunityId);
    let tasks: any[] = [];
    if (sequence) {
      tasks = await repo.getFollowupTasks(organizationId, sequence.id);
    }

    const responses = await repo.getClientResponses(organizationId, opportunityId);

    // Channel integration status reporting (zero simulated live connections)
    const channelIntegrations = {
      email: ResponseMonitor.getIntegrationStatus("email"),
      linkedin: ResponseMonitor.getIntegrationStatus("linkedin"),
      whatsapp: ResponseMonitor.getIntegrationStatus("whatsapp"),
    };

    return NextResponse.json({
      exists: Boolean(sequence),
      sequence,
      tasks,
      responses,
      channelIntegrations,
      externalDispatchLocked: process.env.ALLOW_EXTERNAL_OUTREACH !== "true",
    });
  } catch (err: any) {
    console.error("GET /api/projects/[id]/followup error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load follow-up sequence." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/projects/[id]/followup
 * Creates a follow-up sequence or generates a draft for a specific task step.
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

    const { id: opportunityId } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action || "create_sequence"; // "create_sequence" | "generate_draft"

    if (action === "create_sequence") {
      const channel = (body.channel || "email") as OutreachChannel;

      // 1. Verify approved outreach message exists
      const outreachRows = await repo.getOutreachMessagesByOpportunity(organizationId, opportunityId);
      const outreachMessage = outreachRows.find(
        (r) => r.message.channel === channel && r.message.status === "approved",
      );

      if (!outreachMessage) {
        return NextResponse.json(
          {
            error: `Prerequisite violated: No approved ${channel.toUpperCase()} outreach message found for this opportunity. Outreach must be approved by Anil first.`,
          },
          { status: 400 },
        );
      }

      // 2. Check if active sequence already exists
      const existingSequence = await repo.getFollowupSequenceByOpportunity(organizationId, opportunityId);
      if (existingSequence && existingSequence.status === "active") {
        return NextResponse.json(
          {
            error: `An active follow-up sequence already exists for this opportunity.`,
            sequence: existingSequence,
          },
          { status: 400 },
        );
      }

      // 3. Initialize sequence & schedule step 1
      const { sequence: newSeq, initialTask } = orchestrator.createSequence({
        organizationId,
        opportunityId,
        proposalId: outreachMessage.message.proposalId,
        outreachMessageId: outreachMessage.message.id,
        channel,
        clientContact: outreachMessage.message.recipientContact,
        clientTimezone: body.clientTimezone || "UTC",
        maxSteps: body.maxSteps || 3,
      });

      const savedSeq = await repo.createFollowupSequence({
        organizationId,
        opportunityId,
        proposalId: newSeq.proposalId,
        outreachMessageId: newSeq.outreachMessageId,
        channel: newSeq.channel,
        status: newSeq.status,
        currentStep: newSeq.currentStep,
        maxSteps: newSeq.maxSteps,
        nextFollowupDue: new Date(newSeq.nextFollowupDue!),
        clientContact: newSeq.clientContact,
        clientTimezone: newSeq.clientTimezone,
        activityHistory: newSeq.activityHistory,
        metadata: newSeq.metadata,
      });

      const savedTask = await repo.createFollowupTask({
        organizationId,
        sequenceId: savedSeq.id,
        stepNumber: initialTask.stepNumber,
        channel: initialTask.channel,
        status: initialTask.status,
        dueAt: new Date(initialTask.dueAt),
        version: initialTask.version,
        activityHistory: initialTask.activityHistory,
      });

      return NextResponse.json({
        message: "Follow-up sequence created and Step 1 scheduled.",
        sequence: savedSeq,
        task: savedTask,
      });
    }

    if (action === "generate_draft") {
      const taskId = body.taskId;
      if (!taskId) {
        return NextResponse.json({ error: "Missing taskId for draft generation." }, { status: 400 });
      }

      const oppRecord = await repo.getOpportunityById(organizationId, opportunityId);
      if (!oppRecord) throw new Error("Opportunity record not found.");

      const sequence = await repo.getFollowupSequenceByOpportunity(organizationId, opportunityId);
      if (!sequence) throw new Error("Sequence record not found.");

      const tasks = await repo.getFollowupTasks(organizationId, sequence.id);
      const targetTask = tasks.find((t) => t.id === taskId);
      if (!targetTask) throw new Error("Follow-up task not found.");

      const outreachRows = await repo.getOutreachMessagesByOpportunity(organizationId, opportunityId);
      const outreachMsg = outreachRows.find((r) => r.message.id === sequence.outreachMessageId)?.message;

      const updatedTask = orchestrator.generateStepDraft(
        {
          ...targetTask,
          charCount: targetTask.charCount || 0,
          activityHistory: (targetTask.activityHistory as any) || [],
          metadata: (targetTask.metadata as any) || {},
        },
        {
          organizationId,
          opportunityId,
          projectTitle: oppRecord.opportunity.title,
          clientName: oppRecord.opportunity.clientName,
          channel: targetTask.channel as OutreachChannel,
          stepNumber: targetTask.stepNumber,
          previousOutreachSubject: outreachMsg?.subject,
          previousOutreachBody: outreachMsg?.body,
          revisionFeedback: body.revisionFeedback,
          version: targetTask.version,
        },
      );

      const saved = await repo.updateFollowupTaskDraft({
        organizationId,
        taskId: targetTask.id,
        subject: updatedTask.subject,
        body: updatedTask.body,
        status: updatedTask.status,
        activityEvent: updatedTask.activityHistory[updatedTask.activityHistory.length - 1],
      });

      return NextResponse.json({
        message: `Step ${targetTask.stepNumber} draft generated. Pending Anil's approval.`,
        task: saved,
      });
    }

    return NextResponse.json({ error: `Unrecognized action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/projects/[id]/followup error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process follow-up request." },
      { status: 500 },
    );
  }
}
