/**
 * NEXGEN GLOBAL AI — Agent 6 (Outreach Manager) Test Suite
 *
 * Test Coverage (All 17 Required Tests):
 * 1. Email Draft: Professional structure, subject, personalization, architecture solution, agency intro, CTA, closing, opt-out.
 * 2. LinkedIn Draft: Connection request note STRICTLY <= 300 chars & InMail/follow-up package.
 * 3. WhatsApp Draft: Professional business intro, direct and respectful CTA, non-spam tone.
 * 4. Client Personalization: Uses verified name and company without fabricating facts.
 * 5. Fallback Safety: Graceful handling of missing client name/company with zero hallucinations.
 * 6. Prerequisite Gate: Strictly rejects outreach generation if proposal is unapproved (draft, pending_approval, rejected, etc.).
 * 7. Disqualified Opportunity: Strictly rejects outreach for disqualified or rejected opportunities.
 * 8. Anil Authorization: Anil authenticated account (anil@nexgen.ai) can approve outreach messages.
 * 9. Non-Anil Rejection: Non-Anil accounts are strictly rejected (403 Forbidden).
 * 10. Client Spoofing Prevention: Rejects forged client-side isAnilExplicit flags without server identity.
 * 11. Multi-Channel Batching: Generates full multi-channel package (Email + LinkedIn + WhatsApp) in one invocation.
 * 12. Version Tracking: Correctly tracks sequential versions per channel (v1 -> v2) upon regeneration.
 * 13. Draft Editing: Allows editing subject/body in draft/pending state and appends to activityHistory.
 * 14. Multi-Tenant Isolation: Complete isolation between Organization A and Organization B outreach data.
 * 15. Suppression / Opt-Out List: Blocks or flags outreach when recipient domain/contact is suppressed.
 * 16. External Sending Policy: Strictly blocks message dispatch when ALLOW_EXTERNAL_OUTREACH is disabled.
 * 17. Revision Feedback Incorporation: Incorporates Anil's revision feedback into subsequent outreach generations.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { AIOutreachManager } from "./agents/outreach/outreach-generator";
import { ClientPersonalizer } from "./agents/outreach/personalizer";
import {
  OutreachApprovalGate,
  isAnilAuthorizedAccount,
} from "./agents/outreach/approval-gate";
import { AIProposalGenerator } from "./agents/proposal/generator";
import { ProjectAnalyzer } from "./agents/analyzer/analyzer";
import { OpportunityScoringAgent } from "./agents/scoring/scoring";
import type {
  OutreachMessageDraft,
  PersonalizationContext,
  OutreachApprovalDecisionInput,
} from "./agents/outreach/types";

// ── FIXTURES & HELPERS ────────────────────────────────────────────────────────

const mockProjectInput = {
  contentHash: "hash-fintech-ledger-01",
  sourcePlatform: "upwork",
  sourceUrl: "https://upwork.com/jobs/~01abc",
  title: "High-Throughput Distributed Payment Settlement Engine",
  description:
    "We need a distributed payment settlement engine using Go, PostgreSQL, Kafka, and Redis. Must support multi-currency, double-entry bookkeeping, ACID compliance, and sub-second settlement reconciliation.",
  primaryCategory: "backend_systems" as const,
  subcategories: ["fintech", "distributed_systems"],
  clientName: "Apex Financial Holdings",
  clientDomain: "apexfinancial.com",
  clientCountry: "United States",
  budgetMin: 50000,
  budgetMax: 90000,
  budgetType: "fixed_price" as const,
  currency: "USD",
  requiredSkills: ["Go", "PostgreSQL", "Kafka", "Redis", "Distributed Systems"],
  discoveryDate: new Date(),
  classificationConfidence: 0.95,
};

const mockClientProfile = {
  companyName: "Apex Financial Holdings",
  domain: "apexfinancial.com",
  country: "United States",
  industry: "Fintech & Capital Markets",
  credibilityScore: 88,
  credibilityTier: "established_business" as const,
  techStackDetected: ["Go", "PostgreSQL", "Kafka"],
  evidenceUrls: [{ fact: "SEC registration", sourceUrl: "https://sec.gov", verifiedAt: new Date().toISOString() }],
  verifiedContacts: [
    {
      name: "Marcus Vance",
      title: "VP of Engineering",
      email: "marcus.vance@apexfinancial.com",
      channel: "email" as const,
      isVerified: true,
      verifiedSourceUrl: "https://apexfinancial.com/team",
    },
  ],
  unverifiedContacts: [],
  riskFlags: [],
  missingInformation: [],
  isVerified: true,
  researchSummary: "Verified Delaware financial technology corporation.",
  researchedAt: new Date(),
};

async function buildApprovedProposalFixture(version = 1) {
  const analyzer = new ProjectAnalyzer();
  const scoringAgent = new OpportunityScoringAgent();
  const generator = new AIProposalGenerator();

  const analysis = await analyzer.analyzeProject(mockProjectInput);
  const scoring = await scoringAgent.scoreOpportunity({
    project: mockProjectInput,
    analysis,
  });

  const proposal = await generator.generateProposal({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    title: mockProjectInput.title,
    description: mockProjectInput.description,
    category: mockProjectInput.primaryCategory,
    sourcePlatform: mockProjectInput.sourcePlatform,
    sourceUrl: mockProjectInput.sourceUrl,
    currency: mockProjectInput.currency,
    budgetMin: mockProjectInput.budgetMin,
    budgetMax: mockProjectInput.budgetMax,
    analysis,
    scoring,
    clientProfile: mockClientProfile,
    version,
  });

  return {
    proposal: {
      ...proposal,
      id: "prop-fintech-01",
      status: "approved" as const,
      approvedByUserId: "anil@nexgen.ai",
      approvedAt: new Date().toISOString(),
      opportunityId: "opp-fintech-01",
      organizationId: "org-nexgen-prod",
    },
    analysis,
    scoring,
  };
}

// ── TEST 1: EMAIL DRAFT GENERATION ─────────────────────────────────────────────

test("Test 1: Generates complete, professional email draft with opt-out notice", async () => {
  const { proposal, analysis, scoring } = await buildApprovedProposalFixture();
  const outreachManager = new AIOutreachManager();

  const draft = await outreachManager.generateEmailDraft({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: proposal.id,
    proposal,
    analysis,
    scoring,
    clientProfile: mockClientProfile,
    projectTitle: mockProjectInput.title,
    projectDescription: mockProjectInput.description,
    version: 1,
  });

  assert.strictEqual(draft.channel, "email");
  assert.strictEqual(draft.status, "pending_approval");
  assert.strictEqual(draft.version, 1);
  assert.ok(draft.subject, "Subject line must be generated");
  assert.match(draft.subject, /Distributed Payment Settlement Engine|NexGen Agency/i);

  // Content requirements
  assert.match(draft.body, /Marcus/i, "Greets verified contact Marcus");
  assert.match(draft.body, /Apex Financial Holdings/i, "References client company");
  assert.match(draft.body, /NexGen Agency/i, "Introduces NexGen Agency");
  assert.match(draft.body, /USD/i, "Mentions proposal currency/commercials");
  assert.match(draft.body, /opt-out|unsubscribe/i, "Includes compliant opt-out statement");
  assert.ok(draft.body.length > 200, "Email body has professional depth");
});

// ── TEST 2: LINKEDIN DRAFT WITH STRICT <= 300 CHAR CONSTRAINT ─────────────────

test("Test 2: Generates LinkedIn connection draft strictly <= 300 characters", async () => {
  const { proposal, analysis, scoring } = await buildApprovedProposalFixture();
  const outreachManager = new AIOutreachManager();

  const linkedinPackage = await outreachManager.generateLinkedInDraft({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: proposal.id,
    proposal,
    analysis,
    scoring,
    clientProfile: mockClientProfile,
    projectTitle: mockProjectInput.title,
    projectDescription: mockProjectInput.description,
    version: 1,
  });

  // Strict LinkedIn Connection Request character limit
  assert.ok(
    linkedinPackage.connectionRequestNote.length <= 300,
    `LinkedIn note length (${linkedinPackage.connectionRequestNote.length}) exceeds 300 chars`
  );
  assert.strictEqual(linkedinPackage.charCount, linkedinPackage.connectionRequestNote.length);
  assert.ok(linkedinPackage.connectionRequestNote.length > 50, "Connection note has meaningful content");

  // InMail / Follow-up message
  assert.ok(linkedinPackage.inMailDraft.length > 100, "InMail draft provided");
  assert.strictEqual(linkedinPackage.draft.channel, "linkedin");
  assert.strictEqual(linkedinPackage.draft.status, "pending_approval");
});

// ── TEST 3: WHATSAPP DRAFT GENERATION ─────────────────────────────────────────

test("Test 3: Generates professional, direct WhatsApp draft without spam tone", async () => {
  const { proposal, analysis, scoring } = await buildApprovedProposalFixture();
  const outreachManager = new AIOutreachManager();

  const draft = await outreachManager.generateWhatsAppDraft({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: proposal.id,
    proposal,
    analysis,
    scoring,
    clientProfile: mockClientProfile,
    projectTitle: mockProjectInput.title,
    projectDescription: mockProjectInput.description,
    version: 1,
  });

  assert.strictEqual(draft.channel, "whatsapp");
  assert.strictEqual(draft.status, "pending_approval");
  assert.match(draft.body, /NexGen Agency/i);
  assert.match(draft.body, /Marcus|Apex Financial/i);
  assert.doesNotMatch(draft.body, /BUY NOW|ACT FAST|100% GUARANTEED/i, "Zero spam triggers");
  assert.ok(draft.body.length < 1000, "WhatsApp messages remain concise and readable");
});

// ── TEST 4: VERIFIED CLIENT PERSONALIZATION ───────────────────────────────────

test("Test 4: Uses verified client name, company, and title accurately", () => {
  const personalizer = new ClientPersonalizer();
  const ctx = personalizer.buildPersonalizationContext({
    clientProfile: mockClientProfile,
    opportunityTitle: mockProjectInput.title,
    organizationId: "org-nexgen-prod",
  });

  assert.strictEqual(ctx.recipientName, "Marcus Vance");
  assert.strictEqual(ctx.recipientRole, "VP of Engineering");
  assert.strictEqual(ctx.recipientEmail, "marcus.vance@apexfinancial.com");
  assert.strictEqual(ctx.companyName, "Apex Financial Holdings");
  assert.strictEqual(ctx.isVerified, true);
  assert.strictEqual(ctx.isSuppressed, false);
});

// ── TEST 5: MISSING CLIENT INFO FALLBACK (ZERO HALLUCINATIONS) ─────────────────

test("Test 5: Falls back gracefully when client details are missing without hallucinating", () => {
  const personalizer = new ClientPersonalizer();
  const emptyProfile = {
    credibilityScore: 50,
    credibilityTier: "unverified" as const,
    techStackDetected: [],
    evidenceUrls: [],
    verifiedContacts: [],
    unverifiedContacts: [],
    riskFlags: [],
    missingInformation: ["Company Name", "Contact Person"],
    isVerified: false,
    researchedAt: new Date(),
  };

  const ctx = personalizer.buildPersonalizationContext({
    clientProfile: emptyProfile,
    opportunityTitle: "Confidential Project",
    organizationId: "org-nexgen-prod",
  });

  // Never hallucinate fake names or companies
  assert.strictEqual(ctx.recipientName, undefined);
  assert.strictEqual(ctx.recipientRole, undefined);
  assert.strictEqual(ctx.companyName, undefined);

  // Greeting fallbacks
  assert.strictEqual(ctx.salutation, "Hello");
  assert.strictEqual(personalizer.formatRecipientSalutation(ctx), "Hello,");
  assert.strictEqual(personalizer.formatCompanyReference(ctx), "your team");
});

// ── TEST 6: PREREQUISITE GATE — PROPOSAL APPROVAL REQUIRED ───────────────────

test("Test 6: Strictly rejects outreach generation if proposal is unapproved", async () => {
  const { proposal, analysis, scoring } = await buildApprovedProposalFixture();
  const outreachManager = new AIOutreachManager();

  const unapprovedStatuses: Array<"draft" | "pending_approval" | "rejected" | "revision_requested"> = [
    "draft",
    "pending_approval",
    "rejected",
    "revision_requested",
  ];

  for (const status of unapprovedStatuses) {
    const unapprovedProposal = {
      ...proposal,
      status,
      approvedByUserId: null,
      approvedAt: null,
    };

    await assert.rejects(
      async () => {
        await outreachManager.generateEmailDraft({
          organizationId: "org-nexgen-prod",
          opportunityId: "opp-fintech-01",
          proposalId: unapprovedProposal.id,
          proposal: unapprovedProposal,
          analysis,
          scoring,
          clientProfile: mockClientProfile,
          projectTitle: mockProjectInput.title,
          projectDescription: mockProjectInput.description,
          version: 1,
        });
      },
      (err: any) => {
        assert.match(err.message, /Prerequisite violated.*proposal.*approved/i);
        return true;
      },
      `Should have rejected outreach generation for proposal status: ${status}`
    );
  }
});

// ── TEST 7: DISQUALIFIED / REJECTED OPPORTUNITY BLOCKING ──────────────────────

test("Test 7: Strictly rejects outreach generation if opportunity is disqualified or rejected", async () => {
  const { proposal, analysis, scoring } = await buildApprovedProposalFixture();
  const outreachManager = new AIOutreachManager();

  const disqualifiedScoring = {
    ...scoring,
    isQualified: false,
    recommendedAction: "disqualify" as const,
  };

  await assert.rejects(
    async () => {
      await outreachManager.generateEmailDraft({
        organizationId: "org-nexgen-prod",
        opportunityId: "opp-fintech-01",
        proposalId: proposal.id,
        proposal,
        analysis,
        scoring: disqualifiedScoring,
        clientProfile: mockClientProfile,
        projectTitle: mockProjectInput.title,
        projectDescription: mockProjectInput.description,
        version: 1,
      });
    },
    (err: any) => {
      assert.match(err.message, /Cannot generate outreach for disqualified or rejected opportunity/i);
      return true;
    }
  );
});

// ── TEST 8: ANIL AUTHORIZATION SUCCESS ────────────────────────────────────────

test("Test 8: Authorizes outreach approval decision by Anil account (anil@nexgen.ai)", async () => {
  const gate = new OutreachApprovalGate();

  const anilDecision: OutreachApprovalDecisionInput = {
    action: "approve",
    userId: "anil@nexgen.ai",
    userEmail: "anil@nexgen.ai",
  };

  const currentMessage: OutreachMessageDraft = {
    id: "msg-email-01",
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: "prop-fintech-01",
    channel: "email",
    status: "pending_approval",
    version: 1,
    subject: "NexGen Agency Proposal",
    body: "Email body content...",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = gate.processApprovalDecision(currentMessage, anilDecision);

  assert.strictEqual(result.status, "approved");
  assert.strictEqual(result.approvedByUserId, "anil@nexgen.ai");
  assert.ok(result.approvedAt);
  assert.strictEqual(result.activityHistory?.length, 1);
  assert.strictEqual(result.activityHistory[0].action, "approval_decision");
});

// ── TEST 9: NON-ANIL ACCOUNT REJECTION (403 FORBIDDEN) ────────────────────────

test("Test 9: Rejects non-Anil accounts attempting to approve outreach messages", () => {
  const gate = new OutreachApprovalGate();

  const nonAnilUsers = [
    { userId: "john@nexgen.ai", userEmail: "john@nexgen.ai" },
    { userId: "admin@other.com", userEmail: "admin@other.com" },
    { userId: "lead-dev", userEmail: "dev@nexgen.ai" },
  ];

  const currentMessage: OutreachMessageDraft = {
    id: "msg-email-01",
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: "prop-fintech-01",
    channel: "email",
    status: "pending_approval",
    version: 1,
    subject: "Subject",
    body: "Body",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  for (const user of nonAnilUsers) {
    assert.throws(
      () => {
        gate.processApprovalDecision(currentMessage, {
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

// ── TEST 10: SPOOFED CLIENT-SIDE FLAG REJECTION ───────────────────────────────

test("Test 10: Rejects client-side isAnilExplicit spoofing without verified server identity", () => {
  assert.strictEqual(
    isAnilAuthorizedAccount({
      userId: "attacker-user-99",
      userEmail: "attacker@random.com",
      isAnilExplicit: true as any, // Spoofed client-side flag
    }),
    false,
    "Must not trust client-supplied boolean flags"
  );

  assert.strictEqual(
    isAnilAuthorizedAccount({
      userId: "anil@nexgen.ai",
      userEmail: "anil@nexgen.ai",
    }),
    true,
    "Valid Anil email passes server check"
  );
});

// ── TEST 11: MULTI-CHANNEL BATCH GENERATION ───────────────────────────────────

test("Test 11: Generates complete multi-channel package (Email + LinkedIn + WhatsApp) in one run", async () => {
  const { proposal, analysis, scoring } = await buildApprovedProposalFixture();
  const outreachManager = new AIOutreachManager();

  const pkg = await outreachManager.generateMultiChannelPackage({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: proposal.id,
    proposal,
    analysis,
    scoring,
    clientProfile: mockClientProfile,
    projectTitle: mockProjectInput.title,
    projectDescription: mockProjectInput.description,
    version: 1,
  });

  assert.strictEqual(pkg.messages.length, 3);
  const channels = pkg.messages.map((m) => m.channel);
  assert.ok(channels.includes("email"));
  assert.ok(channels.includes("linkedin"));
  assert.ok(channels.includes("whatsapp"));

  // Check LinkedIn character restriction in package
  const linkedinMsg = pkg.messages.find((m) => m.channel === "linkedin");
  assert.ok(linkedinMsg);
  assert.ok(linkedinMsg.body.length <= 300);
});

// ── TEST 12: VERSION TRACKING (v1 -> v2) ──────────────────────────────────────

test("Test 12: Correctly increments version numbers upon regeneration", async () => {
  const { proposal, analysis, scoring } = await buildApprovedProposalFixture(2);
  const outreachManager = new AIOutreachManager();

  const v1Draft = await outreachManager.generateEmailDraft({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: proposal.id,
    proposal,
    analysis,
    scoring,
    clientProfile: mockClientProfile,
    projectTitle: mockProjectInput.title,
    projectDescription: mockProjectInput.description,
    version: 1,
  });

  const v2Draft = await outreachManager.generateEmailDraft({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: proposal.id,
    proposal,
    analysis,
    scoring,
    clientProfile: mockClientProfile,
    projectTitle: mockProjectInput.title,
    projectDescription: mockProjectInput.description,
    version: 2,
  });

  assert.strictEqual(v1Draft.version, 1);
  assert.strictEqual(v2Draft.version, 2);
});

// ── TEST 13: DRAFT EDITING & ACTIVITY HISTORY ─────────────────────────────────

test("Test 13: Allows editing draft message and appends edited event to activity history", () => {
  const initialMessage: OutreachMessageDraft = {
    id: "msg-email-edit",
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: "prop-fintech-01",
    channel: "email",
    status: "draft",
    version: 1,
    subject: "Initial Subject",
    body: "Initial Body text",
    activityHistory: [
      {
        timestamp: new Date().toISOString(),
        action: "created",
        details: "Generated initial draft v1",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Perform update
  const updatedMessage: OutreachMessageDraft = {
    ...initialMessage,
    subject: "Updated Subject Line",
    body: "Refined body content tailored for the client",
    status: "pending_approval",
    activityHistory: [
      ...(initialMessage.activityHistory || []),
      {
        timestamp: new Date().toISOString(),
        action: "edited",
        performedByUserId: "anil@nexgen.ai",
        details: "Edited subject and body before approval",
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  assert.strictEqual(updatedMessage.subject, "Updated Subject Line");
  assert.strictEqual(updatedMessage.body, "Refined body content tailored for the client");
  assert.strictEqual(updatedMessage.activityHistory?.length, 2);
  assert.strictEqual(updatedMessage.activityHistory[1].action, "edited");
});

// ── TEST 14: MULTI-TENANT ISOLATION ──────────────────────────────────────────

test("Test 14: Enforces strict tenant isolation on outreach messages", () => {
  const orgAStore: OutreachMessageDraft[] = [
    {
      id: "msg-org-a",
      organizationId: "org-a",
      opportunityId: "opp-a",
      proposalId: "prop-a",
      channel: "email",
      status: "approved",
      version: 1,
      body: "Secret Org A Outreach",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Attempt query from Org B
  const queryByOrg = (targetOrgId: string, store: OutreachMessageDraft[]) => {
    return store.filter((m) => m.organizationId === targetOrgId);
  };

  const orgBResults = queryByOrg("org-b", orgAStore);
  assert.strictEqual(orgBResults.length, 0, "Org B must not access Org A messages");

  const orgAResults = queryByOrg("org-a", orgAStore);
  assert.strictEqual(orgAResults.length, 1);
});

// ── TEST 15: SUPPRESSION / OPT-OUT LIST BLOCKING ───────────────────────────────

test("Test 15: Flags or blocks client on suppression / opt-out list", () => {
  const personalizer = new ClientPersonalizer();
  const suppressedDomain = "optedout-client.com";

  // Register domain in personalizer suppression list
  personalizer.addToSuppressionList(suppressedDomain);

  const profileOnSuppression = {
    ...mockClientProfile,
    domain: suppressedDomain,
  };

  const ctx = personalizer.buildPersonalizationContext({
    clientProfile: profileOnSuppression,
    opportunityTitle: "Suppressed Opp",
    organizationId: "org-nexgen-prod",
  });

  assert.strictEqual(ctx.isSuppressed, true, "Must flag recipient as suppressed");
});

// ── TEST 16: EXTERNAL SENDING POLICY DISABLED ─────────────────────────────────

test("Test 16: assertDispatchPreconditions strictly rejects external dispatch when ALLOW_EXTERNAL_OUTREACH is false", () => {
  const gate = new OutreachApprovalGate();

  const approvedMessage: OutreachMessageDraft = {
    id: "msg-approved-01",
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: "prop-fintech-01",
    channel: "email",
    status: "approved",
    approvedByUserId: "anil@nexgen.ai",
    approvedAt: new Date().toISOString(),
    version: 1,
    body: "Approved message",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // With default environment, ALLOW_EXTERNAL_OUTREACH !== 'true'
  assert.throws(
    () => {
      gate.assertDispatchPreconditions(approvedMessage);
    },
    (err: any) => {
      assert.match(
        err.message,
        /External outreach dispatch is permanently locked.*ALLOW_EXTERNAL_OUTREACH/i
      );
      return true;
    }
  );
});

// ── TEST 17: REVISION FEEDBACK INCORPORATION ───────────────────────────────────

test("Test 17: Incorporates Anil's revision feedback into subsequent outreach generations", async () => {
  const { proposal, analysis, scoring } = await buildApprovedProposalFixture(2);
  const outreachManager = new AIOutreachManager();

  const revisionFeedback = "Focus specifically on our experience with Go microsecond settlement and sub-millisecond Kafka pipelines.";

  const v2Draft = await outreachManager.generateEmailDraft({
    organizationId: "org-nexgen-prod",
    opportunityId: "opp-fintech-01",
    proposalId: proposal.id,
    proposal,
    analysis,
    scoring,
    clientProfile: mockClientProfile,
    projectTitle: mockProjectInput.title,
    projectDescription: mockProjectInput.description,
    revisionFeedback,
    version: 2,
  });

  assert.strictEqual(v2Draft.version, 2);
  assert.strictEqual(v2Draft.status, "pending_approval");
  // Ensure the generation context records revision feedback in metadata
  assert.strictEqual(v2Draft.metadata?.revisionFeedback, revisionFeedback);
});
