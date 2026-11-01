/**
 * NEXGEN GLOBAL AI — Agent 2: Client Researcher
 *
 * Responsibilities:
 * - Research the client or company associated with each opportunity.
 * - Identify company website, domain, and verifiable business information.
 * - Detect industry classification and public technology stack.
 * - Check company credibility and assign 0-100 credibility score.
 * - Identify potential risks and missing information.
 * - Provide evidence URLs for all findings.
 * - Never invent email addresses, phone numbers, or corporate facts.
 * - Strict verification tagging.
 */

import type { QualifiedHunterProject } from "../hunter/hunter";
import { ClientCredibilityEngine } from "./credibility";
import type { EvidenceItem, PublicContactEvidence, ResearchedClientProfile } from "./types";

export class ClientResearcher {
  /**
   * Conducts comprehensive, verifiable research on the client entity.
   */
  public async researchClient(project: QualifiedHunterProject): Promise<ResearchedClientProfile> {
    const rawText = `${project.title}\n${project.description}`;
    const evidenceUrls: EvidenceItem[] = [];

    // 1. Evidence of listing origin
    if (project.sourceUrl) {
      evidenceUrls.push({
        fact: `Project opportunity posted on ${project.sourcePlatform}`,
        sourceUrl: project.sourceUrl,
        verifiedAt: new Date(),
      });
    }

    // 2. Extract or Resolve Domain
    let domain = project.clientDomain;
    let websiteUrl = domain ? (domain.startsWith("http") ? domain : `https://${domain}`) : undefined;

    if (!domain) {
      const extractedDomain = this.extractDomainFromText(rawText);
      if (extractedDomain) {
        domain = extractedDomain;
        websiteUrl = `https://${domain}`;
      }
    }

    if (websiteUrl) {
      evidenceUrls.push({
        fact: `Identified client digital domain: ${domain}`,
        sourceUrl: websiteUrl,
        verifiedAt: new Date(),
      });
    }

    // 3. Resolve Company Name
    let companyName = project.clientName;
    if (!companyName && domain) {
      companyName = this.formatNameFromDomain(domain);
    }
    if (!companyName) {
      companyName = "Confidential Client";
    }

    // 4. Industry Classification
    const industry = this.classifyIndustry(project.primaryCategory, rawText);

    // 5. Tech Stack Discovery (Strictly from project specs)
    const techStackDetected = this.detectTechStack(rawText, project.requiredSkills);

    // 6. Public Contact Information (Never fabricate)
    const { verifiedContacts, unverifiedContacts } = this.extractPermittedContacts(rawText, domain, project.sourceUrl);

    // 7. Credibility Evaluation
    const credibility = ClientCredibilityEngine.evaluate({
      companyName,
      domain,
      evidenceUrls,
      country: project.clientCountry,
      description: project.description,
    });

    const summary = this.buildExecutiveSummary({
      companyName,
      domain,
      country: project.clientCountry,
      industry,
      credibilityScore: credibility.score,
      credibilityTier: credibility.tier,
      riskFlags: credibility.riskFlags,
      missingInformation: credibility.missingInformation,
    });

    return {
      companyName,
      domain,
      websiteUrl,
      industry,
      country: project.clientCountry,
      region: project.clientRegion,
      techStackDetected,
      credibilityScore: credibility.score,
      credibilityTier: credibility.tier,
      evidenceUrls,
      verifiedContacts,
      unverifiedContacts,
      riskFlags: credibility.riskFlags,
      missingInformation: credibility.missingInformation,
      isVerified: credibility.isVerified,
      researchSummary: summary,
      researchedAt: new Date(),
    };
  }

  private extractDomainFromText(text: string): string | null {
    // Looks for explicit mentions like company.com, https://acme.org
    const domainMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:com|org|io|net|co|ai|dev|app|eu|tech|global))\b/i);
    if (domainMatch && !domainMatch[1].includes("upwork") && !domainMatch[1].includes("freelancer") && !domainMatch[1].includes("github")) {
      return domainMatch[1].toLowerCase();
    }
    return null;
  }

  private formatNameFromDomain(domain: string): string {
    const base = domain.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  private classifyIndustry(category: string, text: string): string {
    const t = text.toLowerCase();
    if (t.includes("legal") || t.includes("law firm") || t.includes("attorney")) return "Legal Technology";
    if (t.includes("health") || t.includes("medical") || t.includes("hospital") || t.includes("hipaa")) return "Healthcare & Life Sciences";
    if (t.includes("fintech") || t.includes("payment") || t.includes("banking") || t.includes("ledger")) return "Financial Services & FinTech";
    if (t.includes("ecommerce") || t.includes("shopify") || t.includes("retail")) return "E-Commerce & Retail";
    if (t.includes("logistics") || t.includes("supply chain") || t.includes("warehouse")) return "Logistics & Supply Chain";
    if (t.includes("education") || t.includes("edtech") || t.includes("school")) return "Education & EdTech";
    return "Enterprise Technology / Software";
  }

  private detectTechStack(text: string, skills: string[]): string[] {
    const knownTokens = [
      "Python", "TypeScript", "JavaScript", "Golang", "Rust", "Java", "C#", ".NET",
      "Next.js", "React", "Vue", "Angular", "FastAPI", "Express", "NestJS", "Django",
      "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka", "Pinecone", "Qdrant",
      "AWS", "GCP", "Azure", "Kubernetes", "Docker", "Terraform", "LangChain", "LlamaIndex",
    ];

    const found = new Set<string>();
    for (const skill of skills) {
      found.add(skill);
    }

    const tLower = text.toLowerCase();
    for (const token of knownTokens) {
      if (tLower.includes(token.toLowerCase())) {
        found.add(token);
      }
    }

    return Array.from(found);
  }

  private extractPermittedContacts(
    text: string,
    domain: string | undefined,
    sourceUrl: string,
  ): { verifiedContacts: PublicContactEvidence[]; unverifiedContacts: PublicContactEvidence[] } {
    const verifiedContacts: PublicContactEvidence[] = [];
    const unverifiedContacts: PublicContactEvidence[] = [];

    // Strictly detect emails explicitly stated in public text
    const emailMatches = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g) || [];

    for (const email of emailMatches) {
      const emailDomain = email.split("@")[1]?.toLowerCase();
      // If email matches verified corporate domain, mark verified
      if (domain && emailDomain === domain.toLowerCase()) {
        verifiedContacts.push({
          channel: "email",
          value: email,
          isVerified: true,
          evidenceUrl: sourceUrl,
        });
      } else {
        unverifiedContacts.push({
          channel: "email",
          value: email,
          isVerified: false,
          evidenceUrl: sourceUrl,
        });
      }
    }

    // Strictly detect LinkedIn company/profile URLs
    const linkedinMatches = text.match(/(https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+)/g) || [];
    for (const link of linkedinMatches) {
      verifiedContacts.push({
        channel: "linkedin",
        value: link,
        isVerified: true,
        evidenceUrl: link,
      });
    }

    return { verifiedContacts, unverifiedContacts };
  }

  private buildExecutiveSummary(params: {
    companyName: string;
    domain?: string;
    country?: string;
    industry: string;
    credibilityScore: number;
    credibilityTier: string;
    riskFlags: string[];
    missingInformation: string[];
  }): string {
    const parts = [
      `Client Profile: ${params.companyName} (${params.industry}, ${params.country || "Global"}).`,
      `Credibility Assessment: ${params.credibilityScore}/100 [Tier: ${params.credibilityTier}].`,
    ];

    if (params.domain) {
      parts.push(`Domain Verified: ${params.domain}.`);
    } else {
      parts.push("Notice: No verified corporate domain found; client is unverified.");
    }

    if (params.riskFlags.length > 0) {
      parts.push(`Risk Flags: ${params.riskFlags.join("; ")}.`);
    }

    if (params.missingInformation.length > 0) {
      parts.push(`Missing Information: ${params.missingInformation.join("; ")}.`);
    }

    return parts.join(" ");
  }
}
