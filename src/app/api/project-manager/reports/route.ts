import { NextResponse } from "next/server";
import { authContextErrorResponse, requireOrgContext } from "@/lib/auth/context";
import { PostgresProjectRepository } from "@/lib/projects/repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/project-manager/reports
 * Lists historical daily executive intelligence reports for the organization.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireOrgContext(request);
    const repo = new PostgresProjectRepository();

    const reports = await repo.listDailyBusinessReports(ctx.organizationId, 30);

    return NextResponse.json({
      count: reports.length,
      reports,
    });
  } catch (error) {
    const denied = authContextErrorResponse(error);
    if (denied) return denied;
    console.error("[api:project-manager:reports:GET]", error);
    return NextResponse.json({ error: "Failed to retrieve daily reports" }, { status: 500 });
  }
}
