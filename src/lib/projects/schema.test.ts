import assert from "node:assert/strict";
import { test } from "node:test";
import { SCOPED_TABLES } from "../tenancy/registry";
import {
  DAILY_QUALIFIED_TARGET_QUOTA,
  QUALIFICATION_THRESHOLD_SCORE,
  calculateWeightedOverallScore,
  determineQualificationGrade,
  validateBudgetRange,
  validateScoreFactors,
  validateTimeline,
} from "./contract";
import {
  NexgenAgentOrchestrator,
  type ExecutionState,
  type ProposalRecord,
} from "./agents/orchestrator";
import { MIGRATION_STATEMENTS } from "../../../scripts/create-nexgen-project-tables";
import { ROLLBACK_STATEMENTS } from "../../../scripts/rollback-nexgen-project-tables";

// ── TASK 1: TENANT ISOLATION TESTS ───────────────────────────────────────────

test("Tenant Isolation: All 5 NEXGEN tables are registered in SCOPED_TABLES", () => {
  const scopedTableNames = SCOPED_TABLES.map((s) => s.table);

  assert.ok(scopedTableNames.includes("project_opportunities"));
  assert.ok(scopedTableNames.includes("opportunity_scores"));
  assert.ok(scopedTableNames.includes("project_proposals"));
  assert.ok(scopedTableNames.includes("daily_business_reports"));
  assert.ok(scopedTableNames.includes("agent_executions"));
});

test("Tenant Isolation: Mathematical Compound Foreign Keys in Migration SQL", () => {
  const fullMigrationSql = MIGRATION_STATEMENTS.join("\n");

  // project_opportunities must define compound unique (id, organization_id)
  assert.ok(
    fullMigrationSql.includes("CONSTRAINT project_opportunities_id_org_uq UNIQUE (id, organization_id)"),
    "project_opportunities must define UNIQUE (id, organization_id) for compound multi-tenant foreign keys",
  );

  // opportunity_scores must enforce compound foreign key referencing (id, organization_id)
  assert.ok(
    fullMigrationSql.includes("CONSTRAINT opportunity_scores_opportunity_org_fk FOREIGN KEY (opportunity_id, organization_id) REFERENCES project_opportunities(id, organization_id)"),
    "opportunity_scores must reference project_opportunities(id, organization_id) to prevent cross-tenant assignment",
  );

  // project_proposals must enforce compound foreign key referencing (id, organization_id)
  assert.ok(
    fullMigrationSql.includes("CONSTRAINT project_proposals_opportunity_org_fk FOREIGN KEY (opportunity_id, organization_id) REFERENCES project_opportunities(id, organization_id)"),
    "project_proposals must reference project_opportunities(id, organization_id) to prevent cross-tenant assignment",
  );
});

// ── TASK 2: DATABASE VALIDATION & RANGE TESTS ─────────────────────────────────

test("Database Validation: 0-100 check constraints for all 5 scoring factors", () => {
  const validScores = {
    budgetViabilityScore: 85,
    techStackAlignmentScore: 90,
    clientLegitimacyScore: 75,
    competitionScore: 70,
    timelineFeasibilityScore: 80,
  };

  assert.doesNotThrow(() => validateScoreFactors(validScores));

  // Individual factor boundary violations
  assert.throws(
    () => validateScoreFactors({ ...validScores, budgetViabilityScore: -5 }),
    /budgetViabilityScore .* must be between 0 and 100/,
  );
  assert.throws(
    () => validateScoreFactors({ ...validScores, techStackAlignmentScore: 105 }),
    /techStackAlignmentScore .* must be between 0 and 100/,
  );
  assert.throws(
    () => validateScoreFactors({ ...validScores, clientLegitimacyScore: -1 }),
    /clientLegitimacyScore .* must be between 0 and 100/,
  );
  assert.throws(
    () => validateScoreFactors({ ...validScores, competitionScore: 120 }),
    /competitionScore .* must be between 0 and 100/,
  );
  assert.throws(
    () => validateScoreFactors({ ...validScores, timelineFeasibilityScore: -0.1 }),
    /timelineFeasibilityScore .* must be between 0 and 100/,
  );
});

test("Database Validation: Budget minimum and maximum bounds", () => {
  assert.doesNotThrow(() => validateBudgetRange(1000, 5000));
  assert.doesNotThrow(() => validateBudgetRange(5000, 5000));
  assert.doesNotThrow(() => validateBudgetRange(null, 5000));
  assert.doesNotThrow(() => validateBudgetRange(1000, null));

  // Negative min budget
  assert.throws(() => validateBudgetRange(-500, 1000), /minimum budget .* cannot be negative/);
  // Negative max budget
  assert.throws(() => validateBudgetRange(1000, -100), /maximum budget .* cannot be negative/);
  // Max budget less than min budget
  assert.throws(() => validateBudgetRange(5000, 2000), /cannot be less than minimum budget/);
});

test("Database Validation: Positive timeline values", () => {
  assert.doesNotThrow(() => validateTimeline(30, 4));
  assert.doesNotThrow(() => validateTimeline(null, null));

  // Non-positive timeline
  assert.throws(() => validateTimeline(0, 4), /Timeline days .* must be greater than zero/);
  assert.throws(() => validateTimeline(-10, 4), /Timeline days .* must be greater than zero/);
  assert.throws(() => validateTimeline(30, 0), /Duration weeks .* must be greater than zero/);
  assert.throws(() => validateTimeline(30, -2), /Duration weeks .* must be greater than zero/);
});

test("Database Validation: Scoring calculation and qualification grading", () => {
  const enterpriseProject = {
    budgetViabilityScore: 95,
    techStackAlignmentScore: 90,
    clientLegitimacyScore: 85,
    competitionScore: 80,
    timelineFeasibilityScore: 90,
  };

  const score = calculateWeightedOverallScore(enterpriseProject);
  assert.equal(score, 88.75);
  assert.equal(determineQualificationGrade(score), "B");
  assert.equal(determineQualificationGrade(95.0), "A");
  assert.equal(determineQualificationGrade(75.0), "C");
  assert.equal(determineQualificationGrade(62.0), "D");
  assert.equal(determineQualificationGrade(45.0), "F");

  const qualification = NexgenAgentOrchestrator.evaluateOpportunityQualification(enterpriseProject);
  assert.equal(qualification.isQualified, true);
  assert.equal(qualification.recommendedAction, "priority_proposal");
});

// ── TASK 3: HUMAN APPROVAL SECURITY TESTS ─────────────────────────────────────

test("Human Approval: Proposals cannot be dispatched without explicit approval", () => {
  const pendingProposal: ProposalRecord = {
    id: "prop-1",
    opportunityId: "opp-1",
    organizationId: "org-1",
    status: "pending_approval",
    approvedByUserId: null,
    approvedAt: null,
  };

  // Blocked by default when external outreach is disabled
  delete process.env.ALLOW_EXTERNAL_OUTREACH;
  assert.throws(
    () => NexgenAgentOrchestrator.assertOutreachPreconditions(pendingProposal),
    /External communication is disabled by default/,
  );

  // When enabled, pending status is strictly blocked
  process.env.ALLOW_EXTERNAL_OUTREACH = "true";
  assert.throws(
    () => NexgenAgentOrchestrator.assertOutreachPreconditions(pendingProposal),
    /Proposal is pending Anil's approval/,
  );

  const draftProposal: ProposalRecord = {
    ...pendingProposal,
    status: "draft",
  };
  assert.throws(
    () => NexgenAgentOrchestrator.assertOutreachPreconditions(draftProposal),
    /Proposal is still in draft state/,
  );
  delete process.env.ALLOW_EXTERNAL_OUTREACH;
});

test("Human Approval: Rejection and revision requests strictly prevent dispatch", () => {
  process.env.ALLOW_EXTERNAL_OUTREACH = "true";
  const rejectedProposal: ProposalRecord = {
    id: "prop-2",
    opportunityId: "opp-2",
    organizationId: "org-1",
    status: "rejected",
    approvedByUserId: null,
    approvedAt: null,
    reviewerFeedback: "Budget does not meet agency threshold",
  };
  assert.throws(
    () => NexgenAgentOrchestrator.assertOutreachPreconditions(rejectedProposal),
    /Proposal was rejected and cannot be sent/,
  );

  const revisionProposal: ProposalRecord = {
    id: "prop-3",
    opportunityId: "opp-3",
    organizationId: "org-1",
    status: "revision_requested",
    approvedByUserId: null,
    approvedAt: null,
    reviewerFeedback: "Please expand section 3 on data sovereignty",
  };
  assert.throws(
    () => NexgenAgentOrchestrator.assertOutreachPreconditions(revisionProposal),
    /Proposal requires revisions before sending/,
  );
  delete process.env.ALLOW_EXTERNAL_OUTREACH;
});

test("Human Approval: Only authorized users (Anil) can approve proposals", () => {
  const initialProposal: ProposalRecord = {
    id: "prop-4",
    opportunityId: "opp-4",
    organizationId: "org-1",
    status: "pending_approval",
  };

  // Unauthorized approval attempt by regular member or non-Anil admin
  assert.throws(
    () => {
      NexgenAgentOrchestrator.applyProposalApprovalDecision(initialProposal, {
        proposalId: "prop-4",
        action: "approve",
        userId: "member-user-uuid",
        userRoles: ["admin"], // Even ordinary admin is blocked without Anil's account!
      });
    },
    /Only Anil's authenticated account can authorize external communications/,
  );

  // Authorized approval by Anil
  const approved = NexgenAgentOrchestrator.applyProposalApprovalDecision(initialProposal, {
    proposalId: "prop-4",
    action: "approve",
    userId: "anil-user-uuid",
    userEmail: "anil@nexgen.ai",
    userRoles: ["owner"],
    approvedDispatchChannel: "email",
  });

  assert.equal(approved.status, "approved");
  assert.equal(approved.approvedByUserId, "anil-user-uuid");
  assert.ok(approved.approvedAt !== null);
  assert.equal(approved.dispatchChannel, "email");

  // Outreach preconditions pass when enabled and approved by Anil
  process.env.ALLOW_EXTERNAL_OUTREACH = "true";
  assert.doesNotThrow(() => NexgenAgentOrchestrator.assertOutreachPreconditions(approved));
  delete process.env.ALLOW_EXTERNAL_OUTREACH;
});

// ── TASK 4: AGENT ORCHESTRATION & TELEMETRY TESTS ─────────────────────────────

test("Agent Orchestration: Duplicate execution prevention", () => {
  const activeExecutions: ExecutionState[] = [
    {
      id: "exec-1",
      organizationId: "org-1",
      agentType: "opportunity_scoring",
      status: "running",
      targetEntityId: "opp-100",
      startedAt: new Date(),
    },
  ];

  // Attempting concurrent run on same opportunity
  assert.throws(
    () => {
      NexgenAgentOrchestrator.preventDuplicateExecution(activeExecutions, {
        agentType: "opportunity_scoring",
        organizationId: "org-1",
        targetEntityId: "opp-100",
      });
    },
    /Duplicate Execution Blocked: Agent 'opportunity_scoring' is already actively running/,
  );

  // Running on different opportunity or different agent passes
  assert.doesNotThrow(() => {
    NexgenAgentOrchestrator.preventDuplicateExecution(activeExecutions, {
      agentType: "opportunity_scoring",
      organizationId: "org-1",
      targetEntityId: "opp-200",
    });
  });
});

test("Agent Orchestration: Failure and timeout tracking with exponential backoff", () => {
  // Normal transient failure attempt 1
  const fail1 = NexgenAgentOrchestrator.handleExecutionFailure(1, "API rate limit");
  assert.equal(fail1.status, "failed");
  assert.equal(fail1.canRetry, true);
  assert.equal(fail1.retryDelayMs, 2000); // 2^1 * 1000ms

  // Timeout failure
  const timeoutFail = NexgenAgentOrchestrator.handleExecutionFailure(1, "Socket hangup", 30000, 35000);
  assert.equal(timeoutFail.isTimeout, true);
  assert.equal(timeoutFail.canRetry, false);
  assert.ok(timeoutFail.errorMessage.includes("timed out after 35000ms"));
});

test("Agent Orchestration: AI Project Manager telemetry monitoring and anomaly detection", () => {
  const mockExecutions: ExecutionState[] = [
    { id: "e1", organizationId: "org-1", agentType: "global_project_hunter", status: "completed", tokensUsed: 1200, costEstimate: 0.003, startedAt: new Date() },
    { id: "e2", organizationId: "org-1", agentType: "client_researcher", status: "completed", tokensUsed: 2500, costEstimate: 0.007, startedAt: new Date() },
    { id: "e3", organizationId: "org-1", agentType: "project_analyzer", status: "failed", tokensUsed: 500, costEstimate: 0.001, startedAt: new Date() },
    { id: "e4", organizationId: "org-1", agentType: "project_analyzer", status: "failed", tokensUsed: 500, costEstimate: 0.001, startedAt: new Date() },
  ];

  const telemetry = NexgenAgentOrchestrator.monitorAgentFleetTelemetry(mockExecutions);
  assert.equal(telemetry.totalExecutions, 4);
  assert.equal(telemetry.successfulExecutions, 2);
  assert.equal(telemetry.failedExecutions, 2);
  assert.equal(telemetry.totalTokensUsed, 4700);
  assert.equal(telemetry.totalCostEstimateUSD, 0.012);
  // 50% failure rate triggers anomaly alert
  assert.ok(telemetry.anomalies.length > 0);
  assert.ok(telemetry.anomalies[0].includes("High Agent Failure Rate: 50.0%"));
});

// ── TASK 5: DAILY REPORTING & QUOTA TESTS ─────────────────────────────────────

test("Daily Reporting: Daily qualified quota progress towards target 40", () => {
  assert.equal(DAILY_QUALIFIED_TARGET_QUOTA, 40);

  const halfway = NexgenAgentOrchestrator.computeDailyQuotaProgress(20);
  assert.equal(halfway.target, 40);
  assert.equal(halfway.quotaPercentage, 50);
  assert.equal(halfway.quotaMet, false);
  assert.equal(halfway.remainingToTarget, 20);

  const completed = NexgenAgentOrchestrator.computeDailyQuotaProgress(40);
  assert.equal(completed.quotaPercentage, 100);
  assert.equal(completed.quotaMet, true);
  assert.equal(completed.remainingToTarget, 0);
});

// ── TASK 6: MIGRATION SQL SAFETY CHECKS ───────────────────────────────────────

test("Migration Safety: All statements are additive, guarded, and non-destructive", () => {
  for (const stmt of MIGRATION_STATEMENTS) {
    assert.ok(!stmt.toUpperCase().includes("DROP TABLE"), "Migration must never drop tables");
    assert.ok(!stmt.toUpperCase().includes("DROP COLUMN"), "Migration must never drop columns");
    assert.ok(stmt.toUpperCase().includes("IF NOT EXISTS"), "All statements must be guarded with IF NOT EXISTS");
  }

  // Rollback statements must be clean and guarded
  assert.equal(ROLLBACK_STATEMENTS.length, 5);
  for (const stmt of ROLLBACK_STATEMENTS) {
    assert.ok(stmt.toUpperCase().includes("IF EXISTS"), "Rollback statements must be guarded with IF EXISTS");
    assert.ok(stmt.toUpperCase().includes("CASCADE"), "Rollback must clean dependencies with CASCADE");
  }

  // Verify native DATE type in daily_business_reports
  const fullSql = MIGRATION_STATEMENTS.join("\n");
  assert.ok(
    fullSql.includes("report_date date NOT NULL"),
    "daily_business_reports must use PostgreSQL native DATE type",
  );
});
