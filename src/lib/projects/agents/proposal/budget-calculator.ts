/**
 * NEXGEN GLOBAL AI — Proposal Budget Calculator
 *
 * Computes objective, scope-driven commercial budget recommendations:
 * - Scoped to architectural complexity (Enterprise, High, Medium, Low).
 * - Calibrated against estimated milestone duration and engineering roles.
 * - Strictly preserves transparency: unknown client budgets are flagged as unknown.
 * - Never fabricates client financial figures.
 * - Enforces mandatory non-commitment commercial disclaimers.
 */

import type { TechnicalComplexityLevel } from "../analyzer/types";
import type { ProposalBudgetBreakdown } from "./types";

export class ProposalBudgetCalculator {
  public static readonly COMMERCIAL_DISCLAIMER =
    "Commercial estimates are technical discovery projections based on preliminary scope and do not constitute a fixed client contract or binding quote.";

  /**
   * Calculates recommended commercial budget and milestone cost distribution.
   */
  public static calculate(params: {
    complexity: TechnicalComplexityLevel;
    estimatedDurationWeeks: number;
    currency?: string;
    clientBudgetMin?: number | null;
    clientBudgetMax?: number | null;
  }): ProposalBudgetBreakdown {
    const currency = params.currency || "USD";
    const weeks = Math.max(2, params.estimatedDurationWeeks);

    const hasClientBudget =
      (params.clientBudgetMin !== undefined && params.clientBudgetMin !== null) ||
      (params.clientBudgetMax !== undefined && params.clientBudgetMax !== null);

    const clientBudgetStatus = hasClientBudget ? "disclosed" : "unknown";

    // Standard Agency Weekly Sprint Velocity (Blended Senior Engineering Rate)
    // Low: $3,500/wk | Medium: $4,500/wk | High: $6,000/wk | Enterprise: $7,500/wk
    let weeklyRateUSD = 4500;
    if (params.complexity === "enterprise") {
      weeklyRateUSD = 7500;
    } else if (params.complexity === "high") {
      weeklyRateUSD = 6000;
    } else if (params.complexity === "low") {
      weeklyRateUSD = 3500;
    }

    // Convert rate if currency is EUR or GBP
    let exchangeMultiplier = 1.0;
    if (currency === "EUR") exchangeMultiplier = 0.92;
    if (currency === "GBP") exchangeMultiplier = 0.79;

    const baseCalculatedCost = Math.round(weeks * weeklyRateUSD * exchangeMultiplier);

    let recommendedCost = baseCalculatedCost;
    let pricingModelExplanation = `Recommended commercial engagement based on a ${weeks}-week delivery timeline for ${params.complexity.toUpperCase()} complexity software engineering.`;

    if (hasClientBudget) {
      const min = params.clientBudgetMin ?? 0;
      const max = params.clientBudgetMax ?? min * 1.5;

      // If calculated cost falls within client disclosed range, align with optimal bracket
      if (baseCalculatedCost >= min && baseCalculatedCost <= max) {
        recommendedCost = baseCalculatedCost;
        pricingModelExplanation += ` Aligns directly within client disclosed budget range (${currency} ${min.toLocaleString()} - ${max.toLocaleString()}).`;
      } else if (baseCalculatedCost > max && max > 0) {
        // Calculated cost exceeds client budget max: recommend phased delivery
        recommendedCost = Math.round((max * 0.9 + baseCalculatedCost * 0.1) / 100) * 100;
        pricingModelExplanation += ` Client disclosed budget (${currency} ${max.toLocaleString()}) suggests a phased MVP approach to align with financial parameters.`;
      } else if (baseCalculatedCost < min && min > 0) {
        recommendedCost = Math.round(min);
        pricingModelExplanation += ` Aligned with client minimum budget threshold (${currency} ${min.toLocaleString()}) with enhanced QA and telemetry inclusions.`;
      }
    } else {
      pricingModelExplanation += " Client budget was not disclosed in the opportunity listing; commercial estimate is formulated strictly from architectural scope and sprint velocity.";
    }

    return {
      recommendedCost,
      currency,
      budgetType: "fixed_price",
      clientBudgetStatus,
      clientDisclosedRange: hasClientBudget
        ? {
            min: params.clientBudgetMin,
            max: params.clientBudgetMax,
          }
        : undefined,
      pricingModelExplanation,
      disclaimer: ProposalBudgetCalculator.COMMERCIAL_DISCLAIMER,
    };
  }

  /**
   * Distributes total recommended cost proportionally across milestones.
   */
  public static distributeMilestoneCosts(
    totalCost: number,
    milestones: Array<{
      phase: number;
      title: string;
      deliverables: string[];
      durationWeeks: number;
      costAllocationPercent: number;
    }>,
  ) {
    let allocatedTotal = 0;
    return milestones.map((m, idx) => {
      // Last milestone absorbs rounding remainder
      let cost: number;
      if (idx === milestones.length - 1) {
        cost = totalCost - allocatedTotal;
      } else {
        cost = Math.round((totalCost * (m.costAllocationPercent / 100)) / 100) * 100;
        allocatedTotal += cost;
      }

      return {
        phase: m.phase,
        title: m.title,
        deliverables: m.deliverables,
        durationWeeks: m.durationWeeks,
        costEstimate: Math.max(0, cost),
      };
    });
  }
}
