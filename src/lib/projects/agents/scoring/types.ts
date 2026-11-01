/**
 * NEXGEN GLOBAL AI — Agent 4: Opportunity Scoring Agent Types & Matrix
 */

export type ScoringActionRecommendation = "priority_proposal" | "standard_proposal" | "monitor" | "pass";

export type FactorEvaluation = {
  factorName: string;
  score: number; // 0 - 100
  weight: number; // 0.0 - 1.0
  reasoning: string;
  evidenceReferences: string[];
  missingInformation?: string[];
};

export type ScoringWeightsConfig = {
  budgetViability: number;
  techStackAlignment: number;
  clientLegitimacy: number;
  competitionFactor: number;
  timelineFeasibility: number;
};

export type DetailedScoringReport = {
  overallScore: number; // 0 - 100
  qualificationGrade: "A" | "B" | "C" | "D" | "F";
  isQualified: boolean;
  isDisqualified: boolean;
  disqualificationReason?: string;
  confidenceLevel: number; // 0.0 - 1.0
  recommendedAction: ScoringActionRecommendation;
  factors: {
    budgetViability: FactorEvaluation;
    techStackAlignment: FactorEvaluation;
    clientLegitimacy: FactorEvaluation;
    competition: FactorEvaluation;
    timelineFeasibility: FactorEvaluation;
  };
  summaryReasoning: string;
  scoredByAgent: string;
  missingInformation: string[];
  scoredAt: Date;
};
