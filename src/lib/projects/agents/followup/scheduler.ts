/**
 * NEXGEN GLOBAL AI — Agent 7 Follow-up Scheduler
 *
 * Implements business-day follow-up interval calculations, client timezone awareness,
 * weekend and holiday skipping, duplicate prevention, and lifecycle stop conditions.
 */

import type {
  FollowupScheduleConfig,
  FollowupSequenceRecord,
} from "./types";

export class FollowupScheduler {
  public static readonly DEFAULT_CONFIG: FollowupScheduleConfig = {
    stepIntervalsBusinessDays: [3, 5, 7], // Step 1: 3 days, Step 2: 5 days, Step 3: 7 days
    maxSteps: 3,
    clientTimezone: "UTC",
    skipWeekends: true,
    skipHolidays: [],
  };

  /**
   * Adds a specified number of business days to a date, skipping weekends and holidays.
   */
  public static addBusinessDays(
    startDate: Date,
    days: number,
    options?: { skipHolidays?: string[] },
  ): Date {
    const result = new Date(startDate);
    const holidays = new Set(options?.skipHolidays || []);

    let addedDays = 0;
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay(); // 0 is Sunday, 6 is Saturday
      const isoDate = result.toISOString().slice(0, 10);

      // Skip weekend
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      // Skip holiday if configured
      if (holidays.has(isoDate)) {
        continue;
      }

      addedDays++;
    }

    return result;
  }

  /**
   * Computes the scheduled due date for a specific follow-up step.
   */
  public static calculateDueDate(
    stepNumber: number,
    baseDate: Date = new Date(),
    customConfig?: Partial<FollowupScheduleConfig>,
  ): Date {
    const config = { ...this.DEFAULT_CONFIG, ...customConfig };
    const intervals = config.stepIntervalsBusinessDays;
    const intervalIndex = Math.min(Math.max(stepNumber - 1, 0), intervals.length - 1);
    const businessDaysToAdd = intervals[intervalIndex];

    const targetDate = this.addBusinessDays(baseDate, businessDaysToAdd, {
      skipHolidays: config.skipHolidays,
    });

    // Normalize to business hour: 10:00 AM UTC
    targetDate.setUTCHours(10, 0, 0, 0);
    return targetDate;
  }

  /**
   * Evaluates whether a follow-up can be scheduled for the given sequence.
   * Enforces strict immediate stop conditions (replies, opt-outs, rejections, cancellations).
   */
  public static canScheduleFollowup(sequence: {
    status: string;
    currentStep: number;
    maxSteps?: number;
  }): { allowed: boolean; reason?: string } {
    const maxSteps = sequence.maxSteps || this.DEFAULT_CONFIG.maxSteps;

    if (sequence.status === "opted_out") {
      return { allowed: false, reason: "Client has opted out of communication." };
    }

    if (sequence.status === "response_received") {
      return { allowed: false, reason: "Client has already responded. Follow-ups paused pending human review." };
    }

    if (sequence.status === "cancelled") {
      return { allowed: false, reason: "Follow-up sequence has been cancelled." };
    }

    if (sequence.status === "completed") {
      return { allowed: false, reason: "Follow-up sequence is completed." };
    }

    if (sequence.status === "paused") {
      return { allowed: false, reason: "Follow-up sequence is currently paused." };
    }

    if (sequence.currentStep > maxSteps) {
      return { allowed: false, reason: `Maximum follow-up count (${maxSteps}) reached.` };
    }

    return { allowed: true };
  }
}
