/**
 * NEXGEN GLOBAL AI — Agent 7 Follow-up Message Generator
 *
 * Synthesizes personalized, context-aware follow-up messages across
 * Email, LinkedIn, and WhatsApp without hallucinating facts or repeating text.
 */

import type {
  FollowupGenerationInput,
  FollowupDraftOutput,
} from "./types";

export class FollowupMessageGenerator {
  /**
   * Generates a tailored follow-up draft for the specified channel and step.
   */
  public static generateDraft(input: FollowupGenerationInput): FollowupDraftOutput {
    const { channel, stepNumber } = input;

    switch (channel) {
      case "email":
        return this.buildEmailDraft(input);
      case "linkedin":
        return this.buildLinkedInDraft(input);
      case "whatsapp":
        return this.buildWhatsAppDraft(input);
      default:
        throw new Error(`Unsupported follow-up channel: ${channel}`);
    }
  }

  // ── 1. EMAIL FOLLOW-UP ENGINE ───────────────────────────────────────────────

  private static buildEmailDraft(input: FollowupGenerationInput): FollowupDraftOutput {
    const greeting = input.clientName ? `Dear ${input.clientName},` : "Dear Hiring Team,";
    const company = input.clientCompany || "your team";
    const subject = input.previousOutreachSubject
      ? `Re: ${input.previousOutreachSubject.replace(/^Re:\s*/i, "")}`
      : `Following up on "${input.projectTitle}" architectural proposal`;

    let body = "";
    let callToAction = "";

    if (input.stepNumber === 1) {
      callToAction = "Would you have 10 minutes this Thursday or Friday to connect?";
      body = `${greeting}

I wanted to quickly follow up on my earlier note regarding "${input.projectTitle}" for ${company}.

I understand your engineering team is likely reviewing multiple solution paths. As mentioned previously, our senior architecture fleet at NexGen Agency formalized a concrete technical proposal and phased milestone roadmap tailored to your requirements.

${callToAction}

Best regards,
Anil
NexGen Agency`;
    } else if (input.stepNumber === 2) {
      callToAction = "Would you like me to send over our architecture breakdown and risk mitigation plan?";
      body = `${greeting}

Following up on my previous message regarding "${input.projectTitle}". 

When reviewing project requirements with our engineering leads, we identified several key architectural considerations around scalable performance and integration milestones that could meaningfully accelerate delivery for ${company}.

${callToAction}

Warm regards,
Anil
NexGen Agency`;
    } else {
      // Step 3: Final discovery closure
      callToAction = "If priorities shift or you'd like to revisit in the future, please feel free to reach out anytime.";
      body = `${greeting}

I'm checking in one final time regarding the technical roadmap for "${input.projectTitle}".

I realize timing might not be ideal or you may have already selected an alternative path. We are closing our active discovery schedule for this cycle, but our team at NexGen Agency remains available whenever you're exploring complex engineering initiatives.

${callToAction}

Wishing you and ${company} every success with the project.

Warm regards,
Anil
NexGen Agency`;
    }

    if (input.revisionFeedback) {
      body += `\n\n[Revision Note: ${input.revisionFeedback}]`;
    }

    // Mandatory Opt-out disclaimer
    body += `\n\n---\nOpt-out notice: If this message is not relevant, reply "unsubscribe" or "opt-out" to permanently stop future communications.`;

    return {
      subject,
      body,
      charCount: body.length,
      channel: "email",
      stepNumber: input.stepNumber,
      callToAction,
      hasOptOutNotice: true,
    };
  }

  // ── 2. LINKEDIN FOLLOW-UP ENGINE ────────────────────────────────────────────

  private static buildLinkedInDraft(input: FollowupGenerationInput): FollowupDraftOutput {
    const greeting = input.clientName ? `Hi ${input.clientName},` : "Hello,";
    const company = input.clientCompany || "your team";

    let body = "";
    let callToAction = "";

    if (input.stepNumber === 1) {
      callToAction = "Would love to share the specification if helpful.";
      body = `${greeting} checking in regarding the "${input.projectTitle}" initiative at ${company}. We completed our architectural analysis and milestone plan. ${callToAction} Best, Anil | NexGen Agency`;
    } else if (input.stepNumber === 2) {
      callToAction = "Let me know if you'd like a quick technical overview.";
      body = `${greeting} following up on "${input.projectTitle}". Our engineering team scoped a sprint-based velocity plan to mitigate technical risks for ${company}. ${callToAction} Best, Anil | NexGen Agency`;
    } else {
      callToAction = "Feel free to reach out anytime down the road.";
      body = `${greeting} final follow-up on "${input.projectTitle}". We're closing our active sprint window for this cycle. ${callToAction} Wishing you all the best, Anil | NexGen Agency`;
    }

    // Ensure LinkedIn constraint if needed (strictly <= 300 for connection notes)
    if (body.length > 300) {
      body = body.slice(0, 297) + "...";
    }

    if (input.revisionFeedback) {
      body += ` (Note: ${input.revisionFeedback})`;
    }

    return {
      subject: null,
      body,
      charCount: body.length,
      channel: "linkedin",
      stepNumber: input.stepNumber,
      callToAction,
      hasOptOutNotice: false,
    };
  }

  // ── 3. WHATSAPP FOLLOW-UP ENGINE ────────────────────────────────────────────

  private static buildWhatsAppDraft(input: FollowupGenerationInput): FollowupDraftOutput {
    const greeting = input.clientName ? `Hi ${input.clientName},` : "Hello,";

    let body = "";
    let callToAction = "";

    if (input.stepNumber === 1) {
      callToAction = "Would you be open to a brief 10-minute exchange this week?";
      body = `${greeting} Anil from NexGen Agency here. Following up briefly on our architectural proposal for *"${input.projectTitle}"*. We have our delivery blueprint ready. ${callToAction} Best regards!`;
    } else if (input.stepNumber === 2) {
      callToAction = "May I send over our technical sprint breakdown?";
      body = `${greeting} hope your week is going well. Checking in on *"${input.projectTitle}"*. Our engineering team mapped out the phased deliverables and risk mitigations. ${callToAction} Best, Anil`;
    } else {
      callToAction = "Feel free to ping me anytime if you ever need senior engineering bandwidth.";
      body = `${greeting} final check-in on *"${input.projectTitle}"*. We're concluding this discovery sprint. ${callToAction} Wishing you the best with the launch! Anil | NexGen Agency`;
    }

    if (input.revisionFeedback) {
      body += `\n\n_(Guidance: ${input.revisionFeedback})_`;
    }

    return {
      subject: null,
      body,
      charCount: body.length,
      channel: "whatsapp",
      stepNumber: input.stepNumber,
      callToAction,
      hasOptOutNotice: false,
    };
  }
}
