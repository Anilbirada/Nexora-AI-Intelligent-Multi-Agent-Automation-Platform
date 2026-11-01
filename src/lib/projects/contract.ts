/**
 * NEXGEN GLOBAL AI — API Contracts, Domain Types & Validation Rules
 */

export const PROJECT_CATEGORIES = [
  "web_development",
  "mobile_development",
  "ai_machine_learning",
  "cloud_devops",
  "enterprise_systems",
  "blockchain_web3",
  "cybersecurity",
  "embedded_iot",
  "api_backend",
  "fullstack",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_SOURCE_PLATFORMS = [
  "upwork",
  "freelancer",
  "github",
  "reddit",
  "rfp",
  "linkedin",
  "contra",
  "hackernews",
  "direct",
  "other",
] as const;

export type ProjectSourcePlatform = (typeof PROJECT_SOURCE_PLATFORMS)[number];

export const OPPORTUNITY_STATUSES = [
  "discovered",
  "analyzing",
  "scored",
  "proposal_generating",
  "pending_approval",
  "approved",
  "rejected",
  "outreach_queued",
  "contacted",
  "archived",
] as const;

export type ProjectOpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const PROPOSAL_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "revision_requested",
  "dispatched",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const AGENT_TYPES = [
  "global_project_hunter",
  "client_researcher",
  "project_analyzer",
  "opportunity_scoring",
  "proposal_generator",
  "outreach_manager",
  "followup_manager",
  "ai_project_manager",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export const QUALIFICATION_THRESHOLD_SCORE = 75.0; // Score >= 75 is qualified
export const DAILY_QUALIFIED_TARGET_QUOTA = 40;     // Daily target: 40 qualified projects

// ── Scoring Weights ──────────────────────────────────────────────────────────

export const SCORING_WEIGHTS = {
  budgetViability: 0.25,
  techStackAlignment: 0.25,
  clientLegitimacy: 0.20,
  competitionFactor: 0.15,
  timelineFeasibility: 0.15,
} as const;

export type ScoreBreakdown = {
  budgetViabilityScore: number;
  techStackAlignmentScore: number;
  clientLegitimacyScore: number;
  competitionScore: number;
  timelineFeasibilityScore: number;
};

/**
 * Validates that all individual scoring factors fall within the [0, 100] range.
 */
export function validateScoreFactors(scores: ScoreBreakdown): void {
  const factors: [string, number][] = [
    ["budgetViabilityScore", scores.budgetViabilityScore],
    ["techStackAlignmentScore", scores.techStackAlignmentScore],
    ["clientLegitimacyScore", scores.clientLegitimacyScore],
    ["competitionScore", scores.competitionScore],
    ["timelineFeasibilityScore", scores.timelineFeasibilityScore],
  ];

  for (const [factorName, value] of factors) {
    if (typeof value !== "number" || isNaN(value)) {
      throw new Error(`Invalid score for ${factorName}: must be a valid number`);
    }
    if (value < 0 || value > 100) {
      throw new Error(`Invalid score for ${factorName} (${value}): must be between 0 and 100`);
    }
  }
}

/**
 * Validates budget minimum and maximum boundaries.
 */
export function validateBudgetRange(min?: number | null, max?: number | null): void {
  if (min !== undefined && min !== null) {
    if (min < 0) throw new Error(`Estimated minimum budget (${min}) cannot be negative`);
  }
  if (max !== undefined && max !== null) {
    if (max < 0) throw new Error(`Estimated maximum budget (${max}) cannot be negative`);
  }
  if (min !== undefined && min !== null && max !== undefined && max !== null) {
    if (max < min) {
      throw new Error(`Estimated maximum budget (${max}) cannot be less than minimum budget (${min})`);
    }
  }
}

/**
 * Validates that project timeline is positive.
 */
export function validateTimeline(timelineDays?: number | null, durationWeeks?: number | null): void {
  if (timelineDays !== undefined && timelineDays !== null && timelineDays <= 0) {
    throw new Error(`Timeline days (${timelineDays}) must be greater than zero`);
  }
  if (durationWeeks !== undefined && durationWeeks !== null && durationWeeks <= 0) {
    throw new Error(`Duration weeks (${durationWeeks}) must be greater than zero`);
  }
}

export function calculateWeightedOverallScore(scores: ScoreBreakdown): number {
  validateScoreFactors(scores);

  const overall =
    scores.budgetViabilityScore * SCORING_WEIGHTS.budgetViability +
    scores.techStackAlignmentScore * SCORING_WEIGHTS.techStackAlignment +
    scores.clientLegitimacyScore * SCORING_WEIGHTS.clientLegitimacy +
    scores.competitionScore * SCORING_WEIGHTS.competitionFactor +
    scores.timelineFeasibilityScore * SCORING_WEIGHTS.timelineFeasibility;

  return Math.round(overall * 100) / 100;
}

export function determineQualificationGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score < 0 || score > 100) {
    throw new Error(`Invalid overall score (${score}): must be between 0 and 100`);
  }
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ── Request & Response Contract Types ─────────────────────────────────────────

export type DiscoveredProjectInput = {
  title: string;
  description: string;
  category: ProjectCategory;
  subcategories?: string[];
  sourcePlatform: ProjectSourcePlatform;
  sourceUrl?: string;
  sourceExternalId?: string;
  clientName?: string;
  clientDomain?: string;
  clientCountry?: string;
  clientRegion?: string;
  estimatedBudgetMin?: number;
  estimatedBudgetMax?: number;
  currency?: string;
  budgetType?: "fixed_price" | "hourly" | "retainer" | "unknown";
  requiredSkills?: string[];
  scopeComplexity?: "low" | "medium" | "high" | "enterprise";
  timelineDays?: number;
  urgency?: "urgent" | "normal" | "low";
  rawPayload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type ProposalMilestone = {
  phase: number;
  title: string;
  deliverables: string[];
  durationWeeks: number;
  costEstimate: number;
};

export type ProposalApprovalAction = {
  proposalId: string;
  action: "approve" | "reject" | "request_revision";
  notes?: string;
  reviewerFeedback?: string;
  approvedDispatchChannel?: "email" | "linkedin" | "whatsapp" | "portal";
};
