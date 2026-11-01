/**
 * NEXGEN GLOBAL AI — Agent 7 Follow-up Orchestrator
 *
 * Coordinates end-to-end follow-up lifecycles:
 * - Sequence initialization and scheduling
 * - Task generation and versioning
 * - Response ingestion and immediate stop conditions
 * - Strict Anil Human Approval Gate
 * - Zero autonomous sending (ALLOW_EXTERNAL_OUTREACH safety guard)
 */

import { isAnilAuthorizedAccount } from "../outreach/approval-gate";
import { FollowupScheduler } from "./scheduler";
import { ResponseMonitor, type InboundResponseInput } from "./response-monitor";
import { FollowupMessageGenerator } from "./followup-generator";
import type {
  FollowupSequenceRecord,
  FollowupTaskRecord,
  ClientResponseRecord,
  FollowupGenerationInput,
  FollowupActivityEvent,
  OutreachChannel,
} from "./types";

export class FollowupOrchestrator {
  private monitor = new ResponseMonitor();

  /**
   * Initializes a new follow-up sequence for an approved outreach communication.
   */
  public createSequence(params: {
    organizationId: string;
    opportunityId: string;
    proposalId: string;
    outreachMessageId: string;
    channel: OutreachChannel;
    clientContact?: string | null;
    clientTimezone?: string;
    maxSteps?: number;
  }): {
    sequence: FollowupSequenceRecord;
    initialTask: FollowupTaskRecord;
  } {
    const sequenceId = `seq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const maxSteps = params.maxSteps || FollowupScheduler.DEFAULT_CONFIG.maxSteps;
    const now = new Date();

    const nextDueDate = FollowupScheduler.calculateDueDate(1, now, {
      clientTimezone: params.clientTimezone || "UTC",
    });

    const sequence: FollowupSequenceRecord = {
      id: sequenceId,
      organizationId: params.organizationId,
      opportunityId: params.opportunityId,
      proposalId: params.proposalId,
      outreachMessageId: params.outreachMessageId,
      channel: params.channel,
      status: "active",
      currentStep: 1,
      maxSteps,
      nextFollowupDue: nextDueDate,
      lastContactedAt: now,
      clientContact: params.clientContact || null,
      clientTimezone: params.clientTimezone || "UTC",
      pauseReason: null,
      pausedAt: null,
      completedAt: null,
      activityHistory: [
        {
          action: "sequence_started",
          performedByUserId: "system:followup_orchestrator",
          timestamp: now.toISOString(),
          notes: `Follow-up cadence initialized for ${params.channel.toUpperCase()} (Max steps: ${maxSteps}). Step 1 due: ${nextDueDate.toISOString()}`,
        },
      ],
      metadata: {
        schedulerConfig: {
          stepIntervals: FollowupScheduler.DEFAULT_CONFIG.stepIntervalsBusinessDays,
          maxSteps,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    const initialTask: FollowupTaskRecord = {
      id: `task-${Date.now()}-1`,
      organizationId: params.organizationId,
      sequenceId,
      stepNumber: 1,
      channel: params.channel,
      status: "scheduled",
      version: 1,
      dueAt: nextDueDate,
      subject: null,
      body: null,
      charCount: 0,
      approvedByUserId: null,
      approvedAt: null,
      rejectionReason: null,
      revisionFeedback: null,
      activityHistory: [
        {
          action: "task_scheduled",
          performedByUserId: "system:followup_orchestrator",
          timestamp: now.toISOString(),
          notes: `Step 1 scheduled for ${nextDueDate.toISOString()}`,
        },
      ],
      sentAt: null,
      failedReason: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    return { sequence, initialTask };
  }

  /**
   * Generates a follow-up draft for a scheduled step.
   */
  public generateStepDraft(
    task: FollowupTaskRecord,
    input: FollowupGenerationInput,
  ): FollowupTaskRecord {
    const draftOutput = FollowupMessageGenerator.generateDraft({
      ...input,
      stepNumber: task.stepNumber,
      channel: task.channel,
      version: task.version,
    });

    const now = new Date().toISOString();
    const updatedHistory: FollowupActivityEvent[] = [
      ...(task.activityHistory || []),
      {
        action: "draft_generated",
        performedByUserId: "system:followup_generator",
        timestamp: now,
        notes: `Generated Step ${task.stepNumber} draft v${task.version} (${draftOutput.charCount} chars). Pending Anil's approval.`,
      },
    ];

    return {
      ...task,
      status: "pending_approval",
      subject: draftOutput.subject,
      body: draftOutput.body,
      charCount: draftOutput.charCount,
      activityHistory: updatedHistory,
      metadata: {
        ...task.metadata,
        hasOptOutNotice: draftOutput.hasOptOutNotice,
        callToAction: draftOutput.callToAction,
      },
      updatedAt: new Date(now),
    };
  }

  /**
   * Anil Human Approval Gate for follow-up message drafts.
   */
  public processTaskApproval(
    task: FollowupTaskRecord,
    decision: {
      action: "approve" | "reject" | "request_revision";
      userId: string;
      userEmail?: string | null;
      userRoles?: string[];
      reviewerFeedback?: string;
      isAnilExplicit?: boolean;
      isTrustedServerContext?: boolean;
    },
  ): FollowupTaskRecord {
    // 1. Strict Server-Side Identity Verification
    const isAnil = isAnilAuthorizedAccount({
      userId: decision.userId,
      userEmail: decision.userEmail,
      userRoles: decision.userRoles,
      isAnilExplicit: decision.isAnilExplicit,
      isTrustedServerContext: decision.isTrustedServerContext,
    });

    if (!isAnil) {
      throw new Error(
        `Authorization Denied: Security violation: Only Anil's authenticated account can authorize follow-up communications. User (${decision.userEmail || decision.userId}) is not authorized. Ordinary admins or members cannot approve on his behalf.`,
      );
    }

    const timestamp = new Date().toISOString();
    const updatedHistory: FollowupActivityEvent[] = [
      ...(task.activityHistory || []),
      {
        action: "approval_decision",
        performedByUserId: decision.userId,
        performedByUserEmail: decision.userEmail || undefined,
        timestamp,
        notes: decision.reviewerFeedback || `Follow-up draft ${decision.action} by Anil.`,
      },
    ];

    if (decision.action === "approve") {
      return {
        ...task,
        status: "approved",
        approvedByUserId: decision.userId,
        approvedAt: new Date(timestamp),
        reviewerFeedback: decision.reviewerFeedback || null,
        activityHistory: updatedHistory,
        updatedAt: new Date(timestamp),
      };
    }

    if (decision.action === "reject") {
      return {
        ...task,
        status: "rejected",
        approvedByUserId: null,
        approvedAt: null,
        rejectionReason: decision.reviewerFeedback || "Draft rejected by reviewer",
        activityHistory: updatedHistory,
        updatedAt: new Date(timestamp),
      };
    }

    if (decision.action === "request_revision") {
      return {
        ...task,
        status: "revision_requested",
        approvedByUserId: null,
        approvedAt: null,
        revisionFeedback: decision.reviewerFeedback || "Revision requested by reviewer",
        activityHistory: updatedHistory,
        updatedAt: new Date(timestamp),
      };
    }

    throw new Error(`Unrecognized follow-up approval action: ${(decision as { action: string }).action}`);
  }

  /**
   * Ingests a client response and applies immediate stop conditions.
   */
  public handleInboundResponse(
    sequence: FollowupSequenceRecord,
    input: InboundResponseInput,
    pendingTasks: FollowupTaskRecord[] = [],
  ): {
    updatedSequence: FollowupSequenceRecord;
    cancelledTasks: FollowupTaskRecord[];
    responseRecord: ClientResponseRecord;
  } {
    const { response, classification, isOptOut } = this.monitor.ingestResponse(input);
    const now = new Date().toISOString();

    // 1. Determine updated sequence status
    const newStatus = isOptOut ? "opted_out" : "response_received";
    const pauseReason = isOptOut
      ? "Client explicitly requested opt-out / unsubscribe."
      : `Client response received (${classification.classification}). Follow-up sequence halted for review.`;

    const updatedSequence: FollowupSequenceRecord = {
      ...sequence,
      status: newStatus,
      pauseReason,
      pausedAt: new Date(now),
      activityHistory: [
        ...(sequence.activityHistory || []),
        {
          action: isOptOut ? "client_opted_out" : "client_responded",
          performedByUserId: "system:response_monitor",
          timestamp: now,
          notes: pauseReason,
          metadata: {
            classification: classification.classification,
            confidence: classification.confidence,
            explanation: classification.explanation,
          },
        },
      ],
      updatedAt: new Date(now),
    };

    // 2. Cancel pending tasks immediately
    const cancelledTasks = pendingTasks.map((t) => {
      if (t.status === "scheduled" || t.status === "pending_approval" || t.status === "draft_generated") {
        return {
          ...t,
          status: "cancelled" as const,
          rejectionReason: `Auto-cancelled: ${pauseReason}`,
          activityHistory: [
            ...(t.activityHistory || []),
            {
              action: "task_cancelled",
              performedByUserId: "system:response_monitor",
              timestamp: now,
              notes: `Task cancelled due to inbound client response.`,
            },
          ],
          updatedAt: new Date(now),
        };
      }
      return t;
    });

    return {
      updatedSequence,
      cancelledTasks,
      responseRecord: response,
    };
  }

  /**
   * Pauses an active sequence.
   */
  public pauseSequence(
    sequence: FollowupSequenceRecord,
    reason: string,
    userId: string,
  ): FollowupSequenceRecord {
    const now = new Date().toISOString();
    return {
      ...sequence,
      status: "paused",
      pauseReason: reason,
      pausedAt: new Date(now),
      activityHistory: [
        ...(sequence.activityHistory || []),
        {
          action: "sequence_paused",
          performedByUserId: userId,
          timestamp: now,
          notes: `Sequence paused by user: ${reason}`,
        },
      ],
      updatedAt: new Date(now),
    };
  }

  /**
   * Resumes a paused sequence.
   */
  public resumeSequence(
    sequence: FollowupSequenceRecord,
    userId: string,
  ): FollowupSequenceRecord {
    const now = new Date().toISOString();
    return {
      ...sequence,
      status: "active",
      pauseReason: null,
      pausedAt: null,
      activityHistory: [
        ...(sequence.activityHistory || []),
        {
          action: "sequence_resumed",
          performedByUserId: userId,
          timestamp: now,
          notes: `Sequence resumed by user.`,
        },
      ],
      updatedAt: new Date(now),
    };
  }

  /**
   * Cancels a sequence.
   */
  public cancelSequence(
    sequence: FollowupSequenceRecord,
    reason: string,
    userId: string,
  ): FollowupSequenceRecord {
    const now = new Date().toISOString();
    return {
      ...sequence,
      status: "cancelled",
      pauseReason: reason,
      activityHistory: [
        ...(sequence.activityHistory || []),
        {
          action: "sequence_cancelled",
          performedByUserId: userId,
          timestamp: now,
          notes: `Sequence cancelled: ${reason}`,
        },
      ],
      updatedAt: new Date(now),
    };
  }

  /**
   * Safety guard blocking external dispatch.
   */
  public static assertDispatchPreconditions(task: {
    status: string;
    approvedByUserId?: string | null;
    approvedAt?: Date | string | null;
  }): void {
    if (process.env.ALLOW_EXTERNAL_OUTREACH !== "true") {
      throw new Error(
        "Follow-up dispatch blocked: External outreach dispatch is permanently locked by default. Set ALLOW_EXTERNAL_OUTREACH=true to enable.",
      );
    }

    if (task.status !== "approved") {
      throw new Error(
        `Follow-up dispatch blocked: Task status is '${task.status}'. Requires an 'approved' state by Anil.`,
      );
    }

    if (!task.approvedByUserId || !task.approvedAt) {
      throw new Error(
        "Follow-up dispatch blocked: Task lacks valid approval timestamp or approver user ID.",
      );
    }
  }

  public assertDispatchPreconditions(task: {
    status: string;
    approvedByUserId?: string | null;
    approvedAt?: Date | string | null;
  }): void {
    FollowupOrchestrator.assertDispatchPreconditions(task);
  }
}
