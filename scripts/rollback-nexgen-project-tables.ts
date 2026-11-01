/**
 * NEXGEN GLOBAL AI — Phase 1 Database Rollback
 *
 * Safely removes the NEXGEN tables in reverse dependency order.
 * Only use if rolling back Phase 1 completely.
 *
 * Rollback order:
 * 1. agent_executions
 * 2. daily_business_reports
 * 3. project_proposals
 * 4. opportunity_scores
 * 5. project_opportunities
 *
 * Safety characteristics:
 * - DROP TABLE IF EXISTS with CASCADE.
 * - Leaves all original AgentSDR tables untouched.
 * - Guarded in an atomic transaction.
 *
 * Run with:  bun run scripts/rollback-nexgen-project-tables.ts
 *       or:  npx tsx scripts/rollback-nexgen-project-tables.ts
 */

export const ROLLBACK_STATEMENTS = [
  `DROP TABLE IF EXISTS agent_executions CASCADE`,
  `DROP TABLE IF EXISTS daily_business_reports CASCADE`,
  `DROP TABLE IF EXISTS project_proposals CASCADE`,
  `DROP TABLE IF EXISTS opportunity_scores CASCADE`,
  `DROP TABLE IF EXISTS project_opportunities CASCADE`,
];

export async function runRollback(databaseUrl: string, sslDisabled = true) {
  const { Client } = await import("pg");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: sslDisabled ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query("SET lock_timeout = '5s'");
    await client.query("SET statement_timeout = '2min'");
    await client.query("BEGIN");

    for (const statement of ROLLBACK_STATEMENTS) {
      await client.query(statement);
    }

    await client.query("COMMIT");
    console.log("Successfully rolled back NEXGEN Global AI tables.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("DATABASE_URL is not set.");
    return;
  }
  await runRollback(url, process.env.DATABASE_SSL === "disable");
}

if (process.argv[1]?.includes("rollback-nexgen-project-tables")) {
  main().catch((err) => {
    console.error("Rollback failed:", err);
    process.exit(1);
  });
}
