/**
 * NEXGEN GLOBAL AI — Phase 3 Database Rollback Migration
 * Agent 7: Follow-up Sequences, Follow-up Tasks, and Client Responses
 *
 * Drops Agent 7 tables safely in reverse dependency order.
 */

export const ROLLBACK_FOLLOWUP_TABLES_SQL = `
DROP TABLE IF EXISTS "project_client_responses" CASCADE;
DROP TABLE IF EXISTS "project_followup_tasks" CASCADE;
DROP TABLE IF EXISTS "project_followup_sequences" CASCADE;
`;

console.log("NEXGEN GLOBAL AI Agent 7 Rollback SQL prepared.");
