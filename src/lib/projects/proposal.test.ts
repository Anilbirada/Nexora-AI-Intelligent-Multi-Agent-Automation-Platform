/**
 * NEXGEN GLOBAL AI — Agent 5 (AI Proposal Generator) & Human Approval Test Suite
 *
 * Test Coverage:
 * 1. Agent 5: Requirement understanding and synthesis of Agent 3 & Agent 4 reports.
 * 2. Agent 5: Tailored solution architecture & technology recommendations.
 * 3. Agent 5: Unknown budget neutral handling & commercial sprint velocity pricing.
 * 4. Agent 5: Phased milestones work breakdown with 100% cost allocation.
 * 5. Agent 5: Iterative proposal versioning (v1 -> v2) incorporating revision feedback.
 * 6. Security: Strict multi-tenant data isolation on proposal records.
 * 7. Security: Server-side Anil authorization enforcement (blocks non-Anil accounts).
 * 8. Security: Rejection of forged client-side isAnilExplicit flags.
 * 9. Security: State machine decision enforcement (approve, reject, request_revision).
 * 10. Security: External outreach blocking policy (ALLOW_EXTERNAL_OUTREACH = false).
 */

import test from "node:test";
import assert from "node:assert/strict";

import { AIProposalGenerator } from "./agents/proposal/generator";
import { ProposalBudgetCalculator } from "./agents/proposal/budget-calculator";
import { ProjectAnalyzer } from "./agents/analyzer/analyzer";
import { OpportunityScoringAgent } from "./agents/scoring/scoring";
import {
  isAnilAuthorizedAccount,
  NexgenAgentOrchestrator,
} from "./agents/orchestrator";

// ── 1. AGENT 5: REQUIREMENT UNDERSTANDING & SYNTHESIS ──────────────────────────

test("Agent 5: Synthesizes Agent 3 analysis and Agent 4 scoring into structured proposal", async () => {
  const analyzer = new ProjectAnalyzer();
  const scoringAgent = new OpportunityScoringAgent();
  const generator = new AIProposalGenerator();

  const projectInput = {
    contentHash: "hash-enterprise-saas-01",
    sourcePlatform: "upwork",
    sourceUrl: "https://example.com/saas-01",
    title: "Multi-Tenant B2B SaaS Analytics & Telemetry Platform",
    description: "Build a scalable multi-tenant SaaS analytics engine with Next.js, FastAPI, PostgreSQL, Redis, and real-time Kafka event streaming. Must enforce SOC2 compliance, tenant isolation, and automated daily business reporting.",
    primaryCategory: "web_development" as const,
    subcategories: ["full_stack", "cloud_devops"],
    clientName: "DataGrid Analytics Inc.",
    clientDomain: "datagrid.io",
    clientCountry: "United States",
    budgetMin: 35000,
    budgetMax: 70000,
    budgetType: "fixed_price" as const,
    currency: "USD",
    requiredSkills: ["Next.js", "FastAPI", "PostgreSQL", "Kafka", "Docker"],
    discoveryDate: new Date(),
    classificationConfidence: 0.95,
  };

  const analysis = await analyzer.analyzeProject(projectInput);
  const scoring = await scoringAgent.scoreOpportunity({
    project: projectInput,
    analysis,
  });

  const proposal = await generator.generateProposal({
    organizationId: "org-nexgen-test-01",
    opportunityId: "opp-01",
    title: projectInput.title,
    description: projectInput.description,
    category: projectInput.primaryCategory,
    sourcePlatform: projectInput.sourcePlatform,
    sourceUrl: projectInput.sourceUrl,
    currency: projectInput.currency,
    budgetMin: projectInput.budgetMin,
    budgetMax: projectInput.budgetMax,
    analysis,
    scoring,
    clientProfile: {
      companyName: projectInput.clientName,
      domain: projectInput.clientDomain,
      country: projectInput.clientCountry,
      industry: "Enterprise SaaS & Telemetry",
      credibilityScore: 85,
      credibilityTier: "established_business",
      techStackDetected: ["Next.js", "Python", "PostgreSQL"],
      evidenceUrls: [{ fact: "Corporate Website", sourceUrl: "https://datagrid.io", verifiedAt: new Date().toISOString() }],
      verifiedContacts: [],
      unverifiedContacts: [],
      riskFlags: [],
      missingInformation: [],
      isVerified: true,
      researchSummary: "Verified Delaware entity with active SaaS telemetry platform.",
      researchedAt: new Date(),
    },
    version: 1,
  });

  // Verify structure
  assert.strictEqual(proposal.version, 1);
  assert.strictEqual(proposal.metadata.status, "pending_approval");
  assert.ok(proposal.executiveSummary.length > 50);
  assert.ok(proposal.requirementsUnderstanding.businessRequirements.length > 0);
  assert.ok(proposal.requirementsUnderstanding.technicalRequirements.length > 0);
  assert.ok(proposal.proposedSolution.summary.length > 50);
  assert.ok(proposal.proposedSolution.keyCapabilities.length >= 3);
  assert.ok(proposal.proposedSolution.architecturalPattern);
  assert.ok(proposal.recommendedTechStack.some((tech) => tech.toLowerCase().includes("next") || tech.toLowerCase().includes("full")));
  assert.ok(proposal.milestones.length >= 3);
  assert.ok(proposal.budgetRecommendation.recommendedCost > 0);
  assert.strictEqual(proposal.budgetRecommendation.currency, "USD");
  assert.ok(proposal.budgetRecommendation.disclaimer.includes("Commercial estimates are technical discovery projections"));
});

// ── 2. AGENT 5: UNKNOWN BUDGET HANDLING & VELOCITY PRICING ────────────────────

test("Agent 5: Calculates neutral sprint velocity for unknown budget without fabricating commitments", () => {
  const unknownBudgetCalculation = ProposalBudgetCalculator.calculate({
    complexity: "high",
    estimatedDurationWeeks: 10,
    clientBudgetMin: null,
    clientBudgetMax: null,
    currency: "USD",
  });

  // Must not be 0 or arbitrary huge number; based on scope complexity velocity band ($6,000/wk for high)
  assert.ok(unknownBudgetCalculation.recommendedCost > 0);
  assert.strictEqual(unknownBudgetCalculation.clientBudgetStatus, "unknown");
  // Total cost should be 10 weeks * $6,000 = $60,000
  assert.strictEqual(unknownBudgetCalculation.recommendedCost, 60000);
  assert.ok(unknownBudgetCalculation.disclaimer.includes("Commercial estimates are technical discovery projections"));
  assert.ok(unknownBudgetCalculation.pricingModelExplanation.includes("Client budget was not disclosed"));
});

test("Agent 5: Reconciles known budget within velocity parameters", () => {
  const knownBudgetCalculation = ProposalBudgetCalculator.calculate({
    complexity: "medium",
    estimatedDurationWeeks: 5,
    clientBudgetMin: 20000,
    clientBudgetMax: 30000,
    currency: "USD",
  });

  // Medium velocity is $4,500/wk, 5 weeks = $22,500, fits within $20k-$30k
  assert.strictEqual(knownBudgetCalculation.clientBudgetStatus, "disclosed");
  assert.ok(knownBudgetCalculation.recommendedCost >= 20000 && knownBudgetCalculation.recommendedCost <= 30000);
  assert.strictEqual(knownBudgetCalculation.recommendedCost, 22500);
});

// ── 3. PHASED MILESTONES WORK BREAKDOWN ────────────────────────────────────────

test("Agent 5: Distributes milestone budget allocations totaling exactly 100%", () => {
  const milestones = [
    { phase: 1, title: "Architecture & Foundations", deliverables: ["Architecture spec"], durationWeeks: 2, costAllocationPercent: 25 },
    { phase: 2, title: "Core Engine Implementation", deliverables: ["Core API"], durationWeeks: 4, costAllocationPercent: 45 },
    { phase: 3, title: "Testing, Hardening & Launch", deliverables: ["QA & Deploy"], durationWeeks: 2, costAllocationPercent: 30 },
  ];

  const distributed = ProposalBudgetCalculator.distributeMilestoneCosts(50000, milestones);

  const totalCost = distributed.reduce((sum, m) => sum + m.costEstimate, 0);

  assert.strictEqual(totalCost, 50000);
  assert.strictEqual(distributed[0].costEstimate, 12500);
  assert.strictEqual(distributed[1].costEstimate, 22500);
  assert.strictEqual(distributed[2].costEstimate, 15000);
});

// ── 4. ITERATIVE PROPOSAL VERSIONING & REVISION FEEDBACK ───────────────────────

test("Agent 5: Generates version 2 incorporating reviewer feedback", async () => {
  const analyzer = new ProjectAnalyzer();
  const scoringAgent = new OpportunityScoringAgent();
  const generator = new AIProposalGenerator();

  const projectInput = {
    contentHash: "hash-fintech-01",
    sourcePlatform: "upwork",
    title: "FinTech Compliance & Transaction Monitoring Engine",
    description: "Develop an automated transaction screening engine with AML/KYC checks and real-time fraud alerts.",
    primaryCategory: "cybersecurity" as const,
    subcategories: ["fintech"],
    budgetMin: 40000,
    budgetMax: 80000,
    budgetType: "fixed_price" as const,
    currency: "USD",
    requiredSkills: ["Node.js", "PostgreSQL", "Kafka", "Security"],
    discoveryDate: new Date(),
    classificationConfidence: 0.9,
  };

  const analysis = await analyzer.analyzeProject(projectInput);
  const scoring = await scoringAgent.scoreOpportunity({
    project: projectInput,
    analysis,
  });

  // v1 Generation
  const v1 = await generator.generateProposal({
    organizationId: "org-nexgen-test-01",
    opportunityId: "opp-fintech-01",
    title: projectInput.title,
    description: projectInput.description,
    category: projectInput.primaryCategory,
    sourcePlatform: projectInput.sourcePlatform,
    currency: projectInput.currency,
    budgetMin: projectInput.budgetMin,
    budgetMax: projectInput.budgetMax,
    analysis,
    scoring,
    version: 1,
  });

  assert.strictEqual(v1.version, 1);
  assert.strictEqual(v1.metadata.status, "pending_approval");
  assert.strictEqual(v1.revisionNotes, undefined);

  // v2 Generation incorporating Anil's feedback
  const reviewerFeedback = "Include Redis for high-frequency deduplication and extend Phase 2 to 4 weeks.";
  const v2 = await generator.generateProposal({
    organizationId: "org-nexgen-test-01",
    opportunityId: "opp-fintech-01",
    title: projectInput.title,
    description: projectInput.description,
    category: projectInput.primaryCategory,
    sourcePlatform: projectInput.sourcePlatform,
    currency: projectInput.currency,
    budgetMin: projectInput.budgetMin,
    budgetMax: projectInput.budgetMax,
    analysis,
    scoring,
    version: 2,
    revisionFeedback: reviewerFeedback,
  });

  assert.strictEqual(v2.version, 2);
  assert.strictEqual(v2.metadata.status, "pending_approval");
  assert.strictEqual(v2.revisionNotes, reviewerFeedback);
  // Verify feedback is mentioned in executive summary
  assert.ok(
    v2.executiveSummary.includes("Revision Note") &&
    v2.executiveSummary.includes("Include Redis"),
  );
});

// ── 5. SECURITY: SERVER-SIDE ANIL APPROVAL VERIFICATION ────────────────────────

test("Security: isAnilAuthorizedAccount authorizes only verified Anil accounts", () => {
  // 1. Primary Anil email
  assert.strictEqual(
    isAnilAuthorizedAccount({ id: "user-anil-01", email: "anil@nexgen.ai" }),
    true,
  );

  // 2. Different case / whitespace
  assert.strictEqual(
    isAnilAuthorizedAccount({ id: "user-anil-01", email: "  ANIL@NEXGEN.AI " }),
    true,
  );

  // 3. Regular member
  assert.strictEqual(
    isAnilAuthorizedAccount({ id: "user-member-02", email: "john@nexgen.ai" }),
    false,
  );

  // 4. Administrator who is NOT Anil
  assert.strictEqual(
    isAnilAuthorizedAccount({ id: "user-admin-03", email: "admin@nexgen.ai" }),
    false,
  );

  // 5. No email
  assert.strictEqual(
    isAnilAuthorizedAccount({ id: "user-anon", email: null }),
    false,
  );
});

test("Security: isAnilAuthorizedAccount strictly rejects client-supplied isAnilExplicit unless in trusted server context", () => {
  // Untrusted client attempts to pass isAnilExplicit = true
  assert.strictEqual(
    isAnilAuthorizedAccount({
      id: "user-attacker",
      email: "attacker@external.com",
      isAnilExplicit: true,
      isTrustedServerContext: false,
    }),
    false,
  );

  // Untrusted client with no context flag
  assert.strictEqual(
    isAnilAuthorizedAccount({
      id: "user-attacker",
      email: "attacker@external.com",
      isAnilExplicit: true,
    }),
    false,
  );
});

// ── 6. STATE MACHINE TRANSITIONS & PROPOSAL APPROVAL DECISIONS ─────────────────

test("Security: Orchestrator applies approval decision for Anil and records audit fields", () => {
  const proposalState = {
    id: "prop-101",
    opportunityId: "opp-101",
    organizationId: "org-nexgen-test-01",
    status: "pending_approval" as const,
    approvedByUserId: null,
    approvedAt: null,
    reviewerFeedback: null,
  };

  const approved = NexgenAgentOrchestrator.applyProposalApprovalDecision(
    proposalState,
    {
      proposalId: "prop-101",
      action: "approve",
      userId: "user-anil-01",
      userEmail: "anil@nexgen.ai",
      userRoles: ["owner", "admin"],
      isTrustedServerContext: true,
    },
  );

  assert.strictEqual(approved.status, "approved");
  assert.strictEqual(approved.approvedByUserId, "user-anil-01");
  assert.ok(approved.approvedAt);
});

test("Security: Non-Anil account is blocked from approving proposals (Throws Forbidden)", () => {
  const proposalState = {
    id: "prop-102",
    opportunityId: "opp-102",
    organizationId: "org-nexgen-test-01",
    status: "pending_approval" as const,
    approvedByUserId: null,
    approvedAt: null,
    reviewerFeedback: null,
  };

  assert.throws(
    () => {
      NexgenAgentOrchestrator.applyProposalApprovalDecision(
        proposalState,
        {
          proposalId: "prop-102",
          action: "approve",
          userId: "user-other-admin",
          userEmail: "sarah.admin@nexgen.ai",
          userRoles: ["admin"],
          isTrustedServerContext: true,
        },
      );
    },
    /Only Anil's authenticated account can authorize external communications or approve proposals/,
  );
});

test("Security: Anil can request revisions or reject proposals with feedback", () => {
  const proposalState = {
    id: "prop-103",
    opportunityId: "opp-103",
    organizationId: "org-nexgen-test-01",
    status: "pending_approval" as const,
    approvedByUserId: null,
    approvedAt: null,
    reviewerFeedback: null,
  };

  // 1. Revision Request
  const revisionRequested = NexgenAgentOrchestrator.applyProposalApprovalDecision(
    proposalState,
    {
      proposalId: "prop-103",
      action: "request_revision",
      userId: "user-anil-01",
      userEmail: "anil@nexgen.ai",
      reviewerFeedback: "Needs AWS multi-region failover strategy added to Phase 3.",
      isTrustedServerContext: true,
    },
  );

  assert.strictEqual(revisionRequested.status, "revision_requested");
  assert.strictEqual(revisionRequested.approvedByUserId, null);
  assert.strictEqual(revisionRequested.reviewerFeedback, "Needs AWS multi-region failover strategy added to Phase 3.");

  // 2. Rejection
  const rejected = NexgenAgentOrchestrator.applyProposalApprovalDecision(
    proposalState,
    {
      proposalId: "prop-103",
      action: "reject",
      userId: "user-anil-01",
      userEmail: "anil@nexgen.ai",
      reviewerFeedback: "Budget is severely misaligned with enterprise requirements.",
      isTrustedServerContext: true,
    },
  );

  assert.strictEqual(rejected.status, "rejected");
  assert.strictEqual(rejected.approvedByUserId, null);
  assert.strictEqual(rejected.reviewerFeedback, "Budget is severely misaligned with enterprise requirements.");
});

// ── 7. SECURITY: EXTERNAL OUTREACH BLOCKING POLICY ─────────────────────────────

test("Security: assertOutreachPreconditions blocks unapproved proposals and enforces disabled outreach safety guard", () => {
  // Case 1: External outreach is disabled by default (process.env.ALLOW_EXTERNAL_OUTREACH !== 'true')
  assert.throws(
    () => {
      NexgenAgentOrchestrator.assertOutreachPreconditions({
        status: "approved",
        approvedByUserId: "user-anil-01",
        approvedAt: new Date(),
      });
    },
    /Outreach dispatch blocked: External communication is disabled by default/,
  );

  // Case 2: When external outreach is enabled, but proposal is pending approval -> blocked
  const prevEnv = process.env.ALLOW_EXTERNAL_OUTREACH;
  try {
    process.env.ALLOW_EXTERNAL_OUTREACH = "true";

    assert.throws(
      () => {
        NexgenAgentOrchestrator.assertOutreachPreconditions({
          status: "pending_approval",
          approvedByUserId: null,
          approvedAt: null,
        });
      },
      /Outreach dispatch blocked: Proposal is pending Anil's approval/,
    );

    // Case 3: Rejected proposals cannot be dispatched
    assert.throws(
      () => {
        NexgenAgentOrchestrator.assertOutreachPreconditions({
          status: "rejected",
          approvedByUserId: null,
          approvedAt: null,
        });
      },
      /Outreach dispatch blocked: Proposal was rejected/,
    );

    // Case 4: Fully approved proposal by Anil with approver and timestamp succeeds
    assert.doesNotThrow(() => {
      NexgenAgentOrchestrator.assertOutreachPreconditions({
        status: "approved",
        approvedByUserId: "user-anil-01",
        approvedAt: new Date(),
      });
    });
  } finally {
    process.env.ALLOW_EXTERNAL_OUTREACH = prevEnv;
  }
});

// ── 8. DATABASE REPOSITORY PROPOSAL INTEGRATION & MULTI-TENANT ISOLATION ───────

class MockProposalRepository {
  private proposals: Array<{
    id: string;
    organizationId: string;
    opportunityId: string;
    version: number;
    title: string;
    executiveSummary: string;
    proposedSolution: string;
    milestones: any;
    estimatedDurationWeeks: number;
    totalCostEstimate: number;
    currency: string;
    status: string;
    approvedByUserId?: string | null;
    approvedAt?: Date | null;
    reviewerFeedback?: string | null;
    dispatchChannel?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  public async getNextProposalVersion(organizationId: string, opportunityId: string): Promise<number> {
    const existing = this.proposals
      .filter((p) => p.organizationId === organizationId && p.opportunityId === opportunityId)
      .sort((a, b) => b.version - a.version);
    return existing.length > 0 ? existing[0].version + 1 : 1;
  }

  public async saveProposal(params: any) {
    const record = {
      id: `prop-${this.proposals.length + 1}`,
      ...params,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.proposals.push(record);
    return record;
  }

  public async getProposalByOpportunityId(organizationId: string, opportunityId: string) {
    const found = this.proposals
      .filter((p) => p.organizationId === organizationId && p.opportunityId === opportunityId)
      .sort((a, b) => b.version - a.version)[0];
    return found ? { proposal: found } : null;
  }

  public async getProposalById(organizationId: string, proposalId: string) {
    const found = this.proposals.find((p) => p.organizationId === organizationId && p.id === proposalId);
    return found ? { proposal: found } : null;
  }

  public async updateProposalDecision(params: {
    organizationId: string;
    proposalId: string;
    status: any;
    approvedByUserId?: string | null;
    approvedAt?: Date | null;
    reviewerFeedback?: string | null;
    dispatchChannel?: string | null;
  }) {
    const idx = this.proposals.findIndex((p) => p.organizationId === params.organizationId && p.id === params.proposalId);
    if (idx !== -1) {
      this.proposals[idx] = {
        ...this.proposals[idx],
        status: params.status,
        approvedByUserId: params.approvedByUserId ?? null,
        approvedAt: params.approvedAt ?? null,
        reviewerFeedback: params.reviewerFeedback ?? null,
        dispatchChannel: params.dispatchChannel ?? null,
        updatedAt: new Date(),
      };
    }
  }
}

test("Database Contract: Proposal persistence, version auto-increment, and multi-tenant isolation", async () => {
  const repository = new MockProposalRepository();

  const orgA = "org-alpha-nexgen-100";
  const orgB = "org-beta-competing-200";
  const oppId = "opp-hl7-fhir-101";

  // 1. Check next proposal version starts at 1
  const v1Number = await repository.getNextProposalVersion(orgA, oppId);
  assert.strictEqual(v1Number, 1);

  // 2. Save proposal v1 in orgA
  const savedV1 = await repository.saveProposal({
    organizationId: orgA,
    opportunityId: oppId,
    version: 1,
    title: "Technical Proposal: Healthcare EHR Integration",
    executiveSummary: "Production-ready FHIR microservice architecture with audit logging.",
    proposedSolution: "Node.js FHIR facade connecting to PostgreSQL.",
    milestones: [
      { phase: 1, title: "Architecture Spec", deliverables: ["FHIR Schema"], durationWeeks: 2, costAllocationPercent: 30, estimatedCost: 18000 },
      { phase: 2, title: "Integration Engine", deliverables: ["Engine"], durationWeeks: 4, costAllocationPercent: 70, estimatedCost: 42000 },
    ],
    estimatedDurationWeeks: 6,
    totalCostEstimate: 60000,
    currency: "USD",
    status: "pending_approval",
  });

  assert.ok(savedV1.id);
  assert.strictEqual(savedV1.version, 1);
  assert.strictEqual(savedV1.status, "pending_approval");

  // 3. Next version for orgA and oppId is now 2
  const v2Number = await repository.getNextProposalVersion(orgA, oppId);
  assert.strictEqual(v2Number, 2);

  // 4. Multi-Tenant Isolation Test: orgB cannot read orgA's proposal
  const crossTenantByOpp = await repository.getProposalByOpportunityId(orgB, oppId);
  assert.strictEqual(crossTenantByOpp, null);

  const crossTenantById = await repository.getProposalById(orgB, savedV1.id);
  assert.strictEqual(crossTenantById, null);

  // 5. Update proposal decision for orgA
  const approvedDate = new Date();
  await repository.updateProposalDecision({
    organizationId: orgA,
    proposalId: savedV1.id,
    status: "approved",
    approvedByUserId: "user-anil-01",
    approvedAt: approvedDate,
    reviewerFeedback: "Approved for client presentation.",
    dispatchChannel: "email",
  });

  // Verify updated record in orgA
  const fetchedApproved = await repository.getProposalById(orgA, savedV1.id);
  assert.ok(fetchedApproved);
  assert.strictEqual(fetchedApproved.proposal.status, "approved");
  assert.strictEqual(fetchedApproved.proposal.approvedByUserId, "user-anil-01");
  assert.strictEqual(fetchedApproved.proposal.reviewerFeedback, "Approved for client presentation.");

  // 6. Cross-tenant update attempt: OrgB cannot update OrgA's proposal
  await repository.updateProposalDecision({
    organizationId: orgB,
    proposalId: savedV1.id,
    status: "rejected",
    reviewerFeedback: "Malicious cross-tenant override attempt.",
  });

  // Verify status in OrgA remains unchanged (still approved)
  const verifyStillApproved = await repository.getProposalById(orgA, savedV1.id);
  assert.ok(verifyStillApproved);
  assert.strictEqual(verifyStillApproved.proposal.status, "approved");
  assert.strictEqual(verifyStillApproved.proposal.approvedByUserId, "user-anil-01");
});
