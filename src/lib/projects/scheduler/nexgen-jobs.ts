import { and, desc, eq, gte, sql } from "drizzle-orm";
import { organizations } from "@/lib/auth/schema";
import { runInOrganization } from "@/lib/tenancy/scope";
import { db } from "@/lib/db";
import { PostgresProjectRepository } from "@/lib/projects/repository";
import { DiscoveryAndResearchPipeline } from "@/lib/projects/workflow/pipeline";
import { PermittedRssDiscoverySource } from "@/lib/projects/agents/hunter/sources/rss-source";
import { TestFixtureDiscoverySource } from "@/lib/projects/agents/hunter/sources/test-fixture-source";
import { AIProjectManagerOrchestrator } from "@/lib/projects/agents/project-manager/orchestrator";
import { DailyReportGenerator } from "@/lib/projects/agents/project-manager/daily-report-generator";
import type { RawScoredOpportunity } from "@/lib/projects/agents/project-manager/recommendation-engine";
import type { ExecutionRecord } from "@/lib/projects/agents/project-manager/failure-detector";

/**
 * Permitted live discovery sources for recurring production runs.
 */
import {
  LIVE_PERMITTED_RSS_FEEDS,
  sanitizeErrorMessage,
  type ScheduledJobSummary,
} from "./helpers";
export { LIVE_PERMITTED_RSS_FEEDS, sanitizeErrorMessage, type ScheduledJobSummary };

const platformOrchestrator = new AIProjectManagerOrchestrator();

/**
 * Executes the 4-agent discovery and qualification pipeline across all organizations.
 * Runs every 4 hours (240 minutes) via internal scheduler or authenticated cron.
 */
export async function runNexgenGlobalDiscoveryJob(): Promise<ScheduledJobSummary> {
  const startedAt = new Date();
  const summary: ScheduledJobSummary = {
    job: "nexgen-global-discovery",
    startedAt: startedAt.toISOString(),
    completedAt: "",
    durationMs: 0,
    organizationsVisited: 0,
    results: {},
    errors: [],
  };

  try {
    // 1. Fetch all tenant organizations
    const orgs = await db.select({ id: organizations.id, name: organizations.name }).from(organizations);
    summary.organizationsVisited = orgs.length;

    const repository = new PostgresProjectRepository();

    for (const org of orgs) {
      // 2. Prevent duplicate concurrent execution per organization
      const { acquired, lockKey } = platformOrchestrator.claimExecutionLock({
        organizationId: org.id,
        agentType: "global_project_hunter",
      });

      if (!acquired) {
        summary.results[org.id] = { status: "skipped", reason: "Concurrent execution lock active" };
        continue;
      }

      let telemetryRecordId: string | null = null;
      try {
        await runInOrganization(org.id, async () => {
          // Record start in telemetry
          const telemetry = await repository.recordAgentExecution({
            organizationId: org.id,
            agentType: "global_project_hunter",
            status: "running",
            triggerSource: "scheduled",
            targetEntityType: "batch",
            inputPayload: { feedCount: LIVE_PERMITTED_RSS_FEEDS.length, scheduledAt: startedAt.toISOString() },
          });
          telemetryRecordId = telemetry.id;

          // Configure sources
          const sources = [
            ...LIVE_PERMITTED_RSS_FEEDS.map((f) => new PermittedRssDiscoverySource(f)),
            new TestFixtureDiscoverySource({ includeAnomalies: false }),
          ];

          const pipeline = new DiscoveryAndResearchPipeline({
            sources,
            repository,
            scoringThreshold: 75,
          });

          const pipelineResult = await pipeline.runPipeline(org.id);
          const duration = Date.now() - startedAt.getTime();
          const qualifiedCount = pipelineResult.ingestedProjects.filter((p) => p.isQualified).length;

          // Update telemetry with completion
          await repository.updateAgentExecution({
            organizationId: org.id,
            executionId: telemetryRecordId,
            status: "completed",
            outputPayload: {
              discovered: pipelineResult.hunterDiscovered,
              qualified: qualifiedCount,
              duplicatesFiltered: pipelineResult.duplicatesFiltered,
              suspiciousFiltered: pipelineResult.suspiciousFiltered,
            },
            durationMs: duration,
          });

          summary.results[org.id] = {
            status: "success",
            organizationName: org.name,
            discovered: pipelineResult.hunterDiscovered,
            qualified: qualifiedCount,
            durationMs: duration,
          };
        });
      } catch (orgError) {
        const sanitized = sanitizeErrorMessage(orgError);
        summary.errors.push(`Org ${org.id}: ${sanitized}`);
        summary.results[org.id] = { status: "failed", error: sanitized };

        if (telemetryRecordId) {
          await repository.updateAgentExecution({
            organizationId: org.id,
            executionId: telemetryRecordId,
            status: "failed",
            errorDetails: sanitized,
          }).catch(() => undefined);
        }
      } finally {
        platformOrchestrator.releaseExecutionLock(lockKey);
      }
    }
  } catch (error) {
    const sanitized = sanitizeErrorMessage(error);
    summary.errors.push(`Platform-level error: ${sanitized}`);
  } finally {
    const completedAt = new Date();
    summary.completedAt = completedAt.toISOString();
    summary.durationMs = completedAt.getTime() - startedAt.getTime();
  }

  return summary;
}

/**
 * Generates and stores the daily executive business intelligence report for Anil.
 * Runs daily at 23:55 UTC via internal scheduler or authenticated cron.
 */
export async function runNexgenDailyReportJob(): Promise<ScheduledJobSummary> {
  const startedAt = new Date();
  const reportDate = startedAt.toISOString().slice(0, 10);
  const summary: ScheduledJobSummary = {
    job: "nexgen-daily-report",
    startedAt: startedAt.toISOString(),
    completedAt: "",
    durationMs: 0,
    organizationsVisited: 0,
    results: {},
    errors: [],
  };

  try {
    const orgs = await db.select({ id: organizations.id, name: organizations.name }).from(organizations);
    summary.organizationsVisited = orgs.length;

    const repository = new PostgresProjectRepository();

    for (const org of orgs) {
      const { acquired, lockKey } = platformOrchestrator.claimExecutionLock({
        organizationId: org.id,
        agentType: "ai_project_manager",
      });

      if (!acquired) {
        summary.results[org.id] = { status: "skipped", reason: "Concurrent execution lock active" };
        continue;
      }

      try {
        await runInOrganization(org.id, async () => {
          // 1. Fetch raw opportunities
          const oppRows = await repository.getOpportunities(org.id, 200);
          const rawOpps: RawScoredOpportunity[] = oppRows.map((r) => {
            const opp = r.opportunity;
            const sc = r.score;
            const meta = (opp.metadata || {}) as Record<string, unknown>;
            return {
              id: opp.id,
              title: opp.title,
              clientName: opp.clientName || "Undisclosed Client",
              category: opp.category,
              estimatedBudgetMax: opp.estimatedBudgetMax ? Number(opp.estimatedBudgetMax) : null,
              currency: opp.currency,
              overallScore: sc?.overallScore ? Number(sc.overallScore) : meta.overallScore ? Number(meta.overallScore) : 0,
              qualificationGrade: sc?.qualificationGrade || (meta.qualificationGrade as any) || "C",
              isQualified: sc?.isQualified !== undefined ? sc.isQualified : Boolean(meta.isQualified),
              discoveredAt: opp.discoveredAt,
              isVerified: Boolean(meta.isVerified),
              isSuspicious: Boolean(meta.isSuspicious),
            };
          });

          // 2. Fetch pending approvals and commercial pipeline metrics
          const pendingData = await repository.getUnifiedPendingApprovals(org.id);
          const proposals = await repository.getProposals(org.id);
          const outreach = await repository.getOutreachMessages(org.id);
          const followups = await repository.getFollowupSequences(org.id);
          const executions = await repository.getAgentExecutions(org.id, 100);

          const approvedProposals = proposals.filter((p) => p.status === "approved").length;
          const dispatchedOutreach = outreach.filter((m) => m.status === "sent").length;

          // 3. Generate structured executive report
          const report = DailyReportGenerator.generateDailyReport({
            organizationId: org.id,
            reportDate,
            opportunities: rawOpps,
            pipelineEvidence: {
              totalDiscovered: rawOpps.length,
              totalResearched: rawOpps.filter((o) => o.isVerified).length,
              totalAnalyzed: rawOpps.length,
              totalScored: rawOpps.length,
              totalQualified: rawOpps.filter((o) => o.isQualified).length,
              proposalsDrafted: proposals.length,
              proposalsPendingApproval: pendingData.proposals.length,
              proposalsApproved: approvedProposals,
              outreachDraftsGenerated: outreach.length,
              outreachPendingApproval: pendingData.outreachMessages.length,
              outreachApproved: outreach.filter((m) => m.status === "approved").length,
              outreachDispatched: dispatchedOutreach,
              clientResponsesTotal: 0,
              clientResponsesPendingAttention: 0,
              followupSequencesActive: followups.filter((f) => f.status === "active").length,
              followupTasksPendingApproval: pendingData.followupTasks.length,
              followupTasksCompleted: 0,
            },
            executionHistory: executions.map((e) => ({
              id: e.id,
              organizationId: e.organizationId,
              agentType: e.agentType as any,
              status: e.status as any,
              startedAt: e.startedAt,
              completedAt: e.completedAt || undefined,
              durationMs: e.durationMs || undefined,
              retryCount: e.retryCount || 0,
              maxRetries: e.maxRetries || 3,
            })),
            pendingApprovals: [
              ...pendingData.proposals.map((item) => ({
                id: item.proposal.id,
                entityType: "proposal" as const,
                title: item.proposal.title,
                createdAt: item.proposal.createdAt,
              })),
              ...pendingData.outreachMessages.map((item) => ({
                id: item.message.id,
                entityType: "outreach_message" as const,
                title: item.message.subject || "Outreach Draft",
                createdAt: item.message.createdAt,
              })),
            ],
            clientResponses: [],
            dataSourceLabel: "production_verified",
          });

          // 4. Upsert into database
          await repository.saveDailyBusinessReport({
            organizationId: org.id,
            reportDate,
            projectsDiscoveredCount: report.discovery.totalDiscovered,
            projectsQualifiedCount: report.discovery.qualifiedOpportunities,
            proposalsGeneratedCount: report.commercialPipeline.proposalsGenerated,
            proposalsApprovedCount: report.commercialPipeline.proposalsApproved,
            proposalsDispatchedCount: report.commercialPipeline.messagesActuallyDispatched,
            responsesReceivedCount: report.commercialPipeline.clientResponsesReceived,
            meetingsBookedCount: 0,
            pipelineValueTotal: report.commercialPipeline.totalPipelineValue,
            topCategoriesSummary: report.globalCoverage.categoryBreakdown,
            agentPerformanceMetrics: report.agentPerformance as any,
            executiveSummary: report.executiveSummary,
            keyBottlenecks: report.recommendations.pipelineBottlenecks.map((b) => b.title),
          });

          summary.results[org.id] = {
            status: "success",
            reportDate,
            quotaProgress: `${report.discovery.qualifiedOpportunities}/${report.discovery.dailyTarget}`,
            proposalsApproved: report.commercialPipeline.proposalsApproved,
            outreachDispatched: report.commercialPipeline.messagesActuallyDispatched,
          };
        });
      } catch (orgError) {
        const sanitized = sanitizeErrorMessage(orgError);
        summary.errors.push(`Org ${org.id}: ${sanitized}`);
        summary.results[org.id] = { status: "failed", error: sanitized };
      } finally {
        platformOrchestrator.releaseExecutionLock(lockKey);
      }
    }
  } catch (error) {
    const sanitized = sanitizeErrorMessage(error);
    summary.errors.push(`Platform-level error: ${sanitized}`);
  } finally {
    const completedAt = new Date();
    summary.completedAt = completedAt.toISOString();
    summary.durationMs = completedAt.getTime() - startedAt.getTime();
  }

  return summary;
}
