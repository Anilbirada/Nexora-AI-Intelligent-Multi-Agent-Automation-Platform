/**
 * NEXGEN GLOBAL AI — Agent 5: AI Proposal Generator Types & Interfaces
 */

import type {
  ProjectMilestone,
  StructuredProjectAnalysis,
  TechnicalComplexityLevel,
} from "../analyzer/types";
import type { DetailedScoringReport } from "../scoring/types";
import type { ResearchedClientProfile } from "../researcher/types";
import type { ProposalMilestone, ProposalStatus } from "../../schema";

export type ProposalClientInfo = {
  name: string;
  domain?: string;
  country?: string;
  industry?: string;
  isVerified: boolean;
};

export type RequirementsUnderstanding = {
  businessRequirements: string[];
  technicalRequirements: string[];
  missingInformation: string[];
  assumptions: string[];
};

export type ProposedSolutionOverview = {
  summary: string;
  architecturalPattern: string;
  keyCapabilities: string[];
};

export type ProposalTechnicalArchitecture = {
  overview: string;
  frontend: string;
  backend: string;
  database: string;
  apis: string;
  aiMlComponents?: string;
  infrastructure: string;
};

export type ProposalBudgetBreakdown = {
  recommendedCost: number;
  currency: string;
  budgetType: "fixed_price" | "hourly" | "retainer" | "unknown";
  clientBudgetStatus: "disclosed" | "unknown";
  clientDisclosedRange?: {
    min?: number | null;
    max?: number | null;
  };
  pricingModelExplanation: string;
  disclaimer: string;
};

export type ProposalEstimatedTimeline = {
  weeksMin: number;
  weeksMax: number;
  estimatedTimelineDays: number;
  disclaimer: string;
};

export type ProposalDeliveryRisk = {
  risk: string;
  category: "technical" | "scope" | "integration" | "compliance" | "timeline";
  severity: "low" | "medium" | "high";
  mitigation: string;
};

export type StructuredProposalDocument = {
  title: string;
  version: number;
  opportunityId: string;
  organizationId: string;
  clientInfo: ProposalClientInfo;
  executiveSummary: string;
  requirementsUnderstanding: RequirementsUnderstanding;
  proposedSolution: ProposedSolutionOverview;
  technicalArchitecture: ProposalTechnicalArchitecture;
  recommendedTechStack: string[];
  developmentMethodology: string;
  milestones: ProposalMilestone[];
  deliverables: string[];
  estimatedTimeline: ProposalEstimatedTimeline;
  budgetRecommendation: ProposalBudgetBreakdown;
  assumptions: string[];
  exclusions: string[];
  risksAndMitigation: ProposalDeliveryRisk[];
  closingStatement: string;
  revisionNotes?: string;
  metadata: {
    aiModel: string;
    executionMode: "DETERMINISTIC" | "LLM_LIVE" | "LLM_FALLBACK" | "SIMULATED" | "FIXTURE";
    actualProvider?: string;
    tokenUsage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    estimatedCostUSD?: number;
    fallbackStatus?: "none" | "active" | "recovered";
    fallbackReason?: string;
    generationDurationMs: number;
    tokensUsed: number;
    generatedAt: Date;
    qualificationGrade: string;
    overallScore: number;
    status: ProposalStatus;
  };
};

export type ProposalGenerationInput = {
  organizationId: string;
  opportunityId: string;
  title: string;
  description: string;
  category: string;
  sourcePlatform: string;
  sourceUrl?: string;
  currency?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  analysis: StructuredProjectAnalysis;
  scoring: DetailedScoringReport;
  clientProfile?: ResearchedClientProfile;
  version?: number;
  revisionFeedback?: string;
};
