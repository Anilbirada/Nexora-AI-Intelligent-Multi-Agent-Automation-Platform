/**
 * NEXGEN GLOBAL AI — Runtime Execution Reporting & Model Transparency
 *
 * Implements truthful runtime execution reporting across all agents.
 * Strictly adheres to the transparent disclosure standard:
 * Never label deterministic heuristic automation as live generative cloud AI.
 */

export type AIExecutionMode =
  | "DETERMINISTIC"
  | "LLM_LIVE"
  | "LLM_FALLBACK"
  | "SIMULATED"
  | "FIXTURE";

export interface ExecutionTelemetry {
  executionMode: AIExecutionMode;
  actualProvider: string;
  aiModel: string;
  tokensUsed: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  estimatedCostUSD: number;
  fallbackStatus?: "none" | "active" | "recovered";
  fallbackReason?: string;
  executionDurationMs: number;
  generatedAt: Date;
}

export class RuntimeExecutionTracker {
  /**
   * Evaluates the active execution mode based on environment, inputs, and provider availability.
   * By default, if no live LLM provider is explicitly configured and invoked, truthful reporting
   * mandates declaring DETERMINISTIC execution.
   */
  public static resolveTelemetry(options: {
    durationMs: number;
    isFixture?: boolean;
    isSimulated?: boolean;
    providerExecution?: {
      provider: string;
      model: string;
      promptTokens?: number;
      completionTokens?: number;
      costUSD?: number;
      error?: string;
    };
  }): ExecutionTelemetry {
    const now = new Date();

    // Scenario D: Test Fixtures
    if (options.isFixture) {
      return {
        executionMode: "FIXTURE",
        actualProvider: "Test Fixture Harness",
        aiModel: "fixture-static-dataset",
        tokensUsed: 0,
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        estimatedCostUSD: 0,
        fallbackStatus: "none",
        executionDurationMs: options.durationMs,
        generatedAt: now,
      };
    }

    // Scenario D2: Simulated Demo Data
    if (options.isSimulated || process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return {
        executionMode: "SIMULATED",
        actualProvider: "NexGen Simulated Sandbox",
        aiModel: "sandbox-simulation-v1",
        tokensUsed: 0,
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        estimatedCostUSD: 0,
        fallbackStatus: "none",
        executionDurationMs: options.durationMs,
        generatedAt: now,
      };
    }

    // Scenario C: LLM Provider Failed -> Safe Fallback
    if (options.providerExecution?.error) {
      return {
        executionMode: "LLM_FALLBACK",
        actualProvider: `NexGen Deterministic Fallback (Attempted: ${options.providerExecution.provider})`,
        aiModel: "nexgen-deterministic-nlp-v1 (fallback)",
        tokensUsed: 0,
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        estimatedCostUSD: 0,
        fallbackStatus: "active",
        fallbackReason: options.providerExecution.error,
        executionDurationMs: options.durationMs,
        generatedAt: now,
      };
    }

    // Scenario B: Live LLM Provider Executed Successfully
    if (options.providerExecution && options.providerExecution.model && !options.providerExecution.error) {
      const totalTokens =
        (options.providerExecution.promptTokens || 0) + (options.providerExecution.completionTokens || 0);
      return {
        executionMode: "LLM_LIVE",
        actualProvider: options.providerExecution.provider,
        aiModel: options.providerExecution.model,
        tokensUsed: totalTokens,
        tokenUsage: {
          promptTokens: options.providerExecution.promptTokens || 0,
          completionTokens: options.providerExecution.completionTokens || 0,
          totalTokens,
        },
        estimatedCostUSD: options.providerExecution.costUSD || 0,
        fallbackStatus: "none",
        executionDurationMs: options.durationMs,
        generatedAt: now,
      };
    }

    // Scenario A: Default Baseline (No provider configured / Deterministic Engine)
    return {
      executionMode: "DETERMINISTIC",
      actualProvider: "NexGen Deterministic Rules Engine (Local Zero-Hallucination)",
      aiModel: "nexgen-deterministic-nlp-v1",
      tokensUsed: 0,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      estimatedCostUSD: 0,
      fallbackStatus: "none",
      executionDurationMs: options.durationMs,
      generatedAt: now,
    };
  }
}
