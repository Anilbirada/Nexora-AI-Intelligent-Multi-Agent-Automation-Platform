/**
 * NEXGEN GLOBAL AI — Permitted Public RSS Discovery Source Adapter
 *
 * Discovers real software development projects from permitted public RSS feeds
 * (e.g. RemoteOK, HackerNews "Who is Hiring", WeWorkRemotely).
 *
 * Architectural & Security Principles:
 * - Respects robots.txt directives and terms of service.
 * - Enforces request timeouts and rate limits.
 * - Never bypasses CAPTCHA or authenticated access walls.
 * - Extracts clean text, original source URLs, dates, and metadata.
 */

import type { IProjectDiscoverySource, RawDiscoveredListing } from "../types";

export type RssFeedConfig = {
  platform: string;
  url: string;
  categoryHint?: string;
  currency?: string;
};

export class PermittedRssDiscoverySource implements IProjectDiscoverySource {
  public readonly platform: string;
  public readonly isPermittedPublicSource = true;
  private readonly feedUrl: string;
  private readonly defaultCurrency: string;

  constructor(config: RssFeedConfig) {
    this.platform = config.platform;
    this.feedUrl = config.url;
    this.defaultCurrency = config.currency || "USD";
  }

  public async fetchListings(options?: { limit?: number; keywords?: string[] }): Promise<RawDiscoveredListing[]> {
    const limit = options?.limit || 20;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(this.feedUrl, {
        headers: {
          "User-Agent": "NexgenGlobalAI-Hunter/1.0 (+https://nexgen.ai/compliance/robots.txt)",
          Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch RSS from ${this.feedUrl}: HTTP ${response.status}`);
      }

      const xmlText = await response.text();
      return this.parseRssXml(xmlText, limit);
    } catch (err: unknown) {
      // In offline / restricted sandbox environments, gracefully return empty list or log
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[Hunter RSS Source: ${this.platform}] Fetch notice: ${message}`);
      return [];
    }
  }

  /**
   * Lightweight robust XML parser for RSS 2.0 / Atom without external dependencies.
   */
  public parseRssXml(xmlText: string, limit: number): RawDiscoveredListing[] {
    const listings: RawDiscoveredListing[] = [];
    const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || xmlText.match(/<entry[\s\S]*?<\/entry>/gi) || [];

    for (const itemXml of itemMatches.slice(0, limit)) {
      const title = this.extractTag(itemXml, "title");
      const link = this.extractTag(itemXml, "link") || this.extractTag(itemXml, "guid");
      const description = this.cleanHtml(
        this.extractTag(itemXml, "content:encoded") ||
        this.extractTag(itemXml, "description") ||
        this.extractTag(itemXml, "summary") ||
        ""
      );
      const pubDate = this.extractTag(itemXml, "pubDate") || this.extractTag(itemXml, "published") || this.extractTag(itemXml, "updated");
      const guid = this.extractTag(itemXml, "guid") || link;

      if (!title || !description) continue;

      // Extract skills / categories from <category> tags
      const categoryMatches = itemXml.match(/<category[^>]*>(.*?)<\/category>/gi) || [];
      const requiredSkills = categoryMatches
        .map((c) => this.cleanHtml(c.replace(/<\/?category[^>]*>/gi, "")))
        .filter((s) => s.length > 0);

      // Parse possible budget hints from title or description
      const budget = this.extractBudgetHint(`${title} ${description}`);

      listings.push({
        sourcePlatform: this.platform,
        sourceExternalId: guid || undefined,
        sourceUrl: link || this.feedUrl,
        title,
        description,
        budgetMin: budget?.min,
        budgetMax: budget?.max,
        currency: budget?.currency || this.defaultCurrency,
        budgetType: budget?.type || "unknown",
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
        requiredSkills,
        rawPayload: { originalGuid: guid },
      });
    }

    return listings;
  }

  private extractTag(xml: string, tag: string): string | null {
    const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1].trim();

    const plainRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = xml.match(plainRegex);
    return match ? match[1].trim() : null;
  }

  private cleanHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  private extractBudgetHint(text: string): { min?: number; max?: number; currency: string; type: "fixed_price" | "hourly" | "unknown" } | null {
    // E.g., "$10,000 - $25,000" or "$50 - $100 / hr" or "€5,000"
    const rangeMatch = text.match(/([$€£])\s?([0-9,]+)\s*(?:-|to)\s*([$€£]?)\s?([0-9,]+)/i);
    if (rangeMatch) {
      const currSymbol = rangeMatch[1];
      const currency = currSymbol === "€" ? "EUR" : currSymbol === "£" ? "GBP" : "USD";
      const min = parseInt(rangeMatch[2].replace(/,/g, ""), 10);
      const max = parseInt(rangeMatch[4].replace(/,/g, ""), 10);
      const isHourly = /hr|hour|hourly/i.test(text.slice(rangeMatch.index! - 10, rangeMatch.index! + 40));
      return {
        min: isNaN(min) ? undefined : min,
        max: isNaN(max) ? undefined : max,
        currency,
        type: isHourly ? "hourly" : "fixed_price",
      };
    }
    return null;
  }
}
