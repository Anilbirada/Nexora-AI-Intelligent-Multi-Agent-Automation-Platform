/**
 * NEXGEN GLOBAL AI — Agent 8: AI Project Manager
 *
 * Core TypeScript type definitions for:
 * - 8-Agent Fleet Registration & Telemetry
 * - Central Orchestration & Dependency Graph
 * - Daily Opportunity Quota Tracking (Target: 40/day)
 * - End-to-End Pipeline Monitoring & Bottleneck Detection
 * - Failure Detection, Stalled Job Recovery, Exponential Backoff
 * - Daily Executive Reporting
 * - Unified Anil Approval Center
 */

import type {
  AgentType as DbAgentType,
  AgentExecutionStatus,
  ProjectOpportunityStatus,
  ProposalStatus,
  OutreachMessageStatus,
  FollowupTaskStatus,
  ClientResponseClassification,
} from "../../schema";

// ── 1. Eight-Agent Fleet ──────────────────────────────────────────────────────

export type AgentType = DbAgentType;

export const ALL_EIGHT_AGENTS: AgentType[] = [
  "global_project_hunter",
  "client_researcher",
  "project_analyzer",
  "opportunity_scoring",
  "proposal_generator",
  "outreach_manager",
  "followup_manager",
  "ai_project_manager",
];

export type AgentHealthStatus =
  | "operational"
  | "running"
  | "idle"
  | "degraded"
  | "failed"
  | "disabled"
  | "waiting_for_dependency";

export interface AgentDescriptor {
  id: AgentType;
  number: number;
  name: string;
  shortName: string;
  role: string;
  description: string;
  upstreamDependencies: AgentType[];
  isExternalAction: boolean;
}

export interface AgentTelemetryRecord {
  agentType: AgentType;
  name: string;
  number: number;
  status: AgentHealthStatus;
  lastExecutionAt: Date | null;
  lastSuccessAt: Date | null;
  consecutiveFailures: number;
  averageDurationMs: number;
  currentWorkload: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  retryCount: number;
  healthCheckAt: Date;
  lastErrorDetails?: string | null;
  isAvailable: boolean;
}

// ── 2. Daily Opportunity Quota (Target: 40 Qualified Opportunities/Day) ───────

export interface DailyQuotaMetrics {
  target: number; // Constant: 40
  date: string; // YYYY-MM-DD
  discoveredCount: number;
  uniqueCount: number;
  verifiedCount: number;
  qualifiedCount: number; // Only qualified (overallScore >= 75) count towards quota
  unverifiedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  remainingTarget: number;
  completionPercentage: number;
  unknownBudgetCount: number;
  isTargetAchieved: boolean;
}

// ── 3. Pipeline Funnel & Bottlenecks ──────────────────────────────────────────

export type PipelineStageKey =
  | "discovery"
  | "research"
  | "analysis"
  | "scoring"
  | "proposal"
  | "approval"
  | "outreach"
  | "client_response"
  | "followup";

export interface PipelineStageMetrics {
  stage: PipelineStageKey;
  displayName: string;
  totalRecords: number;
  completedRecords: number;
  pendingRecords: number;
  failedRecords: number;
  averageProcessingTimeMs: number;
  successRate: number; // 0 - 100 percentage
  latestExecutionAt: Date | null;
  errorDetails?: string[];
}

export type BottleneckSeverity = "low" | "medium" | "high" | "critical";

export interface PipelineBottleneck {
  id: string;
  stage: PipelineStageKey;
  severity: BottleneckSeverity;
  title: string;
  description: string;
  impact: string;
  evidence: string;
  recommendedAction: string;
  detectedAt: Date;
}

// ── 4. Failure Detection & Exponential Backoff Recovery ───────────────────────

export interface StalledJobRecord {
  executionId: string;
  agentType: AgentType;
  organizationId: string;
  targetEntityId?: string | null;
  startedAt: Date;
  elapsedMs: number;
  timeoutThresholdMs: number;
  retryCount: number;
  maxRetries: number;
  isEligibleForRetry: boolean;
  nextRetryAt?: Date | null;
  failureReason: string;
}

export interface RetryPolicyConfig {
  baseDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
  stalledTimeoutMs: number; // e.g. 15 minutes = 900,000 ms
}

// ── 5. Unified Approval Center ────────────────────────────────────────────────

export type ApprovalItemType = "proposal" | "outreach" | "followup";

export type ApprovalPriority = "urgent" | "high" | "normal" | "low";

export interface UnifiedApprovalItem {
  id: string;
  type: ApprovalItemType;
  opportunityId: string;
  clientName: string;
  title: string;
  channel?: string | null;
  version: number;
  priority: ApprovalPriority;
  score?: number | null;
  budgetFormatted?: string | null;
  pendingAgeHours: number;
  recommendedNextAction: string;
  summaryOrPreview: string;
  submittedAt: Date;
  status: string;
}

export interface AnilApprovalDecisionPayload {
  itemId: string;
  itemType: ApprovalItemType;
  action: "approve" | "reject" | "request_revision";
  reviewerFeedback?: string;
  userId?: string;
  userEmail?: string;
  isAnilExplicit?: boolean;
  isTrustedServerContext?: boolean;
}

// ── 6. Daily Executive Business Report ────────────────────────────────────────

export interface ExecutiveReportDiscoverySection {
  dailyTarget: number; // 40
  totalDiscovered: number;
  uniqueOpportunities: number;
  qualifiedOpportunities: number;
  unverifiedOpportunities: number;
  rejectedOpportunities: number;
  duplicateOpportunities: number;
  targetCompletionPercentage: number;
}

export interface ExecutiveReportGlobalCoverageSection {
  countryBreakdown: Record<string, number>;
  regionBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  sourcePerformance: Record<string, { discovered: number; qualified: number }>;
  sourceFailures: Record<string, number>;
}

export interface ExecutiveReportCommercialPipelineSection {
  proposalsGenerated: number;
  proposalsPendingApproval: number;
  proposalsApproved: number;
  outreachDraftsGenerated: number;
  outreachAwaitingApproval: number;
  messagesActuallyDispatched: number;
  clientResponsesReceived: number;
  followupsDue: number;
  followupsAwaitingApproval: number;
  confirmedWins: number;
  totalPipelineValue: number;
  currency: string;
}

export interface ExecutiveReportAgentTelemetrySection {
  fleetStatus: Record<AgentType, AgentTelemetryRecord>;
  totalFleetExecutions: number;
  totalFleetFailures: number;
  averageExecutionDurationMs: number;
}

export interface TopOpportunityCandidate {
  opportunityId: string;
  title: string;
  clientName: string;
  category: string;
  score: number;
  grade: string;
  budgetFormatted: string;
  rationale: string;
}

export interface ExecutiveReportRecommendationsSection {
  topThreeOpportunities: TopOpportunityCandidate[];
  highestPriorityResponses: Array<{
    responseId: string;
    sender: string;
    classification: ClientResponseClassification;
    summary: string;
    recommendedAction: string;
  }>;
  approvalItemsRequiringAnil: UnifiedApprovalItem[];
  pipelineBottlenecks: PipelineBottleneck[];
  recommendedCorrectiveActions: string[];
}

export interface DailyExecutiveReportData {
  organizationId: string;
  reportDate: string; // YYYY-MM-DD
  isSimulatedData: boolean;
  dataSourceLabel: "production_verified" | "testing_in_memory" | "staged_sandbox";
  generatedAt: Date;
  executiveSummary: string;
  discovery: ExecutiveReportDiscoverySection;
  globalCoverage: ExecutiveReportGlobalCoverageSection;
  commercialPipeline: ExecutiveReportCommercialPipelineSection;
  agentPerformance: ExecutiveReportAgentTelemetrySection;
  recommendations: ExecutiveReportRecommendationsSection;
  dispatchedToAnilAt?: Date | null;
}

// ── 7. Orchestration & Prerequisites ──────────────────────────────────────────

export interface AgentPrerequisiteCheckResult {
  allowed: boolean;
  missingPrerequisites: string[];
  message: string;
}

export interface OrchestrationTaskParams {
  organizationId: string;
  agentType: AgentType;
  targetEntityId?: string;
  targetEntityType?: "opportunity" | "proposal" | "batch" | "report";
  inputPayload?: Record<string, unknown>;
  triggerSource?: "scheduled" | "manual" | "event" | "webhook";
}
