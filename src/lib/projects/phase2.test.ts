/**
 * NEXGEN GLOBAL AI — Phase 2 Automated Test Suite
 *
 * Test Coverage:
 * 1. Agent 1: Global Project Hunter discovery across 13 software categories.
 * 2. Agent 1: Duplicate project detection and content hash fingerprinting.
 * 3. Agent 1: Expired and suspicious scam listing rejection.
 * 4. Agent 1: Source reliability scoring and telemetry.
 * 5. Agent 2: Client Researcher factual domain and industry extraction.
 * 6. Agent 2: Client credibility scoring and risk flag identification.
 * 7. Agent 2: Strict prohibition on contact information fabrication.
 * 8. Workflow: End-to-end pipeline execution across Hunter & Researcher.
 * 9. Multi-tenant isolation during repository ingestion.
 * 10. Dashboard foundation: Progress tracking toward 40 qualified projects daily.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { GlobalProjectHunter } from "./agents/hunter/hunter";
import { HunterDetector } from "./agents/hunter/detector";
import {
  GENUINE_PROJECT_FIXTURES,
  TestFixtureDiscoverySource,
} from "./agents/hunter/sources/test-fixture-source";
import { PermittedRssDiscoverySource } from "./agents/hunter/sources/rss-source";
import { ClientResearcher } from "./agents/researcher/researcher";
import { ClientCredibilityEngine } from "./agents/researcher/credibility";
import {
  DiscoveryAndResearchPipeline,
  type IDatabaseOpportunityRepository,
} from "./workflow/pipeline";
import { DashboardMetricsCalculator } from "./dashboard/metrics";

// ── 1. AGENT 1: PROJECT DISCOVERY & CATEGORIZATION TESTS ─────────────────────

test("Agent 1: Discovers genuine software projects across multiple categories", async () => {
  const source = new TestFixtureDiscoverySource({ includeAnomalies: false });
  const hunter = new GlobalProjectHunter([source]);

  const result = await hunter.executeDiscovery();

  assert.equal(result.totalDiscovered, 6);
  assert.equal(result.qualifiedProjects.length, 6);
  assert.equal(result.duplicatesFiltered, 0);
  assert.equal(result.suspiciousFiltered, 0);

  const allCategories = result.qualifiedProjects.flatMap((p) => [p.primaryCategory, ...p.subcategories]);
  assert.ok(allCategories.includes("genai"));
  assert.ok(allCategories.includes("saas"));
  assert.ok(allCategories.includes("erp_crm"));
  assert.ok(allCategories.includes("cloud_devops"));
  assert.ok(allCategories.includes("mobile_development"));

  // Check currency support (USD, EUR, GBP)
  const currencies = result.qualifiedProjects.map((p) => p.currency);
  assert.ok(currencies.includes("USD"));
  assert.ok(currencies.includes("EUR"));
  assert.ok(currencies.includes("GBP"));
});

test("Agent 1: Detects and rejects duplicate listings", async () => {
  const source = new TestFixtureDiscoverySource({ includeAnomalies: false });
  const hunter = new GlobalProjectHunter([source]);

  // First run: all 6 qualified
  const firstRun = await hunter.executeDiscovery();
  assert.equal(firstRun.qualifiedProjects.length, 6);

  // Second run: all 6 must be detected as duplicates and filtered
  const secondRun = await hunter.executeDiscovery();
  assert.equal(secondRun.qualifiedProjects.length, 0);
  assert.equal(secondRun.duplicatesFiltered, 6);
});

test("Agent 1: Rejects suspicious, advance-fee, and scam listings", async () => {
  const suspiciousListing = {
    sourcePlatform: "upwork",
    sourceUrl: "https://example.com/scam-test",
    title: "Need simple React app - Send upfront activation fee on Telegram @fastpay",
    description: "Please pay upfront fee of $50 to register. Contact on Telegram: @scamwire",
    budgetMin: 500,
    budgetMax: 1000,
  };

  const verdict = HunterDetector.detectSuspicious(suspiciousListing);
  assert.equal(verdict.isAcceptable, false);
  assert.equal(verdict.rejectionReason, "suspicious");
  assert.ok(verdict.flags.some((f) => f.includes("Telegram")));
  assert.ok(verdict.flags.some((f) => f.includes("upfront fee")));
});

test("Agent 1: Rejects expired and closed project listings", async () => {
  const expiredListing = {
    sourcePlatform: "freelancer",
    sourceUrl: "https://example.com/expired-test",
    title: "Fullstack Python Developer (POSITION HAS BEEN FILLED)",
    description: "Thank you for applying. This project is closed and no longer accepting proposals.",
    publishedAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(), // 60 days old
  };

  const verdict = HunterDetector.detectExpired(expiredListing);
  assert.equal(verdict.isAcceptable, false);
  assert.equal(verdict.rejectionReason, "expired");
  assert.ok(verdict.flags.some((f) => f.includes("closed") || f.includes("filled")));
});

test("Agent 1: Source reliability scoring penalizes suspicious listing sources", async () => {
  const sourceWithAnomalies = new TestFixtureDiscoverySource({ includeAnomalies: true });
  const hunter = new GlobalProjectHunter([sourceWithAnomalies]);

  const result = await hunter.executeDiscovery();
  assert.equal(result.totalDiscovered, 9);
  assert.equal(result.qualifiedProjects.length, 6);
  assert.equal(result.suspiciousFiltered, 2);
  assert.equal(result.expiredFiltered, 1);

  const metric = result.sourceReliability["fixture_feed"];
  assert.ok(metric !== undefined);
  assert.equal(metric.validProjects, 6);
  assert.equal(metric.suspiciousBlocked, 2);
  assert.equal(metric.expiredBlocked, 1);
  // Reliability score should be degraded due to suspicious submissions
  assert.ok(metric.reliabilityScore < 1.0);
});

test("Agent 1: RSS Parser extracts valid listings and cleans HTML", () => {
  const rssSource = new PermittedRssDiscoverySource({
    platform: "remoteok",
    url: "https://remoteok.com/rss",
  });

  const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Remote Jobs</title>
      <item>
        <title>Senior AI Engineer ($120,000 - $160,000)</title>
        <link>https://remoteok.com/job/12345</link>
        <guid>job-12345</guid>
        <description><![CDATA[<p>We are seeking a <b>Senior AI Engineer</b> to build LLM pipelines with LangChain and Python.</p>]]></description>
        <pubDate>Mon, 27 Oct 2026 12:00:00 GMT</pubDate>
        <category>AI</category>
        <category>Python</category>
      </item>
    </channel>
  </rss>`;

  const listings = rssSource.parseRssXml(mockXml, 10);
  assert.equal(listings.length, 1);
  assert.equal(listings[0].title, "Senior AI Engineer ($120,000 - $160,000)");
  assert.equal(listings[0].sourceExternalId, "job-12345");
  assert.ok(!listings[0].description.includes("<p>"));
  assert.ok(listings[0].description.includes("Senior AI Engineer"));
  assert.equal(listings[0].budgetMin, 120000);
  assert.equal(listings[0].budgetMax, 160000);
  assert.equal(listings[0].currency, "USD");
});

// ── 2. AGENT 2: CLIENT RESEARCHER TESTS ───────────────────────────────────────

test("Agent 2: Researches client facts, extracts domain, tech stack, and evidence URLs", async () => {
  const researcher = new ClientResearcher();
  const testProject = {
    contentHash: "hash-001",
    sourcePlatform: "upwork",
    sourceUrl: "https://www.upwork.com/jobs/~01genai901",
    title: "Senior GenAI Architect",
    description: "Seeking an experienced GenAI Engineer for LexisAI Technologies Inc. (https://lexisai-tech.com). Needs Python, FastAPI, and LangChain.",
    primaryCategory: "genai" as const,
    subcategories: ["ai_machine_learning"],
    clientName: "LexisAI Technologies Inc.",
    clientDomain: "lexisai-tech.com",
    clientCountry: "United States",
    budgetMin: 25000,
    budgetMax: 50000,
    budgetType: "fixed_price" as const,
    currency: "USD",
    requiredSkills: ["GenAI", "Python"],
    discoveryDate: new Date(),
    classificationConfidence: 0.9,
  };

  const profile = await researcher.researchClient(testProject);

  assert.equal(profile.companyName, "LexisAI Technologies Inc.");
  assert.equal(profile.domain, "lexisai-tech.com");
  assert.equal(profile.websiteUrl, "https://lexisai-tech.com");
  assert.equal(profile.country, "United States");
  assert.ok(profile.techStackDetected.includes("Python"));
  assert.ok(profile.techStackDetected.includes("FastAPI"));
  assert.ok(profile.evidenceUrls.length >= 2);
  assert.ok(profile.credibilityScore >= 70);
  assert.equal(profile.isVerified, true);
});

test("Agent 2: Strictly does NOT invent email addresses or phone numbers", async () => {
  const researcher = new ClientResearcher();
  const anonymousProject = {
    contentHash: "hash-anon-002",
    sourcePlatform: "freelancer",
    sourceUrl: "https://example.com/anon-project",
    title: "Build Simple REST API",
    description: "We need someone to build a REST API in Node.js. No contact details provided here.",
    primaryCategory: "api_backend" as const,
    subcategories: [],
    budgetMin: 2000,
    budgetMax: 4000,
    budgetType: "fixed_price" as const,
    currency: "USD",
    requiredSkills: ["Node.js"],
    discoveryDate: new Date(),
    classificationConfidence: 0.8,
  };

  const profile = await researcher.researchClient(anonymousProject);

  // Must not invent emails or phones
  assert.equal(profile.verifiedContacts.length, 0);
  assert.equal(profile.unverifiedContacts.length, 0);
  // Missing info must explicitly note absence of domain and contacts
  assert.ok(profile.missingInformation.some((m) => m.includes("domain") || m.includes("website")));
  assert.equal(profile.isVerified, false);
  assert.ok(profile.credibilityScore < 50);
});

test("Agent 2: Credibility engine flags disposable and free webmail domains", () => {
  const disposableEvaluation = ClientCredibilityEngine.evaluate({
    companyName: "Shady LLC",
    domain: "mailinator.com",
    evidenceUrls: [],
    description: "Short job post",
  });

  assert.equal(disposableEvaluation.tier, "high_risk");
  assert.ok(disposableEvaluation.riskFlags.some((r) => r.includes("Disposable")));
  assert.ok(disposableEvaluation.score < 30);
  assert.equal(disposableEvaluation.isVerified, false);

  const enterpriseEvaluation = ClientCredibilityEngine.evaluate({
    companyName: "Siemens Healthineers",
    domain: "siemens-healthineers.com",
    evidenceUrls: [
      { fact: "Verified Corporate Portal", sourceUrl: "https://siemens-healthineers.com", verifiedAt: new Date() },
      { fact: "Public RFP Listing", sourceUrl: "https://rfp-hub.com/job/99", verifiedAt: new Date() },
    ],
    country: "Germany",
    description: "Enterprise software overhaul",
  });

  assert.ok(enterpriseEvaluation.score >= 85);
  assert.equal(enterpriseEvaluation.tier, "verified_enterprise");
  assert.equal(enterpriseEvaluation.isVerified, true);
  assert.equal(enterpriseEvaluation.riskFlags.length, 0);
});

// ── 3. WORKFLOW PIPELINE & MULTI-TENANT REPOSITORY TESTS ──────────────────────

test("Workflow Pipeline: End-to-end Hunter -> Deduplication -> Researcher -> Repository", async () => {
  const testOrgId = "test-org-uuid-001";
  const storedOpportunities: Array<{ organizationId: string; title: string }> = [];
  const storedAgentExecutions: Array<{ organizationId: string; agentType: string; status: string }> = [];

  const mockRepo: IDatabaseOpportunityRepository = {
    async findExistingFingerprints(_orgId: string) {
      return [];
    },
    async saveOpportunity(record) {
      storedOpportunities.push({ organizationId: record.organizationId, title: record.title });
      return { id: `opp-${storedOpportunities.length}` };
    },
    async logAgentExecution(exec) {
      storedAgentExecutions.push({
        organizationId: exec.organizationId,
        agentType: exec.agentType,
        status: exec.status,
      });
    },
  };

  const pipeline = new DiscoveryAndResearchPipeline({
    sources: [new TestFixtureDiscoverySource({ includeAnomalies: false })],
    repository: mockRepo,
  });

  const result = await pipeline.runPipeline(testOrgId);

  assert.equal(result.organizationId, testOrgId);
  assert.equal(result.hunterDiscovered, 6);
  assert.equal(result.ingestedProjects.length, 6);
  assert.equal(storedOpportunities.length, 6);

  // Multi-tenant isolation verified: all stored records have testOrgId
  assert.ok(storedOpportunities.every((o) => o.organizationId === testOrgId));

  // Both agents logged executions in audit trail
  assert.ok(storedAgentExecutions.some((e) => e.agentType === "global_project_hunter" && e.status === "completed"));
  assert.ok(storedAgentExecutions.some((e) => e.agentType === "client_researcher" && e.status === "completed"));
  assert.ok(storedAgentExecutions.every((e) => e.organizationId === testOrgId));
});

// ── 4. DASHBOARD FOUNDATION & TARGET 40/DAY METRICS ───────────────────────────

test("Dashboard Metrics: Computes daily quota progress toward 40 qualified projects", () => {
  const metrics = DashboardMetricsCalculator.calculate({
    totalDiscovered: 45,
    qualifiedListings: [
      { category: "genai", country: "United States", isVerified: true, credibilityTier: "verified_enterprise" },
      { category: "saas", country: "United Kingdom", isVerified: true, credibilityTier: "established_business" },
      { category: "erp_crm", country: "Germany", isVerified: false, credibilityTier: "early_stage_startup" },
      { category: "cloud_devops", country: "United States", isVerified: true, credibilityTier: "verified_enterprise" },
    ],
    duplicateCount: 5,
    suspiciousCount: 2,
    expiredCount: 1,
    agentExecutions: [
      { agentType: "global_project_hunter", status: "completed", startedAt: new Date(), costEstimate: 0.002 },
      { agentType: "client_researcher", status: "completed", startedAt: new Date(), costEstimate: 0.004 },
    ],
  });

  assert.equal(metrics.dailyTargetQualified, 40);
  assert.equal(metrics.qualifiedProjectsCount, 4);
  // 4 / 40 = 10%
  assert.equal(metrics.progressTowardsDailyTarget, 10.0);
  assert.equal(metrics.isTargetMet, false);
  assert.equal(metrics.totalProjectsDiscovered, 45);
  assert.equal(metrics.unverifiedProjectsCount, 1);
  assert.equal(metrics.rejectedProjectsCount, 3);
  assert.equal(metrics.duplicateProjectsCount, 5);

  // Country breakdown
  assert.equal(metrics.countryWiseBreakdown["United States"], 2);
  assert.equal(metrics.countryWiseBreakdown["United Kingdom"], 1);
  assert.equal(metrics.countryWiseBreakdown["Germany"], 1);

  // Category breakdown
  assert.equal(metrics.categoryWiseBreakdown["genai"], 1);
  assert.equal(metrics.categoryWiseBreakdown["saas"], 1);

  // Research status breakdown
  assert.equal(metrics.clientResearchStatus.verifiedEnterprise, 2);
  assert.equal(metrics.clientResearchStatus.establishedBusiness, 1);
  assert.equal(metrics.clientResearchStatus.earlyStageStartup, 1);
  assert.equal(metrics.clientResearchStatus.highRiskBlocked, 2);

  // Agent status
  assert.equal(metrics.agentExecutionStatus.totalExecutions, 2);
  assert.equal(metrics.agentExecutionStatus.failureCount, 0);
  assert.equal(metrics.apiUsageAndErrors.estimatedCostUSD, 0.01);
});
