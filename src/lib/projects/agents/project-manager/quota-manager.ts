/**
 * NEXGEN GLOBAL AI — Agent 8: Quota Manager
 *
 * Tracks the enterprise business objective:
 * 40 Genuine, Qualified Opportunities per day.
 *
 * Strict Rules:
 * 1. Only genuine, unique, verified, qualified (overallScore >= 75) count towards the 40 quota.
 * 2. Never manufacture leads or inflate statistics.
 * 3. If only 18 qualified opportunities are discovered, report 18/40 (45%).
 * 4. Unknown budgets must remain unknown and NEVER automatically disqualify an opportunity.
 * 5. Accurately tracks duplicates, unverified, and rejected opportunities separately.
 */

import type { DailyQuotaMetrics } from "./types";

export interface RawOpportunityRecord {
  id: string;
  title: string;
  clientName?: string | null;
  clientDomain?: string | null;
  budgetType?: string | null;
  estimatedBudgetMin?: number | string | null;
  estimatedBudgetMax?: number | string | null;
  isVerified?: boolean;
  status: string; // "discovered" | "scored" | "rejected" | etc.
  overallScore?: number | null;
  isQualified?: boolean | null;
  isDuplicate?: boolean;
  createdAt?: Date | string;
}

export class QuotaManager {
  public static readonly DAILY_TARGET = 40;

  /**
   * Computes the daily quota metrics from an array of opportunities for a given target date.
   */
  public static calculateDailyQuota(
    opportunities: RawOpportunityRecord[],
    targetDateStr?: string,
  ): DailyQuotaMetrics {
    const targetDate = targetDateStr || new Date().toISOString().slice(0, 10);

    // Filter to opportunities created on the target date (if date info exists)
    const dailyRecords = opportunities.filter((opp) => {
      if (!opp.createdAt) return true;
      const datePart = typeof opp.createdAt === "string"
        ? opp.createdAt.slice(0, 10)
        : opp.createdAt.toISOString().slice(0, 10);
      return datePart === targetDate;
    });

    const totalDiscovered = dailyRecords.length;
    let duplicateCount = 0;
    let uniqueCount = 0;
    let verifiedCount = 0;
    let unverifiedCount = 0;
    let rejectedCount = 0;
    let qualifiedCount = 0;
    let unknownBudgetCount = 0;

    // Track seen identifiers to guarantee uniqueness
    const seenTitlesOrIds = new Set<string>();

    for (const opp of dailyRecords) {
      // 1. Check for duplicate flag or duplicate identifier
      const normalizedTitle = (opp.title || "").toLowerCase().trim();
      const isMarkedDuplicate = opp.isDuplicate === true;
      const isAlreadySeen = seenTitlesOrIds.has(opp.id) || (normalizedTitle.length > 5 && seenTitlesOrIds.has(normalizedTitle));

      if (isMarkedDuplicate || isAlreadySeen) {
        duplicateCount++;
        continue;
      }

      // Record as unique
      seenTitlesOrIds.add(opp.id);
      if (normalizedTitle.length > 5) seenTitlesOrIds.add(normalizedTitle);
      uniqueCount++;

      // 2. Budget neutrality: Track unknown budgets
      const isUnknownBudget =
        opp.budgetType === "unknown" ||
        (opp.estimatedBudgetMin == null && opp.estimatedBudgetMax == null);
      if (isUnknownBudget) {
        unknownBudgetCount++;
      }

      // 3. Verification check
      const isVerified = opp.isVerified === true || Boolean(opp.clientDomain && !opp.clientDomain.includes("free"));
      if (isVerified) {
        verifiedCount++;
      } else {
        unverifiedCount++;
      }

      // 4. Status / Qualification check
      const score = typeof opp.overallScore === "number" ? opp.overallScore : null;
      const isMarkedQualified = opp.isQualified === true || (score !== null && score >= 75);
      const isRejected = opp.status === "rejected" || (score !== null && score < 50);

      if (isRejected) {
        rejectedCount++;
      } else if (isMarkedQualified && isVerified) {
        // Strict business rule: Only genuine, unique, verified, and qualified count towards quota!
        qualifiedCount++;
      }
    }

    const remainingTarget = Math.max(0, QuotaManager.DAILY_TARGET - qualifiedCount);
    const completionPercentage = Math.round((qualifiedCount / QuotaManager.DAILY_TARGET) * 1000) / 10; // e.g. 45.0%

    return {
      target: QuotaManager.DAILY_TARGET,
      date: targetDate,
      discoveredCount: totalDiscovered,
      uniqueCount,
      verifiedCount,
      qualifiedCount,
      unverifiedCount,
      rejectedCount,
      duplicateCount,
      remainingTarget,
      completionPercentage,
      unknownBudgetCount,
      isTargetAchieved: qualifiedCount >= QuotaManager.DAILY_TARGET,
    };
  }

  /**
   * Helper to format human-readable quota progress summary.
   */
  public static formatProgressSummary(metrics: DailyQuotaMetrics): string {
    return `Daily Quota: ${metrics.qualifiedCount}/${metrics.target} qualified (${metrics.completionPercentage}%) | Discovered: ${metrics.discoveredCount} | Unique: ${metrics.uniqueCount} | Verified: ${metrics.verifiedCount} | Unverified: ${metrics.unverifiedCount} | Rejected: ${metrics.rejectedCount} | Duplicates: ${metrics.duplicateCount} | Remaining: ${metrics.remainingTarget}`;
  }
}
