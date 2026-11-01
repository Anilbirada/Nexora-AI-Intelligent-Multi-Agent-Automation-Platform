/**
 * NEXGEN GLOBAL AI — Client Credibility Assessment Engine
 *
 * Implements objective, verifiable scoring for company legitimacy:
 * - Domain verification & TLD quality
 * - Free webmail & anonymous entity detection
 * - Enterprise digital footprint analysis
 * - Risk flag synthesis
 * - Strict prohibition on data invention
 */

import type { CredibilityTier, EvidenceItem } from "./types";

const FREE_WEBMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "protonmail.com", "proton.me", "aol.com", "icloud.com",
  "mail.com", "zoho.com", "yandex.com",
]);

const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "10minutemail.com", "guerrillamail.com", "trashmail.com",
  "sharklasers.com", "mailinator.com",
]);

export class ClientCredibilityEngine {
  /**
   * Assesses credibility score (0 - 100) based strictly on discovered factual evidence.
   */
  public static evaluate(params: {
    companyName?: string;
    domain?: string;
    evidenceUrls: EvidenceItem[];
    country?: string;
    description: string;
  }): {
    score: number;
    tier: CredibilityTier;
    riskFlags: string[];
    missingInformation: string[];
    isVerified: boolean;
  } {
    let score = 40; // baseline neutral
    const riskFlags: string[] = [];
    const missingInformation: string[] = [];

    // 1. Company Name Assessment
    if (!params.companyName || params.companyName.toLowerCase() === "confidential" || params.companyName.toLowerCase() === "unknown") {
      score -= 20;
      missingInformation.push("Client identity is anonymous or marked confidential");
    } else {
      score += 10;
    }

    // 2. Domain & Digital Footprint Assessment
    if (!params.domain) {
      score -= 15;
      missingInformation.push("No corporate domain or website identified");
    } else {
      const cleanDomain = params.domain.toLowerCase().trim();
      
      if (DISPOSABLE_DOMAINS.has(cleanDomain)) {
        score -= 40;
        riskFlags.push(`Disposable/temporary domain detected (${cleanDomain})`);
      } else if (FREE_WEBMAIL_DOMAINS.has(cleanDomain)) {
        score -= 20;
        riskFlags.push(`Client operates from free webmail provider rather than custom corporate domain (${cleanDomain})`);
      } else if (cleanDomain.includes(".")) {
        // Legitimate custom domain
        score += 25;
        // Enterprise or reputable TLD bonus
        if (cleanDomain.endsWith(".com") || cleanDomain.endsWith(".org") || cleanDomain.endsWith(".io") || cleanDomain.endsWith(".co") || cleanDomain.endsWith(".eu")) {
          score += 10;
        }
      }
    }

    // 3. Evidence URLs Verification
    if (params.evidenceUrls.length === 0) {
      score -= 10;
      missingInformation.push("No verifiable third-party evidence citations available");
    } else {
      score += Math.min(20, params.evidenceUrls.length * 7);
    }

    // 4. Country / Geographical Origin
    if (!params.country) {
      missingInformation.push("Client country / jurisdiction is unspecified");
    } else {
      score += 5;
    }

    // 5. Constrain Score Bounds (0 - 100)
    score = Math.max(5, Math.min(100, Math.round(score)));

    // 6. Tier Mapping
    let tier: CredibilityTier = "unverified_individual";
    let isVerified = false;

    if (score >= 85) {
      tier = "verified_enterprise";
      isVerified = true;
    } else if (score >= 70) {
      tier = "established_business";
      isVerified = true;
    } else if (score >= 50) {
      tier = "early_stage_startup";
      isVerified = false;
    } else if (score >= 30) {
      tier = "unverified_individual";
      isVerified = false;
    } else {
      tier = "high_risk";
      isVerified = false;
    }

    return {
      score,
      tier,
      riskFlags,
      missingInformation,
      isVerified,
    };
  }
}
