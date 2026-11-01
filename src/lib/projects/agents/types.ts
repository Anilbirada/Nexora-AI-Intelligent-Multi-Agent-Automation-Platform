/**
 * NEXGEN GLOBAL AI — Eight-Agent Architecture Specification & Interfaces
 * 
 * Target Product Agents:
 * 1. Global Project Hunter
 * 2. Client Researcher
 * 3. Project Analyzer
 * 4. Opportunity Scoring Agent
 * 5. Proposal Generator
 * 6. Outreach Manager
 * 7. Follow-up Manager
 * 8. AI Project Manager
 */

import type {
  DiscoveredProjectInput,
  ProjectCategory,
  ProjectOpportunityStatus,
  ProposalMilestone,
  ScoreBreakdown,
} from "../contract";

// ── Agent 1: Global Project Hunter ───────────────────────────────────────────

export type HunterSourceConfig = {
  platform: string;
  enabled: boolean;
  categories: ProjectCategory[];
  keywords: string[];
  minBudgetUSD?: number;
};

export type HunterExecutionResult = {
  projectsDiscovered: number;
  newOpportunitiesCreated: number;
  duplicatesSkipped: number;
  ingestedOpportunityIds: string[];
};

// ── Agent 2: Client Researcher ────────────────────────────────────────────────

export type ClientResearchResult = {
  opportunityId: string;
  clientDomain?: string;
  companyName?: string;
  companySize?: string;
  fundingRaisedUSD?: number;
  industry?: string;
  techStackFound: string[];
  keyDecisionMakers: Array<{
    name: string;
    title: string;
    email?: string;
    linkedinUrl?: string;
    verified: boolean;
  }>;
  legitimacyScore: number; // 0-100
  notes: string;
};

// ── Agent 3: Project Analyzer ────────────────────────────────────────────────

export type ProjectAnalysisResult = {
  opportunityId: string;
  identifiedCategory: ProjectCategory;
  recommendedArchitecture: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    cloudInfra?: string[];
    aiServices?: string[];
  };
  complexity: "low" | "medium" | "high" | "enterprise";
  estimatedTeamSize: number;
  estimatedDurationWeeks: number;
  estimatedBudgetUSD: {
    min: number;
    recommended: number;
    max: number;
  };
  technicalRisks: string[];
  suggestedDeliverables: string[];
};

// ── Agent 4: Opportunity Scoring Agent ────────────────────────────────────────

export type OpportunityScoringResult = {
  opportunityId: string;
  scoreBreakdown: ScoreBreakdown;
  overallScore: number; // 0-100
  qualificationGrade: "A" | "B" | "C" | "D" | "F";
  isQualified: boolean; // >= 75
  recommendedAction: "priority_proposal" | "standard_proposal" | "monitor" | "pass";
  reasoningSummary: string;
};

// ── Agent 5: Proposal Generator ───────────────────────────────────────────────

export type ProposalGenerationInput = {
  opportunityId: string;
  technicalAnalysis: ProjectAnalysisResult;
  clientResearch?: ClientResearchResult;
  scoringResult: OpportunityScoringResult;
  organizationKnowledgeDocIds?: string[];
};

export type ProposalGenerationResult = {
  proposalId: string;
  opportunityId: string;
  version: number;
  title: string;
  executiveSummary: string;
  problemAnalysis: string;
  proposedSolution: string;
  techStackRecommendations: string[];
  milestones: ProposalMilestone[];
  estimatedDurationWeeks: number;
  totalCostEstimate: number;
  currency: string;
  status: "pending_approval"; // Strictly requires Anil's approval before sending!
};

// ── Agent 6: Outreach Manager ────────────────────────────────────────────────

export type OutreachDispatchInstruction = {
  proposalId: string;
  opportunityId: string;
  approvedBy: string; // Must be Anil / authorized owner
  channel: "email" | "linkedin" | "whatsapp" | "portal";
  recipientEmail?: string;
  recipientLinkedinUrl?: string;
  recipientPhone?: string;
  customMessageSubject?: string;
  customMessageBody: string;
};

export type OutreachDispatchResult = {
  dispatchId: string;
  dispatchedAt: string;
  status: "sent" | "queued" | "failed";
  channel: string;
  externalMessageId?: string;
};

// ── Agent 7: Follow-up Manager ───────────────────────────────────────────────

export type FollowupIntent = "positive" | "objection" | "meeting_requested" | "not_interested" | "unresponsive";

export type FollowupEvaluationResult = {
  opportunityId: string;
  crmRecordId: string;
  intent: FollowupIntent;
  daysSinceLastContact: number;
  recommendedAction: "schedule_meeting" | "draft_rebuttal" | "send_case_study" | "archive";
  draftResponseText?: string;
  requiresAnilApproval: true; // Hard constraint: all external messages need human approval
};

// ── Agent 8: AI Project Manager ──────────────────────────────────────────────

export type DailyOperationalMetrics = {
  date: string;
  projectsDiscovered: number;
  projectsQualified: number;
  dailyQuotaMet: boolean; // Target: 40
  proposalsGenerated: number;
  proposalsPendingApproval: number;
  proposalsApproved: number;
  proposalsDispatched: number;
  responsesReceived: number;
  meetingsBooked: number;
  pipelineValueUSD: number;
  agentAnomaliesDetected: string[];
};

export type DailyBusinessReportResult = {
  reportId: string;
  date: string;
  metrics: DailyOperationalMetrics;
  executiveSummary: string;
  bottlenecks: string[];
  actionItemsForAnil: string[];
};
