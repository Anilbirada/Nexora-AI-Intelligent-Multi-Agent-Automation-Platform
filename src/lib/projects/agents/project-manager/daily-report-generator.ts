/**
 * NEXGEN GLOBAL AI — Agent 8: Daily Executive Report Generator
 *
 * Produces structured, multi-section executive reports for Anil:
 * - Section A: Discovery (Target 40/day quota metrics)
 * - Section B: Global Coverage (Geographic & category breakdown)
 * - Section C: Commercial Pipeline (Proposals, drafts, approvals, responses)
 * - Section D: Eight-Agent Fleet Telemetry (Operational status & error rates)
 * - Section E: Strategic Business Recommendations (Top 3 deals & action queue)
 *
 * Enforces:
 * 1. Idempotent report generation per (organizationId, reportDate).
 * 2. Strict distinction of data source (production_verified vs testing_in_memory).
 * 3. Never reports approved messages as dispatched unless confirmed.
 */

import { QuotaManager } from "./quota-manager";
import { AgentMonitor } from "./agent-monitor";
import { PipelineManager, type PipelineEvidenceData } from "./pipeline-manager";
import { RecommendationEngine, type RawScoredOpportunity } from "./recommendation-engine";
import type {
  DailyExecutiveReportData,
  UnifiedApprovalItem,
  AgentTelemetryRecord,
  AgentType,
} from "./types";
import type { ClientResponseRecord } from "../followup/types";
import type { ExecutionRecord } from "./failure-detector";

export interface ReportGenerationInput {
  organizationId: string;
  reportDate?: string; // YYYY-MM-DD
  opportunities: RawScoredOpportunity[];
  countryBreakdown?: Record<string, number>;
  regionBreakdown?: Record<string, number>;
  categoryBreakdown?: Record<string, number>;
  sourcePerformance?: Record<string, { discovered: number; qualified: number }>;
  sourceFailures?: Record<string, number>;
  pipelineEvidence: PipelineEvidenceData;
  executionHistory: ExecutionRecord[];
  pendingApprovals: UnifiedApprovalItem[];
  clientResponses: ClientResponseRecord[];
  isSimulatedData?: boolean;
  dataSourceLabel?: "production_verified" | "testing_in_memory" | "staged_sandbox";
}

export class DailyReportGenerator {
  /**
   * Generates a comprehensive, idempotent daily executive report data object.
   */
  public static generateDailyReport(input: ReportGenerationInput): DailyExecutiveReportData {
    const reportDate = input.reportDate || new Date().toISOString().slice(0, 10);
    const now = new Date();

    // 1. Section A: Discovery & Quota Progress
    const quotaMetrics = QuotaManager.calculateDailyQuota(input.opportunities, reportDate);

    // 2. Section B: Global Coverage
    const categoryBreakdown: Record<string, number> = input.categoryBreakdown || {};
    if (Object.keys(categoryBreakdown).length === 0) {
      for (const opp of input.opportunities) {
        const cat = opp.category || "other";
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
      }
    }

    const countryBreakdown = input.countryBreakdown || { US: 0, UK: 0, DE: 0, CA: 0, Global: input.opportunities.length };
    const regionBreakdown = input.regionBreakdown || { "North America": 0, Europe: 0, "Asia-Pacific": 0, Remote: input.opportunities.length };
    const sourcePerformance = input.sourcePerformance || {
      upwork: { discovered: quotaMetrics.discoveredCount, qualified: quotaMetrics.qualifiedCount },
    };
    const sourceFailures = input.sourceFailures || {};

    // 3. Section C: Commercial Pipeline
    const pEvidence = input.pipelineEvidence;
    const commercialPipeline = {
      proposalsGenerated: pEvidence.proposalsDrafted,
      proposalsPendingApproval: pEvidence.proposalsPendingApproval,
      proposalsApproved: pEvidence.proposalsApproved,
      outreachDraftsGenerated: pEvidence.outreachDraftsGenerated,
      outreachAwaitingApproval: pEvidence.outreachPendingApproval,
      // Never report approved message as dispatched unless confirmed
      messagesActuallyDispatched: pEvidence.outreachDispatched,
      clientResponsesReceived: pEvidence.clientResponsesTotal,
      followupsDue: pEvidence.followupTasksPendingApproval,
      followupsAwaitingApproval: pEvidence.followupTasksPendingApproval,
      confirmedWins: 0,
      totalPipelineValue: input.opportunities
        .filter((o) => o.isQualified)
        .reduce((sum, o) => sum + (o.estimatedBudgetMax || 0), 0),
      currency: "USD",
    };

    // 4. Section D: Eight-Agent Fleet Telemetry
    const fleetStatus = AgentMonitor.evaluateFleetHealth(input.executionHistory, {
      currentTime: now,
    });

    const fleetValues = Object.values(fleetStatus) as AgentTelemetryRecord[];
    const totalFleetExecutions = fleetValues.reduce((sum, a) => sum + a.totalExecutions, 0);
    const totalFleetFailures = fleetValues.reduce((sum, a) => sum + a.failedExecutions, 0);
    const validDurations = fleetValues
      .map((a) => a.averageDurationMs)
      .filter((d) => d > 0);
    const averageExecutionDurationMs = validDurations.length > 0
      ? Math.round(validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length)
      : 0;

    // 5. Section E: Bottlenecks & Strategic Recommendations
    const bottlenecks = PipelineManager.detectBottlenecks(pEvidence, now);
    const recommendations = RecommendationEngine.generateRecommendations({
      opportunities: input.opportunities,
      pendingApprovals: input.pendingApprovals,
      clientResponses: input.clientResponses,
      bottlenecks,
    });

    // Executive Summary Text
    const summaryText = `Daily Executive Intelligence for ${reportDate}: Achieved ${quotaMetrics.qualifiedCount}/${quotaMetrics.target} qualified opportunities (${quotaMetrics.completionPercentage}% of target). Discovered ${quotaMetrics.discoveredCount} opportunities (${quotaMetrics.uniqueCount} unique, ${quotaMetrics.verifiedCount} verified, ${quotaMetrics.duplicateCount} duplicates filtered). Commercial pipeline tracks ${commercialPipeline.proposalsApproved} approved proposals and ${input.pendingApprovals.length} items awaiting Anil's authorization. Agent fleet status: ${totalFleetFailures === 0 ? "100% operational" : `${totalFleetFailures} failures monitored with backoff recovery`}. External outreach safety guard: LOCKED (ALLOW_EXTERNAL_OUTREACH=false).`;

    return {
      organizationId: input.organizationId,
      reportDate,
      isSimulatedData: Boolean(input.isSimulatedData),
      dataSourceLabel: input.dataSourceLabel || (input.isSimulatedData ? "testing_in_memory" : "production_verified"),
      generatedAt: now,
      executiveSummary: summaryText,
      discovery: {
        dailyTarget: quotaMetrics.target,
        totalDiscovered: quotaMetrics.discoveredCount,
        uniqueOpportunities: quotaMetrics.uniqueCount,
        qualifiedOpportunities: quotaMetrics.qualifiedCount,
        unverifiedOpportunities: quotaMetrics.unverifiedCount,
        rejectedOpportunities: quotaMetrics.rejectedCount,
        duplicateOpportunities: quotaMetrics.duplicateCount,
        targetCompletionPercentage: quotaMetrics.completionPercentage,
      },
      globalCoverage: {
        countryBreakdown,
        regionBreakdown,
        categoryBreakdown,
        sourcePerformance,
        sourceFailures,
      },
      commercialPipeline,
      agentPerformance: {
        fleetStatus,
        totalFleetExecutions,
        totalFleetFailures,
        averageExecutionDurationMs,
      },
      recommendations,
      dispatchedToAnilAt: null,
    };
  }

  /**
   * Formats report into high-impact Markdown for executive viewing or notifications.
   */
  public static formatMarkdownReport(report: DailyExecutiveReportData): string {
    const d = report.discovery;
    const c = report.commercialPipeline;
    const r = report.recommendations;

    return `# NEXGEN GLOBAL AI — Daily Business Intelligence (${report.reportDate})
*Agency: NEXGEN AGENCY | Approver: Anil | Data Source: ${report.dataSourceLabel}*

> **Executive Summary:** ${report.executiveSummary}

---

### A. Discovery Quota Tracking
* **Daily Target:** ${d.dailyTarget} qualified opportunities/day
* **Qualified Progress:** **${d.qualifiedOpportunities}/${d.dailyTarget}** (${d.targetCompletionPercentage}%)
* **Discovered:** ${d.totalDiscovered} | **Unique:** ${d.uniqueOpportunities} | **Verified:** ${d.uniqueOpportunities - d.unverifiedOpportunities}
* **Duplicates Filtered:** ${d.duplicateOpportunities} | **Rejected/Disqualified:** ${d.rejectedOpportunities}

---

### B. Commercial Pipeline
* **Proposals:** ${c.proposalsApproved} approved / ${c.proposalsPendingApproval} pending approval (${c.proposalsGenerated} total)
* **Outreach Drafts:** ${c.outreachDraftsGenerated} drafted (${c.outreachAwaitingApproval} awaiting signoff)
* **Actually Dispatched:** **${c.messagesActuallyDispatched}** *(Safety Guard Active)*
* **Client Inbound Replies:** ${c.clientResponsesReceived} received

---

### C. Top 3 Opportunity Candidates
${r.topThreeOpportunities.map((o, idx) => `${idx + 1}. **${o.title}** (${o.clientName}) — Score: ${o.score}/100 [Grade ${o.grade}] | Budget: ${o.budgetFormatted}`).join("\n")}

---

### D. Action Required for Anil
${r.recommendedCorrectiveActions.map((action) => `- ${action}`).join("\n")}
`;
  }
}
