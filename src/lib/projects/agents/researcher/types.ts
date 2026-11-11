/**
 * NEXGEN GLOBAL AI — Agent 2: Client Researcher Types & Interfaces
 */

export type CredibilityTier =
  | "verified_enterprise"
  | "established_business"
  | "early_stage_startup"
  | "unverified_individual"
  | "high_risk";

export type PublicContactEvidence = {
  name?: string;
  role?: string;
  title?: string;
  email?: string;
  channel: "email" | "linkedin" | "website" | "github" | "public_directory";
  value: string;
  isVerified: boolean;
  evidenceUrl: string;
};

export type EvidenceItem = {
  fact: string;
  sourceUrl: string;
  verifiedAt: Date;
};

export type ResearchedClientProfile = {
  companyName: string;
  legalEntityName?: string;
  domain?: string;
  websiteUrl?: string;
  industry: string;
  country?: string;
  region?: string;
  companySize?: "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";
  estimatedRevenueRange?: string;
  techStackDetected: string[];
  credibilityScore: number; // 0 - 100
  credibilityTier: CredibilityTier;
  evidenceUrls: EvidenceItem[];
  verifiedContacts: PublicContactEvidence[];
  unverifiedContacts: PublicContactEvidence[];
  riskFlags: string[];
  missingInformation: string[];
  isVerified: boolean;
  researchSummary: string;
  researchedAt: Date;
};
