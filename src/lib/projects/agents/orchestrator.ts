import {
  DAILY_QUALIFIED_TARGET_QUOTA,
  QUALIFICATION_THRESHOLD_SCORE,
  calculateWeightedOverallScore,
  determineQualificationGrade,
  validateScoreFactors,
  type AgentType,
  type ProposalStatus,
} from "../contract";
import type {
  DailyOperationalMetrics,
  HunterExecutionResult,
  OpportunityScoringResult,
  OutreachDispatchInstruction,
  OutreachDispatchResult,
  ProjectAnalysisResult,
  ProposalGenerationResult,
} from "./types";

export type ProposalRecord = {
  id: string;
  opportunityId: string;
  organizationId: string;
  status: ProposalStatus;
  approvedByUserId?: string | null;
  approvedAt?: Date | string | null;
  reviewerFeedback?: string | null;
  dispatchChannel?: string | null;
};

export type ProposalApprovalDecision = {
  proposalId: string;
  action: "approve" | "reject" | "request_revision";
  userId: string;
  userEmail?: string;
  userRoles: string[]; // e.g. ["owner"], ["admin"], ["member"]
  isAnilExplicit?: boolean;
  isTrustedServerContext?: boolean; // Must be true for isAnilExplicit to be considered
  reviewerFeedback?: string;
  approvedDispatchChannel?: "email" | "linkedin" | "whatsapp" | "portal";
};

export function isAnilAuthorizedAccount(
  user: { id: string; email?: string | null; isAnilExplicit?: boolean },
  options?: { isTrustedServerContext?: boolean }
): boolean {
  // Never trust isAnilExplicit from ordinary client requests; requires trusted server context
  if (user.isAnilExplicit === true && options?.isTrustedServerContext === true) {
    return true;
  }

  const rawEmails = process.env.ANIL_APPROVAL_EMAIL || "anil@nexgen.ai";
  const configuredEmails = rawEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const anilUserId = process.env.ANIL_USER_ID;
  const userEmail = (user.email || "").toLowerCase().trim();

  if (anilUserId && user.id === anilUserId) {
    return true;
  }

  // Exact matching against configured Anil email addresses or official domains
  return Boolean(
    userEmail &&
      (configuredEmails.includes(userEmail) ||
        userEmail === "anil@nexgen.ai" ||
        userEmail === "anil@nexora.ai")
  );
}

export type ExecutionState = {
  id: string;
  organizationId: string;
  agentType: AgentType;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  targetEntityId?: string | null;
  durationMs?: number | null;
  tokensUsed?: number;
  costEstimate?: number;
  startedAt: Date | string;
};

/**
 * NEXGEN GLOBAL AI — Agent Fleet Orchestrator
 *
 * Enforces the core business workflow and state transitions across the 8 agents:
 *
 * [1. Hunter] -> Discovers project opportunities
 *       |
 * [2. Researcher] -> Deep client background
 *       |
 * [3. Analyzer] -> Architecture, tech stack & effort
 *       |
 * [4. Scoring Agent] -> Multi-factor qualification (Selects top 40 daily)
 *       |
 *       v (If Score >= 75)
 * [5. Proposal Generator] -> Generates technical proposal
 *       |
 *       v
 * [HUMAN APPROVAL GATE - ANIL] (Strict blocking requirement)
 *       |
 *       v (Once Approved)
 * [6. Outreach Manager] -> Dispatches via Email / LinkedIn / WhatsApp
 *       |
 *       v
 * [7. Follow-up Manager] -> Monitors responses, detects intent, drafts follow-ups
 *       |
 * [8. AI Project Manager] -> Orchestrates the loop, tracks quota, produces daily reports
 */

export class NexgenAgentOrchestrator {
  /**
   * Evaluates if a discovered project passes qualification for proposal generation.
   * Target: Top 40 qualified opportunities daily.
   */
  public static evaluateOpportunityQualification(
    breakdown: {
      budgetViabilityScore: number;
      techStackAlignmentScore: number;
      clientLegitimacyScore: number;
      competitionScore: number;
      timelineFeasibilityScore: number;
    },
  ): {
    overallScore: number;
    grade: "A" | "B" | "C" | "D" | "F";
    isQualified: boolean;
    recommendedAction: "priority_proposal" | "standard_proposal" | "monitor" | "pass";
  } {
    validateScoreFactors(breakdown);

    const overallScore = calculateWeightedOverallScore(breakdown);
    const grade = determineQualificationGrade(overallScore);
    const isQualified = overallScore >= QUALIFICATION_THRESHOLD_SCORE;

    let recommendedAction: "priority_proposal" | "standard_proposal" | "monitor" | "pass" = "pass";
    if (overallScore >= 88) {
      recommendedAction = "priority_proposal";
    } else if (overallScore >= QUALIFICATION_THRESHOLD_SCORE) {
      recommendedAction = "standard_proposal";
    } else if (overallScore >= 60) {
      recommendedAction = "monitor";
    }

    return {
      overallScore,
      grade,
      isQualified,
      recommendedAction,
    };
  }

  /**
   * Applies human approval, rejection, or revision requested by Anil or authorized Admin.
   * Enforces role-based security: normal members CANNOT approve proposals.
   */
  public static applyProposalApprovalDecision(
    proposal: ProposalRecord,
    decision: ProposalApprovalDecision,
  ): ProposalRecord {
    if (proposal.status === "dispatched") {
      throw new Error("Cannot modify proposal approval: proposal has already been dispatched to client.");
    }

    const isAnil = isAnilAuthorizedAccount(
      {
        id: decision.userId,
        email: decision.userEmail,
        isAnilExplicit: decision.isAnilExplicit,
      },
      { isTrustedServerContext: decision.isTrustedServerContext },
    );
    if (!isAnil) {
      throw new Error(
        `Authorization Denied: Only Anil's authenticated account can authorize external communications or approve proposals. User (${decision.userId}${decision.userEmail ? " / " + decision.userEmail : ""}) is not authorized. Ordinary admins or members cannot approve on his behalf.`,
      );
    }

    if (!decision.userId) {
      throw new Error("Invalid Approval Action: Approving user ID is required.");
    }

    const now = new Date();

    if (decision.action === "approve") {
      return {
        ...proposal,
        status: "approved",
        approvedByUserId: decision.userId,
        approvedAt: now,
        reviewerFeedback: decision.reviewerFeedback ?? null,
        dispatchChannel: decision.approvedDispatchChannel ?? proposal.dispatchChannel ?? "email",
      };
    }

    if (decision.action === "reject") {
      return {
        ...proposal,
        status: "rejected",
        approvedByUserId: null,
        approvedAt: null,
        reviewerFeedback: decision.reviewerFeedback ?? "Rejected during review",
      };
    }

    if (decision.action === "request_revision") {
      return {
        ...proposal,
        status: "revision_requested",
        approvedByUserId: null,
        approvedAt: null,
        reviewerFeedback: decision.reviewerFeedback ?? "Revisions requested by reviewer",
      };
    }

    throw new Error(`Unrecognized proposal approval action: ${(decision as { action: string }).action}`);
  }

  /**
   * Enforces the human approval rule: NO external outreach may proceed
   * without Anil's explicit sign-off on the proposal.
   * External sending is disabled by default.
   */
  public static assertOutreachPreconditions(
    proposal: ProposalRecord | { status: ProposalStatus; approvedByUserId?: string | null; approvedAt?: Date | string | null },
  ): void {
    if (process.env.ALLOW_EXTERNAL_OUTREACH !== "true") {
      throw new Error(
        "Outreach dispatch blocked: External communication is disabled by default. Set ALLOW_EXTERNAL_OUTREACH=true to enable.",
      );
    }
    if (proposal.status === "pending_approval") {
      throw new Error(
        "Outreach dispatch blocked: Proposal is pending Anil's approval. External communication requires explicit human sign-off.",
      );
    }
    if (proposal.status === "rejected") {
      throw new Error("Outreach dispatch blocked: Proposal was rejected and cannot be sent.");
    }
    if (proposal.status === "revision_requested") {
      throw new Error("Outreach dispatch blocked: Proposal requires revisions before sending.");
    }
    if (proposal.status === "draft") {
      throw new Error("Outreach dispatch blocked: Proposal is still in draft state.");
    }
    if (proposal.status !== "approved") {
      throw new Error(
        `Outreach dispatch blocked: Invalid proposal state '${proposal.status}'. External communication requires an 'approved' state.`,
      );
    }
    if (!proposal.approvedByUserId) {
      throw new Error(
        "Outreach dispatch blocked: No authorized approver user ID attached to this proposal.",
      );
    }
    if (!proposal.approvedAt) {
      throw new Error(
        "Outreach dispatch blocked: No approval timestamp attached to this proposal.",
      );
    }
  }

  /**
   * Prevents concurrent duplicate executions of the same agent on the same entity.
   */
  public static preventDuplicateExecution(
    activeExecutions: ExecutionState[],
    newExecution: { agentType: AgentType; organizationId: string; targetEntityId?: string | null },
  ): void {
    const isAlreadyRunning = activeExecutions.some(
      (e) =>
        e.organizationId === newExecution.organizationId &&
        e.agentType === newExecution.agentType &&
        e.status === "running" &&
        e.targetEntityId === newExecution.targetEntityId,
    );

    if (isAlreadyRunning) {
      throw new Error(
        `Duplicate Execution Blocked: Agent '${newExecution.agentType}' is already actively running for entity '${newExecution.targetEntityId ?? "batch"}'.`,
      );
    }
  }

  /**
   * Tracks agent execution failures, timeout violations, and calculates exponential backoff.
   */
  public static handleExecutionFailure(
    attempt: number,
    error: Error | string,
    timeoutMs?: number,
    durationMs?: number,
  ): {
    status: "failed";
    isTimeout: boolean;
    canRetry: boolean;
    retryDelayMs: number;
    errorMessage: string;
  } {
    const errorMessage = typeof error === "string" ? error : error.message;
    const isTimeout = Boolean(timeoutMs && durationMs && durationMs > timeoutMs);
    const maxAttempts = 3;
    const canRetry = attempt < maxAttempts && !isTimeout;
    const retryDelayMs = canRetry ? Math.pow(2, attempt) * 1000 : 0; // 2s, 4s

    return {
      status: "failed",
      isTimeout,
      canRetry,
      retryDelayMs,
      errorMessage: isTimeout ? `Execution timed out after ${durationMs}ms (limit: ${timeoutMs}ms)` : errorMessage,
    };
  }

  /**
   * AI Project Manager Telemetry Monitor:
   * Aggregates execution health, token consumption, and detects anomalies across all 8 agents.
   */
  public static monitorAgentFleetTelemetry(executions: ExecutionState[]): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    runningExecutions: number;
    totalTokensUsed: number;
    totalCostEstimateUSD: number;
    anomalies: string[];
  } {
    let successful = 0;
    let failed = 0;
    let running = 0;
    let tokens = 0;
    let cost = 0;
    const anomalies: string[] = [];

    for (const exec of executions) {
      if (exec.status === "completed") successful++;
      if (exec.status === "failed") failed++;
      if (exec.status === "running") running++;
      tokens += exec.tokensUsed ?? 0;
      cost += Number(exec.costEstimate ?? 0);
    }

    const failureRate = executions.length > 0 ? (failed / executions.length) * 100 : 0;
    if (failureRate > 20) {
      anomalies.push(`High Agent Failure Rate: ${failureRate.toFixed(1)}% of executions failed.`);
    }

    return {
      totalExecutions: executions.length,
      successfulExecutions: successful,
      failedExecutions: failed,
      runningExecutions: running,
      totalTokensUsed: tokens,
      totalCostEstimateUSD: Math.round(cost * 10000) / 10000,
      anomalies,
    };
  }

  /**
   * Computes the daily progress towards the 40 qualified software projects target.
   */
  public static computeDailyQuotaProgress(qualifiedCountToday: number): {
    target: number;
    qualifiedCountToday: number;
    quotaPercentage: number;
    quotaMet: boolean;
    remainingToTarget: number;
  } {
    const target = DAILY_QUALIFIED_TARGET_QUOTA;
    const remainingToTarget = Math.max(0, target - qualifiedCountToday);
    const quotaPercentage = Math.min(100, Math.round((qualifiedCountToday / target) * 100));

    return {
      target,
      qualifiedCountToday,
      quotaPercentage,
      quotaMet: qualifiedCountToday >= target,
      remainingToTarget,
    };
  }
}
