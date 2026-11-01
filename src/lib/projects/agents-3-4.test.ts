/**
 * NEXGEN GLOBAL AI — Agent 3 (Project Analyzer) & Agent 4 (Opportunity Scoring) Test Suite
 *
 * Test Coverage:
 * 1. Agent 3: Functional & Non-functional requirements extraction.
 * 2. Agent 3: Architecture and modern technology recommendations.
 * 3. Agent 3: Milestone breakdown and non-commitment duration disclaimer.
 * 4. Agent 3: Delivery risk and missing requirement detection.
 * 5. Agent 4: 5-Factor scoring matrix calculation and weighting.
 * 6. Agent 4: Unknown budget neutral baseline handling (not zero).
 * 7. Agent 4: Competition factor directionality (high score = favorable moat).
 * 8. Agent 4: Qualification threshold (&ge;75) and letter grading (A-F).
 * 9. Agent 4: Hard disqualification rule for high-risk/suspicious listings.
 * 10. Pipeline Integration: Full 4-agent discovery, analysis, scoring, and DB persistence.
 * 11. Security: Server-side Anil approval verification rejects untrusted isAnilExplicit.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { ProjectAnalyzer } from "./agents/analyzer/analyzer";
import { OpportunityScoringAgent } from "./agents/scoring/scoring";
import {
  GENUINE_PROJECT_FIXTURES,
  TestFixtureDiscoverySource,
} from "./agents/hunter/sources/test-fixture-source";
import { ClientResearcher } from "./agents/researcher/researcher";
import {
  DiscoveryAndResearchPipeline,
  type IDatabaseOpportunityRepository,
} from "./workflow/pipeline";
import { isAnilAuthorizedAccount, NexgenAgentOrchestrator } from "./agents/orchestrator";
import { DashboardMetricsCalculator } from "./dashboard/metrics";

// ── 1. AGENT 3: PROJECT ANALYZER TESTS ────────────────────────────────────────

test("Agent 3: Analyzes requirements and recommends RAG Multi-Agent Architecture for GenAI", async () => {
  const analyzer = new ProjectAnalyzer();
  const genaiProject = {
    contentHash: "hash-genai-01",
    sourcePlatform: "upwork",
    sourceUrl: "https://example.com/genai-01",
    title: "Enterprise Multi-Agent LLM Knowledge Assistant",
    description: "Build an autonomous multi-agent assistant for legal document discovery. Must support hybrid RAG, LangChain, Pinecone vector database, and Claude fallback with strict SOC2 audit logging.",
    primaryCategory: "genai" as const,
    subcategories: ["ai_machine_learning"],
    clientName: "Lexis Legal Tech",
    clientDomain: "lexislegal.com",
    clientCountry: "United States",
    budgetMin: 30000,
    budgetMax: 60000,
    budgetType: "fixed_price" as const,
    currency: "USD",
    requiredSkills: ["GenAI", "Python", "RAG", "LangChain", "Vector Database"],
    discoveryDate: new Date(),
    classificationConfidence: 0.95,
  };

  const analysis = await analyzer.analyzeProject(genaiProject);

  assert.ok(analysis.functionalRequirements.length >= 2);
  assert.ok(analysis.nonFunctionalRequirements.some((nfr) => nfr.includes("SOC2")));
  assert.equal(analysis.recommendedArchitecture.pattern, "rag_multi_agent_system");
  assert.ok(analysis.recommendedArchitecture.aiMlRequirements !== undefined);
  assert.ok(analysis.technologyRecommendations.coreStack.includes("Python"));
  assert.ok(analysis.milestones.length >= 3);
  assert.equal(analysis.estimatedDuration.disclaimer, ProjectAnalyzer.DURATION_DISCLAIMER);
  assert.ok(analysis.risks.some((r) => r.category === "technical" && r.description.includes("LLM")));
});

test("Agent 3: Recommends Event-Driven Microservices for high-throughput distributed payment", async () => {
  const analyzer = new ProjectAnalyzer();
  const paymentProject = {
    contentHash: "hash-pay-02",
    sourcePlatform: "github",
    sourceUrl: "https://example.com/pay-02",
    title: "High-Throughput Distributed Payment Gateway & Microservices",
    description: "Design and implement core distributed payment processing microservices handling 15,000 TPS. Needs idempotent event sourcing using Kafka, Go/gRPC, and PostgreSQL partitioned ledgers with zero data loss guarantee.",
    primaryCategory: "api_backend" as const,
    subcategories: [],
    clientName: "FinPay Global",
    clientDomain: "finpay.eu",
    clientCountry: "Germany",
    budgetMin: 35000,
    budgetMax: 70000,
    budgetType: "fixed_price" as const,
    currency: "EUR",
    requiredSkills: ["Golang", "Kafka", "gRPC", "PostgreSQL"],
    discoveryDate: new Date(),
    classificationConfidence: 0.9,
  };

  const analysis = await analyzer.analyzeProject(paymentProject);

  assert.equal(analysis.complexityLevel, "enterprise");
  assert.equal(analysis.recommendedArchitecture.pattern, "event_driven_microservices");
  assert.ok(analysis.recommendedArchitecture.databaseRequirements.some((d) => d.includes("Kafka")));
  assert.ok(analysis.technologyRecommendations.coreStack.includes("PostgreSQL"));
  assert.ok(analysis.estimatedDuration.weeksMin >= 8);
});

test("Agent 3: Identifies missing requirements and flags scope risk", async () => {
  const analyzer = new ProjectAnalyzer();
  const underspecifiedProject = {
    contentHash: "hash-vague-03",
    sourcePlatform: "freelancer",
    sourceUrl: "https://example.com/vague-03",
    title: "Make me an app",
    description: "I need a fast app developed quickly. Contact me.",
    primaryCategory: "web_development" as const,
    subcategories: [],
    budgetType: "unknown" as const,
    currency: "USD",
    requiredSkills: [],
    discoveryDate: new Date(),
    classificationConfidence: 0.5,
  };

  const analysis = await analyzer.analyzeProject(underspecifiedProject);

  assert.ok(analysis.missingInformation.length >= 3);
  assert.ok(analysis.missingInformation.some((m) => m.includes("budget")));
  assert.ok(analysis.missingInformation.some((m) => m.includes("hosting") || m.includes("database")));
  assert.ok(analysis.confidenceLevel <= 0.7);
});

// ── 2. AGENT 4: OPPORTUNITY SCORING AGENT TESTS ───────────────────────────────

test("Agent 4: Unknown budget receives neutral baseline (55.0) and is not zeroed out", async () => {
  const scoringAgent = new OpportunityScoringAgent();
  const noBudgetProject = {
    contentHash: "hash-nobudget-04",
    sourcePlatform: "upwork",
    sourceUrl: "https://example.com/nobudget-04",
    title: "Enterprise Next.js SaaS Analytics Platform",
    description: "Build an enterprise SaaS platform with Next.js, TypeScript, and PostgreSQL.",
    primaryCategory: "saas" as const,
    subcategories: ["web_development"],
    clientName: "Enterprise Client",
    clientDomain: "enterprise.com",
    clientCountry: "United States",
    budgetType: "unknown" as const,
    currency: "USD",
    requiredSkills: ["Next.js", "TypeScript", "PostgreSQL"],
    discoveryDate: new Date(),
    classificationConfidence: 0.9,
  };

  const scoreResult = await scoringAgent.scoreOpportunity({
    project: noBudgetProject,
  });

  // Must NOT be zero!
  assert.equal(scoreResult.factors.budgetViability.score, 55.0);
  assert.ok(scoreResult.overallScore > 0);
  assert.ok(scoreResult.factors.budgetViability.missingInformation?.some((m) => m.includes("undisclosed")));
});

test("Agent 4: Competition factor scores higher for high-barrier enterprise opportunities", async () => {
  const scoringAgent = new OpportunityScoringAgent();
  const analyzer = new ProjectAnalyzer();

  const enterpriseProject = {
    contentHash: "hash-ent-05",
    sourcePlatform: "direct",
    sourceUrl: "https://example.com/ent-05",
    title: "Enterprise Multi-Agent SOC2 HIPAA Healthcare Engine",
    description: "Design distributed HIPAA and SOC2 compliant AI diagnostic assistant.",
    primaryCategory: "genai" as const,
    subcategories: [],
    clientName: "HealthTech Corp",
    clientDomain: "healthtech.org",
    clientCountry: "United States",
    budgetMin: 50000,
    budgetMax: 100000,
    budgetType: "fixed_price" as const,
    currency: "USD",
    requiredSkills: ["GenAI", "Python", "HIPAA", "SOC2"],
    discoveryDate: new Date(),
    classificationConfidence: 0.95,
  };

  const analysis = await analyzer.analyzeProject(enterpriseProject);
  const scoreResult = await scoringAgent.scoreOpportunity({
    project: enterpriseProject,
    analysis,
  });

  // High barrier to entry = favorable competition score (>= 80)
  assert.ok(scoreResult.factors.competition.score >= 80);
  assert.ok(scoreResult.factors.competition.reasoning.includes("High technical barrier"));
});

test("Agent 4: Correctly calculates weighted score, grade, and qualification threshold", async () => {
  const scoringAgent = new OpportunityScoringAgent({ threshold: 75 });

  const strongProject = {
    contentHash: "hash-strong-06",
    sourcePlatform: "upwork",
    sourceUrl: "https://example.com/strong-06",
    title: "Enterprise GenAI Knowledge Assistant",
    description: "Build LangChain and Python RAG pipeline with FastAPI and PostgreSQL.",
    primaryCategory: "genai" as const,
    subcategories: [],
    clientName: "LexisAI Inc.",
    clientDomain: "lexisai.com",
    clientCountry: "United States",
    budgetMin: 30000,
    budgetMax: 50000,
    budgetType: "fixed_price" as const,
    currency: "USD",
    requiredSkills: ["GenAI", "Python", "FastAPI"],
    discoveryDate: new Date(),
    classificationConfidence: 0.9,
  };

  const researcher = new ClientResearcher();
  const analyzer = new ProjectAnalyzer();

  const profile = await researcher.researchClient(strongProject);
  const analysis = await analyzer.analyzeProject(strongProject, profile);

  const scoreResult = await scoringAgent.scoreOpportunity({
    project: strongProject,
    clientProfile: profile,
    analysis,
  });

  assert.ok(scoreResult.overallScore >= 75);
  assert.equal(scoreResult.isQualified, true);
  assert.ok(["A", "B"].includes(scoreResult.qualificationGrade));
  assert.ok(["priority_proposal", "standard_proposal"].includes(scoreResult.recommendedAction));
});

test("Agent 4: High-risk client triggers HARD DISQUALIFICATION regardless of numerical score", async () => {
  const scoringAgent = new OpportunityScoringAgent();

  const projectWithHighRiskClient = {
    contentHash: "hash-hr-07",
    sourcePlatform: "freelancer",
    sourceUrl: "https://example.com/hr-07",
    title: "Large Enterprise Python API ($100,000)",
    description: "We need someone to build an enterprise platform.",
    primaryCategory: "api_backend" as const,
    subcategories: [],
    clientName: "Shady Anonymous",
    budgetMin: 100000,
    budgetMax: 100000,
    budgetType: "fixed_price" as const,
    currency: "USD",
    requiredSkills: ["Python", "FastAPI"],
    discoveryDate: new Date(),
    classificationConfidence: 0.9,
  };

  const highRiskProfile = {
    companyName: "Shady Anonymous",
    industry: "Unknown",
    credibilityScore: 15,
    credibilityTier: "high_risk" as const,
    techStackDetected: [],
    evidenceUrls: [],
    verifiedContacts: [],
    unverifiedContacts: [],
    riskFlags: ["Disposable domain detected", "Advance fee scam indicators"],
    missingInformation: ["No corporate presence"],
    isVerified: false,
    researchSummary: "High risk anonymous entity.",
    researchedAt: new Date(),
  };

  const scoreResult = await scoringAgent.scoreOpportunity({
    project: projectWithHighRiskClient,
    clientProfile: highRiskProfile,
  });

  // Must be HARD DISQUALIFIED
  assert.equal(scoreResult.isDisqualified, true);
  assert.equal(scoreResult.isQualified, false);
  assert.equal(scoreResult.recommendedAction, "pass");
  assert.ok(scoreResult.disqualificationReason?.includes("Hard Disqualification"));
});

// ── 3. PIPELINE INTEGRATION: FULL 4-AGENT WORKFLOW ────────────────────────────

test("Pipeline Integration: Complete workflow across Hunter, Researcher, Analyzer, and Scoring", async () => {
  const testOrgId = "test-org-fleet-001";
  const savedOpportunities: any[] = [];
  const savedScores: any[] = [];
  const loggedExecutions: any[] = [];

  const mockRepo: IDatabaseOpportunityRepository = {
    async findExistingFingerprints() {
      return [];
    },
    async saveOpportunity(rec) {
      savedOpportunities.push(rec);
      return { id: `opp-${savedOpportunities.length}` };
    },
    async saveOpportunityScore(rec) {
      savedScores.push(rec);
      return { id: `score-${savedScores.length}` };
    },
    async logAgentExecution(exec) {
      loggedExecutions.push(exec);
    },
  };

  const pipeline = new DiscoveryAndResearchPipeline({
    sources: [new TestFixtureDiscoverySource({ includeAnomalies: false })],
    repository: mockRepo,
    scoringThreshold: 75,
  });

  const summary = await pipeline.runPipeline(testOrgId);

  assert.equal(summary.organizationId, testOrgId);
  assert.equal(summary.hunterDiscovered, 6);
  assert.equal(summary.ingestedProjects.length, 6);
  assert.equal(savedOpportunities.length, 6);
  assert.equal(savedScores.length, 6);

  // Verify all 4 agents logged executions
  const agentTypes = loggedExecutions.map((e) => e.agentType);
  assert.ok(agentTypes.includes("global_project_hunter"));
  assert.ok(agentTypes.includes("client_researcher"));
  assert.ok(agentTypes.includes("project_analyzer"));
  assert.ok(agentTypes.includes("opportunity_scoring"));

  // Check multi-tenant scoping
  assert.ok(savedOpportunities.every((o) => o.organizationId === testOrgId));
  assert.ok(savedScores.every((s) => s.organizationId === testOrgId));
  assert.ok(loggedExecutions.every((e) => e.organizationId === testOrgId));

  // Check analysis and scoring reports are populated
  assert.ok(summary.ingestedProjects.every((p) => p.analysisReport !== undefined));
  assert.ok(summary.ingestedProjects.every((p) => p.scoringReport !== undefined));
});

// ── 4. SECURITY: UNTRUSTED isAnilExplicit SPOOFING REJECTION ─────────────────

test("Security: Untrusted client isAnilExplicit is strictly REJECTED without trusted server context", () => {
  // Attacker sends { isAnilExplicit: true } with non-Anil email
  const untrustedUser = {
    id: "attacker-user-id",
    email: "intruder@badactor.com",
    isAnilExplicit: true, // Spoofed!
  };

  // Without trusted server context, must return false!
  const isAuthorizedUntrusted = isAnilAuthorizedAccount(untrustedUser, { isTrustedServerContext: false });
  assert.equal(isAuthorizedUntrusted, false);

  // Even if options is omitted, defaults to untrusted
  const isAuthorizedDefault = isAnilAuthorizedAccount(untrustedUser);
  assert.equal(isAuthorizedDefault, false);

  // Legitimate authenticated Anil user succeeds
  const legitimateAnil = {
    id: "anil-user-id",
    email: "anil@nexgen.ai",
  };
  const isAuthorizedLegit = isAnilAuthorizedAccount(legitimateAnil);
  assert.equal(isAuthorizedLegit, true);
});

// ── 5. DASHBOARD METRICS: VERIFIED COUNT & AVERAGE SCORE ──────────────────────

test("Dashboard Metrics: Computes verified count and average opportunity score accurately", () => {
  const metrics = DashboardMetricsCalculator.calculate({
    totalDiscovered: 10,
    qualifiedListings: [
      { category: "genai", isVerified: true, overallScore: 92.0 },
      { category: "saas", isVerified: true, overallScore: 84.0 },
      { category: "mobile", isVerified: false, overallScore: 70.0 },
      { category: "api_backend", isVerified: true, overallScore: 88.0 },
    ],
    duplicateCount: 2,
    suspiciousCount: 1,
    expiredCount: 1,
  });

  assert.equal(metrics.totalProjectsDiscovered, 10);
  assert.equal(metrics.qualifiedProjectsCount, 4);
  assert.equal(metrics.verifiedProjectsCount, 3);
  assert.equal(metrics.unverifiedProjectsCount, 1);
  // (92 + 84 + 70 + 88) / 4 = 334 / 4 = 83.5
  assert.equal(metrics.averageOpportunityScore, 83.5);
  assert.equal(metrics.agentExecutionStatus.analyzerStatus, "active");
  assert.equal(metrics.agentExecutionStatus.scoringStatus, "active");
});
