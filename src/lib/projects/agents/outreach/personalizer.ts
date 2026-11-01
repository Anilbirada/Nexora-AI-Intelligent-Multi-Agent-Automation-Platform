/**
 * NEXGEN GLOBAL AI — Client Personalization & Truthfulness Guard
 *
 * Implements strict anti-hallucination rules for client outreach:
 * - Uses only verified facts from Agent 2 (Client Researcher) and Agent 3 (Analyzer).
 * - Never invents client names, corporate identities, past conversations, or fake case studies.
 * - Leaves missing information omitted or explicitly marked unavailable.
 * - Validates contacts against suppression / opt-out lists.
 */

import type { ResearchedClientProfile } from "../researcher/types";
import type { StructuredProjectAnalysis } from "../analyzer/types";
import type { StructuredProposalDocument } from "../proposal/types";
import type { PersonalizationContext } from "./types";

export type PersonalizationSummary = {
  recipientName?: string;
  recipientRole?: string;
  recipientEmail?: string;
  companyName?: string;
  isVerified: boolean;
  isSuppressed: boolean;
  salutation: string;
};

export class ClientPersonalizer {
  private suppressionList: Set<string> = new Set();

  public addToSuppressionList(entry: string): void {
    if (entry && entry.trim().length > 0) {
      this.suppressionList.add(entry.trim().toLowerCase());
    }
  }

  /**
   * Resolves recipient name strictly from verified sources.
   * If unverified or missing, returns null to trigger professional team salutation.
   */
  public static resolveRecipientName(
    clientProfile?: ResearchedClientProfile | null,
    opportunityClientName?: string | null,
  ): string | null {
    // 1. Check verified contacts from researcher
    if (clientProfile?.verifiedContacts && clientProfile.verifiedContacts.length > 0) {
      const firstVerified = clientProfile.verifiedContacts[0];
      if (firstVerified.name && firstVerified.name.trim().length > 1) {
        return firstVerified.name.trim();
      }
    }

    // 2. Check opportunity clientName ONLY IF client profile is verified and not generic
    if (clientProfile?.isVerified && opportunityClientName) {
      const trimmed = opportunityClientName.trim();
      const genericNames = [
        "client",
        "client partner",
        "confidential",
        "hiring manager",
        "anonymous",
        "owner",
        "admin",
        "recruiter",
      ];
      if (trimmed.length > 1 && !genericNames.includes(trimmed.toLowerCase())) {
        return trimmed;
      }
    }

    // Strictly DO NOT invent or guess a name
    return null;
  }

  /**
   * Resolves company name from verified research or fallback.
   */
  public static resolveCompanyName(
    clientProfile?: ResearchedClientProfile | null,
    opportunityClientName?: string | null,
  ): string {
    if (clientProfile?.companyName && clientProfile.companyName.trim().length > 1) {
      const c = clientProfile.companyName.trim();
      if (!c.toLowerCase().includes("confidential") && !c.toLowerCase().includes("client partner")) {
        return c;
      }
    }

    if (opportunityClientName && opportunityClientName.trim().length > 1) {
      const o = opportunityClientName.trim();
      if (!o.toLowerCase().includes("confidential") && !o.toLowerCase().includes("client partner")) {
        return o;
      }
    }

    return "your organization";
  }

  /**
   * Builds the comprehensive personalization context without fabricating any claims.
   */
  public static buildContext(params: {
    opportunity: {
      id: string;
      title: string;
      category: string;
      clientName?: string | null;
      clientDomain?: string | null;
      clientCountry?: string | null;
      currency?: string;
    };
    clientProfile?: ResearchedClientProfile | null;
    analysis: any;
    proposalDocument: any;
  }): PersonalizationContext {
    const { opportunity, clientProfile, analysis, proposalDocument } = params;

    const recipientName = this.resolveRecipientName(clientProfile, opportunity.clientName);
    const clientCompany = this.resolveCompanyName(clientProfile, opportunity.clientName);

    const missingInformationFlags: string[] = [];
    if (!recipientName) missingInformationFlags.push("client_name_unverified");
    if (clientCompany === "your organization") missingInformationFlags.push("company_name_confidential");
    if (!clientProfile?.isVerified) missingInformationFlags.push("client_profile_unverified");

    const verifiedFactsUsed: string[] = [];
    if (recipientName) verifiedFactsUsed.push(`Verified Recipient: ${recipientName}`);
    if (clientCompany !== "your organization") verifiedFactsUsed.push(`Verified Enterprise: ${clientCompany}`);
    if (clientProfile?.domain) verifiedFactsUsed.push(`Corporate Domain: ${clientProfile.domain}`);
    if (clientProfile?.country) verifiedFactsUsed.push(`Country Jurisdiction: ${clientProfile.country}`);
    if (analysis?.recommendedArchitecture?.pattern) {
      verifiedFactsUsed.push(`Architectural Pattern: ${analysis.recommendedArchitecture.pattern}`);
    }

    const functionalRequirements = analysis?.functionalRequirements || [];
    const risks = analysis?.risks || analysis?.deliveryRisks || [];
    const coreStack = analysis?.technologyRecommendations?.coreStack || [];
    const pattern = analysis?.recommendedArchitecture?.pattern || "modular_architecture";
    const recommendedCost = proposalDocument?.budgetRecommendation?.recommendedCost ?? proposalDocument?.totalCostEstimate;
    const durationWeeks = proposalDocument?.estimatedTimeline?.weeksMax ?? proposalDocument?.estimatedDurationWeeks ?? 8;
    const currency = proposalDocument?.budgetRecommendation?.currency || opportunity.currency || "USD";

    return {
      opportunityId: opportunity.id,
      projectTitle: opportunity.title,
      category: opportunity.category,
      clientName: recipientName,
      clientCompany,
      clientDomain: clientProfile?.domain,
      clientCountry: clientProfile?.country || opportunity.clientCountry || undefined,
      isClientVerified: Boolean(clientProfile?.isVerified),
      keyRequirements: functionalRequirements.slice(0, 4),
      technicalChallenges: risks.slice(0, 3).map((r: any) => (typeof r === "string" ? r : r?.description || String(r))),
      recommendedArchitecturePattern: pattern,
      recommendedTechStack: coreStack.slice(0, 6),
      proposalVersion: proposalDocument?.version ?? 1,
      proposalTotalCost: recommendedCost,
      proposalDurationWeeks: durationWeeks,
      currency,
      missingInformationFlags,
      verifiedFactsUsed,
    };
  }

  /**
   * Instance helper for building a lightweight or structured personalization context.
   */
  public buildPersonalizationContext(params: {
    clientProfile?: ResearchedClientProfile | null;
    opportunityTitle?: string;
    organizationId?: string;
    opportunity?: {
      id: string;
      title: string;
      category: string;
      clientName?: string | null;
      clientDomain?: string | null;
      clientCountry?: string | null;
      currency?: string;
    };
    analysis?: any;
    proposalDocument?: any;
  }): PersonalizationSummary {
    const { clientProfile } = params;

    let recipientName: string | undefined;
    let recipientRole: string | undefined;
    let recipientEmail: string | undefined;

    if (clientProfile?.verifiedContacts && clientProfile.verifiedContacts.length > 0) {
      const primaryContact = clientProfile.verifiedContacts[0];
      if (primaryContact.name && primaryContact.name.trim().length > 1) {
        recipientName = primaryContact.name.trim();
      }
      if (primaryContact.title && primaryContact.title.trim().length > 0) {
        recipientRole = primaryContact.title.trim();
      }
      if (primaryContact.email && primaryContact.email.trim().length > 0) {
        recipientEmail = primaryContact.email.trim();
      }
    }

    let companyName: string | undefined;
    if (clientProfile?.companyName && clientProfile.companyName.trim().length > 0) {
      const c = clientProfile.companyName.trim();
      if (!c.toLowerCase().includes("confidential") && !c.toLowerCase().includes("client partner")) {
        companyName = c;
      }
    }

    const isVerified = Boolean(clientProfile?.isVerified);

    let isSuppressed = false;
    if (recipientEmail && this.suppressionList.has(recipientEmail.toLowerCase())) {
      isSuppressed = true;
    }
    if (clientProfile?.domain && this.suppressionList.has(clientProfile.domain.toLowerCase())) {
      isSuppressed = true;
    }

    const salutation = recipientName ? `Dear ${recipientName}` : "Hello";

    return {
      recipientName,
      recipientRole,
      recipientEmail,
      companyName,
      isVerified,
      isSuppressed,
      salutation,
    };
  }

  public formatRecipientSalutation(ctx: PersonalizationSummary): string {
    return ctx.recipientName ? `Dear ${ctx.recipientName},` : "Hello,";
  }

  public formatCompanyReference(ctx: PersonalizationSummary): string {
    return ctx.companyName || "your team";
  }

  /**
   * Checks if an email address or contact identifier is present on the suppression list.
   */
  public static isSuppressed(contact: string | null | undefined, suppressionList?: string[]): boolean {
    if (!contact || !suppressionList || suppressionList.length === 0) return false;
    const normalized = contact.trim().toLowerCase();
    return suppressionList.some((s) => s.trim().toLowerCase() === normalized);
  }
}
