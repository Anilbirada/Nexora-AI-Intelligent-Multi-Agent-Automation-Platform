/**
 * NEXGEN GLOBAL AI — Dashboard Intelligence & Telemetry Metrics
 *
 * Computes executive business indicators and tracks daily quota progress:
 * Target: 40 genuine qualified software projects daily.
 */

export type DashboardExecutiveMetrics = {
  dailyTargetQualified: number; // 40
  progressTowardsDailyTarget: number; // e.g. 87.5%
  isTargetMet: boolean;
  totalProjectsDiscovered: number;
  verifiedProjectsCount: number;
  qualifiedProjectsCount: number;
  unverifiedProjectsCount: number;
  rejectedProjectsCount: number;
  duplicateProjectsCount: number;
  averageOpportunityScore: number;
  countryWiseBreakdown: Record<string, number>;
  categoryWiseBreakdown: Record<string, number>;
  clientResearchStatus: {
    verifiedEnterprise: number;
    establishedBusiness: number;
    earlyStageStartup: number;
    unverified: number;
    highRiskBlocked: number;
  };
  agentExecutionStatus: {
    hunterStatus: "active" | "idle" | "error";
    researcherStatus: "active" | "idle" | "error";
    analyzerStatus: "active" | "idle" | "error";
    scoringStatus: "active" | "idle" | "error";
    lastRunAt?: Date;
    totalExecutions: number;
    failureCount: number;
  };
  apiUsageAndErrors: {
    totalRequests: number;
    errorRatePercent: number;
    estimatedCostUSD: number;
  };
};

export class DashboardMetricsCalculator {
  public static readonly DAILY_QUALIFIED_TARGET = 40;

  public static calculate(params: {
    totalDiscovered: number;
    qualifiedListings: Array<{
      category: string;
      country?: string;
      isVerified: boolean;
      credibilityTier?: string;
      overallScore?: number;
    }>;
    duplicateCount: number;
    suspiciousCount: number;
    expiredCount: number;
    agentExecutions?: Array<{
      agentType: string;
      status: string;
      startedAt: Date;
      errorDetails?: string | null;
      costEstimate?: number;
    }>;
  }): DashboardExecutiveMetrics {
    const qualifiedCount = params.qualifiedListings.length;
    const progress = Math.min(100, Math.round((qualifiedCount / this.DAILY_QUALIFIED_TARGET) * 1000) / 10);
    const isTargetMet = qualifiedCount >= this.DAILY_QUALIFIED_TARGET;

    // Country Breakdown
    const countryWise: Record<string, number> = {};
    const categoryWise: Record<string, number> = {};
    let unverifiedCount = 0;
    let verifiedCount = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    const researchStatus = {
      verifiedEnterprise: 0,
      establishedBusiness: 0,
      earlyStageStartup: 0,
      unverified: 0,
      highRiskBlocked: params.suspiciousCount,
    };

    for (const item of params.qualifiedListings) {
      // Country
      const country = item.country || "Global / Unspecified";
      countryWise[country] = (countryWise[country] || 0) + 1;

      // Category
      categoryWise[item.category] = (categoryWise[item.category] || 0) + 1;

      // Verification & Credibility Tier
      if (item.isVerified) {
        verifiedCount++;
      } else {
        unverifiedCount++;
      }

      if (item.overallScore !== undefined) {
        scoreSum += item.overallScore;
        scoreCount++;
      }

      const tier = item.credibilityTier || (item.isVerified ? "established_business" : "unverified_individual");
      if (tier === "verified_enterprise") researchStatus.verifiedEnterprise++;
      else if (tier === "established_business") researchStatus.establishedBusiness++;
      else if (tier === "early_stage_startup") researchStatus.earlyStageStartup++;
      else researchStatus.unverified++;
    }

    const averageOpportunityScore =
      scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0;

    // Agent Executions & Telemetry
    const executions = params.agentExecutions || [];
    let failureCount = 0;
    let totalCostUSD = 0;
    let lastRunAt: Date | undefined;

    for (const exec of executions) {
      if (exec.status === "failed") failureCount++;
      if (exec.costEstimate) totalCostUSD += exec.costEstimate;
      if (!lastRunAt || exec.startedAt > lastRunAt) {
        lastRunAt = exec.startedAt;
      }
    }

    const totalRequests = params.totalDiscovered + executions.length;
    const errorRatePercent = totalRequests > 0 ? Math.round((failureCount / totalRequests) * 1000) / 10 : 0;

    return {
      dailyTargetQualified: this.DAILY_QUALIFIED_TARGET,
      progressTowardsDailyTarget: progress,
      isTargetMet,
      totalProjectsDiscovered: params.totalDiscovered,
      verifiedProjectsCount: verifiedCount,
      qualifiedProjectsCount: qualifiedCount,
      unverifiedProjectsCount: unverifiedCount,
      rejectedProjectsCount: params.suspiciousCount + params.expiredCount,
      duplicateProjectsCount: params.duplicateCount,
      averageOpportunityScore,
      countryWiseBreakdown: countryWise,
      categoryWiseBreakdown: categoryWise,
      clientResearchStatus: researchStatus,
      agentExecutionStatus: {
        hunterStatus: "active",
        researcherStatus: "active",
        analyzerStatus: "active",
        scoringStatus: "active",
        lastRunAt,
        totalExecutions: executions.length,
        failureCount,
      },
      apiUsageAndErrors: {
        totalRequests,
        errorRatePercent,
        estimatedCostUSD: Math.round(totalCostUSD * 100) / 100,
      },
    };
  }
}
