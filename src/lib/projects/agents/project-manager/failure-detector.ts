/**
 * NEXGEN GLOBAL AI — Agent 8: Failure Detector & Recovery Engine
 *
 * Responsibilities:
 * 1. Stalled job detection (status: "running" past timeout threshold, e.g. 15 minutes).
 * 2. Controlled exponential backoff calculation: baseDelay * 2^retryCount.
 * 3. Max retry limit enforcement (default: 3).
 * 4. Terminal dead-letter state tracking when retries are exhausted.
 * 5. Idempotent recovery enforcement (preventing duplicate proposals, messages, follow-ups).
 */

import type { AgentType, StalledJobRecord, RetryPolicyConfig } from "./types";

export interface ExecutionRecord {
  id: string;
  organizationId: string;
  agentType: AgentType;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  targetEntityId?: string | null;
  targetEntityType?: string | null;
  startedAt: Date;
  completedAt?: Date | null;
  durationMs?: number | null;
  retryCount: number;
  maxRetries: number;
  errorDetails?: string | null;
  nextRetryAt?: Date | null;
}

export class FailureDetector {
  public static readonly DEFAULT_CONFIG: RetryPolicyConfig = {
    baseDelayMs: 60 * 1000, // 1 minute
    maxDelayMs: 60 * 60 * 1000, // 1 hour max cap
    maxRetries: 3,
    stalledTimeoutMs: 15 * 60 * 1000, // 15 minutes
  };

  /**
   * Calculates exponential backoff delay in milliseconds.
   * Formula: min(baseDelay * 2^retryCount, maxDelay)
   */
  public static calculateExponentialBackoff(
    retryCount: number,
    config: Partial<RetryPolicyConfig> = {},
  ): number {
    const base = config.baseDelayMs || FailureDetector.DEFAULT_CONFIG.baseDelayMs;
    const max = config.maxDelayMs || FailureDetector.DEFAULT_CONFIG.maxDelayMs;

    // 2^retryCount * baseDelay
    const calculatedDelay = base * Math.pow(2, Math.max(0, retryCount));
    return Math.min(calculatedDelay, max);
  }

  /**
   * Computes the next retry timestamp for a failed execution.
   */
  public static getNextRetryTimestamp(
    retryCount: number,
    fromTime: Date = new Date(),
    config: Partial<RetryPolicyConfig> = {},
  ): Date {
    const delayMs = FailureDetector.calculateExponentialBackoff(retryCount, config);
    return new Date(fromTime.getTime() + delayMs);
  }

  /**
   * Scans a list of executions to identify stalled jobs.
   * A job is stalled if its status is "running" and elapsed time exceeds stalledTimeoutMs.
   */
  public static detectStalledJobs(
    executions: ExecutionRecord[],
    config: Partial<RetryPolicyConfig> = {},
    currentTime: Date = new Date(),
  ): StalledJobRecord[] {
    const timeoutMs = config.stalledTimeoutMs || FailureDetector.DEFAULT_CONFIG.stalledTimeoutMs;
    const maxRetries = config.maxRetries || FailureDetector.DEFAULT_CONFIG.maxRetries;
    const stalledJobs: StalledJobRecord[] = [];

    for (const job of executions) {
      if (job.status !== "running") continue;

      const startedMs = new Date(job.startedAt).getTime();
      const elapsedMs = currentTime.getTime() - startedMs;

      if (elapsedMs > timeoutMs) {
        const isEligible = job.retryCount < (job.maxRetries || maxRetries);
        const nextRetryAt = isEligible
          ? FailureDetector.getNextRetryTimestamp(job.retryCount, currentTime, config)
          : null;

        stalledJobs.push({
          executionId: job.id,
          agentType: job.agentType,
          organizationId: job.organizationId,
          targetEntityId: job.targetEntityId,
          startedAt: new Date(job.startedAt),
          elapsedMs,
          timeoutThresholdMs: timeoutMs,
          retryCount: job.retryCount,
          maxRetries: job.maxRetries || maxRetries,
          isEligibleForRetry: isEligible,
          nextRetryAt,
          failureReason: `Job execution stalled: exceeded threshold of ${Math.round(timeoutMs / 60000)} minutes without heartbeat (elapsed: ${Math.round(elapsedMs / 1000)}s).`,
        });
      }
    }

    return stalledJobs;
  }

  /**
   * Evaluates if a failed job is eligible for retry.
   */
  public static isRetryEligible(job: {
    status: string;
    retryCount: number;
    maxRetries?: number;
  }): boolean {
    const allowedMax = job.maxRetries !== undefined ? job.maxRetries : FailureDetector.DEFAULT_CONFIG.maxRetries;
    return (job.status === "failed" || job.status === "running") && job.retryCount < allowedMax;
  }

  /**
   * Prepares idempotent retry attributes for an execution record.
   * Increments retry count and sets status to pending with new backoff schedule.
   */
  public static prepareRetry(
    job: ExecutionRecord,
    currentTime: Date = new Date(),
    config: Partial<RetryPolicyConfig> = {},
  ): {
    retryCount: number;
    status: "pending";
    nextRetryAt: Date;
    errorDetails: string;
  } {
    if (!FailureDetector.isRetryEligible(job)) {
      throw new Error(
        `Job ${job.id} cannot be retried: exceeded maximum retry limit of ${job.maxRetries} (current retries: ${job.retryCount}). Marked terminal dead-letter.`,
      );
    }

    const newRetryCount = job.retryCount + 1;
    const nextRetryAt = FailureDetector.getNextRetryTimestamp(newRetryCount, currentTime, config);

    return {
      retryCount: newRetryCount,
      status: "pending",
      nextRetryAt,
      errorDetails: `Scheduled retry ${newRetryCount}/${job.maxRetries} after backoff. Previous error: ${job.errorDetails || "Unknown error / timeout"}.`,
    };
  }

  /**
   * Idempotency validator: Verifies that retrying an execution will not generate
   * duplicate external side effects.
   */
  public static validateIdempotentRecovery(params: {
    agentType: AgentType;
    targetEntityId?: string | null;
    existingEntityFingerprints: string[];
    candidateFingerprint: string;
  }): { isSafeToRetry: boolean; reason?: string } {
    if (params.existingEntityFingerprints.includes(params.candidateFingerprint)) {
      return {
        isSafeToRetry: false,
        reason: `Duplicate prevention guard: Target entity ${params.candidateFingerprint} already exists. Retrying ${params.agentType} must reuse existing record without creating duplicate side effects.`,
      };
    }
    return { isSafeToRetry: true };
  }
}
