/**
 * NEXGEN GLOBAL AI — Agent 1: Global Project Hunter
 *
 * Responsibilities:
 * - Discover genuine software development opportunities worldwide.
 * - Support AI/ML, GenAI, Web, Mobile, SaaS, ERP, CRM, API, Cloud, DevOps, Automation, Data Engineering, Consulting.
 * - Multi-currency (USD, EUR, GBP, AUD, etc.) & multi-country detection.
 * - Deduplication via content hash & external platform IDs.
 * - Scam, suspicious listing & expired post rejection.
 * - Source reliability telemetry tracking.
 * - Strict adherence to website policies & zero data fabrication.
 */

import { HunterDetector } from "./detector";
import type {
  IProjectDiscoverySource,
  ProjectDomainCategory,
  RawDiscoveredListing,
  SourceReliabilityMetric,
} from "./types";

export type QualifiedHunterProject = {
  contentHash: string;
  sourcePlatform: string;
  sourceExternalId?: string;
  sourceUrl: string;
  title: string;
  description: string;
  primaryCategory: ProjectDomainCategory;
  subcategories: string[];
  clientName?: string;
  clientDomain?: string;
  clientCountry?: string;
  clientRegion?: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetType: "fixed_price" | "hourly" | "retainer" | "unknown";
  currency: string;
  requiredSkills: string[];
  discoveryDate: Date;
  deadline?: Date;
  classificationConfidence: number;
};

export type HunterPipelineResult = {
  totalDiscovered: number;
  qualifiedProjects: QualifiedHunterProject[];
  duplicatesFiltered: number;
  suspiciousFiltered: number;
  expiredFiltered: number;
  sourceReliability: Record<string, SourceReliabilityMetric>;
};

export class GlobalProjectHunter {
  private readonly sources: IProjectDiscoverySource[];
  private readonly knownFingerprints = new Set<string>();
  private readonly sourceMetrics: Map<string, SourceReliabilityMetric> = new Map();

  constructor(sources: IProjectDiscoverySource[] = []) {
    this.sources = sources;
  }

  public registerSource(source: IProjectDiscoverySource): void {
    this.sources.push(source);
  }

  /**
   * Prime deduplication cache with existing hashes from database.
   */
  public seedKnownFingerprints(fingerprints: string[]): void {
    for (const fp of fingerprints) {
      this.knownFingerprints.add(fp);
    }
  }

  /**
   * Executes discovery across all registered permitted sources.
   */
  public async executeDiscovery(options?: {
    limitPerSource?: number;
    keywords?: string[];
  }): Promise<HunterPipelineResult> {
    const qualified: QualifiedHunterProject[] = [];
    let totalDiscovered = 0;
    let duplicatesFiltered = 0;
    let suspiciousFiltered = 0;
    let expiredFiltered = 0;

    for (const source of this.sources) {
      const metric = this.getOrCreateMetric(source.platform);

      try {
        const rawListings = await source.fetchListings(options);
        metric.totalFetched += rawListings.length;
        metric.lastFetchedAt = new Date();
        totalDiscovered += rawListings.length;

        for (const listing of rawListings) {
          // 1. Content Hash & Deduplication Check
          const contentHash = HunterDetector.computeContentHash(
            listing.sourcePlatform,
            listing.sourceExternalId,
            listing.title,
            listing.description,
          );

          if (this.knownFingerprints.has(contentHash)) {
            duplicatesFiltered++;
            metric.duplicatesBlocked++;
            continue;
          }

          // 2. Suspicious & Scam Detection Check
          const suspiciousVerdict = HunterDetector.detectSuspicious(listing);
          if (!suspiciousVerdict.isAcceptable) {
            suspiciousFiltered++;
            metric.suspiciousBlocked++;
            continue;
          }

          // 3. Expired & Stale Check
          const expiredVerdict = HunterDetector.detectExpired(listing);
          if (!expiredVerdict.isAcceptable) {
            expiredFiltered++;
            metric.expiredBlocked++;
            continue;
          }

          // 4. Category Classification
          const classification = HunterDetector.classifyCategories(
            listing.title,
            listing.description,
            listing.requiredSkills,
          );

          // 5. Ingestion to Qualified Output
          const project: QualifiedHunterProject = {
            contentHash,
            sourcePlatform: listing.sourcePlatform,
            sourceExternalId: listing.sourceExternalId,
            sourceUrl: listing.sourceUrl,
            title: listing.title.trim(),
            description: listing.description.trim(),
            primaryCategory: classification.primary,
            subcategories: classification.subcategories,
            clientName: listing.clientName?.trim() || undefined,
            clientDomain: listing.clientDomain?.trim().toLowerCase() || undefined,
            clientCountry: listing.clientCountry || undefined,
            clientRegion: listing.clientRegion || undefined,
            budgetMin: listing.budgetMin,
            budgetMax: listing.budgetMax,
            budgetType: listing.budgetType || "unknown",
            currency: listing.currency || "USD",
            requiredSkills: listing.requiredSkills || [],
            discoveryDate: new Date(),
            deadline: listing.deadline ? new Date(listing.deadline) : undefined,
            classificationConfidence: classification.confidence,
          };

          this.knownFingerprints.add(contentHash);
          qualified.push(project);
          metric.validProjects++;
        }
      } catch (err) {
        console.error(`[Global Project Hunter] Error executing source ${source.platform}:`, err);
      }

      this.updateReliabilityScore(metric);
    }

    const reliabilityRecord: Record<string, SourceReliabilityMetric> = {};
    this.sourceMetrics.forEach((v, k) => {
      reliabilityRecord[k] = { ...v };
    });

    return {
      totalDiscovered,
      qualifiedProjects: qualified,
      duplicatesFiltered,
      suspiciousFiltered,
      expiredFiltered,
      sourceReliability: reliabilityRecord,
    };
  }

  private getOrCreateMetric(platform: string): SourceReliabilityMetric {
    let metric = this.sourceMetrics.get(platform);
    if (!metric) {
      metric = {
        platform,
        totalFetched: 0,
        validProjects: 0,
        duplicatesBlocked: 0,
        suspiciousBlocked: 0,
        expiredBlocked: 0,
        reliabilityScore: 1.0,
        lastFetchedAt: new Date(),
      };
      this.sourceMetrics.set(platform, metric);
    }
    return metric;
  }

  private updateReliabilityScore(metric: SourceReliabilityMetric): void {
    if (metric.totalFetched === 0) return;
    // Penalize heavily for suspicious scam listings; slightly for expired
    const validWeight = metric.validProjects * 1.0;
    const suspiciousPenalty = metric.suspiciousBlocked * 3.0;
    const expiredPenalty = metric.expiredBlocked * 0.5;

    const netScore = Math.max(0, validWeight - suspiciousPenalty - expiredPenalty) / metric.totalFetched;
    metric.reliabilityScore = Math.round(Math.min(1.0, Math.max(0.1, netScore)) * 100) / 100;
  }
}
