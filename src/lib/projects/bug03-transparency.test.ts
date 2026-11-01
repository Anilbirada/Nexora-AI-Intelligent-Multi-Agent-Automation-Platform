import test from 'node:test';
import assert from 'node:assert/strict';
import { RuntimeExecutionTracker } from './agents/runtime-transparency';
import { AIProposalGenerator } from './agents/proposal/generator';
import { AIOutreachManager } from './agents/outreach/outreach-generator';

test('BUG-03 Transparency: Scenario A: Deterministic execution when no LLM provider is active', () => {
  const telemetry = RuntimeExecutionTracker.resolveTelemetry({ durationMs: 15 });

  assert.equal(telemetry.executionMode, 'DETERMINISTIC');
  assert.equal(telemetry.aiModel, 'nexgen-deterministic-nlp-v1');
  assert.equal(telemetry.tokensUsed, 0, 'Tokens used must be exactly 0 when no LLM tokens were consumed');
  assert.equal(telemetry.estimatedCostUSD, 0, 'Cost must be exactly 0 USD');
  assert.equal(telemetry.actualProvider, 'NexGen Deterministic Rules Engine (Local Zero-Hallucination)');
  assert.equal(telemetry.fallbackStatus, 'none');
});

test('BUG-03 Transparency: Scenario B: LLM_LIVE execution when provider executes', () => {
  const telemetry = RuntimeExecutionTracker.resolveTelemetry({
    durationMs: 450,
    providerExecution: {
      provider: 'Anthropic Claude',
      model: 'claude-3-5-sonnet-20241022',
      promptTokens: 850,
      completionTokens: 320,
      costUSD: 0.00735
    }
  });

  assert.equal(telemetry.executionMode, 'LLM_LIVE');
  assert.equal(telemetry.actualProvider, 'Anthropic Claude');
  assert.equal(telemetry.aiModel, 'claude-3-5-sonnet-20241022');
  assert.equal(telemetry.tokensUsed, 1170);
  assert.equal(telemetry.tokenUsage?.promptTokens, 850);
  assert.equal(telemetry.tokenUsage?.completionTokens, 320);
  assert.equal(telemetry.estimatedCostUSD, 0.00735);
  assert.equal(telemetry.fallbackStatus, 'none');
});

test('BUG-03 Transparency: Scenario C: LLM_FALLBACK when provider fails', () => {
  const telemetry = RuntimeExecutionTracker.resolveTelemetry({
    durationMs: 85,
    providerExecution: {
      provider: 'OpenAI GPT-4o',
      model: 'gpt-4o',
      error: '429 Rate limit exceeded / Insufficient quota'
    }
  });

  assert.equal(telemetry.executionMode, 'LLM_FALLBACK');
  assert.ok(telemetry.actualProvider.includes('Fallback'));
  assert.equal(telemetry.tokensUsed, 0);
  assert.equal(telemetry.fallbackStatus, 'active');
  assert.equal(telemetry.fallbackReason, '429 Rate limit exceeded / Insufficient quota');
});

test('BUG-03 Transparency: Scenario D: FIXTURE and SIMULATED modes', () => {
  const fixtureTel = RuntimeExecutionTracker.resolveTelemetry({ durationMs: 5, isFixture: true });
  assert.equal(fixtureTel.executionMode, 'FIXTURE');
  assert.equal(fixtureTel.actualProvider, 'Test Fixture Harness');
  assert.equal(fixtureTel.tokensUsed, 0);

  const simTel = RuntimeExecutionTracker.resolveTelemetry({ durationMs: 12, isSimulated: true });
  assert.equal(simTel.executionMode, 'SIMULATED');
  assert.equal(simTel.actualProvider, 'NexGen Simulated Sandbox');
});

test('BUG-03 Transparency: Proposal generator outputs truthful DETERMINISTIC mode by default', async () => {
  const generator = new AIProposalGenerator();
  const proposal = await generator.generateProposal({
    opportunityId: 'opp-transparency-test',
    organizationId: 'org-transparency-test',
    title: 'Custom ERP Logistics Platform',
    category: 'erp_crm',
    currency: 'USD',
    analysis: {
      opportunityId: 'opp-transparency-test',
      complexityLevel: 'medium',
      recommendedArchitecture: {
        pattern: 'modular_monolith',
        summary: 'Modular Next.js and Postgres architecture',
        frontendRequirements: [],
        backendRequirements: [],
        databaseRequirements: [],
        apiRequirements: [],
        infrastructure: []
      },
      technologyRecommendations: {
        coreStack: ['Next.js', 'PostgreSQL'],
        frontend: [],
        backend: [],
        database: [],
        apis: [],
        infrastructure: [],
        testingTools: []
      },
      estimatedDuration: {
        weeksMin: 4,
        weeksMax: 6,
        estimatedTimelineDays: 35,
        sprintsCount: 3,
        disclaimer: 'Projections only'
      },
      milestones: [
        { phase: 1, title: 'Phase 1', deliverables: ['Spec'], durationWeeks: 2, costEstimate: 5000 },
        { phase: 2, title: 'Phase 2', deliverables: ['MVP'], durationWeeks: 3, costEstimate: 7000 }
      ],
      businessRequirements: ['Inventory sync'],
      functionalRequirements: ['Orders', 'Shipments'],
      nonFunctionalRequirements: ['99.9% uptime'],
      missingInformation: [],
      assumptions: [],
      risks: []
    },
    scoring: {
      opportunityId: 'opp-transparency-test',
      overallScore: 88,
      qualificationGrade: 'B',
      isQualified: true,
      budgetViabilityScore: 85,
      techStackAlignmentScore: 90,
      clientLegitimacyScore: 88,
      competitionScore: 80,
      timelineFeasibilityScore: 90,
      confidenceLevel: 0.9,
      recommendedAction: 'standard_proposal',
      factorExplanations: {
        budgetViability: 'Fair budget',
        techStackAlignment: 'High match',
        clientLegitimacy: 'Established',
        competitionFactor: 'Moderate',
        timelineFeasibility: 'Realistic'
      },
      evaluatedAt: new Date()
    }
  });

  assert.equal(proposal.metadata.executionMode, 'DETERMINISTIC');
  assert.equal(proposal.metadata.aiModel, 'nexgen-deterministic-nlp-v1');
  assert.equal(proposal.metadata.tokensUsed, 0, 'No fake tokens');
  assert.equal(proposal.metadata.actualProvider, 'NexGen Deterministic Rules Engine (Local Zero-Hallucination)');
});
