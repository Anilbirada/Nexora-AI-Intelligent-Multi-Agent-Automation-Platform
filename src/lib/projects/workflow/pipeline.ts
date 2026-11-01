/**
 * NEXGEN GLOBAL AI — Phase 2 & 3 Workflow Orchestration Pipeline
 *
 * Implements the complete automated pipeline across the first 4 agents:
 *
 * Project Sources
 *       ↓
 * [1. Global Project Hunter] (Multi-source discovery, filtering, SHA-256 deduplication)
 *       ↓
 * [2. Client Researcher] (Factual client verification, digital footprint, credibility)
 *       ↓
 * [3. Project Analyzer] (Requirements, architecture, tech stack, duration, milestones, risks)
 *       ↓
 * [4. Opportunity Scoring Agent] (5-factor matrix, grades A-F, threshold 75, safe disqualification)
 *       ↓
 * [Qualified / Review / Rejected]
 *       ↓
 * Database Ingestion (Scoped to tenant organization with atomic telemetry audit)
 */

import { GlobalProjectHunter, type QualifiedHunterProject } from "../agents/hunter/hunter";
import type { IProjectDiscoverySource } from "../agents/hunter/types";
import { ClientResearcher } from "../agents/researcher/researcher";
import type { ResearchedClientProfile } from "../agents/researcher/types";
import { ProjectAnalyzer } from "../agents/analyzer/analyzer";
import type { StructuredProjectAnalysis } from "../agents/analyzer/types";
import { OpportunityScoringAgent } from "../agents/scoring/scoring";
import type { DetailedScoringReport } from "../agents/scoring/types";
import { DashboardMetricsCalculator, type DashboardExecutiveMetrics } from "../dashboard/metrics";

export type IngestedProjectResult = {
  opportunityId: string;
  title: string;
  category: string;
  clientName: string;
  domain?: string;
  budgetFormatted: string;
  credibilityScore: number;
  credibilityTier: string;
  isVerified: boolean;
  complexityLevel: string;
  overallScore: number;
  qualificationGrade: string;
  isQualified: boolean;
  recommendedAction: string;
  status: "discovered" | "scored" | "rejected";
  analysisReport: StructuredProjectAnalysis;
  scoringReport: DetailedScoringReport;
};

export type PipelineExecutionSummary = {
  organizationId: string;
  executedAt: Date;
  hunterDiscovered: number;
  duplicatesFiltered: number;
  suspiciousFiltered: number;
  expiredFiltered: number;
  ingestedProjects: IngestedProjectResult[];
  dashboardMetrics: DashboardExecutiveMetrics;
};

export interface IDatabaseOpportunityRepository {
  findExistingFingerprints(organizationId: string): Promise<string[]>;
  saveOpportunity(record: {
    organizationId: string;
    title: string;
    description: string;
    category: string;
    subcategories: string[];
    sourcePlatform: string;
    sourceUrl: string;
    sourceExternalId?: string;
    clientName?: string;
    clientDomain?: string;
    clientCountry?: string;
    clientRegion?: string;
    estimatedBudgetMin?: number;
    estimatedBudgetMax?: number;
    currency: string;
    budgetType: "fixed_price" | "hourly" | "retainer" | "unknown";
    requiredSkills: string[];
    scopeComplexity?: "low" | "medium" | "high" | "enterprise";
    timelineDays?: number;
    status: "discovered" | "scored" | "rejected";
    rawPayload: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }): Promise<{ id: string }>;
  saveOpportunityScore?(record: {
    opportunityId: string;
    organizationId: string;
    overallScore: number;
    qualificationGrade: "A" | "B" | "C" | "D" | "F";
    isQualified: boolean;
    budgetViabilityScore: number;
    techStackAlignmentScore: number;
    clientLegitimacyScore: number;
    competitionScore: number;
    timelineFeasibilityScore: number;
    confidenceLevel: number;
    reasoningSummary: string;
    scoringFactors: Record<string, unknown>;
    recommendedAction: "priority_proposal" | "standard_proposal" | "monitor" | "pass";
    scoredByAgent: string;
  }): Promise<{ id: string }>;
  logAgentExecution(execution: {
    organizationId: string;
    agentType: "global_project_hunter" | "client_researcher" | "project_analyzer" | "opportunity_scoring";
    status: "completed" | "failed";
    inputPayload: Record<string, unknown>;
    outputPayload: Record<string, unknown>;
    durationMs: number;
    tokensUsed?: number;
    costEstimate?: number;
  }): Promise<void>;
}

export class DiscoveryAndResearchPipeline {
  private readonly hunter: GlobalProjectHunter;
  private readonly researcher: ClientResearcher;
  private readonly analyzer: ProjectAnalyzer;
  private readonly scoringAgent: OpportunityScoringAgent;
  private readonly repository?: IDatabaseOpportunityRepository;

  constructor(options?: {
    sources?: IProjectDiscoverySource[];
    repository?: IDatabaseOpportunityRepository;
    scoringThreshold?: number;
  }) {
    this.hunter = new GlobalProjectHunter(options?.sources || []);
    this.researcher = new ClientResearcher();
    this.analyzer = new ProjectAnalyzer();
    this.scoringAgent = new OpportunityScoringAgent({
      threshold: options?.scoringThreshold,
    });
    this.repository = options?.repository;
  }

  public registerSource(source: IProjectDiscoverySource): void {
    this.hunter.registerSource(source);
  }

  /**
   * Runs the complete end-to-end 4-agent discovery, analysis, and qualification workflow.
   */
  public async runPipeline(organizationId: string): Promise<PipelineExecutionSummary> {
    const startTime = Date.now();

    // 1. Seed existing database fingerprints for this organization to prevent duplicates
    if (this.repository) {
      const existingFingerprints = await this.repository.findExistingFingerprints(organizationId);
      this.hunter.seedKnownFingerprints(existingFingerprints);
    }

    // 2. Execute Agent 1: Global Project Hunter Discovery
    const hunterStart = Date.now();
    const hunterResult = await this.hunter.executeDiscovery();
    const hunterDuration = Date.now() - hunterStart;

    if (this.repository) {
      await this.repository.logAgentExecution({
        organizationId,
        agentType: "global_project_hunter",
        status: "completed",
        inputPayload: { target: "all_registered_sources" },
        outputPayload: {
          totalDiscovered: hunterResult.totalDiscovered,
          qualified: hunterResult.qualifiedProjects.length,
          duplicates: hunterResult.duplicatesFiltered,
          suspicious: hunterResult.suspiciousFiltered,
          expired: hunterResult.expiredFiltered,
        },
        durationMs: hunterDuration,
      });
    }

    // Process all qualified hunter listings through Agents 2, 3, and 4
    const ingestedProjects: IngestedProjectResult[] = [];
    const enrichedListingsForMetrics: Array<{
      category: string;
      country?: string;
      isVerified: boolean;
      credibilityTier: string;
      overallScore: number;
    }> = [];

    let totalResearcherTime = 0;
    let totalAnalyzerTime = 0;
    let totalScoringTime = 0;

    for (const project of hunterResult.qualifiedProjects) {
      // 3. Execute Agent 2: Client Researcher
      const resStart = Date.now();
      const clientProfile: ResearchedClientProfile = await this.researcher.researchClient(project);
      totalResearcherTime += Date.now() - resStart;

      // 4. Execute Agent 3: Project Analyzer
      const anaStart = Date.now();
      const analysis: StructuredProjectAnalysis = await this.analyzer.analyzeProject(project, clientProfile);
      totalAnalyzerTime += Date.now() - anaStart;

      // 5. Execute Agent 4: Opportunity Scoring Agent
      const scoreStart = Date.now();
      const scoring: DetailedScoringReport = await this.scoringAgent.scoreOpportunity({
        project,
        clientProfile,
        analysis,
      });
      totalScoringTime += Date.now() - scoreStart;

      // Determine Lifecycle Opportunity Status
      let status: "discovered" | "scored" | "rejected" = "discovered";
      if (scoring.isDisqualified) {
        status = "rejected";
      } else if (scoring.isQualified) {
        status = "scored"; // Scored and qualified, ready for Proposal Generator!
      } else {
        status = "discovered"; // Under review / monitor
      }

      let savedId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // 6. Database Ingestion (Scoped strictly to organizationId)
      if (this.repository) {
        const savedOpp = await this.repository.saveOpportunity({
          organizationId,
          title: project.title,
          description: project.description,
          category: project.primaryCategory,
          subcategories: project.subcategories,
          sourcePlatform: project.sourcePlatform,
          sourceUrl: project.sourceUrl,
          sourceExternalId: project.sourceExternalId,
          clientName: clientProfile.companyName,
          clientDomain: clientProfile.domain,
          clientCountry: clientProfile.country,
          clientRegion: clientProfile.region,
          estimatedBudgetMin: project.budgetMin,
          estimatedBudgetMax: project.budgetMax,
          currency: project.currency,
          budgetType: project.budgetType,
          requiredSkills: project.requiredSkills,
          scopeComplexity: analysis.complexityLevel,
          timelineDays: analysis.estimatedDuration.estimatedTimelineDays,
          status,
          rawPayload: {
            contentHash: project.contentHash,
            evidenceUrls: clientProfile.evidenceUrls,
            techStackDetected: clientProfile.techStackDetected,
          },
          metadata: {
            credibilityScore: clientProfile.credibilityScore,
            credibilityTier: clientProfile.credibilityTier,
            isVerified: clientProfile.isVerified,
            riskFlags: clientProfile.riskFlags,
            missingInformation: clientProfile.missingInformation,
            researchSummary: clientProfile.researchSummary,
            researchedAt: clientProfile.researchedAt.toISOString(),
            analysisSummary: analysis.projectSummary,
            recommendedArchitecture: analysis.recommendedArchitecture,
            technologyRecommendations: analysis.technologyRecommendations,
            milestones: analysis.milestones,
            deliveryRisks: analysis.risks,
            scoringSummary: scoring.summaryReasoning,
            overallScore: scoring.overallScore,
            qualificationGrade: scoring.qualificationGrade,
            isQualified: scoring.isQualified,
            recommendedAction: scoring.recommendedAction,
          },
        });
        savedId = savedOpp.id;

        // If repository supports opportunity scores table:
        if (this.repository.saveOpportunityScore) {
          await this.repository.saveOpportunityScore({
            opportunityId: savedId,
            organizationId,
            overallScore: scoring.overallScore,
            qualificationGrade: scoring.qualificationGrade,
            isQualified: scoring.isQualified,
            budgetViabilityScore: scoring.factors.budgetViability.score,
            techStackAlignmentScore: scoring.factors.techStackAlignment.score,
            clientLegitimacyScore: scoring.factors.clientLegitimacy.score,
            competitionScore: scoring.factors.competition.score,
            timelineFeasibilityScore: scoring.factors.timelineFeasibility.score,
            confidenceLevel: scoring.confidenceLevel,
            reasoningSummary: scoring.summaryReasoning,
            scoringFactors: {
              budgetViability: scoring.factors.budgetViability,
              techStackAlignment: scoring.factors.techStackAlignment,
              clientLegitimacy: scoring.factors.clientLegitimacy,
              competition: scoring.factors.competition,
              timelineFeasibility: scoring.factors.timelineFeasibility,
            },
            recommendedAction: scoring.recommendedAction,
            scoredByAgent: scoring.scoredByAgent,
          });
        }
      }

      const budgetFormatted = project.budgetMin && project.budgetMax
        ? `${project.currency} ${project.budgetMin.toLocaleString()} - ${project.budgetMax.toLocaleString()}`
        : project.budgetMin
        ? `${project.currency} ${project.budgetMin.toLocaleString()}+`
        : "Budget Unspecified";

      ingestedProjects.push({
        opportunityId: savedId,
        title: project.title,
        category: project.primaryCategory,
        clientName: clientProfile.companyName,
        domain: clientProfile.domain,
        budgetFormatted,
        credibilityScore: clientProfile.credibilityScore,
        credibilityTier: clientProfile.credibilityTier,
        isVerified: clientProfile.isVerified,
        complexityLevel: analysis.complexityLevel,
        overallScore: scoring.overallScore,
        qualificationGrade: scoring.qualificationGrade,
        isQualified: scoring.isQualified,
        recommendedAction: scoring.recommendedAction,
        status,
        analysisReport: analysis,
        scoringReport: scoring,
      });

      enrichedListingsForMetrics.push({
        category: project.primaryCategory,
        country: clientProfile.country,
        isVerified: clientProfile.isVerified,
        credibilityTier: clientProfile.credibilityTier,
        overallScore: scoring.overallScore,
      });
    }

    // Telemetry logging for Agents 2, 3, and 4
    if (this.repository) {
      await this.repository.logAgentExecution({
        organizationId,
        agentType: "client_researcher",
        status: "completed",
        inputPayload: { projectsCount: hunterResult.qualifiedProjects.length },
        outputPayload: { researchedCount: ingestedProjects.length },
        durationMs: totalResearcherTime,
      });

      await this.repository.logAgentExecution({
        organizationId,
        agentType: "project_analyzer",
        status: "completed",
        inputPayload: { projectsCount: hunterResult.qualifiedProjects.length },
        outputPayload: { analyzedCount: ingestedProjects.length },
        durationMs: totalAnalyzerTime,
      });

      await this.repository.logAgentExecution({
        organizationId,
        agentType: "opportunity_scoring",
        status: "completed",
        inputPayload: { projectsCount: hunterResult.qualifiedProjects.length },
        outputPayload: {
          scoredCount: ingestedProjects.length,
          qualifiedCount: ingestedProjects.filter((p) => p.isQualified).length,
        },
        durationMs: totalScoringTime,
      });
    }

    // 7. Calculate Dashboard Metrics
    const dashboardMetrics = DashboardMetricsCalculator.calculate({
      totalDiscovered: hunterResult.totalDiscovered,
      qualifiedListings: enrichedListingsForMetrics,
      duplicateCount: hunterResult.duplicatesFiltered,
      suspiciousCount: hunterResult.suspiciousFiltered,
      expiredCount: hunterResult.expiredFiltered,
      agentExecutions: [
        {
          agentType: "global_project_hunter",
          status: "completed",
          startedAt: new Date(startTime),
        },
        {
          agentType: "client_researcher",
          status: "completed",
          startedAt: new Date(startTime + hunterDuration),
        },
        {
          agentType: "project_analyzer",
          status: "completed",
          startedAt: new Date(startTime + hunterDuration + totalResearcherTime),
        },
        {
          agentType: "opportunity_scoring",
          status: "completed",
          startedAt: new Date(startTime + hunterDuration + totalResearcherTime + totalAnalyzerTime),
        },
      ],
    });

    return {
      organizationId,
      executedAt: new Date(),
      hunterDiscovered: hunterResult.totalDiscovered,
      duplicatesFiltered: hunterResult.duplicatesFiltered,
      suspiciousFiltered: hunterResult.suspiciousFiltered,
      expiredFiltered: hunterResult.expiredFiltered,
      ingestedProjects,
      dashboardMetrics,
    };
  }
}
