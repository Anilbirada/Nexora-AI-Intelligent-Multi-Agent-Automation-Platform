/**
 * NEXGEN GLOBAL AI — Agent 8: Strategic Recommendation Engine
 *
 * Synthesizes actionable, evidence-based recommendations for Anil:
 * 1. Top three highest-potential qualified opportunities.
 * 2. Highest-priority client responses requiring human attention.
 * 3. Urgent approval items in the Unified Approval Center.
 * 4. Pipeline bottleneck corrective actions.
 */

import type {
  TopOpportunityCandidate,
  UnifiedApprovalItem,
  PipelineBottleneck,
  ExecutiveReportRecommendationsSection,
} from "./types";
import type { ClientResponseRecord } from "../followup/types";

export interface RawScoredOpportunity {
  id: string;
  title: string;
  clientName?: string | null;
  category: string;
  overallScore: number;
  qualificationGrade: string;
  estimatedBudgetMax?: number | null;
  currency?: string;
  isQualified: boolean;
  credibilityScore?: number;
}

export class RecommendationEngine {
  /**
   * Generates prioritized executive recommendations based on real database evidence.
   */
  public static generateRecommendations(params: {
    opportunities: RawScoredOpportunity[];
    pendingApprovals: UnifiedApprovalItem[];
    clientResponses: ClientResponseRecord[];
    bottlenecks: PipelineBottleneck[];
  }): ExecutiveReportRecommendationsSection {
    // 1. Identify Top 3 Opportunities
    const qualified = params.opportunities.filter((o) => o.isQualified && o.overallScore >= 75);

    // Rank by score descending, then budget descending
    const sortedOpps = [...qualified].sort((a, b) => {
      if (b.overallScore !== a.overallScore) {
        return b.overallScore - a.overallScore;
      }
      const budgetA = a.estimatedBudgetMax || 0;
      const budgetB = b.estimatedBudgetMax || 0;
      return budgetB - budgetA;
    });

    const topThreeOpportunities: TopOpportunityCandidate[] = sortedOpps.slice(0, 3).map((opp) => {
      const budgetStr = opp.estimatedBudgetMax
        ? `${opp.currency || "USD"} ${opp.estimatedBudgetMax.toLocaleString()}`
        : "Sprint Velocity / TBD";
      return {
        opportunityId: opp.id,
        title: opp.title,
        clientName: opp.clientName || "Discovered Enterprise Client",
        category: opp.category,
        score: opp.overallScore,
        grade: opp.qualificationGrade,
        budgetFormatted: budgetStr,
        rationale: `Grade ${opp.qualificationGrade} (${opp.overallScore}/100) — High technical alignment with NEXGEN capabilities and verified client profile.`,
      };
    });

    // 2. Identify Highest Priority Responses (urgent classifications first)
    const priorityClassifications = new Set([
      "interested",
      "wants_meeting",
      "negotiating_budget",
      "technical_question",
      "unrecognized",
    ]);

    const highPriorityResponses = params.clientResponses
      .filter((r) => priorityClassifications.has(r.classification))
      .slice(0, 5)
      .map((r) => ({
        responseId: r.id,
        sender: r.senderContact,
        classification: r.classification,
        summary: r.explanation || r.content.slice(0, 100),
        recommendedAction: r.recommendedAction || "Schedule direct commercial discovery call with Anil.",
      }));

    // 3. Approval items requiring Anil
    const approvalItemsRequiringAnil = params.pendingApprovals.slice(0, 10);

    // 4. Synthesize Corrective Actions from Bottlenecks
    const recommendedCorrectiveActions: string[] = [];

    if (params.pendingApprovals.length > 0) {
      recommendedCorrectiveActions.push(
        `Action Required: Anil to review ${params.pendingApprovals.length} pending items in the Unified Approval Center to unblock outreach and follow-ups.`,
      );
    }

    if (params.bottlenecks.length > 0) {
      for (const btn of params.bottlenecks) {
        recommendedCorrectiveActions.push(`${btn.title}: ${btn.recommendedAction}`);
      }
    }

    if (topThreeOpportunities.length > 0) {
      recommendedCorrectiveActions.push(
        `Prioritize outreach generation for top opportunity: "${topThreeOpportunities[0].title}" (Score: ${topThreeOpportunities[0].score}/100).`,
      );
    }

    if (recommendedCorrectiveActions.length === 0) {
      recommendedCorrectiveActions.push(
        "Agent fleet operational. Maintain discovery pipeline intake to achieve 40 qualified opportunities/day.",
      );
    }

    return {
      topThreeOpportunities,
      highestPriorityResponses: highPriorityResponses,
      approvalItemsRequiringAnil,
      pipelineBottlenecks: params.bottlenecks,
      recommendedCorrectiveActions,
    };
  }
}
