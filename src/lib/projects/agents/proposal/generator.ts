/**
 * NEXGEN GLOBAL AI — Agent 5: AI Proposal Generator
 *
 * Responsibilities:
 * 1. Read original project opportunity, technical analysis (Agent 3), and scoring report (Agent 4).
 * 2. Formulate comprehensive requirements understanding (business, technical, missing info, assumptions).
 * 3. Design tailored software solution architecture (frontend, backend, database, API, AI/ML, infra).
 * 4. Generate structured technical proposal in professional consulting English.
 * 5. Compute scope-driven commercial budget recommendation with mandatory disclaimers.
 * 6. Synthesize realistic milestones, deliverables, assumptions, exclusions, and risks.
 * 7. Support iterative versioning and revision feedback from Anil.
 * 8. Never fabricate testimonials, credentials, or client budgets.
 */

import { ProposalBudgetCalculator } from "./budget-calculator";
import { RuntimeExecutionTracker } from "../runtime-transparency";
import type {
  ProposalGenerationInput,
  StructuredProposalDocument,
} from "./types";
import type { ProposalMilestone } from "../../schema";

export class AIProposalGenerator {
  public static readonly DEFAULT_MODEL = "nexgen-deterministic-nlp-v1";

  /**
   * Generates a complete, structured technical proposal ready for Anil's review and approval.
   */
  public async generateProposal(
    input: ProposalGenerationInput,
  ): Promise<StructuredProposalDocument> {
    const startTime = Date.now();
    const { opportunityId, organizationId, title, category, analysis, scoring, clientProfile } = input;
    const version = input.version ?? 1;

    // 1. Client Information
    const clientInfo = {
      name: clientProfile?.companyName || "Client Partner",
      domain: clientProfile?.domain,
      country: clientProfile?.country || "Global",
      industry: clientProfile?.industry || "Software & Technology",
      isVerified: Boolean(clientProfile?.isVerified),
    };

    // 2. Budget & Milestone Financial Calculation
    const budgetRecommendation = ProposalBudgetCalculator.calculate({
      complexity: analysis.complexityLevel,
      estimatedDurationWeeks: analysis.estimatedDuration.weeksMax,
      currency: input.currency || "USD",
      clientBudgetMin: input.budgetMin,
      clientBudgetMax: input.budgetMax,
    });

    const milestones: ProposalMilestone[] = ProposalBudgetCalculator.distributeMilestoneCosts(
      budgetRecommendation.recommendedCost,
      analysis.milestones,
    );

    // 3. Assumptions & Exclusions
    const assumptions = this.formulateAssumptions(analysis, clientProfile);
    const exclusions = this.formulateExclusions(category, analysis.complexityLevel);

    // 4. Executive Summary
    const executiveSummary = this.composeExecutiveSummary({
      title,
      clientName: clientInfo.name,
      category,
      complexity: analysis.complexityLevel,
      architecturePattern: analysis.recommendedArchitecture.pattern,
      estimatedWeeks: analysis.estimatedDuration.weeksMax,
      revisionFeedback: input.revisionFeedback,
    });

    // 5. Understanding of Requirements
    const requirementsUnderstanding = {
      businessRequirements: analysis.businessRequirements,
      technicalRequirements: analysis.functionalRequirements,
      missingInformation: analysis.missingInformation,
      assumptions,
    };

    // 6. Proposed Solution Overview
    const safeCategory = (category || "software_development").replace(/_/g, " ");
    const safePattern = (analysis.recommendedArchitecture?.pattern || "modular_architecture").replace(/_/g, " ");

    const proposedSolution = {
      summary: `NEXGEN AGENCY proposes an enterprise-grade, custom-engineered ${safeCategory} solution based on ${safePattern} principles. The solution guarantees high reliability, rigorous data isolation, and scalable engineering standards.`,
      architecturalPattern: analysis.recommendedArchitecture?.pattern || "modular_monolith",
      keyCapabilities: [
        ...analysis.functionalRequirements.slice(0, 4),
        `Automated test coverage and continuous integration via Docker & GitHub Actions`,
        `Role-based tenant access control and enterprise security auditing`,
      ],
    };

    // 7. Technical Architecture
    const techArch = {
      overview: analysis.recommendedArchitecture.summary,
      frontend: analysis.recommendedArchitecture.frontendRequirements.join("; ") || "Modern responsive web interface built with Next.js and Tailwind CSS.",
      backend: analysis.recommendedArchitecture.backendRequirements.join("; ") || "High-performance TypeScript/Python backend service mesh.",
      database: analysis.recommendedArchitecture.databaseRequirements.join("; ") || "PostgreSQL relational persistence with automated schema migrations.",
      apis: analysis.recommendedArchitecture.apiRequirements.join("; ") || "RESTful and streaming API orchestration with OpenAPI validation.",
      aiMlComponents: analysis.recommendedArchitecture.aiMlRequirements
        ? analysis.recommendedArchitecture.aiMlRequirements.join("; ")
        : undefined,
      infrastructure: analysis.technologyRecommendations.infrastructure.join(", ") || "Cloud-native containerized hosting with automated health checks.",
    };

    // 8. Deliverables Synthesis
    const deliverables = milestones.flatMap((m) => m.deliverables);

    // 9. Risks and Mitigation
    const risksAndMitigation = analysis.risks.map((r) => ({
      risk: r.description,
      category: r.category,
      severity: r.severity,
      mitigation: r.mitigationStrategy,
    }));

    // 10. Development Methodology
    const developmentMethodology =
      "NEXGEN AGENCY operates on an Agile Continuous Delivery sprint model. Engagements are divided into 2-week iterative sprints featuring weekly stakeholder demos, continuous integration builds, and transparent git-based changelog visibility.";

    // 11. Closing Statement
    const closingStatement =
      `NEXGEN AGENCY is committed to delivering exceptional engineering quality, robust architectural integrity, and measurable business outcomes for ${clientInfo.name}. We look forward to advancing this engagement to formal architectural onboarding upon approval.`;

    const proposalTitle = `Technical Proposal: ${title} (v${version})`;
    const durationMs = Date.now() - startTime;
    const telemetry = RuntimeExecutionTracker.resolveTelemetry({ durationMs });

    return {
      title: proposalTitle,
      version,
      opportunityId,
      organizationId,
      clientInfo,
      executiveSummary,
      requirementsUnderstanding,
      proposedSolution,
      technicalArchitecture: techArch,
      recommendedTechStack: analysis.technologyRecommendations.coreStack,
      developmentMethodology,
      milestones,
      deliverables,
      estimatedTimeline: {
        weeksMin: analysis.estimatedDuration.weeksMin,
        weeksMax: analysis.estimatedDuration.weeksMax,
        estimatedTimelineDays: analysis.estimatedDuration.estimatedTimelineDays,
        disclaimer: analysis.estimatedDuration.disclaimer,
      },
      budgetRecommendation,
      assumptions,
      exclusions,
      risksAndMitigation,
      closingStatement,
      revisionNotes: input.revisionFeedback,
      metadata: {
        aiModel: telemetry.aiModel,
        executionMode: telemetry.executionMode,
        actualProvider: telemetry.actualProvider,
        tokenUsage: telemetry.tokenUsage,
        estimatedCostUSD: telemetry.estimatedCostUSD,
        fallbackStatus: telemetry.fallbackStatus,
        fallbackReason: telemetry.fallbackReason,
        generationDurationMs: durationMs,
        tokensUsed: telemetry.tokensUsed,
        generatedAt: telemetry.generatedAt,
        qualificationGrade: scoring.qualificationGrade,
        overallScore: scoring.overallScore,
        status: "pending_approval",
      },
    };
  }

  private composeExecutiveSummary(params: {
    title: string;
    clientName: string;
    category: string;
    complexity: string;
    architecturePattern: string;
    estimatedWeeks: number;
    revisionFeedback?: string;
  }): string {
    let summary = `NEXGEN AGENCY is pleased to present this comprehensive technical proposal for "${params.title}". Designed specifically for ${params.clientName}, our solution addresses core functional imperatives through an enterprise-grade ${params.architecturePattern.replace(/_/g, " ")} blueprint. Operating across an estimated ${params.estimatedWeeks}-week phased milestone roadmap, our senior engineering fleet will deliver secure, scalable, and fully maintainable software adhering to modern cloud-native standards.`;

    if (params.revisionFeedback) {
      summary += ` [Revision Note: This proposal version incorporates targeted refinements in direct response to architectural feedback: "${params.revisionFeedback}"].`;
    }

    return summary;
  }

  private formulateAssumptions(
    analysis: any,
    clientProfile?: any,
  ): string[] {
    const list = [
      "Client will provide timely access to necessary third-party API credentials and test environments during sprint milestones.",
      "Primary business logic and acceptance criteria will be finalized during the initial architectural kickoff phase.",
      "Deployment target infrastructure (AWS, GCP, Azure, or Vercel) will be provisioned according to agreed specifications.",
    ];

    if (clientProfile && !clientProfile.isVerified) {
      list.push("Formal discovery workshop will precede codebase implementation to validate unconfirmed client domain integrations.");
    }

    return list;
  }

  private formulateExclusions(category: string, complexity: string): string[] {
    const list = [
      "Ongoing third-party SaaS subscription fees and cloud infrastructure billing (e.g. AWS hosting, OpenAI token usage).",
      "End-user customer support operations beyond the agreed 30-day post-launch warranty period.",
      "Legacy data sanitization or manual data entry not explicitly covered in milestone deliverables.",
    ];

    if (category !== "mobile_development") {
      list.push("Native mobile app store submissions (unless explicitly scoped in mobile expansion phases).");
    }

    return list;
  }
}
