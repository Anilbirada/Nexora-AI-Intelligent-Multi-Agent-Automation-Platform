/**
 * NEXGEN GLOBAL AI — Agent 8: Agent Fleet Monitor
 *
 * Provides real-time telemetry and health monitoring across all 8 AI Agents:
 * 1. Global Project Hunter
 * 2. Client Researcher
 * 3. Project Analyzer
 * 4. Opportunity Scoring Agent
 * 5. AI Proposal Generator
 * 6. Outreach Manager
 * 7. AI Follow-up Manager
 * 8. AI Project Manager
 *
 * Strict Rule: Real execution telemetry determines status, never code existence alone.
 */

import {
  ALL_EIGHT_AGENTS,
  type AgentDescriptor,
  type AgentHealthStatus,
  type AgentTelemetryRecord,
  type AgentType,
} from "./types";
import type { ExecutionRecord } from "./failure-detector";

export const AGENT_DESCRIPTORS: Record<AgentType, AgentDescriptor> = {
  global_project_hunter: {
    id: "global_project_hunter",
    number: 1,
    name: "Global Project Hunter",
    shortName: "Hunter",
    role: "Global Project Discovery & Deduplication",
    description: "Crawls multiple platforms, filters scams, and identifies global software projects.",
    upstreamDependencies: [],
    isExternalAction: false,
  },
  client_researcher: {
    id: "client_researcher",
    number: 2,
    name: "Client Researcher",
    shortName: "Researcher",
    role: "Client Digital Footprint & Credibility Verification",
    description: "Researches client facts, domains, tech stack footprint, and verifies legitimacy.",
    upstreamDependencies: ["global_project_hunter"],
    isExternalAction: false,
  },
  project_analyzer: {
    id: "project_analyzer",
    number: 3,
    name: "Project Analyzer",
    shortName: "Analyzer",
    role: "Technical Specification & Architecture Recommendation",
    description: "Extracts functional requirements and recommends system architecture and milestones.",
    upstreamDependencies: ["global_project_hunter", "client_researcher"],
    isExternalAction: false,
  },
  opportunity_scoring: {
    id: "opportunity_scoring",
    number: 4,
    name: "Opportunity Scoring Agent",
    shortName: "Scorer",
    role: "5-Factor Commercial Qualification Matrix",
    description: "Evaluates budget, tech alignment, legitimacy, competition, and timeline feasibility.",
    upstreamDependencies: ["project_analyzer"],
    isExternalAction: false,
  },
  proposal_generator: {
    id: "proposal_generator",
    number: 5,
    name: "AI Proposal Generator",
    shortName: "Proposal Gen",
    role: "Technical Proposal & Milestone Plan Drafting",
    description: "Drafts executive summaries, solutions, sprints, and velocity-based milestones.",
    upstreamDependencies: ["opportunity_scoring"],
    isExternalAction: false,
  },
  outreach_manager: {
    id: "outreach_manager",
    number: 6,
    name: "Outreach Manager",
    shortName: "Outreach",
    role: "Personalized Multi-Channel Communications",
    description: "Crafts email, LinkedIn, and WhatsApp drafts awaiting Anil's explicit human signoff.",
    upstreamDependencies: ["proposal_generator"],
    isExternalAction: true,
  },
  followup_manager: {
    id: "followup_manager",
    number: 7,
    name: "AI Follow-up Manager",
    shortName: "Follow-up",
    role: "Multi-Step Cadence & Inbound Response Intelligence",
    description: "Schedules 3-step follow-ups, pauses on replies, and classifies client intent.",
    upstreamDependencies: ["outreach_manager"],
    isExternalAction: true,
  },
  ai_project_manager: {
    id: "ai_project_manager",
    number: 8,
    name: "AI Project Manager",
    shortName: "Project Mgr",
    role: "Central Orchestration, Quota Governance & Telemetry",
    description: "Oversees the 8-agent fleet, monitors bottlenecks, and delivers executive intelligence.",
    upstreamDependencies: [],
    isExternalAction: false,
  },
};

export class AgentMonitor {
  /**
   * Generates health telemetry for all 8 agents based on real execution history.
   */
  public static evaluateFleetHealth(
    executionHistory: ExecutionRecord[],
    options: {
      disabledAgents?: AgentType[];
      currentTime?: Date;
    } = {},
  ): Record<AgentType, AgentTelemetryRecord> {
    const now = options.currentTime || new Date();
    const disabledList = new Set(options.disabledAgents || []);

    const fleetTelemetry = {} as Record<AgentType, AgentTelemetryRecord>;

    for (const agentType of ALL_EIGHT_AGENTS) {
      const descriptor = AGENT_DESCRIPTORS[agentType];
      const agentExecs = executionHistory.filter((e) => e.agentType === agentType);

      // Sort chronological descending (most recent first)
      const sortedExecs = [...agentExecs].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      );

      const latestExec = sortedExecs[0] || null;
      const completedExecs = sortedExecs.filter((e) => e.status === "completed");
      const failedExecs = sortedExecs.filter((e) => e.status === "failed");
      const activeRunningExecs = sortedExecs.filter((e) => e.status === "running");

      const latestSuccess = completedExecs[0] || null;

      // Count consecutive failures (failures occurring since the last completed run)
      let consecutiveFailures = 0;
      for (const exec of sortedExecs) {
        if (exec.status === "completed") break;
        if (exec.status === "failed") consecutiveFailures++;
      }

      // Compute average execution duration in milliseconds
      const durations = completedExecs
        .map((e) => e.durationMs)
        .filter((d): d is number => typeof d === "number" && d > 0);
      const averageDurationMs = durations.length > 0
        ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
        : 0;

      // Sum retries across all executions for this agent
      const totalRetries = agentExecs.reduce((sum, e) => sum + (e.retryCount || 0), 0);

      // Determine real status based on telemetry
      let status: AgentHealthStatus;

      if (disabledList.has(agentType)) {
        status = "disabled";
      } else if (activeRunningExecs.length > 0) {
        status = "running";
      } else if (consecutiveFailures >= 3) {
        status = "failed";
      } else if (consecutiveFailures > 0 || (failedExecs.length > 0 && failedExecs.length / Math.max(1, agentExecs.length) > 0.25)) {
        status = "degraded";
      } else if (completedExecs.length > 0) {
        // Healthy recent execution
        status = "operational";
      } else {
        // No executions yet in current telemetry window
        status = "idle";
      }

      fleetTelemetry[agentType] = {
        agentType,
        name: descriptor.name,
        number: descriptor.number,
        status,
        lastExecutionAt: latestExec ? new Date(latestExec.startedAt) : null,
        lastSuccessAt: latestSuccess ? new Date(latestSuccess.startedAt) : null,
        consecutiveFailures,
        averageDurationMs,
        currentWorkload: activeRunningExecs.length,
        totalExecutions: agentExecs.length,
        successfulExecutions: completedExecs.length,
        failedExecutions: failedExecs.length,
        retryCount: totalRetries,
        healthCheckAt: now,
        lastErrorDetails: latestExec?.errorDetails || null,
        isAvailable: status !== "disabled" && status !== "failed",
      };
    }

    return fleetTelemetry;
  }

  /**
   * Evaluates if upstream dependencies are satisfied for a target agent.
   */
  public static checkDependencies(
    agentType: AgentType,
    fleetStatus: Record<AgentType, AgentTelemetryRecord>,
  ): { isReady: boolean; failedDependencies: AgentType[] } {
    const descriptor = AGENT_DESCRIPTORS[agentType];
    const failedDependencies: AgentType[] = [];

    for (const upstream of descriptor.upstreamDependencies) {
      const upstreamTelemetry = fleetStatus[upstream];
      if (!upstreamTelemetry) continue;

      if (upstreamTelemetry.status === "failed" || upstreamTelemetry.status === "disabled") {
        failedDependencies.push(upstream);
      }
    }

    return {
      isReady: failedDependencies.length === 0,
      failedDependencies,
    };
  }
}
