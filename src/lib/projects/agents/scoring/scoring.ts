/**
 * NEXGEN GLOBAL AI — Agent 4: Opportunity Scoring Agent
 *
 * Scoring Matrix:
 * - Budget Viability: 25%
 * - Technology Alignment: 25%
 * - Client Legitimacy: 20%
 * - Competition Factor: 15% (Higher score = Favorable competitive landscape / high barrier to entry)
 * - Timeline Feasibility: 15%
 * Total: 100%
 *
 * Qualification Rules:
 * - Overall score >= 75 for qualification.
 * - Unknown budget receives a neutral baseline score (55) rather than automatic zero.
 * - Suspicious or high-risk projects are hard disqualified regardless of numerical score.
 * - Detailed evidence references and factor explanations for full auditability.
 */

import {
  SCORING_WEIGHTS,
  determineQualificationGrade,
  validateScoreFactors,
} from "../../contract";
import type { QualifiedHunterProject } from "../hunter/hunter";
import type { ResearchedClientProfile } from "../researcher/types";
import type { StructuredProjectAnalysis } from "../analyzer/types";
import type {
  DetailedScoringReport,
  FactorEvaluation,
  ScoringActionRecommendation,
  ScoringWeightsConfig,
} from "./types";

export class OpportunityScoringAgent {
  public static readonly DEFAULT_QUALIFICATION_THRESHOLD = 75;
  private readonly weights: ScoringWeightsConfig;
  private readonly qualificationThreshold: number;

  constructor(options?: {
    weights?: Partial<ScoringWeightsConfig>;
    threshold?: number;
  }) {
    this.weights = {
      budgetViability: options?.weights?.budgetViability ?? SCORING_WEIGHTS.budgetViability,
      techStackAlignment: options?.weights?.techStackAlignment ?? SCORING_WEIGHTS.techStackAlignment,
      clientLegitimacy: options?.weights?.clientLegitimacy ?? SCORING_WEIGHTS.clientLegitimacy,
      competitionFactor: options?.weights?.competitionFactor ?? SCORING_WEIGHTS.competitionFactor,
      timelineFeasibility: options?.weights?.timelineFeasibility ?? SCORING_WEIGHTS.timelineFeasibility,
    };

    // Ensure weights normalize to 1.0
    const sum =
      this.weights.budgetViability +
      this.weights.techStackAlignment +
      this.weights.clientLegitimacy +
      this.weights.competitionFactor +
      this.weights.timelineFeasibility;

    if (Math.abs(sum - 1.0) > 0.001) {
      throw new Error(`Scoring weights must sum to 1.0 (current sum: ${sum})`);
    }

    this.qualificationThreshold = options?.threshold ?? OpportunityScoringAgent.DEFAULT_QUALIFICATION_THRESHOLD;
  }

  /**
   * Scores an opportunity using the 5-factor matrix and generates a transparent explanation.
   */
  public async scoreOpportunity(params: {
    project: QualifiedHunterProject;
    clientProfile?: ResearchedClientProfile;
    analysis?: StructuredProjectAnalysis;
  }): Promise<DetailedScoringReport> {
    const { project, clientProfile, analysis } = params;
    const missingInfo: string[] = [];

    // 1. Evaluate Budget Viability (25%)
    const budgetEval = this.evaluateBudgetViability(project, analysis);
    if (budgetEval.missingInformation) missingInfo.push(...budgetEval.missingInformation);

    // 2. Evaluate Technology Alignment (25%)
    const techEval = this.evaluateTechnologyAlignment(project, analysis);

    // 3. Evaluate Client Legitimacy (20%)
    const clientEval = this.evaluateClientLegitimacy(clientProfile, project);
    if (clientEval.missingInformation) missingInfo.push(...clientEval.missingInformation);

    // 4. Evaluate Competition Factor (15%)
    // Direction: Higher score = Favorable environment (e.g. niche tech, direct inquiry, high engineering moat)
    const compEval = this.evaluateCompetition(project, analysis);

    // 5. Evaluate Timeline Feasibility (15%)
    const timelineEval = this.evaluateTimelineFeasibility(project, analysis);

    // Ensure all scores obey [0, 100] constraints
    validateScoreFactors({
      budgetViabilityScore: budgetEval.score,
      techStackAlignmentScore: techEval.score,
      clientLegitimacyScore: clientEval.score,
      competitionScore: compEval.score,
      timelineFeasibilityScore: timelineEval.score,
    });

    // Calculate Weighted Score
    const rawWeighted =
      budgetEval.score * this.weights.budgetViability +
      techEval.score * this.weights.techStackAlignment +
      clientEval.score * this.weights.clientLegitimacy +
      compEval.score * this.weights.competitionFactor +
      timelineEval.score * this.weights.timelineFeasibility;

    const overallScore = Math.round(rawWeighted * 100) / 100;
    const qualificationGrade = determineQualificationGrade(overallScore);

    // Hard Disqualification Check (Safety Overrides)
    let isDisqualified = false;
    let disqualificationReason: string | undefined;

    if (clientProfile && clientProfile.credibilityTier === "high_risk") {
      isDisqualified = true;
      disqualificationReason = `Hard Disqualification: Client flagged as high-risk (${clientProfile.riskFlags.join("; ") || "unverified disposable footprint"}).`;
    }

    if (project.budgetMin !== undefined && project.budgetMin < 0) {
      isDisqualified = true;
      disqualificationReason = "Hard Disqualification: Invalid negative budget boundaries.";
    }

    const isQualified = !isDisqualified && overallScore >= this.qualificationThreshold;

    // Recommended Action
    let recommendedAction: ScoringActionRecommendation = "pass";
    if (isQualified) {
      recommendedAction = overallScore >= 88 ? "priority_proposal" : "standard_proposal";
    } else if (!isDisqualified && overallScore >= 65) {
      recommendedAction = "monitor";
    }

    // Confidence Level
    const confidenceLevel = Math.max(
      0.5,
      Math.min(0.98, (clientProfile?.credibilityScore || 60) / 100 * 0.4 + (analysis?.confidenceLevel || 0.7) * 0.6),
    );

    const summaryReasoning = isDisqualified
      ? disqualificationReason!
      : `Opportunity evaluated at ${overallScore}/100 (Grade ${qualificationGrade}). ` +
        `Budget: ${budgetEval.score}/100, Tech Alignment: ${techEval.score}/100, ` +
        `Client Legitimacy: ${clientEval.score}/100, Competition: ${compEval.score}/100, ` +
        `Timeline: ${timelineEval.score}/100. Recommendation: ${recommendedAction.toUpperCase().replace(/_/g, " ")}.`;

    return {
      overallScore,
      qualificationGrade,
      isQualified,
      isDisqualified,
      disqualificationReason,
      confidenceLevel: Math.round(confidenceLevel * 100) / 100,
      recommendedAction,
      factors: {
        budgetViability: budgetEval,
        techStackAlignment: techEval,
        clientLegitimacy: clientEval,
        competition: compEval,
        timelineFeasibility: timelineEval,
      },
      summaryReasoning,
      scoredByAgent: "Opportunity Scoring Agent",
      missingInformation: Array.from(new Set(missingInfo)),
      scoredAt: new Date(),
    };
  }

  private evaluateBudgetViability(
    project: QualifiedHunterProject,
    analysis?: StructuredProjectAnalysis,
  ): FactorEvaluation {
    const min = project.budgetMin;
    const max = project.budgetMax;

    // RULE: Unknown budget must NEVER automatically receive zero!
    if (min === undefined && max === undefined) {
      return {
        factorName: "Budget Viability",
        score: 55.0, // Neutral baseline
        weight: this.weights.budgetViability,
        reasoning: "Client budget is undisclosed; assigned neutral baseline score (55.0/100) pending commercial discovery.",
        evidenceReferences: [project.sourceUrl],
        missingInformation: ["Exact client budget range undisclosed in public listing"],
      };
    }

    const effectiveBudget = max ?? min ?? 0;
    const complexity = analysis?.complexityLevel ?? "medium";

    // Compare budget to estimated architectural scope
    let score = 60;
    let reasoning = `Disclosed budget (${project.currency} ${effectiveBudget.toLocaleString()}) `;

    if (complexity === "enterprise") {
      if (effectiveBudget >= 40000) {
        score = 95;
        reasoning += "adequately covers enterprise architectural scope.";
      } else if (effectiveBudget >= 25000) {
        score = 80;
        reasoning += "is moderate for enterprise scope.";
      } else {
        score = 45;
        reasoning += "is low relative to enterprise scope.";
      }
    } else if (complexity === "high") {
      if (effectiveBudget >= 20000) {
        score = 92;
        reasoning += "aligns well with high-complexity delivery.";
      } else if (effectiveBudget >= 12000) {
        score = 78;
        reasoning += "is acceptable for high-complexity delivery.";
      } else {
        score = 50;
        reasoning += "is constrained relative to high-complexity requirements.";
      }
    } else {
      // medium or low
      if (effectiveBudget >= 8000) {
        score = 90;
        reasoning += "fully supports project delivery.";
      } else if (effectiveBudget >= 3000) {
        score = 75;
        reasoning += "is viable for medium-scale requirements.";
      } else {
        score = 40;
        reasoning += "presents margin compression risks.";
      }
    }

    return {
      factorName: "Budget Viability",
      score,
      weight: this.weights.budgetViability,
      reasoning,
      evidenceReferences: [project.sourceUrl],
    };
  }

  private evaluateTechnologyAlignment(
    project: QualifiedHunterProject,
    analysis?: StructuredProjectAnalysis,
  ): FactorEvaluation {
    const agencyCore = new Set([
      "genai", "llm", "rag", "langchain", "llamaindex", "fastapi", "python",
      "typescript", "next.js", "react", "react native", "node.js", "postgresql",
      "docker", "kubernetes", "aws", "gcp", "devops", "microservices", "kafka",
    ]);

    const combinedSkills = [
      ...project.requiredSkills,
      ...(analysis?.technologyRecommendations.coreStack || []),
    ].map((s) => s.toLowerCase());

    let matchCount = 0;
    for (const skill of combinedSkills) {
      if (agencyCore.has(skill) || Array.from(agencyCore).some((core) => skill.includes(core))) {
        matchCount++;
      }
    }

    let score = 50 + matchCount * 10;
    // Category bonus
    if (project.primaryCategory === "genai" || project.primaryCategory === "ai_machine_learning") {
      score += 15;
    } else if (project.primaryCategory === "saas" || project.primaryCategory === "cloud_devops") {
      score += 10;
    }

    score = Math.max(20, Math.min(100, score));

    return {
      factorName: "Technology Alignment",
      score,
      weight: this.weights.techStackAlignment,
      reasoning: `Strong engineering alignment with NEXGEN capabilities (${matchCount} core stack matches detected in ${project.primaryCategory}).`,
      evidenceReferences: [project.sourceUrl],
    };
  }

  private evaluateClientLegitimacy(
    clientProfile?: ResearchedClientProfile,
    project?: QualifiedHunterProject,
  ): FactorEvaluation {
    if (!clientProfile) {
      return {
        factorName: "Client Legitimacy",
        score: 45.0,
        weight: this.weights.clientLegitimacy,
        reasoning: "Client profile has not been researched yet; assigned default unverified baseline score.",
        evidenceReferences: project?.sourceUrl ? [project.sourceUrl] : [],
        missingInformation: ["Client background research has not been performed"],
      };
    }

    const score = Math.max(5, Math.min(100, clientProfile.credibilityScore));
    return {
      factorName: "Client Legitimacy",
      score,
      weight: this.weights.clientLegitimacy,
      reasoning: `Credibility tier evaluated as "${clientProfile.credibilityTier.replace(/_/g, " ")}" with ${clientProfile.evidenceUrls.length} verifiable citations.`,
      evidenceReferences: clientProfile.evidenceUrls.map((e) => e.sourceUrl),
      missingInformation: clientProfile.missingInformation,
    };
  }

  private evaluateCompetition(
    project: QualifiedHunterProject,
    analysis?: StructuredProjectAnalysis,
  ): FactorEvaluation {
    // DIRECTION: Higher score = favorable competitive environment (low competition, high engineering moat)
    // Low score = intense commodity bidding / race-to-the-bottom
    let score = 70; // baseline favorable
    let reasoning = "";

    const complexity = analysis?.complexityLevel ?? "medium";

    if (complexity === "enterprise" || complexity === "high") {
      // High barrier to entry: few generic freelancers can deliver HIPAA/SOC2/distributed microservices
      score += 18;
      reasoning = "High technical barrier to entry significantly insulates against commodity low-cost competition.";
    } else {
      score -= 10;
      reasoning = "Standard software scope invites broader competition; requires differentiated technical proposal.";
    }

    // Source platform influence
    if (project.sourcePlatform === "github" || project.sourcePlatform === "rfp" || project.sourcePlatform === "direct") {
      score += 12;
      reasoning += ` Source platform (${project.sourcePlatform}) exhibits lower proposal saturation.`;
    } else if (project.sourcePlatform === "freelancer") {
      score -= 15;
      reasoning += " Source platform exhibits high bidding volume; requires accelerated outreach.";
    }

    score = Math.max(15, Math.min(100, score));

    return {
      factorName: "Competition Factor",
      score,
      weight: this.weights.competitionFactor,
      reasoning,
      evidenceReferences: [project.sourceUrl],
    };
  }

  private evaluateTimelineFeasibility(
    project: QualifiedHunterProject,
    analysis?: StructuredProjectAnalysis,
  ): FactorEvaluation {
    const estimatedDays = analysis?.estimatedDuration.estimatedTimelineDays ?? 45;
    const requestedDeadline = project.deadline;

    if (!requestedDeadline) {
      return {
        factorName: "Timeline Feasibility",
        score: 80.0,
        weight: this.weights.timelineFeasibility,
        reasoning: "Flexible client timeline allows optimal milestone scheduling without delivery compression.",
        evidenceReferences: [project.sourceUrl],
      };
    }

    const daysUntilDeadline = (new Date(requestedDeadline).getTime() - Date.now()) / (1000 * 3600 * 24);

    if (daysUntilDeadline <= 0) {
      return {
        factorName: "Timeline Feasibility",
        score: 10.0,
        weight: this.weights.timelineFeasibility,
        reasoning: "Requested deadline has already passed; unviable delivery schedule.",
        evidenceReferences: [project.sourceUrl],
      };
    }

    let score = 85;
    if (daysUntilDeadline >= estimatedDays * 0.9) {
      score = 95;
    } else if (daysUntilDeadline >= estimatedDays * 0.6) {
      score = 75;
    } else {
      score = 35; // Severely compressed schedule
    }

    return {
      factorName: "Timeline Feasibility",
      score,
      weight: this.weights.timelineFeasibility,
      reasoning: `Timeline ratio: ${Math.round(daysUntilDeadline)} days requested vs ${estimatedDays} days estimated.`,
      evidenceReferences: [project.sourceUrl],
    };
  }
}
