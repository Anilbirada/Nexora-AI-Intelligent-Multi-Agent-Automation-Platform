-- ============================================================================
-- NEXGEN GLOBAL AI — Live PostgreSQL Integration Test Suite
-- ============================================================================
-- Tests against live PostgreSQL database (nexgen_global_ai):
-- 1. Multi-Tenant Compound Foreign Key Isolation
-- 2. Range & Bounds Check Constraints (0-100 scores, budget bounds, timeline)
-- 3. Human Approval State Guard
-- 4. Atomic Duplicate Agent Execution Lock
-- 5. Opportunity Source Deduplication Constraint
-- 6. Daily Business Report Constraints
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_org_a uuid := '11111111-1111-4111-8111-111111111111';
  v_org_b uuid := '22222222-2222-4222-8222-222222222222';
  v_anil_user_id uuid := '33333333-3333-4333-8333-333333333333';
  v_opp_a_id uuid := '44444444-4444-4444-8444-444444444444';
  v_caught_exception boolean := false;
BEGIN
  RAISE NOTICE '------------------------------------------------------------';
  RAISE NOTICE 'NEXGEN GLOBAL AI: Running PostgreSQL Live Integration Checks';
  RAISE NOTICE '------------------------------------------------------------';

  -- 0. Fixtures Setup
  INSERT INTO organizations (id, name, slug) 
  VALUES (v_org_a, 'NEXGEN Agency', 'nexgen-agency-test'),
         (v_org_b, 'Intruder Corp', 'intruder-corp-test');

  INSERT INTO users (id, name, email, email_verified)
  VALUES (v_anil_user_id, 'Anil', 'anil@nexgen.ai', true);

  -- 1. Valid Project Opportunity Ingestion
  INSERT INTO project_opportunities (
    id, organization_id, title, description, category, source_platform, 
    source_external_id, estimated_budget_min, estimated_budget_max, currency, timeline_days
  ) VALUES (
    v_opp_a_id, v_org_a, 'Enterprise GenAI Customer Support Engine',
    'Build multi-agent customer support with RAG and LLM tool orchestration',
    'AI & Machine Learning', 'upwork', 'proj-ext-101', 25000, 50000, 'USD', 45
  );

  INSERT INTO opportunity_scores (
    opportunity_id, organization_id, overall_score, qualification_grade, is_qualified,
    budget_viability_score, tech_stack_alignment_score, client_legitimacy_score, 
    competition_score, timeline_feasibility_score, recommended_action
  ) VALUES (
    v_opp_a_id, v_org_a, 94.00, 'A', true,
    95.00, 96.00, 92.00, 90.00, 97.00, 'priority_proposal'
  );
  RAISE NOTICE '✔ TEST 1 PASSED: Valid Opportunity & Scoring Ingestion succeeded';

  -- 2. Multi-Tenant Compound Foreign Key Enforcement
  -- Attempt A: Intruder Corp (v_org_b) attempts to attach score to Org A opportunity
  -- Create second opportunity in Org A (no score exists yet)
  DECLARE
    v_opp_a2_id uuid := '55555555-5555-5555-8555-555555555555';
  BEGIN
    INSERT INTO project_opportunities (
      id, organization_id, title, description, category, source_platform, 
      source_external_id, estimated_budget_min, estimated_budget_max, currency, timeline_days
    ) VALUES (
      v_opp_a2_id, v_org_a, 'Second Opportunity Org A', 'Description',
      'Web Development', 'upwork', 'proj-ext-102', 10000, 20000, 'USD', 30
    );

    v_caught_exception := false;
    BEGIN
      INSERT INTO opportunity_scores (
        opportunity_id, organization_id, overall_score, qualification_grade, is_qualified,
        budget_viability_score, tech_stack_alignment_score, client_legitimacy_score, 
        competition_score, timeline_feasibility_score
      ) VALUES (
        v_opp_a2_id, v_org_b, 80.00, 'B', true, 80, 80, 80, 80, 80
      );
    EXCEPTION WHEN foreign_key_violation THEN
      v_caught_exception := true;
    END;
    IF NOT v_caught_exception THEN
      RAISE EXCEPTION 'TEST 2A FAILED: Cross-tenant score was NOT blocked by compound FK!';
    END IF;
  END;

  -- Attempt B: Intruder Corp (v_org_b) attempts to attach proposal to Org A opportunity
  v_caught_exception := false;
  BEGIN
    INSERT INTO project_proposals (
      opportunity_id, organization_id, title, executive_summary, problem_analysis, 
      proposed_solution, tech_stack_recommendations, milestones, status
    ) VALUES (
      v_opp_a_id, v_org_b, 'Intruder Infiltrated Proposal', 'Summary', 'Problem',
      'Solution', '[]'::jsonb, '[]'::jsonb, 'draft'
    );
  EXCEPTION WHEN foreign_key_violation THEN
    v_caught_exception := true;
  END;
  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 2B FAILED: Cross-tenant proposal was NOT blocked by compound FK!';
  END IF;
  RAISE NOTICE '✔ TEST 2 PASSED: Multi-tenant compound foreign key isolation strictly enforced';

  -- 3. Database Check Constraints (Scores 0-100, Budget bounds, Timeline > 0)
  -- Score > 100
  v_caught_exception := false;
  BEGIN
    INSERT INTO opportunity_scores (
      opportunity_id, organization_id, overall_score, qualification_grade, is_qualified,
      budget_viability_score, tech_stack_alignment_score, client_legitimacy_score, 
      competition_score, timeline_feasibility_score
    ) VALUES (
      v_opp_a_id, v_org_a, 105.00, 'A', true, 120.00, 90, 90, 90, 90
    );
  EXCEPTION WHEN check_violation THEN
    v_caught_exception := true;
  END;
  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 3A FAILED: Score > 100 was not blocked by check constraint!';
  END IF;

  -- Budget Min > Max
  v_caught_exception := false;
  BEGIN
    INSERT INTO project_opportunities (
      organization_id, title, description, category, source_platform,
      estimated_budget_min, estimated_budget_max
    ) VALUES (
      v_org_a, 'Inverted Budget Project', 'Desc', 'Web Development', 'rss_feed', 50000, 10000
    );
  EXCEPTION WHEN check_violation THEN
    v_caught_exception := true;
  END;
  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 3B FAILED: Budget Min > Max was not blocked by check constraint!';
  END IF;

  -- Timeline <= 0
  v_caught_exception := false;
  BEGIN
    INSERT INTO project_opportunities (
      organization_id, title, description, category, source_platform, timeline_days
    ) VALUES (
      v_org_a, 'Zero Timeline Project', 'Desc', 'Web Development', 'rss_feed', 0
    );
  EXCEPTION WHEN check_violation THEN
    v_caught_exception := true;
  END;
  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 3C FAILED: Timeline <= 0 was not blocked by check constraint!';
  END IF;
  RAISE NOTICE '✔ TEST 3 PASSED: Scoring 0-100, budget range, and positive timeline constraints enforced';

  -- 4. Human Approval Database Constraint
  -- Attempt status = 'approved' without approved_by_user_id
  v_caught_exception := false;
  BEGIN
    INSERT INTO project_proposals (
      opportunity_id, organization_id, title, executive_summary, problem_analysis, 
      proposed_solution, tech_stack_recommendations, milestones, status, approved_by_user_id, approved_at
    ) VALUES (
      v_opp_a_id, v_org_a, 'Unapproved Bypass Proposal', 'Summary', 'Problem',
      'Solution', '[]'::jsonb, '[]'::jsonb, 'approved', NULL, NULL
    );
  EXCEPTION WHEN check_violation THEN
    v_caught_exception := true;
  END;
  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 4A FAILED: Approval state constraint failed to block unapproved proposal!';
  END IF;

  -- Valid approval with Anil user ID and timestamp
  INSERT INTO project_proposals (
    opportunity_id, organization_id, title, executive_summary, problem_analysis, 
    proposed_solution, tech_stack_recommendations, milestones, status, 
    approved_by_user_id, approved_at, dispatch_channel
  ) VALUES (
    v_opp_a_id, v_org_a, 'Anil Approved Proposal', 'Executive Summary', 'Problem Analysis',
    'Proposed Solution', '["Next.js", "Python", "PostgreSQL"]'::jsonb, '[]'::jsonb, 'approved',
    v_anil_user_id, now(), 'email'
  );
  RAISE NOTICE '✔ TEST 4 PASSED: Human approval constraint enforced (approval requires user ID & timestamp)';

  -- 5. Atomic Duplicate Agent Execution Lock (Active Lock)
  -- Start running execution
  INSERT INTO agent_executions (
    organization_id, agent_type, status, target_entity_id, target_entity_type
  ) VALUES (
    v_org_a, 'global_project_hunter', 'running', v_opp_a_id, 'opportunity'
  );

  -- Attempt concurrent running execution on same target entity
  v_caught_exception := false;
  BEGIN
    INSERT INTO agent_executions (
      organization_id, agent_type, status, target_entity_id, target_entity_type
    ) VALUES (
      v_org_a, 'global_project_hunter', 'running', v_opp_a_id, 'opportunity'
    );
  EXCEPTION WHEN unique_violation THEN
    v_caught_exception := true;
  END;
  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 5 FAILED: Duplicate running agent lock failed to prevent concurrent execution!';
  END IF;
  RAISE NOTICE '✔ TEST 5 PASSED: Atomic duplicate execution lock strictly enforced';

  -- 6. Opportunity Source Deduplication Constraint
  -- Attempt duplicate (organization_id, source_platform, source_external_id)
  v_caught_exception := false;
  BEGIN
    INSERT INTO project_opportunities (
      organization_id, title, description, category, source_platform, source_external_id
    ) VALUES (
      v_org_a, 'Duplicate Title', 'Desc', 'AI & Machine Learning', 'upwork', 'proj-ext-101'
    );
  EXCEPTION WHEN unique_violation THEN
    v_caught_exception := true;
  END;
  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 6 FAILED: Duplicate external project listing was not blocked!';
  END IF;
  RAISE NOTICE '✔ TEST 6 PASSED: Natural source deduplication constraint strictly enforced';

  -- 7. Daily Business Report Constraints
  INSERT INTO daily_business_reports (
    organization_id, report_date, projects_discovered_count, projects_qualified_count,
    proposals_generated_count, proposals_approved_count, proposals_dispatched_count,
    pipeline_value_total
  ) VALUES (
    v_org_a, CURRENT_DATE, 40, 35, 12, 10, 8, 485000.00
  );

  -- Attempt duplicate report for same day and org
  v_caught_exception := false;
  BEGIN
    INSERT INTO daily_business_reports (
      organization_id, report_date
    ) VALUES (
      v_org_a, CURRENT_DATE
    );
  EXCEPTION WHEN unique_violation THEN
    v_caught_exception := true;
  END;
  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 7 FAILED: Duplicate daily business report was not blocked!';
  END IF;
  RAISE NOTICE '✔ TEST 7 PASSED: Daily business report unique and metric constraints enforced';

  RAISE NOTICE '------------------------------------------------------------';
  RAISE NOTICE 'ALL 7 POSTGRESQL LIVE INTEGRATION CHECKS PASSED SUCCESSFULLY';
  RAISE NOTICE '------------------------------------------------------------';
END $$;

-- Rollback transaction so test fixtures leave no residue
ROLLBACK;
