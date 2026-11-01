import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeErrorMessage, LIVE_PERMITTED_RSS_FEEDS, safeEqual } from "./helpers";
import { PLATFORM_JOBS, platformJob } from "@/lib/scheduler/schedules";
import { AIProjectManagerOrchestrator } from "@/lib/projects/agents/project-manager/orchestrator";

test("Scheduler: Secret and Credential Sanitization redacts sensitive tokens", () => {
  const rawDbError = new Error("Connection failed: postgres://postgres:SuperSecretP@ssw0rd!@db.production.nexgen.ai:5432/nexgen");
  const sanitizedDb = sanitizeErrorMessage(rawDbError);
  assert.ok(!sanitizedDb.includes("SuperSecretP@ssw0rd!"), "Database password must be redacted");
  assert.ok(sanitizedDb.includes("[REDACTED_USER_PASSWORD]"), "Redaction token must be present");

  const rawBearerError = "Unauthorized request: Bearer sk-live-999998888877777abcde returned 403";
  const sanitizedBearer = sanitizeErrorMessage(rawBearerError);
  assert.ok(!sanitizedBearer.includes("sk-live-999998888877777abcde"), "Bearer token must be redacted");
  assert.ok(sanitizedBearer.includes("[REDACTED_TOKEN]"), "Redacted token label must be present");
});

test("Scheduler: Jobs are properly registered in PLATFORM_JOBS", () => {
  const discoveryJob = platformJob("nexgen-global-discovery");
  assert.equal(discoveryJob.enabled, true, "Discovery job must be enabled");
  assert.equal(discoveryJob.endpoint, "/api/cron/nexgen", "Endpoint must point to /api/cron/nexgen");

  const reportJob = platformJob("nexgen-daily-report");
  assert.equal(reportJob.enabled, true, "Daily report job must be enabled");
  assert.equal(reportJob.endpoint, "/api/cron/nexgen", "Endpoint must point to /api/cron/nexgen");
});

test("Scheduler: Duplicate Execution Prevention acquires and releases lock", () => {
  const orchestrator = new AIProjectManagerOrchestrator();
  const orgId = "11111111-1111-1111-1111-111111111111";

  const firstAttempt = orchestrator.claimExecutionLock({
    organizationId: orgId,
    agentType: "global_project_hunter",
  });
  assert.equal(firstAttempt.acquired, true, "First lock claim must succeed");

  const secondAttempt = orchestrator.claimExecutionLock({
    organizationId: orgId,
    agentType: "global_project_hunter",
  });
  assert.equal(secondAttempt.acquired, false, "Concurrent lock claim on same org & agent must be blocked");

  orchestrator.releaseExecutionLock(firstAttempt.lockKey);

  const thirdAttempt = orchestrator.claimExecutionLock({
    organizationId: orgId,
    agentType: "global_project_hunter",
  });
  assert.equal(thirdAttempt.acquired, true, "Lock claim must succeed after release");
  orchestrator.releaseExecutionLock(thirdAttempt.lockKey);
});

test("Scheduler: CRON_SECRET constant-time safeEqual comparison", () => {
  assert.equal(safeEqual("test-secret-123", "test-secret-123"), true);
  assert.equal(safeEqual("test-secret-123", "wrong-secret-abc"), false);
  assert.equal(safeEqual("short", "much-longer-secret"), false);
});

test("Scheduler: Live discovery permitted feeds are active URLs", () => {
  assert.ok(LIVE_PERMITTED_RSS_FEEDS.length >= 3, "Must configure at least 3 legitimate feeds");
  for (const feed of LIVE_PERMITTED_RSS_FEEDS) {
    assert.ok(feed.url.startsWith("https://"), `Feed URL must be secure HTTPS: ${feed.url}`);
    assert.ok(feed.platform.length > 0, "Platform identifier must be defined");
  }
});
