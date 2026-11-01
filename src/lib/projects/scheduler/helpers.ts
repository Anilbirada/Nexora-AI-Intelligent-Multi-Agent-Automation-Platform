import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison for secrets and tokens.
 */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Permitted live discovery sources for recurring production runs.
 */
export const LIVE_PERMITTED_RSS_FEEDS = [
  { platform: "weworkremotely_programming", url: "https://weworkremotely.com/categories/remote-programming-jobs.rss", currency: "USD" },
  { platform: "weworkremotely_devops", url: "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss", currency: "USD" },
  { platform: "weworkremotely_fullstack", url: "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss", currency: "USD" },
  { platform: "hackernews_whoishiring", url: "https://hnrss.org/whoishiring", currency: "USD" },
];

export interface ScheduledJobSummary {
  job: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  organizationsVisited: number;
  results: Record<string, unknown>;
  errors: string[];
}

/**
 * Sanitizes error messages so secrets, database URLs, and API tokens are never leaked into logs.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return "Unknown error";
  let message = error instanceof Error ? error.message : String(error);
  // Redact potential connection strings, tokens, and keys
  message = message.replace(/postgres:\/\/[^@]+@/g, "postgres://[REDACTED_USER_PASSWORD]@");
  message = message.replace(/(bearer\s+)[a-zA-Z0-9_\-\.]{8,}/gi, "$1[REDACTED_TOKEN]");
  message = message.replace(/(key=)[a-zA-Z0-9_\-\.]{8,}/gi, "$1[REDACTED_KEY]");
  return message;
}
