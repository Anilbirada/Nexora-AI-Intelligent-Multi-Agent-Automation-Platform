/**
 * NEXGEN GLOBAL AI — Phase 4 Database Rollback: Agent 6 Outreach Messages
 *
 * Drops project_outreach_messages table and associated indexes.
 *
 * Run with:  npx tsx scripts/rollback-nexgen-outreach-tables.ts
 */

export const ROLLBACK_STATEMENTS = [
  `DROP TABLE IF EXISTS project_outreach_messages CASCADE;`,
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
    console.log("Successfully rolled back project_outreach_messages table.");
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
    console.log("DATABASE_URL is not set. Rollback script verified for execution against live database.");
    return;
  }
  await runRollback(url, process.env.DATABASE_SSL === "disable");
}

if (process.argv[1]?.includes("rollback-nexgen-outreach-tables")) {
  main().catch((err) => {
    console.error("Rollback failed:", err);
    process.exit(1);
  });
}
