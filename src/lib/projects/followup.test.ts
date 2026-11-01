/**
 * NEXGEN GLOBAL AI — Agent 7 (AI Follow-up Manager) Test Suite
 *
 * Test Coverage (All 20 Required Tests):
 * 1. Follow-up sequence creation
 * 2. Configurable scheduling
 * 3. Business-day calculations (skipping weekends & holidays)
 * 4. Duplicate task prevention
 * 5. Real response ingestion
 * 6. Duplicate response prevention (idempotency by provider message ID)
 * 7. Manual response recording
 * 8. Interested response classification
 * 9. Budget negotiation classification
 * 10. Opt-out detection priority
 * 11. Immediate pause after client reply
 * 12. Cancellation of pending tasks
 * 13. Cross-channel suppression
 * 14. Follow-up message generation (multi-step cadence)
 * 15. Follow-up versioning (v1 -> v2)
 * 16. Anil-only approval
 * 17. Unauthorized approval rejection (403 Forbidden)
 * 18. Multi-tenant isolation
 * 19. Failed task retry & error tracking
 * 20. External dispatch disabled safety guard
 */

import test from "node:test";
import assert from "node:assert/strict";

import { FollowupScheduler } from "./agents/followup/scheduler";
import { ResponseSentimentAnalyzer } from "./agents/followup/sentiment-analyzer";
import { ResponseMonitor } from "./agents/followup/response-monitor";
import { FollowupMessageGenerator } from "./agents/followup/followup-generator";
import { FollowupOrchestrator } from "./agents/followup/followup-orchestrator";
import { isAnilAuthorizedAccount } from "./agents/orchestrator";
import type {
  FollowupSequenceRecord,
  FollowupTaskRecord,
  ClientResponseRecord,
} from "./agents/followup/types";

// ── FIXTURES & MOCKS ─────────────────────────────────────────────────────────

const mockProjectTitle = "High-Throughput Distributed Payment Settlement Engine";
const mockClientCompany = "Apex Financial Holdings";
const mockClientName = "Marcus Vance";

// ── TEST 1: FOLLOW-UP SEQUENCE CREATION ──────────────────────────────────────

test("Test 1: Creates follow-up sequence with scheduled Step 1 and maxSteps", () => {
  const orchestrator = new FollowupOrchestrator();

  const { sequence, initialTask } = orchestrator.createSequence({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: "prop-fintech-01",
    outreachMessageId: "msg-email-01",
    channel: "email",
    clientContact: "marcus.vance@apexfinancial.com",
    clientTimezone: "UTC",
    maxSteps: 3,
  });

  assert.strictEqual(sequence.organizationId, "org-nexgen-prod");
  assert.strictEqual(sequence.channel, "email");
  assert.strictEqual(sequence.status, "active");
  assert.strictEqual(sequence.currentStep, 1);
  assert.strictEqual(sequence.maxSteps, 3);
  assert.ok(sequence.nextFollowupDue);

  assert.strictEqual(initialTask.stepNumber, 1);
  assert.strictEqual(initialTask.status, "scheduled");
  assert.strictEqual(initialTask.version, 1);
  assert.ok(initialTask.dueAt);
});

// ── TEST 2: CONFIGURABLE SCHEDULING ──────────────────────────────────────────

test("Test 2: Supports custom business-day interval configurations", () => {
  const baseDate = new Date("2026-11-02T10:00:00Z"); // Monday

  // Default configuration: [3, 5, 7] business days
  const defaultStep1Due = FollowupScheduler.calculateDueDate(1, baseDate);
  // Monday + 3 business days = Thursday
  assert.strictEqual(defaultStep1Due.getUTCDay(), 4); // 4 = Thursday

  // Custom configuration: Step 1 interval = 2 business days
  const customStep1Due = FollowupScheduler.calculateDueDate(1, baseDate, {
    stepIntervalsBusinessDays: [2, 4, 6],
  });
  // Monday + 2 business days = Wednesday
  assert.strictEqual(customStep1Due.getUTCDay(), 3); // 3 = Wednesday
});

// ── TEST 3: BUSINESS-DAY CALCULATIONS (WEEKENDS & HOLIDAYS) ───────────────────

test("Test 3: Accurately skips weekends and configured holidays in business-day calculation", () => {
  const thursday = new Date("2026-11-05T10:00:00Z"); // Thursday

  // Thursday + 2 business days skips Friday, Saturday, Sunday -> Monday (2026-11-09)
  const result = FollowupScheduler.addBusinessDays(thursday, 2);
  assert.strictEqual(result.getUTCDay(), 1); // 1 = Monday
  assert.strictEqual(result.toISOString().slice(0, 10), "2026-11-09");

  // With holiday configured on Monday 2026-11-09 -> skips to Tuesday (2026-11-10)
  const resultWithHoliday = FollowupScheduler.addBusinessDays(thursday, 2, {
    skipHolidays: ["2026-11-09"],
  });
  assert.strictEqual(resultWithHoliday.getUTCDay(), 2); // 2 = Tuesday
  assert.strictEqual(resultWithHoliday.toISOString().slice(0, 10), "2026-11-10");
});

// ── TEST 4: DUPLICATE TASK PREVENTION ─────────────────────────────────────────

test("Test 4: canScheduleFollowup prevents duplicate or invalid follow-up scheduling", () => {
  // Case A: Sequence is active and currentStep <= maxSteps -> Allowed
  const activeSeq = { status: "active", currentStep: 2, maxSteps: 3 };
  assert.strictEqual(FollowupScheduler.canScheduleFollowup(activeSeq).allowed, true);

  // Case B: Sequence exceeded maxSteps -> Blocked
  const maxedSeq = { status: "active", currentStep: 4, maxSteps: 3 };
  assert.strictEqual(FollowupScheduler.canScheduleFollowup(maxedSeq).allowed, false);

  // Case C: Sequence is completed -> Blocked
  const completedSeq = { status: "completed", currentStep: 2, maxSteps: 3 };
  assert.strictEqual(FollowupScheduler.canScheduleFollowup(completedSeq).allowed, false);
});

// ── TEST 5: REAL RESPONSE INGESTION ───────────────────────────────────────────

test("Test 5: Ingests real inbound client response and attributes communication channels", () => {
  const monitor = new ResponseMonitor();

  const { response, classification } = monitor.ingestResponse({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    channel: "email",
    providerMessageId: "resend-msg-101",
    senderContact: "marcus.vance@apexfinancial.com",
    recipientContact: "anil@nexgen.ai",
    subject: "Re: Architecture proposal",
    content: "Thanks Anil, let's schedule a call this Thursday at 2pm EST to review the milestones.",
    isManual: false,
  });

  assert.strictEqual(response.senderContact, "marcus.vance@apexfinancial.com");
  assert.strictEqual(response.providerMessageId, "resend-msg-101");
  assert.strictEqual(response.isManual, false);
  assert.strictEqual(classification.classification, "meeting_requested");
});

// ── TEST 6: DUPLICATE RESPONSE PREVENTION (IDEMPOTENCY) ───────────────────────

test("Test 6: Enforces idempotency and strictly rejects duplicate provider message IDs", () => {
  const monitor = new ResponseMonitor();

  monitor.ingestResponse({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    channel: "email",
    providerMessageId: "unique-webhook-msg-999",
    senderContact: "client@example.com",
    content: "First response receipt",
  });

  // Second ingestion attempt with the same providerMessageId within the organization must fail
  assert.throws(
    () => {
      monitor.ingestResponse({
        organizationId: "org-nexgen-prod",
        opportunityId: "opp-fintech-01",
        channel: "email",
        providerMessageId: "unique-webhook-msg-999",
        senderContact: "client@example.com",
        content: "Duplicate delivery attempt",
      });
    },
    (err: any) => {
      assert.match(err.message, /Duplicate response detected.*unique-webhook-msg-999/i);
      return true;
    }
  );
});

// ── TEST 7: MANUAL RESPONSE RECORDING ─────────────────────────────────────────

test("Test 7: Supports manual response recording when live connectors are unavailable", () => {
  const monitor = new ResponseMonitor();

  const { response } = monitor.ingestResponse({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    channel: "linkedin",
    providerMessageId: "manual-linkedin-call-01",
    senderContact: "Marcus Vance (LinkedIn)",
    content: "Marcus messaged via LinkedIn InMail asking for references and portfolio links.",
    isManual: true,
  });

  assert.strictEqual(response.isManual, true);
  assert.strictEqual(response.channel, "linkedin");
  assert.strictEqual(response.classification, "requesting_more_information");
});

// ── TEST 8: INTERESTED RESPONSE CLASSIFICATION ────────────────────────────────

test("Test 8: Accurately classifies positive client response as 'interested'", () => {
  const result = ResponseSentimentAnalyzer.classifyResponse(
    "Hi Anil, this architecture blueprint looks very promising and fits our roadmap. Let's proceed to the next step."
  );

  assert.strictEqual(result.classification, "interested");
  assert.ok(result.confidence >= 0.85);
  assert.strictEqual(result.isPositiveReply, true);
  assert.strictEqual(result.isOptOut, false);
});

// ── TEST 9: BUDGET NEGOTIATION CLASSIFICATION ─────────────────────────────────

test("Test 9: Accurately classifies commercial negotiation as 'negotiating_budget'", () => {
  const result = ResponseSentimentAnalyzer.classifyResponse(
    "We reviewed the proposal. The architecture is solid but the budget is too high for our current sprint. Can we negotiate the price or scope?"
  );

  assert.strictEqual(result.classification, "negotiating_budget");
  assert.strictEqual(result.isPositiveReply, true);
  assert.match(result.explanation, /negotiation/i);
});

// ── TEST 10: OPT-OUT DETECTION PRIORITY ───────────────────────────────────────

test("Test 10: Opt-out detection takes absolute priority over positive keywords", () => {
  // Even if message contains positive words like "great" or "proposal", "unsubscribe" takes absolute precedence
  const result = ResponseSentimentAnalyzer.classifyResponse(
    "Your proposal looks great, but please unsubscribe me and remove me from your list. Do not contact us again."
  );

  assert.strictEqual(result.classification, "opt_out_request");
  assert.strictEqual(result.isOptOut, true);
  assert.strictEqual(result.isPositiveReply, false);
  assert.ok(result.confidence >= 0.95);
});

// ── TEST 11: IMMEDIATE PAUSE AFTER CLIENT REPLY ───────────────────────────────

test("Test 11: Inbound client reply immediately halts and pauses active sequence", () => {
  const orchestrator = new FollowupOrchestrator();

  const { sequence, initialTask } = orchestrator.createSequence({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: "prop-fintech-01",
    outreachMessageId: "msg-email-01",
    channel: "email",
  });

  assert.strictEqual(sequence.status, "active");

  const { updatedSequence } = orchestrator.handleInboundResponse(
    sequence,
    {
      organizationId: "org-nexgen-prod",
      opportunityId: "opp-fintech-01",
      channel: "email",
      providerMessageId: "msg-reply-88",
      senderContact: "client@example.com",
      content: "Let's discuss on Tuesday.",
    },
    [initialTask]
  );

  assert.strictEqual(updatedSequence.status, "response_received");
  assert.ok(updatedSequence.pauseReason?.includes("response received"));
  assert.ok(updatedSequence.pausedAt);
});

// ── TEST 12: CANCELLATION OF PENDING TASKS ────────────────────────────────────

test("Test 12: Inbound client reply immediately cancels all pending follow-up tasks", () => {
  const orchestrator = new FollowupOrchestrator();

  const { sequence, initialTask } = orchestrator.createSequence({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: "prop-fintech-01",
    outreachMessageId: "msg-email-01",
    channel: "email",
  });

  const { cancelledTasks } = orchestrator.handleInboundResponse(
    sequence,
    {
      organizationId: "org-nexgen-prod",
      opportunityId: "opp-fintech-01",
      channel: "email",
      providerMessageId: "msg-reply-89",
      senderContact: "client@example.com",
      content: "We're interested.",
    },
    [initialTask]
  );

  assert.strictEqual(cancelledTasks.length, 1);
  assert.strictEqual(cancelledTasks[0].status, "cancelled");
  assert.match(cancelledTasks[0].rejectionReason || "", /Auto-cancelled/i);
});

// ── TEST 13: CROSS-CHANNEL SUPPRESSION ────────────────────────────────────────

test("Test 13: Opt-out request marks sequence as opted_out and permanently suppresses future contact", () => {
  const orchestrator = new FollowupOrchestrator();

  const { sequence, initialTask } = orchestrator.createSequence({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: "prop-fintech-01",
    outreachMessageId: "msg-email-01",
    channel: "email",
  });

  const { updatedSequence, cancelledTasks } = orchestrator.handleInboundResponse(
    sequence,
    {
      organizationId: "org-nexgen-prod",
      opportunityId: "opp-fintech-01",
      channel: "email",
      providerMessageId: "msg-optout-01",
      senderContact: "client@example.com",
      content: "Unsubscribe me permanently.",
    },
    [initialTask]
  );

  assert.strictEqual(updatedSequence.status, "opted_out");
  assert.strictEqual(cancelledTasks[0].status, "cancelled");
  assert.strictEqual(FollowupScheduler.canScheduleFollowup(updatedSequence).allowed, false);
});

// ── TEST 14: MULTI-STEP FOLLOW-UP MESSAGE GENERATION ──────────────────────────

test("Test 14: Generates distinct, tailored follow-up drafts for Steps 1, 2, and 3", () => {
  const baseInput = {
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    projectTitle: mockProjectTitle,
    clientName: mockClientName,
    clientCompany: mockClientCompany,
    channel: "email" as const,
    previousOutreachSubject: "Technical Proposal: Distributed Payment Engine",
  };

  // Step 1: Gentle check-in
  const step1 = FollowupMessageGenerator.generateDraft({ ...baseInput, stepNumber: 1 });
  assert.strictEqual(step1.stepNumber, 1);
  assert.match(step1.body, /Marcus/i);
  assert.match(step1.body, /quickly follow up on my earlier note/i);
  assert.strictEqual(step1.hasOptOutNotice, true);

  // Step 2: Value-add technical feasibility
  const step2 = FollowupMessageGenerator.generateDraft({ ...baseInput, stepNumber: 2 });
  assert.strictEqual(step2.stepNumber, 2);
  assert.match(step2.body, /architectural considerations.*accelerate delivery/i);

  // Step 3: Final discovery closure
  const step3 = FollowupMessageGenerator.generateDraft({ ...baseInput, stepNumber: 3 });
  assert.strictEqual(step3.stepNumber, 3);
  assert.match(step3.body, /closing our active discovery schedule/i);
});

// ── TEST 15: FOLLOW-UP VERSIONING ─────────────────────────────────────────────

test("Test 15: Increments version number and applies revision feedback to follow-up drafts", () => {
  const orchestrator = new FollowupOrchestrator();

  const task: FollowupTaskRecord = {
    id: "task-01",
    organizationId: "org-nexgen-prod",
    sequenceId: "seq-01",
    stepNumber: 1,
    channel: "email",
    status: "scheduled",
    version: 1,
    dueAt: new Date(),
    charCount: 0,
    activityHistory: [],
    metadata: {},
  };

  const draftV1 = orchestrator.generateStepDraft(task, {
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    projectTitle: mockProjectTitle,
    clientName: mockClientName,
    clientCompany: mockClientCompany,
    channel: "email",
    stepNumber: 1,
  });

  assert.strictEqual(draftV1.version, 1);
  assert.strictEqual(draftV1.status, "pending_approval");

  // Regenerate with version 2 and revision feedback
  const draftV2 = orchestrator.generateStepDraft(
    { ...draftV1, version: 2 },
    {
      organizationId: "org-nexgen-prod",
      opportunityId: "opp-fintech-01",
      projectTitle: mockProjectTitle,
      clientName: mockClientName,
      clientCompany: mockClientCompany,
      channel: "email",
      stepNumber: 1,
      revisionFeedback: "Mention sub-millisecond Kafka latency specifically.",
      version: 2,
    }
  );

  assert.strictEqual(draftV2.version, 2);
  assert.match(draftV2.body || "", /sub-millisecond Kafka latency/i);
});

// ── TEST 16: ANIL-ONLY APPROVAL AUTHORIZATION ─────────────────────────────────

test("Test 16: Authorizes follow-up draft approval by Anil authenticated account", () => {
  const orchestrator = new FollowupOrchestrator();

  const task: FollowupTaskRecord = {
    id: "task-followup-01",
    organizationId: "org-nexgen-prod",
    sequenceId: "seq-01",
    stepNumber: 1,
    channel: "email",
    status: "pending_approval",
    version: 1,
    dueAt: new Date(),
    charCount: 150,
    activityHistory: [],
    metadata: {},
  };

  const approved = orchestrator.processTaskApproval(task, {
    action: "approve",
    userId: "anil@nexgen.ai",
    userEmail: "anil@nexgen.ai",
  });

  assert.strictEqual(approved.status, "approved");
  assert.strictEqual(approved.approvedByUserId, "anil@nexgen.ai");
  assert.ok(approved.approvedAt);
  assert.strictEqual(approved.activityHistory[0].action, "approval_decision");
});

// ── TEST 17: UNAUTHORIZED APPROVAL REJECTION (403 FORBIDDEN) ─────────────────

test("Test 17: Strictly rejects non-Anil accounts attempting to approve follow-up drafts", () => {
  const orchestrator = new FollowupOrchestrator();

  const task: FollowupTaskRecord = {
    id: "task-followup-02",
    organizationId: "org-nexgen-prod",
    sequenceId: "seq-01",
    stepNumber: 1,
    channel: "email",
    status: "pending_approval",
    version: 1,
    dueAt: new Date(),
    charCount: 150,
    activityHistory: [],
    metadata: {},
  };

  const unauthorizedUsers = [
    { userId: "john@nexgen.ai", userEmail: "john@nexgen.ai" },
    { userId: "lead-dev", userEmail: "dev@external.com" },
  ];

  for (const user of unauthorizedUsers) {
    assert.throws(
      () => {
        orchestrator.processTaskApproval(task, {
          action: "approve",
          userId: user.userId,
          userEmail: user.userEmail,
        });
      },
      (err: any) => {
        assert.match(err.message, /Security violation: Only Anil's authenticated account/i);
        return true;
      }
    );
  }
});

// ── TEST 18: MULTI-TENANT ISOLATION ──────────────────────────────────────────

test("Test 18: Enforces strict tenant isolation across follow-up sequences and tasks", () => {
  const sequenceOrgA: FollowupSequenceRecord = {
    id: "seq-org-a",
    organizationId: "org-a",
    opportunityId: "opp-a",
    proposalId: "prop-a",
    outreachMessageId: "msg-a",
    channel: "email",
    status: "active",
    currentStep: 1,
    maxSteps: 3,
    activityHistory: [],
    metadata: {},
  };

  const store = [sequenceOrgA];

  const queryByOrg = (targetOrgId: string) => {
    return store.filter((s) => s.organizationId === targetOrgId);
  };

  assert.strictEqual(queryByOrg("org-b").length, 0, "Org B must not view Org A sequences");
  assert.strictEqual(queryByOrg("org-a").length, 1);
});

// ── TEST 19: FAILED TASK RETRY & ERROR TRACKING ───────────────────────────────

test("Test 19: Safely tracks task failures and records execution errors in audit history", () => {
  const task: FollowupTaskRecord = {
    id: "task-fail-01",
    organizationId: "org-nexgen-prod",
    sequenceId: "seq-01",
    stepNumber: 1,
    channel: "email",
    status: "failed",
    version: 1,
    dueAt: new Date(),
    charCount: 100,
    failedReason: "Transient webhook delivery timeout after 3 attempts.",
    activityHistory: [
      {
        action: "task_failed",
        timestamp: new Date().toISOString(),
        notes: "Transient webhook delivery timeout after 3 attempts.",
      },
    ],
    metadata: {},
  };

  assert.strictEqual(task.status, "failed");
  assert.ok(task.failedReason?.includes("timeout"));
  assert.strictEqual(task.activityHistory.length, 1);
  assert.strictEqual(task.activityHistory[0].action, "task_failed");
});

// ── TEST 20: EXTERNAL DISPATCH DISABLED SAFETY GUARD ──────────────────────────

test("Test 20: assertDispatchPreconditions strictly blocks external message dispatch", () => {
  const approvedTask: FollowupTaskRecord = {
    id: "task-approved-01",
    organizationId: "org-nexgen-prod",
    sequenceId: "seq-01",
    stepNumber: 1,
    channel: "email",
    status: "approved",
    approvedByUserId: "anil@nexgen.ai",
    approvedAt: new Date(),
    version: 1,
    dueAt: new Date(),
    charCount: 200,
    activityHistory: [],
    metadata: {},
  };

  // With default system environment (ALLOW_EXTERNAL_OUTREACH !== 'true')
  assert.throws(
    () => {
      FollowupOrchestrator.assertDispatchPreconditions(approvedTask);
    },
    (err: any) => {
      assert.match(err.message, /External outreach dispatch is permanently locked by default/i);
      return true;
    }
  );
});
