-- NEXGEN GLOBAL AI — Phase 1 Hardened Migration SQL
BEGIN;
SET search_path = public;
SET lock_timeout = '5s';
SET statement_timeout = '2min';

-- 1. project_opportunities
CREATE TABLE IF NOT EXISTS project_opportunities (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  subcategories jsonb DEFAULT '[]'::jsonb,
  source_platform text NOT NULL,
  source_url text,
  source_external_id text,
  client_name text,
  client_domain text,
  client_country text,
  client_region text,
  estimated_budget_min numeric(12, 2),
  estimated_budget_max numeric(12, 2),
  currency text NOT NULL DEFAULT 'USD',
  budget_type text NOT NULL DEFAULT 'unknown',
  required_skills jsonb DEFAULT '[]'::jsonb,
  scope_complexity text,
  timeline_days integer,
  urgency text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'discovered',
  discovered_at timestamptz NOT NULL DEFAULT now(),
  analyzed_at timestamptz,
  scored_at timestamptz,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_opportunities_id_org_uq UNIQUE (id, organization_id),
  CONSTRAINT project_opportunities_title_chk CHECK (length(btrim(title)) > 0),
  CONSTRAINT project_opportunities_description_chk CHECK (length(btrim(description)) > 0),
  CONSTRAINT project_opportunities_status_chk CHECK (status IN ('discovered', 'analyzing', 'scored', 'proposal_generating', 'pending_approval', 'approved', 'rejected', 'outreach_queued', 'contacted', 'archived')),
  CONSTRAINT project_opportunities_urgency_chk CHECK (urgency IN ('urgent', 'normal', 'low')),
  CONSTRAINT project_opportunities_budget_type_chk CHECK (budget_type IN ('fixed_price', 'hourly', 'retainer', 'unknown')),
  CONSTRAINT project_opportunities_budget_min_chk CHECK (estimated_budget_min IS NULL OR estimated_budget_min >= 0),
  CONSTRAINT project_opportunities_budget_max_chk CHECK (estimated_budget_max IS NULL OR estimated_budget_max >= 0),
  CONSTRAINT project_opportunities_budget_range_chk CHECK ((estimated_budget_min IS NULL OR estimated_budget_max IS NULL) OR (estimated_budget_max >= estimated_budget_min)),
  CONSTRAINT project_opportunities_timeline_chk CHECK (timeline_days IS NULL OR timeline_days > 0)
);

CREATE INDEX IF NOT EXISTS project_opportunities_organization_idx ON project_opportunities (organization_id);
CREATE INDEX IF NOT EXISTS project_opportunities_status_idx ON project_opportunities (organization_id, status);
CREATE INDEX IF NOT EXISTS project_opportunities_category_idx ON project_opportunities (organization_id, category);
CREATE INDEX IF NOT EXISTS project_opportunities_discovered_idx ON project_opportunities (organization_id, discovered_at);
CREATE UNIQUE INDEX IF NOT EXISTS project_opportunities_source_uq ON project_opportunities (organization_id, source_platform, source_external_id) WHERE source_external_id IS NOT NULL;

-- 2. opportunity_scores
CREATE TABLE IF NOT EXISTS opportunity_scores (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL,
  overall_score numeric(5, 2) NOT NULL,
  qualification_grade text NOT NULL,
  is_qualified boolean NOT NULL DEFAULT false,
  budget_viability_score numeric(5, 2) NOT NULL DEFAULT 0,
  tech_stack_alignment_score numeric(5, 2) NOT NULL DEFAULT 0,
  client_legitimacy_score numeric(5, 2) NOT NULL DEFAULT 0,
  competition_score numeric(5, 2) NOT NULL DEFAULT 0,
  timeline_feasibility_score numeric(5, 2) NOT NULL DEFAULT 0,
  confidence_level numeric(4, 3) NOT NULL DEFAULT 0.850,
  reasoning_summary text,
  scoring_factors jsonb DEFAULT '{}'::jsonb,
  recommended_action text NOT NULL DEFAULT 'standard_proposal',
  scored_by_agent text NOT NULL DEFAULT 'Opportunity Scoring Agent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_scores_opportunity_org_fk FOREIGN KEY (opportunity_id, organization_id) REFERENCES project_opportunities(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT opportunity_scores_overall_chk CHECK (overall_score >= 0 AND overall_score <= 100),
  CONSTRAINT opportunity_scores_budget_chk CHECK (budget_viability_score >= 0 AND budget_viability_score <= 100),
  CONSTRAINT opportunity_scores_tech_chk CHECK (tech_stack_alignment_score >= 0 AND tech_stack_alignment_score <= 100),
  CONSTRAINT opportunity_scores_client_chk CHECK (client_legitimacy_score >= 0 AND client_legitimacy_score <= 100),
  CONSTRAINT opportunity_scores_comp_chk CHECK (competition_score >= 0 AND competition_score <= 100),
  CONSTRAINT opportunity_scores_time_chk CHECK (timeline_feasibility_score >= 0 AND timeline_feasibility_score <= 100),
  CONSTRAINT opportunity_scores_confidence_chk CHECK (confidence_level >= 0 AND confidence_level <= 1),
  CONSTRAINT opportunity_scores_grade_chk CHECK (qualification_grade IN ('A', 'B', 'C', 'D', 'F')),
  CONSTRAINT opportunity_scores_action_chk CHECK (recommended_action IN ('priority_proposal', 'standard_proposal', 'monitor', 'pass'))
);

CREATE INDEX IF NOT EXISTS opportunity_scores_organization_idx ON opportunity_scores (organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS opportunity_scores_opp_uq ON opportunity_scores (opportunity_id);
CREATE INDEX IF NOT EXISTS opportunity_scores_qualified_idx ON opportunity_scores (organization_id, is_qualified, overall_score);

-- 3. project_proposals
CREATE TABLE IF NOT EXISTS project_proposals (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  executive_summary text NOT NULL,
  problem_analysis text NOT NULL,
  proposed_solution text NOT NULL,
  architecture_blueprint jsonb DEFAULT '{}'::jsonb,
  tech_stack_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_duration_weeks numeric(5, 2),
  total_cost_estimate numeric(12, 2),
  currency text NOT NULL DEFAULT 'USD',
  case_study_citations jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending_approval',
  approval_notes text,
  approved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  reviewer_feedback text,
  dispatch_channel text,
  dispatched_at timestamptz,
  crm_record_id uuid REFERENCES crm_records(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_proposals_opportunity_org_fk FOREIGN KEY (opportunity_id, organization_id) REFERENCES project_opportunities(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT project_proposals_title_chk CHECK (length(btrim(title)) > 0),
  CONSTRAINT project_proposals_version_chk CHECK (version >= 1),
  CONSTRAINT project_proposals_status_chk CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'revision_requested', 'dispatched')),
  CONSTRAINT project_proposals_cost_chk CHECK (total_cost_estimate IS NULL OR total_cost_estimate >= 0),
  CONSTRAINT project_proposals_duration_chk CHECK (estimated_duration_weeks IS NULL OR estimated_duration_weeks > 0),
  CONSTRAINT project_proposals_channel_chk CHECK (dispatch_channel IS NULL OR dispatch_channel IN ('email', 'linkedin', 'whatsapp', 'portal')),
  CONSTRAINT project_proposals_approval_state_chk CHECK ((status = 'approved' AND approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL) OR (status != 'approved'))
);

CREATE INDEX IF NOT EXISTS project_proposals_organization_idx ON project_proposals (organization_id);
CREATE INDEX IF NOT EXISTS project_proposals_opp_idx ON project_proposals (opportunity_id);
CREATE INDEX IF NOT EXISTS project_proposals_status_idx ON project_proposals (organization_id, status);

-- 4. daily_business_reports
CREATE TABLE IF NOT EXISTS daily_business_reports (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL,
  projects_discovered_count integer NOT NULL DEFAULT 0,
  projects_qualified_count integer NOT NULL DEFAULT 0,
  proposals_generated_count integer NOT NULL DEFAULT 0,
  proposals_approved_count integer NOT NULL DEFAULT 0,
  proposals_dispatched_count integer NOT NULL DEFAULT 0,
  responses_received_count integer NOT NULL DEFAULT 0,
  meetings_booked_count integer NOT NULL DEFAULT 0,
  pipeline_value_total numeric(14, 2) NOT NULL DEFAULT 0.00,
  top_categories_summary jsonb DEFAULT '{}'::jsonb,
  agent_performance_metrics jsonb DEFAULT '{}'::jsonb,
  executive_summary text,
  key_bottlenecks jsonb DEFAULT '[]'::jsonb,
  dispatched_to_anil_at timestamptz,
  dispatch_channel text DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_business_reports_pipeline_chk CHECK (pipeline_value_total >= 0),
  CONSTRAINT daily_business_reports_counts_chk CHECK (projects_discovered_count >= 0 AND projects_qualified_count >= 0 AND proposals_generated_count >= 0 AND proposals_approved_count >= 0 AND proposals_dispatched_count >= 0 AND responses_received_count >= 0 AND meetings_booked_count >= 0)
);

CREATE INDEX IF NOT EXISTS daily_business_reports_organization_idx ON daily_business_reports (organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS daily_business_reports_org_date_uq ON daily_business_reports (organization_id, report_date);

-- 5. agent_executions
CREATE TABLE IF NOT EXISTS agent_executions (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  trigger_source text NOT NULL DEFAULT 'scheduled',
  target_entity_id uuid,
  target_entity_type text,
  input_payload jsonb DEFAULT '{}'::jsonb,
  output_payload jsonb DEFAULT '{}'::jsonb,
  error_details text,
  tokens_used integer NOT NULL DEFAULT 0,
  cost_estimate numeric(8, 4) NOT NULL DEFAULT 0.0000,
  model_used text,
  duration_ms integer,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  next_retry_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_executions_tokens_chk CHECK (tokens_used >= 0),
  CONSTRAINT agent_executions_cost_chk CHECK (cost_estimate >= 0),
  CONSTRAINT agent_executions_retries_chk CHECK (retry_count >= 0 AND max_retries >= 0),
  CONSTRAINT agent_executions_duration_chk CHECK (duration_ms IS NULL OR duration_ms >= 0),
  CONSTRAINT agent_executions_status_chk CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
  CONSTRAINT agent_executions_trigger_chk CHECK (trigger_source IN ('scheduled', 'manual', 'event', 'webhook')),
  CONSTRAINT agent_executions_type_chk CHECK (agent_type IN ('global_project_hunter', 'client_researcher', 'project_analyzer', 'opportunity_scoring', 'proposal_generator', 'outreach_manager', 'followup_manager', 'ai_project_manager')),
  CONSTRAINT agent_executions_target_type_chk CHECK (target_entity_type IS NULL OR target_entity_type IN ('opportunity', 'proposal', 'batch', 'report'))
);

CREATE INDEX IF NOT EXISTS agent_executions_organization_idx ON agent_executions (organization_id);
CREATE INDEX IF NOT EXISTS agent_executions_agent_status_idx ON agent_executions (organization_id, agent_type, status);
CREATE INDEX IF NOT EXISTS agent_executions_started_idx ON agent_executions (organization_id, started_at);
CREATE UNIQUE INDEX IF NOT EXISTS agent_executions_active_lock_uq ON agent_executions (organization_id, agent_type, target_entity_id) WHERE status = 'running' AND target_entity_id IS NOT NULL;

COMMIT;
