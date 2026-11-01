-- NEXGEN GLOBAL AI — Phase 1 Database Rollback
-- Drops the 5 NEXGEN tables in reverse dependency order without affecting baseline tables
BEGIN;
SET search_path = public;

DROP TABLE IF EXISTS agent_executions CASCADE;
DROP TABLE IF EXISTS daily_business_reports CASCADE;
DROP TABLE IF EXISTS project_proposals CASCADE;
DROP TABLE IF EXISTS opportunity_scores CASCADE;
DROP TABLE IF EXISTS project_opportunities CASCADE;

COMMIT;
