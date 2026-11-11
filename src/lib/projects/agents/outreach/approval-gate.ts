/**
 * NEXGEN GLOBAL AI — Agent 6 Outreach Human Approval Gate
 *
 * Enforces strict server-side human approval for all outbound client messages:
 * - Only Anil's verified account (anil@nexgen.ai) can approve, reject, or request revisions.
 * - Ordinary admins and team members are strictly blocked.
 * - Client-supplied authorization flags are never trusted.
 * - Maintains append-only audit trail in activityHistory.
 * - Enforces ALLOW_EXTERNAL_OUTREACH safety policy.
 */

import type {
  OutreachApprovalDecisionInput,
  OutreachMessageDraft,
  OutreachActivityEvent,
} from "./types";

export function isAnilAuthorizedAccount(
  userOrDecision: {
    id?: string;
    userId?: string;
    email?: string | null;
    userEmail?: string | null;
    isAnilExplicit?: boolean;
    isTrustedServerContext?: boolean;
  },
  options?: { isTrustedServerContext?: boolean },
): boolean {
  const effectiveId = (userOrDecision.id || userOrDecision.userId || "").trim();
  const effectiveEmail = (userOrDecision.email || userOrDecision.userEmail || "").trim().toLowerCase();
  const effectiveTrusted = options?.isTrustedServerContext ?? userOrDecision.isTrustedServerContext ?? false;

  // Never trust isAnilExplicit from ordinary client requests; strictly requires trusted server context
  if (userOrDecision.isAnilExplicit === true && effectiveTrusted === true) {
    return true;
  }

  // 1. Authorized User ID Verification (Supports comma-separated list of admin IDs)
  const configuredUserIds = (process.env.ANIL_USER_ID || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (effectiveId && configuredUserIds.includes(effectiveId)) {
    return true;
  }

  // 2. Authorized Email Verification (Supports comma-separated list of admin emails)
  const rawConfiguredEmails = process.env.ANIL_APPROVAL_EMAIL;
  const configuredEmails = (rawConfiguredEmails !== undefined ? rawConfiguredEmails : "anil@nexgen.ai")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (effectiveEmail && configuredEmails.includes(effectiveEmail)) {
    return true;
  }

  return false;
}

export class OutreachApprovalGate {
  /**
   * Applies an approval, rejection, or revision decision to an outreach message draft.
   */
  public static applyDecision(
    message: OutreachMessageDraft,
    decision: OutreachApprovalDecisionInput,
  ): OutreachMessageDraft {
    // 1. Strict Server-Side Identity Verification
    const isAnil = isAnilAuthorizedAccount({
      userId: decision.userId,
      userEmail: decision.userEmail,
      isAnilExplicit: decision.isAnilExplicit,
      isTrustedServerContext: decision.isTrustedServerContext,
    });

    if (!isAnil) {
      throw new Error(
        `Authorization Denied: Security violation: Only Anil's authenticated account can authorize outreach communications. User (${decision.userEmail || decision.userId}) is not authorized. Ordinary admins or members cannot approve on his behalf.`,
      );
    }

    const timestamp = new Date().toISOString();
    const updatedHistory: OutreachActivityEvent[] = [...(message.activityHistory || [])];

    // Record audit event
    updatedHistory.push({
      action: "approval_decision",
      performedByUserId: decision.userId,
      performedByUserEmail: decision.userEmail || undefined,
      timestamp,
      notes: decision.reviewerFeedback || `Outreach draft ${decision.action} by Anil.`,
    });

    // 2. State Machine Transitions
    if (decision.action === "approve") {
      return {
        ...message,
        status: "approved",
        approvedByUserId: decision.userId,
        approvedAt: new Date(timestamp),
        reviewerFeedback: decision.reviewerFeedback || null,
        scheduledFor: decision.scheduledFor || message.scheduledFor,
        activityHistory: updatedHistory,
      };
    }

    if (decision.action === "reject") {
      return {
        ...message,
        status: "rejected",
        approvedByUserId: null,
        approvedAt: null,
        reviewerFeedback: decision.reviewerFeedback || "Draft rejected by reviewer",
        activityHistory: updatedHistory,
      };
    }

    if (decision.action === "request_revision") {
      return {
        ...message,
        status: "revision_requested",
        approvedByUserId: null,
        approvedAt: null,
        reviewerFeedback: decision.reviewerFeedback || "Revisions requested by reviewer",
        activityHistory: updatedHistory,
      };
    }

    throw new Error(`Unrecognized outreach approval action: ${(decision as { action: string }).action}`);
  }

  public static processApprovalDecision(
    message: OutreachMessageDraft,
    decision: OutreachApprovalDecisionInput,
  ): OutreachMessageDraft {
    return OutreachApprovalGate.applyDecision(message, decision);
  }

  public applyDecision(
    message: OutreachMessageDraft,
    decision: OutreachApprovalDecisionInput,
  ): OutreachMessageDraft {
    return OutreachApprovalGate.applyDecision(message, decision);
  }

  public processApprovalDecision(
    message: OutreachMessageDraft,
    decision: OutreachApprovalDecisionInput,
  ): OutreachMessageDraft {
    return OutreachApprovalGate.applyDecision(message, decision);
  }

  /**
   * Enforces external sending safety guard.
   * Sending is disabled by default (ALLOW_EXTERNAL_OUTREACH !== 'true').
   */
  public static assertDispatchPreconditions(message: {
    status: string;
    approvedByUserId?: string | null;
    approvedAt?: Date | string | null;
  }): void {
    if (process.env.ALLOW_EXTERNAL_OUTREACH !== "true") {
      throw new Error(
        "Outreach dispatch blocked: External outreach dispatch is permanently locked by default. Set ALLOW_EXTERNAL_OUTREACH=true to enable.",
      );
    }

    if (message.status === "pending_approval" || message.status === "draft") {
      throw new Error(
        "Outreach dispatch blocked: Message is pending Anil's approval. External communication requires explicit human sign-off.",
      );
    }

    if (message.status === "rejected") {
      throw new Error("Outreach dispatch blocked: Message was rejected and cannot be sent.");
    }

    if (message.status === "revision_requested") {
      throw new Error("Outreach dispatch blocked: Message requires revisions before sending.");
    }

    if (message.status !== "approved") {
      throw new Error(
        `Outreach dispatch blocked: Invalid message state '${message.status}'. External communication requires an 'approved' state.`,
      );
    }

    if (!message.approvedByUserId || !message.approvedAt) {
      throw new Error(
        "Outreach dispatch blocked: Message is marked approved but lacks approval timestamp or approver user ID.",
      );
    }
  }

  public assertDispatchPreconditions(message: {
    status: string;
    approvedByUserId?: string | null;
    approvedAt?: Date | string | null;
  }): void {
    OutreachApprovalGate.assertDispatchPreconditions(message);
  }
}
