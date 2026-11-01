/**
 * NEXGEN GLOBAL AI — Agent 8: AI Project Manager Orchestrator
 *
 * Central coordinator and governance engine for the 8-agent ecosystem:
 * 1. Global Project Hunter
 * 2. Client Researcher
 * 3. Project Analyzer
 * 4. Opportunity Scoring Agent
 * 5. AI Proposal Generator
 * 6. Outreach Manager
 * 7. AI Follow-up Manager
 * 8. AI Project Manager
 *
 * Responsibilities:
 * - Upstream prerequisite enforcement before dependent agents run
 * - Duplicate execution prevention with active execution locks
 * - Failure detection and idempotent exponential backoff retries
 * - Unified Anil Approval Center orchestration (proposals, outreach, follow-ups)
 * - Strict server-side Anil identity authorization
 * - Absolute External Communication Safety Guard (ALLOW_EXTERNAL_OUTREACH=false)
 */

import { isAnilAuthorizedAccount } from "../outreach/approval-gate";
import { ALL_EIGHT_AGENTS, type AgentType, type AgentPrerequisiteCheckResult, type UnifiedApprovalItem, type AnilApprovalDecisionPayload } from "./types";
import { AgentMonitor, AGENT_DESCRIPTORS } from "./agent-monitor";
import { FailureDetector, type ExecutionRecord } from "./failure-detector";
import { QuotaManager } from "./quota-manager";
import { PipelineManager } from "./pipeline-manager";
import { DailyReportGenerator } from "./daily-report-generator";

export interface OpportunityContext {
  id: string;
  organizationId: string;
  title: string;
  status: string;
  overallScore?: number | null;
  isQualified?: boolean | null;
  hasResearch?: boolean;
  hasAnalysis?: boolean;
  hasProposal?: boolean;
  proposalStatus?: string | null;
  outreachStatus?: string | null;
}

export class AIProjectManagerOrchestrator {
  private activeLocks = new Set<string>(); // composite key: `${orgId}:${agentType}:${targetEntityId}`
  private executionHistory: ExecutionRecord[] = [];

  /**
   * Validates if all upstream dependencies are satisfied before executing an agent.
   * Throws or returns clear validation failure if prerequisite data is missing.
   */
  public validatePrerequisites(
    agentType: AgentType,
    context?: OpportunityContext,
  ): AgentPrerequisiteCheckResult {
    const missing: string[] = [];

    switch (agentType) {
      case "global_project_hunter":
        // Agent 1 has no upstream dependencies
        break;

      case "client_researcher":
        if (!context || !context.id) {
          missing.push("Target opportunity ID from Agent 1 (Hunter)");
        }
        break;

      case "project_analyzer":
        if (!context || !context.id) {
          missing.push("Target opportunity ID from Agent 1 (Hunter)");
        }
        if (context && !context.hasResearch) {
          missing.push("Completed client research profile from Agent 2 (Researcher)");
        }
        break;

      case "opportunity_scoring":
        if (!context || !context.id) {
          missing.push("Target opportunity ID");
        }
        if (context && !context.hasAnalysis) {
          missing.push("Technical analysis specifications from Agent 3 (Analyzer)");
        }
        break;

      case "proposal_generator":
        if (!context || !context.id) {
          missing.push("Target opportunity ID");
        }
        if (context && (!context.isQualified || (context.overallScore !== undefined && context.overallScore !== null && context.overallScore < 75))) {
          missing.push("Qualified opportunity status (overallScore >= 75) from Agent 4 (Scorer)");
        }
        break;

      case "outreach_manager":
        if (!context || !context.id) {
          missing.push("Target opportunity ID");
        }
        if (context && context.proposalStatus !== "approved") {
          missing.push("Explicitly approved proposal by Anil from Agent 5");
        }
        break;

      case "followup_manager":
        if (!context || !context.id) {
          missing.push("Target opportunity ID");
        }
        if (context && context.outreachStatus !== "approved") {
          missing.push("Explicitly approved initial outreach message by Anil from Agent 6");
        }
        break;

      case "ai_project_manager":
        // Orchestrator coordinates all
        break;
    }

    const allowed = missing.length === 0;
    return {
      allowed,
      missingPrerequisites: missing,
      message: allowed
        ? `Prerequisites satisfied for ${AGENT_DESCRIPTORS[agentType].name}.`
        : `Prerequisites missing for ${AGENT_DESCRIPTORS[agentType].name}: ${missing.join(", ")}.`,
    };
  }

  /**
   * Claims an execution lock to prevent duplicate concurrent runs on the same entity.
   */
  public claimExecutionLock(params: {
    organizationId: string;
    agentType: AgentType;
    targetEntityId?: string | null;
  }): { acquired: boolean; lockKey: string } {
    const lockKey = `${params.organizationId}:${params.agentType}:${params.targetEntityId || "batch"}`;
    if (this.activeLocks.has(lockKey)) {
      return { acquired: false, lockKey };
    }
    this.activeLocks.add(lockKey);
    return { acquired: true, lockKey };
  }

  /**
   * Releases an execution lock upon job completion or failure.
   */
  public releaseExecutionLock(lockKey: string): void {
    this.activeLocks.delete(lockKey);
  }

  /**
   * Records execution start in telemetry history.
   */
  public recordExecutionStart(record: {
    id: string;
    organizationId: string;
    agentType: AgentType;
    targetEntityId?: string | null;
    targetEntityType?: string | null;
    startedAt?: Date;
    maxRetries?: number;
  }): ExecutionRecord {
    const exec: ExecutionRecord = {
      id: record.id,
      organizationId: record.organizationId,
      agentType: record.agentType,
      status: "running",
      targetEntityId: record.targetEntityId,
      targetEntityType: record.targetEntityType,
      startedAt: record.startedAt || new Date(),
      retryCount: 0,
      maxRetries: record.maxRetries || 3,
    };
    this.executionHistory.push(exec);
    return exec;
  }

  /**
   * Records execution completion in telemetry history.
   */
  public recordExecutionComplete(
    executionId: string,
    completedAt: Date = new Date(),
  ): ExecutionRecord | null {
    const exec = this.executionHistory.find((e) => e.id === executionId);
    if (!exec) return null;

    exec.status = "completed";
    exec.completedAt = completedAt;
    exec.durationMs = completedAt.getTime() - new Date(exec.startedAt).getTime();
    return exec;
  }

  /**
   * Records execution failure in telemetry history.
   */
  public recordExecutionFailure(
    executionId: string,
    errorMessage: string,
    completedAt: Date = new Date(),
  ): ExecutionRecord | null {
    const exec = this.executionHistory.find((e) => e.id === executionId);
    if (!exec) return null;

    exec.status = "failed";
    exec.completedAt = completedAt;
    exec.durationMs = completedAt.getTime() - new Date(exec.startedAt).getTime();
    exec.errorDetails = errorMessage;
    return exec;
  }

  /**
   * Scans and returns all currently stalled jobs.
   */
  public getStalledJobs(currentTime: Date = new Date()) {
    return FailureDetector.detectStalledJobs(this.executionHistory, {}, currentTime);
  }

  /**
   * Retries an eligible failed or stalled execution.
   */
  public retryExecution(
    executionId: string,
    currentTime: Date = new Date(),
  ): { success: boolean; execution?: ExecutionRecord; error?: string } {
    const exec = this.executionHistory.find((e) => e.id === executionId);
    if (!exec) {
      return { success: false, error: `Execution ${executionId} not found.` };
    }

    try {
      const retryAttrs = FailureDetector.prepareRetry(exec, currentTime);
      exec.retryCount = retryAttrs.retryCount;
      exec.status = retryAttrs.status;
      exec.nextRetryAt = retryAttrs.nextRetryAt;
      exec.errorDetails = retryAttrs.errorDetails;
      return { success: true, execution: exec };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Unified Approval Gate: Applies Anil's decision to a pending item.
   * Strictly enforces that only Anil's authenticated server-side account can authorize.
   */
  public applyUnifiedApprovalDecision(
    payload: AnilApprovalDecisionPayload,
  ): { authorized: boolean; appliedAt: Date; decision: string } {
    // 1. Enforce Server-Side Identity Check
    const isAnil = isAnilAuthorizedAccount({
      userId: payload.userId,
      userEmail: payload.userEmail,
      isAnilExplicit: payload.isAnilExplicit,
      isTrustedServerContext: payload.isTrustedServerContext,
    });

    if (!isAnil) {
      throw new Error(
        `Authorization Denied: Security violation: Only Anil's authenticated account (anil@nexgen.ai) can authorize commercial items. User (${payload.userEmail || payload.userId}) is not authorized. Ordinary admins or members cannot approve on his behalf.`,
      );
    }

    const appliedAt = new Date();
    return {
      authorized: true,
      appliedAt,
      decision: payload.action,
    };
  }

  /**
   * Safety Guard: Checks external communication dispatch status.
   * Always enforces ALLOW_EXTERNAL_OUTREACH safety policy.
   */
  public static assertExternalDispatchSafety(): void {
    const isAllowed = process.env.ALLOW_EXTERNAL_OUTREACH === "true";
    if (!isAllowed) {
      throw new Error(
        "EXTERNAL COMMUNICATION DISPATCH BLOCKED: Policy rule ALLOW_EXTERNAL_OUTREACH=false is strictly active. Agent 8 cannot autonomously dispatch emails, LinkedIn, WhatsApp messages, or submit bids. Human transmission hold remains locked.",
      );
    }
  }

  /**
   * Returns copy of in-memory execution history.
   */
  public getExecutionHistory(): ExecutionRecord[] {
    return [...this.executionHistory];
  }
}
