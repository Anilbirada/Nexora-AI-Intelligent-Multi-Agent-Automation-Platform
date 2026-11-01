import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { FollowupOrchestrator } from "@/lib/projects/agents/followup/followup-orchestrator";
import type { OutreachChannel } from "@/lib/projects/schema";

const repo = new PostgresProjectRepository();
const orchestrator = new FollowupOrchestrator();

/**
 * POST /api/projects/[id]/followup/response
 * Ingests a client response (manual recording or inbound integration).
 * Enforces provider message ID idempotency, classifies sentiment, and triggers immediate stop conditions.
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
    const body = await req.json();

    if (!body.content || !body.senderContact) {
      return NextResponse.json(
        { error: "Missing required response fields: 'content' and 'senderContact'." },
        { status: 400 },
      );
    }

    const channel = (body.channel || "email") as OutreachChannel;
    const providerMessageId =
      body.providerMessageId || `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const sequence = await repo.getFollowupSequenceByOpportunity(organizationId, opportunityId);
    const tasks = sequence ? await repo.getFollowupTasks(organizationId, sequence.id) : [];

    // 1. Process response through orchestrator
    const { updatedSequence, cancelledTasks, responseRecord } = orchestrator.handleInboundResponse(
      sequence
        ? {
            ...sequence,
            channel: sequence.channel as OutreachChannel,
            activityHistory: (sequence.activityHistory as any) || [],
            metadata: (sequence.metadata as any) || {},
          }
        : ({
            id: `seq-adhoc-${opportunityId}`,
            organizationId,
            opportunityId,
            proposalId: "",
            outreachMessageId: "",
            channel,
            status: "active",
            currentStep: 1,
            maxSteps: 3,
            activityHistory: [],
            metadata: {},
          } as any),
      {
        organizationId,
        opportunityId,
        sequenceId: sequence?.id,
        channel,
        providerMessageId,
        senderContact: body.senderContact,
        recipientContact: body.recipientContact,
        subject: body.subject,
        content: body.content,
        isManual: body.isManual !== undefined ? body.isManual : true,
      },
      tasks as any,
    );

    // 2. Persist response in database
    const savedResponse = await repo.saveClientResponse({
      organizationId,
      opportunityId,
      sequenceId: sequence?.id,
      channel,
      providerMessageId,
      senderContact: responseRecord.senderContact,
      recipientContact: responseRecord.recipientContact,
      subject: responseRecord.subject,
      content: responseRecord.content,
      isManual: responseRecord.isManual,
      classification: responseRecord.classification,
      confidence: responseRecord.confidence,
      explanation: responseRecord.explanation,
      evidence: responseRecord.evidence,
      recommendedAction: responseRecord.recommendedAction,
      metadata: responseRecord.metadata,
    });

    // 3. Update sequence status and cancel pending tasks if sequence exists
    if (sequence) {
      await repo.updateFollowupSequenceStatus({
        organizationId,
        sequenceId: sequence.id,
        status: updatedSequence.status,
        pauseReason: updatedSequence.pauseReason,
        activityEvent: updatedSequence.activityHistory[updatedSequence.activityHistory.length - 1],
      });

      for (const t of cancelledTasks) {
        if (t.status === "cancelled") {
          await repo.updateFollowupTaskDraft({
            organizationId,
            taskId: t.id,
            status: "cancelled",
            activityEvent: t.activityHistory[t.activityHistory.length - 1],
          });
        }
      }
    }

    return NextResponse.json({
      message: "Client response successfully recorded and analyzed.",
      response: savedResponse,
      classification: {
        category: responseRecord.classification,
        confidence: responseRecord.confidence,
        explanation: responseRecord.explanation,
        recommendedAction: responseRecord.recommendedAction,
        isOptOut: responseRecord.metadata?.isOptOut,
      },
      immediateStopApplied: true,
      sequenceStatus: updatedSequence.status,
    });
  } catch (err: any) {
    console.error("POST /api/projects/[id]/followup/response error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to record client response." },
      { status: 500 },
    );
  }
}
