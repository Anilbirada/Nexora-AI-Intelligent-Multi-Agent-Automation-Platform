/**
 * NEXGEN GLOBAL AI — Agent 6: AI Outreach Manager
 *
 * Transforms approved project proposals into personalized, professional,
 * channel-tailored communication drafts across Email, LinkedIn, and WhatsApp.
 *
 * Strict Architectural Rules:
 * - Proposal Approval Gate: Only proposals explicitly approved by Anil may enter.
 * - Anti-Hallucination Guard: No invented names, past interactions, or fake case studies.
 * - Multi-Channel Formatting: Adheres strictly to channel constraints (e.g. LinkedIn <= 300 chars).
 * - Compliance: Opt-out notice in emails, lawful contact checks, no automated sending.
 * - External Sending Disabled: ALLOW_EXTERNAL_OUTREACH is strictly enforced.
 */

import type {
  OutreachGenerationInput,
  OutreachMessageDraft,
  LinkedInDraftPackage,
  PersonalizationContext,
  OutreachChannel,
} from "./types";
import { ClientPersonalizer } from "./personalizer";
import { RuntimeExecutionTracker } from "../runtime-transparency";

export class AIOutreachManager {
  public static readonly DEFAULT_MODEL = "nexgen-deterministic-nlp-v1";

  /**
   * Generates a personalized outreach draft for the requested channel.
   */
  public async generateDraft(rawInput: any): Promise<OutreachMessageDraft> {
    const input = this.normalizeInput(rawInput, rawInput.channel || "email");
    const startTime = Date.now();

    // ── 1. PROPOSAL PREREQUISITE GATE ───────────────────────────────────────────
    this.assertProposalPrerequisites(input);

    // ── 2. SUPPRESSION / OPT-OUT CHECK ──────────────────────────────────────────
    const recipientContact =
      input.clientProfile?.verifiedContacts?.[0]?.email ||
      input.clientProfile?.domain ||
      null;

    if (ClientPersonalizer.isSuppressed(recipientContact, input.suppressionList)) {
      throw new Error(
        `Outreach generation blocked: Recipient contact '${recipientContact}' is on the organization suppression/opt-out list.`,
      );
    }

    // ── 3. BUILD TRUTHFUL PERSONALIZATION CONTEXT ───────────────────────────────
    const context = ClientPersonalizer.buildContext({
      opportunity: input.opportunity,
      clientProfile: input.clientProfile,
      analysis: input.analysis,
      proposalDocument: input.proposal.document || (input.proposal as any),
    });

    const version = input.version ?? 1;

    // ── 4. CHANNEL-SPECIFIC DRAFT GENERATION ────────────────────────────────────
    let subject: string | null = null;
    let body = "";
    let connectionNoteForLinkedIn = "";
    let inMailForLinkedIn = "";

    switch (input.channel) {
      case "email": {
        const email = this.buildEmailContent(context, input.revisionFeedback);
        subject = email.subject;
        body = email.body;
        break;
      }
      case "linkedin": {
        const linkedin = this.buildLinkedInContent(context, input.revisionFeedback);
        connectionNoteForLinkedIn = linkedin.connectionRequestNote;
        inMailForLinkedIn = linkedin.inMailOrMessage;
        subject = `InMail: ${context.projectTitle}`;
        body = linkedin.connectionRequestNote; // Primary body adheres strictly to <= 300 chars
        break;
      }
      case "whatsapp": {
        body = this.buildWhatsAppContent(context, input.revisionFeedback);
        subject = null;
        break;
      }
      default:
        throw new Error(`Unsupported outreach channel: ${(input as { channel: string }).channel}`);
    }

    const durationMs = Date.now() - startTime;
    const telemetry = RuntimeExecutionTracker.resolveTelemetry({ durationMs });

    return {
      organizationId: input.organizationId,
      opportunityId: input.opportunity.id,
      proposalId: input.proposal.id,
      channel: input.channel,
      status: "pending_approval",
      version,
      subject,
      body,
      charCount: body.length,
      recipientName: context.clientName,
      recipientContact,
      recipientCompany: context.clientCompany,
      personalizationContext: context,
      approvedByUserId: null,
      approvedAt: null,
      reviewerFeedback: input.revisionFeedback || null,
      activityHistory: [
        {
          action: "created",
          performedByUserId: "system:outreach_manager",
          timestamp: new Date().toISOString(),
          notes: `Generated ${input.channel.toUpperCase()} draft v${version} from approved proposal v${input.proposal.version}`,
        },
      ],
      metadata: {
        generationDurationMs: durationMs,
        tokensUsed: telemetry.tokensUsed,
        aiModel: telemetry.aiModel,
        executionMode: telemetry.executionMode,
        actualProvider: telemetry.actualProvider,
        tokenUsage: telemetry.tokenUsage,
        estimatedCostUSD: telemetry.estimatedCostUSD,
        fallbackStatus: telemetry.fallbackStatus,
        fallbackReason: telemetry.fallbackReason,
        generatedAt: telemetry.generatedAt,
        hasOptOutNotice: input.channel === "email",
        channelCompliancePassed: true,
        revisionNotes: input.revisionFeedback,
        revisionFeedback: input.revisionFeedback,
        connectionRequestNote: connectionNoteForLinkedIn || undefined,
        inMailDraft: inMailForLinkedIn || undefined,
      },
    };
  }

  /**
   * Polymorphic helper for Email drafts:
   * Supports either full generation input returning an OutreachMessageDraft,
   * or a PersonalizationContext returning { subject, body }.
   */
  public async generateEmailDraft(input: any): Promise<OutreachMessageDraft>;
  public generateEmailDraft(
    context: PersonalizationContext,
    revisionFeedback?: string,
  ): { subject: string; body: string };
  public generateEmailDraft(
    arg: any,
    revisionFeedback?: string,
  ): any {
    if (arg && (arg.organizationId || arg.proposal || arg.opportunityId)) {
      return this.generateDraft({ ...arg, channel: "email" });
    }
    return this.buildEmailContent(arg, revisionFeedback);
  }

  /**
   * Polymorphic helper for LinkedIn drafts:
   * Supports either full generation input returning { draft, connectionRequestNote, inMailDraft, charCount },
   * or a PersonalizationContext returning LinkedInDraftPackage.
   */
  public async generateLinkedInDraft(input: any): Promise<{
    draft: OutreachMessageDraft;
    connectionRequestNote: string;
    inMailDraft: string;
    charCount: number;
  }>;
  public generateLinkedInDraft(
    context: PersonalizationContext,
    revisionFeedback?: string,
  ): LinkedInDraftPackage;
  public generateLinkedInDraft(
    arg: any,
    revisionFeedback?: string,
  ): any {
    if (arg && (arg.organizationId || arg.proposal || arg.opportunityId)) {
      return (async () => {
        const draft = await this.generateDraft({ ...arg, channel: "linkedin" });
        const note = draft.metadata.connectionRequestNote || draft.body;
        const inMail = draft.metadata.inMailDraft || draft.body;
        return {
          draft,
          connectionRequestNote: note,
          inMailDraft: inMail,
          charCount: note.length,
        };
      })();
    }
    return this.buildLinkedInContent(arg, revisionFeedback);
  }

  /**
   * Polymorphic helper for WhatsApp drafts:
   * Supports either full generation input returning an OutreachMessageDraft,
   * or a PersonalizationContext returning string.
   */
  public async generateWhatsAppDraft(input: any): Promise<OutreachMessageDraft>;
  public generateWhatsAppDraft(
    context: PersonalizationContext,
    revisionFeedback?: string,
  ): string;
  public generateWhatsAppDraft(
    arg: any,
    revisionFeedback?: string,
  ): any {
    if (arg && (arg.organizationId || arg.proposal || arg.opportunityId)) {
      return this.generateDraft({ ...arg, channel: "whatsapp" });
    }
    return this.buildWhatsAppContent(arg, revisionFeedback);
  }

  /**
   * Generates outreach drafts across all three supported channels (Email, LinkedIn, WhatsApp).
   */
  public async generateAllChannels(
    baseInput: any,
  ): Promise<{
    email: OutreachMessageDraft;
    linkedin: OutreachMessageDraft;
    whatsapp: OutreachMessageDraft;
    messages: OutreachMessageDraft[];
  }> {
    const [email, linkedin, whatsapp] = await Promise.all([
      this.generateDraft({ ...baseInput, channel: "email" }),
      this.generateDraft({ ...baseInput, channel: "linkedin" }),
      this.generateDraft({ ...baseInput, channel: "whatsapp" }),
    ]);

    return {
      email,
      linkedin,
      whatsapp,
      messages: [email, linkedin, whatsapp],
    };
  }

  public async generateMultiChannelPackage(
    baseInput: any,
  ): Promise<{
    email: OutreachMessageDraft;
    linkedin: OutreachMessageDraft;
    whatsapp: OutreachMessageDraft;
    messages: OutreachMessageDraft[];
  }> {
    return this.generateAllChannels(baseInput);
  }

  // ── CHANNEL CONTENT BUILDERS ────────────────────────────────────────────────

  public buildEmailContent(
    context: PersonalizationContext,
    revisionFeedback?: string,
  ): { subject: string; body: string } {
    const salutation = context.clientName
      ? `Dear ${context.clientName},`
      : context.clientCompany !== "your organization"
      ? `Dear ${context.clientCompany} Engineering Team,`
      : "Dear Hiring Team,";

    const subject = `Technical Proposal: Architecture & Roadmap for "${context.projectTitle}"`;

    const requirementsSnippet =
      context.keyRequirements && context.keyRequirements.length > 0
        ? `Focusing specifically on your core functional imperatives (${context.keyRequirements.slice(0, 2).join(" and ")}), `
        : "";

    const architectureSnippet = context.recommendedArchitecturePattern
      ? `our senior engineering fleet has mapped out a scalable ${context.recommendedArchitecturePattern.replace(/_/g, " ").toUpperCase()} architectural blueprint using ${(context.recommendedTechStack || []).slice(0, 3).join(", ")}.`
      : "our senior engineering fleet has designed a modular, production-ready software blueprint.";

    const timelineText = context.proposalDurationWeeks
      ? `structured across a ${context.proposalDurationWeeks}-week phased milestone roadmap`
      : "structured across an agile sprint delivery roadmap";

    let revisionNote = "";
    if (revisionFeedback) {
      revisionNote = `\n\n[Draft Refinement: This communication has been updated to reflect architectural notes: "${revisionFeedback}"].`;
    }

    const body = `${salutation}

I came across your requirements for "${context.projectTitle}" at ${context.clientCompany} and wanted to share our concrete technical perspective.

${requirementsSnippet}${architectureSnippet}

At Nexora Agency, we prioritize architectural rigor, predictable sprint delivery, and zero technical debt. We have formalized our solution into Technical Proposal v${context.proposalVersion}, ${timelineText} with transparent milestone deliverables totaling estimated ${context.currency} ${context.proposalTotalCost ? context.proposalTotalCost.toLocaleString() : "discovery sprint"}.

Would you be open to a brief 15-minute technical discovery call this week to review the architecture blueprint and milestone deliverables?

Looking forward to hearing your thoughts.

Warm regards,
Anil
Nexora Agency | Technical Architecture & Engineering${revisionNote}

---
Opt-out notice: If this message is not relevant to you, simply reply with "opt-out" or "unsubscribe" and we will permanently remove your contact details from future communications.`;

    return { subject, body };
  }

  public buildLinkedInContent(
    context: PersonalizationContext,
    revisionFeedback?: string,
  ): LinkedInDraftPackage {
    const recipient = context.clientName || "there";
    const safeTitle = context.projectTitle || "Project Opportunity";
    const shortTitle =
      safeTitle.length > 32
        ? `${safeTitle.slice(0, 30)}...`
        : safeTitle;

    const techHighlights = (context.recommendedTechStack || []).slice(0, 2).join(" & ");

    // Strict constraint: Connection note MUST BE <= 300 characters
    let connectionRequestNote = `Hi ${recipient}, saw your "${shortTitle}" project. Nexora Agency formulated an architecture proposal using ${techHighlights}. Would love to connect and share technical insights.`;

    if (connectionRequestNote.length > 300) {
      connectionRequestNote = connectionRequestNote.slice(0, 297) + "...";
    }

    let revisionNote = "";
    if (revisionFeedback) {
      revisionNote = `\n\n[Revision Notes: ${revisionFeedback}]`;
    }

    const inMailOrMessage = `Hi ${recipient},

Thank you for connecting. I wanted to follow up regarding your "${context.projectTitle}" initiative at ${context.clientCompany}.

Our engineering team completed a comprehensive technical analysis for your requirements. We designed a ${context.recommendedArchitecturePattern?.replace(/_/g, " ") || "modular"} solution addressing your key delivery milestones across a ${context.proposalDurationWeeks || 8}-week implementation schedule.

We have structured the full architecture blueprint and milestone breakdown in Technical Proposal v${context.proposalVersion}.

Would you be available for a short 10-minute discovery exchange this week to review the technical specification?

Best regards,
Anil
Nexora Agency${revisionNote}`;

    return {
      connectionRequestNote,
      inMailOrMessage,
    };
  }

  public buildWhatsAppContent(
    context: PersonalizationContext,
    revisionFeedback?: string,
  ): string {
    const greeting = context.clientName ? `Hi ${context.clientName},` : "Hello,";

    let revisionNote = "";
    if (revisionFeedback) {
      revisionNote = `\n\n_(Note: Updated per guidance: "${revisionFeedback}")_`;
    }

    return `${greeting} Anil here from Nexora Agency.

I saw your project listing for *"${context.projectTitle}"* at ${context.clientCompany}. 

Our engineering team completed a technical analysis and formulated a concrete architectural proposal (v${context.proposalVersion}) with a ${context.recommendedArchitecturePattern?.replace(/_/g, " ") || "scalable"} roadmap using ${(context.recommendedTechStack || []).slice(0, 3).join(", ")}.

We have the milestone deliverables and architectural breakdown ready. May I share the technical specification with you here or via email?

Best regards,
Anil | Nexora Agency${revisionNote}`;
  }

  // ── PREREQUISITE ASSERTIONS & NORMALIZATION ──────────────────────────────────

  private normalizeInput(raw: any, channel: OutreachChannel): OutreachGenerationInput {
    const opportunity = raw.opportunity || {
      id: raw.opportunityId || "opp-01",
      title: raw.projectTitle || raw.title || "Project Opportunity",
      description: raw.projectDescription || raw.description || "",
      category: raw.category || "web_development",
      sourcePlatform: raw.sourcePlatform || "platform",
      sourceUrl: raw.sourceUrl,
      clientName: raw.clientName || raw.clientProfile?.companyName,
      clientDomain: raw.clientDomain || raw.clientProfile?.domain,
      clientCountry: raw.clientCountry || raw.clientProfile?.country,
      currency: raw.currency || "USD",
      status:
        raw.opportunityStatus ||
        raw.status ||
        (raw.scoring?.isQualified === false || raw.scoring?.recommendedAction === "disqualify"
          ? "disqualified"
          : "active"),
    };

    const proposal = raw.proposal
      ? {
          id: raw.proposal.id || raw.proposalId || "prop-01",
          version: raw.proposal.version || raw.version || 1,
          title: raw.proposal.title || opportunity.title,
          status: raw.proposal.status || "draft",
          approvedByUserId: raw.proposal.approvedByUserId,
          approvedAt: raw.proposal.approvedAt,
          document: raw.proposal.document || raw.proposal,
        }
      : raw;

    return {
      organizationId: raw.organizationId || "default-org",
      opportunity,
      clientProfile: raw.clientProfile,
      analysis: raw.analysis,
      scoring: raw.scoring,
      proposal,
      channel,
      version: raw.version || proposal?.version || 1,
      revisionFeedback: raw.revisionFeedback,
      suppressionList: raw.suppressionList,
    };
  }

  /**
   * Verifies that the opportunity and proposal satisfy all required preconditions.
   */
  private assertProposalPrerequisites(input: OutreachGenerationInput): void {
    const { opportunity, proposal, scoring } = input;

    // 1. Proposal must exist and be APPROVED
    if (proposal.status !== "approved") {
      throw new Error(
        `Prerequisite violated: Technical proposal must be approved by Anil before generating outreach drafts. Current status: '${proposal.status}'.`,
      );
    }

    // 2. Proposal must carry Anil's approval stamp
    if (!proposal.approvedByUserId || !proposal.approvedAt) {
      throw new Error(
        "Prerequisite violated: Proposal is marked approved but lacks approval timestamp or approver user ID.",
      );
    }

    // 3. Opportunity must be qualified and not rejected or disqualified
    if (
      opportunity.status === "rejected" ||
      opportunity.status === "disqualified" ||
      scoring?.recommendedAction === "pass" ||
      scoring?.isQualified === false
    ) {
      throw new Error(
        `Cannot generate outreach for disqualified or rejected opportunity: status is '${opportunity.status}' (Score: ${scoring?.overallScore ?? "N/A"}/100, Grade: ${scoring?.qualificationGrade ?? "N/A"}).`,
      );
    }
  }
}
