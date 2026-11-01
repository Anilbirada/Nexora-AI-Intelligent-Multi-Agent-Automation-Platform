/**
 * NEXGEN GLOBAL AI — Agent 1: Global Project Hunter Types & Interfaces
 */

export type ProjectDomainCategory =
  | "ai_machine_learning"
  | "genai"
  | "web_development"
  | "mobile_development"
  | "saas"
  | "erp_crm"
  | "api_backend"
  | "cloud_devops"
  | "automation"
  | "data_engineering"
  | "software_consulting"
  | "blockchain_web3"
  | "cybersecurity";

export type RawDiscoveredListing = {
  sourcePlatform: string;
  sourceExternalId?: string;
  sourceUrl: string;
  title: string;
  description: string;
  clientName?: string;
  clientCountry?: string;
  clientRegion?: string;
  clientDomain?: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetType?: "fixed_price" | "hourly" | "retainer" | "unknown";
  currency?: string;
  deadline?: Date | string;
  publishedAt?: Date | string;
  requiredSkills?: string[];
  rawPayload?: Record<string, unknown>;
};

export type HunterFilterVerdict = {
  isAcceptable: boolean;
  rejectionReason?: "duplicate" | "expired" | "suspicious" | "unsupported_scope" | "missing_requirements";
  rejectionDetails?: string;
  confidenceScore: number;
  flags: string[];
};

export type SourceReliabilityMetric = {
  platform: string;
  totalFetched: number;
  validProjects: number;
  duplicatesBlocked: number;
  suspiciousBlocked: number;
  expiredBlocked: number;
  reliabilityScore: number; // 0.0 - 1.0
  lastFetchedAt: Date;
};

export interface IProjectDiscoverySource {
  readonly platform: string;
  readonly isPermittedPublicSource: boolean;
  fetchListings(options?: { limit?: number; keywords?: string[] }): Promise<RawDiscoveredListing[]>;
}
