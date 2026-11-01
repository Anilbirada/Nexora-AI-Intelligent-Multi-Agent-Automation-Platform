import { NextRequest, NextResponse } from "next/server";
import { safeEqual } from "@/lib/linkedin/organizations.server";
import { runPlatformJobForCron } from "@/lib/scheduler/endpoint";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { runNexgenGlobalDiscoveryJob, runNexgenDailyReportJob } from "@/lib/projects/scheduler/nexgen-jobs";
import type { PlatformJobName } from "@/lib/scheduler/schedules";

export const dynamic = "force-dynamic";

/**
 * Validates whether the incoming request is authorized via CRON_SECRET or authenticated user session.
 */
async function authenticateCronCaller(request: NextRequest): Promise<{ isCron: boolean; organizationId: string | null }> {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const xCronSecret = request.headers.get("x-cron-secret");

  // Check Bearer CRON_SECRET or x-cron-secret header
  if (secret) {
    if (authHeader && safeEqual(authHeader, `Bearer ${secret}`)) {
      return { isCron: true, organizationId: null };
    }
    if (xCronSecret && safeEqual(xCronSecret, secret)) {
      return { isCron: true, organizationId: null };
    }
  }

  // Fallback to user session context (e.g. Anil running discovery manually from dashboard)
  try {
    const ctx = await requireOrgContext(request);
    return { isCron: false, organizationId: ctx.organizationId };
  } catch (err) {
    return { isCron: false, organizationId: null };
  }
}

/**
 * Resolves which platform job to run based on URL search params or header.
 */
function resolveTargetJob(request: NextRequest): PlatformJobName {
  const jobParam = request.nextUrl.searchParams.get("job") || request.nextUrl.searchParams.get("action");
  if (jobParam === "report" || jobParam === "daily-report" || jobParam === "nexgen-daily-report") {
    return "nexgen-daily-report";
  }
  return "nexgen-global-discovery";
}

/**
 * POST /api/cron/nexgen
 * Triggers NEXGEN Global Discovery (every 4h) or Daily Report (at 23:55 UTC).
 * Requires `Authorization: Bearer <CRON_SECRET>` or an authenticated user session.
 */
export async function POST(request: NextRequest) {
  try {
    const { isCron, organizationId } = await authenticateCronCaller(request);

    if (!isCron && !organizationId) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing CRON_SECRET or session." },
        { status: 401 }
      );
    }

    const jobName = resolveTargetJob(request);

    if (isCron) {
      // Deduped against in-process scheduler slot
      return await runPlatformJobForCron(jobName, request);
    }

    // Direct manual invocation by authenticated user
    if (jobName === "nexgen-daily-report") {
      const summary = await runNexgenDailyReportJob();
      return NextResponse.json({ ok: true, trigger: "manual_session", summary });
    } else {
      const summary = await runNexgenGlobalDiscoveryJob();
      return NextResponse.json({ ok: true, trigger: "manual_session", summary });
    }
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;

    console.error("[api:cron:nexgen:POST]", error);
    return NextResponse.json(
      { error: "Scheduled execution failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/nexgen
 * Convenience GET endpoint for standard HTTP cron pingers.
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
