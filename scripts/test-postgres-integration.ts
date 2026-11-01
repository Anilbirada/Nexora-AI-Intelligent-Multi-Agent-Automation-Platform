/**
 * NEXGEN GLOBAL AI — Live PostgreSQL Integration Test Suite
 *
 * Validates real PostgreSQL database enforcement on localhost:5433:
 * 1. Multi-tenant compound foreign key isolation (Org A vs Org B)
 * 2. Range & check constraints (0-100 scores, budget bounds, timeline bounds)
 * 3. Human approval database constraint (approved requires approved_by_user_id and timestamp)
 * 4. Atomic duplicate agent execution lock (partial unique index on running state)
 * 5. Opportunity source deduplication constraint
 */

import { Client } from "pg";
import assert from "node:assert/strict";

const DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5433/nexgen_global_ai";

async function runLivePostgresIntegrationTests() {
  console.log("=== NEXGEN GLOBAL AI: Live PostgreSQL Integration Tests ===");
  console.log(`Connecting to: ${DB_URL.replace(/:[^:@]+@/, ":***@")}`);

  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const orgAId = "11111111-1111-4111-8111-111111111111";
  const orgBId = "22222222-2222-4222-8222-222222222222";
  const anilUserId = "33333333-3333-4333-8333-333333333333";
  const testOppAId = "44444444-4444-4444-8444-444444444444";

  try {
    // 0. Setup clean test fixtures
    await client.query("BEGIN");
    
    // Cleanup any existing test records
    await client.query("DELETE FROM agent_executions WHERE organization_id IN ($1, $2)", [orgAId, orgBId]);
    await client.query("DELETE FROM project_proposals WHERE organization_id IN ($1, $2)", [orgAId, orgBId]);
    await client.query("DELETE FROM opportunity_scores WHERE organization_id IN ($1, $2)", [orgAId, orgBId]);
    await client.query("DELETE FROM project_opportunities WHERE organization_id IN ($1, $2)", [orgAId, orgBId]);
    await client.query("DELETE FROM members WHERE organization_id IN ($1, $2)", [orgAId, orgBId]);
    await client.query("DELETE FROM users WHERE id = $1", [anilUserId]);
    await client.query("DELETE FROM organizations WHERE id IN ($1, $2)", [orgAId, orgBId]);

    // Insert organizations
    await client.query(
      "INSERT INTO organizations (id, name, slug) VALUES ($1, 'NEXGEN Agency', 'nexgen-agency'), ($2, 'Intruder Corp', 'intruder-corp')",
      [orgAId, orgBId]
    );

    // Insert Anil user
    await client.query(
      "INSERT INTO users (id, name, email, email_verified) VALUES ($1, 'Anil', 'anil@nexgen.ai', true)",
      [anilUserId]
    );

    console.log("✔ Setup: Test organizations and Anil user initialized successfully");

    // ── TEST 1: Valid Opportunity & Scoring Ingestion ────────────────────────
    await client.query(
      `INSERT INTO project_opportunities (
        id, organization_id, title, description, category, source_platform, 
        source_external_id, estimated_budget_min, estimated_budget_max, currency, timeline_days
      ) VALUES ($1, $2, 'AI Medical Imaging Platform', 'Build HIPAA compliant AI platform', 'AI & Machine Learning', 'upwork', 'proj-101', 15000, 30000, 'USD', 60)`,
      [testOppAId, orgAId]
    );

    await client.query(
      `INSERT INTO opportunity_scores (
        opportunity_id, organization_id, overall_score, qualification_grade, is_qualified,
        budget_viability_score, tech_stack_alignment_score, client_legitimacy_score, 
        competition_score, timeline_feasibility_score, recommended_action
      ) VALUES ($1, $2, 92.5, 'A', true, 90, 95, 92, 88, 97, 'priority_proposal')`,
      [testOppAId, orgAId]
    );
    console.log("✔ Test 1: Valid Opportunity & Opportunity Score ingestion succeeded");

    // ── TEST 2: Multi-Tenant Compound Foreign Key Isolation ───────────────────
    // Intruder Corp (orgBId) tries to attach a score or proposal to Org A's opportunity
    let crossTenantScoreBlocked = false;
    try {
      await client.query(
        `INSERT INTO opportunity_scores (
          opportunity_id, organization_id, overall_score, qualification_grade, is_qualified,
          budget_viability_score, tech_stack_alignment_score, client_legitimacy_score, 
          competition_score, timeline_feasibility_score
        ) VALUES ($1, $2, 50, 'C', false, 50, 50, 50, 50, 50)`,
        [testOppAId, orgBId] // Cross-tenant! Opp belongs to orgAId!
      );
    } catch (err: any) {
      if (err.code === "23503" && err.constraint === "opportunity_scores_opportunity_org_fk") {
        crossTenantScoreBlocked = true;
      } else {
        throw err;
      }
    }
    assert.equal(crossTenantScoreBlocked, true, "Cross-tenant score creation MUST be rejected by compound FK");

    let crossTenantProposalBlocked = false;
    try {
      await client.query(
        `INSERT INTO project_proposals (
          opportunity_id, organization_id, title, executive_summary, problem_analysis, 
          proposed_solution, tech_stack_recommendations, milestones, status
        ) VALUES ($1, $2, 'Infiltrated Proposal', 'Summary', 'Problem', 'Solution', '[]'::jsonb, '[]'::jsonb, 'draft')`,
        [testOppAId, orgBId] // Cross-tenant! Opp belongs to orgAId!
      );
    } catch (err: any) {
      if (err.code === "23503" && err.constraint === "project_proposals_opportunity_org_fk") {
        crossTenantProposalBlocked = true;
      } else {
        throw err;
      }
    }
    assert.equal(crossTenantProposalBlocked, true, "Cross-tenant proposal creation MUST be rejected by compound FK");
    console.log("✔ Test 2: Multi-tenant compound foreign key isolation strictly enforced");

    // ── TEST 3: Database Check Constraints ───────────────────────────────────
    // Score > 100 violation
    let invalidScoreBlocked = false;
    try {
      await client.query(
        `INSERT INTO opportunity_scores (
          opportunity_id, organization_id, overall_score, qualification_grade, is_qualified,
          budget_viability_score, tech_stack_alignment_score, client_legitimacy_score, 
          competition_score, timeline_feasibility_score
        ) VALUES ($1, $2, 105, 'A', true, 120, 95, 92, 88, 97)`,
        [testOppAId, orgAId]
      );
    } catch (err: any) {
      if (err.code === "23514") {
        invalidScoreBlocked = true;
      }
    }
    assert.equal(invalidScoreBlocked, true, "Score > 100 must be rejected by check constraint");

    // Budget Min > Max violation
    let invalidBudgetBlocked = false;
    try {
      await client.query(
        `INSERT INTO project_opportunities (
          organization_id, title, description, category, source_platform,
          estimated_budget_min, estimated_budget_max
        ) VALUES ($1, 'Bad Budget Opp', 'Description', 'Web Development', 'freelancer', 50000, 20000)`,
        [orgAId]
      );
    } catch (err: any) {
      if (err.code === "23514" && err.constraint === "project_opportunities_budget_range_chk") {
        invalidBudgetBlocked = true;
      }
    }
    assert.equal(invalidBudgetBlocked, true, "Budget Min > Max must be rejected by check constraint");

    // Timeline <= 0 violation
    let invalidTimelineBlocked = false;
    try {
      await client.query(
        `INSERT INTO project_opportunities (
          organization_id, title, description, category, source_platform, timeline_days
        ) VALUES ($1, 'Zero Timeline Opp', 'Description', 'Web Development', 'freelancer', 0)`,
        [orgAId]
      );
    } catch (err: any) {
      if (err.code === "23514" && err.constraint === "project_opportunities_timeline_chk") {
        invalidTimelineBlocked = true;
      }
    }
    assert.equal(invalidTimelineBlocked, true, "Timeline <= 0 must be rejected by check constraint");
    console.log("✔ Test 3: Score bounds (0-100), budget bounds, and timeline bounds verified");

    // ── TEST 4: Human Approval State Guard ────────────────────────────────────
    // Attempting to set approved status without approved_by_user_id or approved_at
    let unapprovedBypassBlocked = false;
    try {
      await client.query(
        `INSERT INTO project_proposals (
          opportunity_id, organization_id, title, executive_summary, problem_analysis, 
          proposed_solution, tech_stack_recommendations, milestones, status
        ) VALUES ($1, $2, 'Bypass Proposal', 'Summary', 'Problem', 'Solution', '[]'::jsonb, '[]'::jsonb, 'approved')`,
        [testOppAId, orgAId]
      );
    } catch (err: any) {
      if (err.code === "23514" && err.constraint === "project_proposals_approval_state_chk") {
        unapprovedBypassBlocked = true;
      }
    }
    assert.equal(unapprovedBypassBlocked, true, "Approved status without user ID and timestamp must be rejected");

    // Legitimate approval by Anil
    await client.query(
      `INSERT INTO project_proposals (
        opportunity_id, organization_id, title, executive_summary, problem_analysis, 
        proposed_solution, tech_stack_recommendations, milestones, status, approved_by_user_id, approved_at, dispatch_channel
      ) VALUES ($1, $2, 'Legitimate Approved Proposal', 'Summary', 'Problem', 'Solution', '[]'::jsonb, '[]'::jsonb, 'approved', $3, now(), 'email')`,
      [testOppAId, orgAId, anilUserId]
    );
    console.log("✔ Test 4: Human approval database guard strictly enforced");

    // ── TEST 5: Atomic Duplicate Agent Execution Lock ─────────────────────────
    // Start running agent
    await client.query(
      `INSERT INTO agent_executions (
        organization_id, agent_type, status, target_entity_id, target_entity_type
      ) VALUES ($1, 'global_project_hunter', 'running', $2, 'opportunity')`,
      [orgAId, testOppAId]
    );

    // Try concurrent duplicate running agent on same target
    let concurrentLockBlocked = false;
    try {
      await client.query(
        `INSERT INTO agent_executions (
          organization_id, agent_type, status, target_entity_id, target_entity_type
        ) VALUES ($1, 'global_project_hunter', 'running', $2, 'opportunity')`,
        [orgAId, testOppAId]
      );
    } catch (err: any) {
      if (err.code === "23505" && err.constraint === "agent_executions_active_lock_uq") {
        concurrentLockBlocked = true;
      }
    }
    assert.equal(concurrentLockBlocked, true, "Duplicate running agent on same entity must be blocked by partial unique index");
    console.log("✔ Test 5: Atomic duplicate agent execution lock strictly enforced");

    // ── TEST 6: Opportunity Deduplication Constraint ──────────────────────────
    let duplicateOppBlocked = false;
    try {
      await client.query(
        `INSERT INTO project_opportunities (
          organization_id, title, description, category, source_platform, source_external_id
        ) VALUES ($1, 'Duplicate Listing', 'Desc', 'Web Development', 'upwork', 'proj-101')`,
        [orgAId] // Already exists for upwork / proj-101
      );
    } catch (err: any) {
      if (err.code === "23505" && err.constraint === "project_opportunities_source_uq") {
        duplicateOppBlocked = true;
      }
    }
    assert.equal(duplicateOppBlocked, true, "Duplicate external project listing must be blocked by source unique constraint");
    console.log("✔ Test 6: Opportunity source deduplication constraint strictly enforced");

    // Rollback test changes to leave database in pristine state
    await client.query("ROLLBACK");
    console.log("✔ Cleanup: All integration test fixtures rolled back cleanly");

    console.log("\n========================================================");
    console.log("ALL 6 POSTGRESQL LIVE INTEGRATION CHECKS PASSED (100%)");
    console.log("========================================================\n");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

runLivePostgresIntegrationTests().catch((err) => {
  console.error("Postgres integration test failure:", err);
  process.exit(1);
});
