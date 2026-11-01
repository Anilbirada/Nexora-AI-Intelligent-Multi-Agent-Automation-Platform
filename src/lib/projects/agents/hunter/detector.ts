/**
 * NEXGEN GLOBAL AI — Hunter Detector Engine
 *
 * Implements detection for:
 * 1. Category and subcategory classification across 13 target domains.
 * 2. Suspicious / scam pattern detection (strict no-scam policy).
 * 3. Stale and expired listing detection.
 * 4. Content fingerprinting for deduplication.
 */

import { createHash } from "node:crypto";
import type {
  HunterFilterVerdict,
  ProjectDomainCategory,
  RawDiscoveredListing,
} from "./types";

// ── 1. Category Classification Mapping ───────────────────────────────────────

const CATEGORY_KEYWORDS: Record<ProjectDomainCategory, string[]> = {
  genai: [
    "genai", "generative ai", "llm", "large language model", "rag", "langchain",
    "llamaindex", "fine-tuning", "prompt engineering", "claude", "gpt-4", "agentic",
    "ai agent", "vector database", "pinecone", "qdrant", "weaviate", "ollama",
  ],
  ai_machine_learning: [
    "ai", "machine learning", "deep learning", "pytorch", "tensorflow", "computer vision",
    "nlp", "natural language processing", "data science", "neural network", "huggingface",
    "xgboost", "predictive model", "opencv", "whisper",
  ],
  saas: [
    "saas", "software as a service", "multi-tenant", "b2b platform", "subscription billing",
    "stripe integration", "tenant isolation", "customer portal", "membership platform",
  ],
  erp_crm: [
    "erp", "crm", "sap", "salesforce", "odoo", "hubspot", "netsuite", "inventory management",
    "supply chain", "enterprise resource", "custom crm", "zoho", "pipeline tracking",
  ],
  automation: [
    "automation", "workflow automation", "n8n", "zapier", "make.com", "robotic process automation",
    "rpa", "playwright", "puppeteer", "selenium", "web scraping", "browser automation", "etl pipeline",
  ],
  data_engineering: [
    "data engineering", "snowflake", "bigquery", "databricks", "apache spark", "kafka",
    "airflow", "dbt", "data warehouse", "lakehouse", "etl", "data pipeline", "postgres analytics",
  ],
  software_consulting: [
    "software consulting", "code audit", "architecture review", "system design", "advisory",
    "fractional cto", "technical due diligence", "migration strategy", "performance audit",
  ],
  cloud_devops: [
    "devops", "cloud", "aws", "gcp", "azure", "kubernetes", "k8s", "docker", "terraform",
    "ci/cd", "github actions", "infrastructure as code", "ansible", "helm", "serverless",
  ],
  api_backend: [
    "backend", "api", "rest api", "graphql", "grpc", "microservices", "fastapi", "express",
    "nestjs", "django", "spring boot", "golang", "rust", "database optimization",
  ],
  web_development: [
    "web development", "react", "next.js", "nextjs", "vue", "nuxt", "svelte", "typescript",
    "tailwind", "frontend", "full stack", "fullstack", "responsive web",
  ],
  mobile_development: [
    "mobile app", "react native", "flutter", "ios", "swift", "android", "kotlin",
    "mobile development", "expo", "app store", "play store",
  ],
  blockchain_web3: [
    "blockchain", "smart contract", "solidity", "web3", "ethereum", "evm", "defi",
  ],
  cybersecurity: [
    "cybersecurity", "security audit", "penetration testing", "vulnerability assessment",
    "soc2", "hipaa compliance", "iam", "auth0", "oauth2",
  ],
};

// ── 2. Suspicious & Scam Detection Patterns ───────────────────────────────────

const SUSPICIOUS_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  {
    regex: /(?:pay|send)\s+(?:upfront|activation|deposit|registration)\s+fee/i,
    reason: "Requires upfront fee from developer (advance-fee fraud pattern)",
  },
  {
    regex: /telegram\s*:\s*@|contact\s+(?:on|via)\s+telegram/i,
    reason: "Demands unverified Telegram communication to evade platform escrow",
  },
  {
    regex: /(?:cashier'?s?\s*check|wire\s*transfer\s*overpayment|western\s*union|moneygram)/i,
    reason: "Suspicious off-platform payment instruments or overpayment scam",
  },
  {
    regex: /(?:free\s+trial\s+work|unpaid\s+test\s+(?:task|project|assignment)|spec\s+work\s+only)/i,
    reason: "Exploitative unpaid spec work / uncompensated labour request",
  },
  {
    regex: /(?:whatsapp\s*(?:me|only)\s*at\s*[\+\d\s\-]{7,}|dm\s+my\s+whatsapp\s+first)/i,
    reason: "Suspicious off-platform WhatsApp diversion bypassing contractual escrow",
  },
  {
    regex: /(?:crypto\s+investment|earn\s+\$?\d+k\s+daily|guaranteed\s+passive\s+income|mlm)/i,
    reason: "Get-rich-quick / crypto phishing scheme masquerading as engineering project",
  },
];

// ── 3. Expired & Stale Detection Rules ────────────────────────────────────────

const EXPIRED_KEYWORD_PATTERNS = [
  /\b(?:closed|filled|expired|cancelled|archived|no longer accepting)\b/i,
  /\b(?:position has been closed|project is closed|offer expired)\b/i,
];

export class HunterDetector {
  /**
   * Generates a stable cryptographic fingerprint for deduplicating listings across sources.
   */
  public static computeContentHash(
    sourcePlatform: string,
    sourceExternalId: string | undefined,
    title: string,
    description: string,
  ): string {
    const normPlatform = sourcePlatform.toLowerCase().trim();
    const normExtId = (sourceExternalId || "").toLowerCase().trim();
    const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
    // Use first 150 characters of description to match similar listings
    const normSnippet = description.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 150);

    const raw = `${normPlatform}:${normExtId}:${normTitle}:${normSnippet}`;
    return createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Classifies listing text into domain categories with match confidence.
   */
  public static classifyCategories(
    title: string,
    description: string,
    skills: string[] = [],
  ): { primary: ProjectDomainCategory; subcategories: string[]; confidence: number } {
    const combined = `${title} ${description} ${skills.join(" ")}`.toLowerCase();
    const scores: Record<ProjectDomainCategory, number> = {
      ai_machine_learning: 0,
      genai: 0,
      web_development: 0,
      mobile_development: 0,
      saas: 0,
      erp_crm: 0,
      api_backend: 0,
      cloud_devops: 0,
      automation: 0,
      data_engineering: 0,
      software_consulting: 0,
      blockchain_web3: 0,
      cybersecurity: 0,
    };

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [ProjectDomainCategory, string[]][]) {
      for (const kw of keywords) {
        if (combined.includes(kw)) {
          scores[category] += title.toLowerCase().includes(kw) ? 3 : 1;
        }
      }
    }

    // Rank categories
    const sorted = (Object.entries(scores) as [ProjectDomainCategory, number][])
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      return {
        primary: "web_development", // default fallback
        subcategories: [],
        confidence: 0.5,
      };
    }

    const primary = sorted[0][0];
    const topScore = sorted[0][1];
    const subcategories = sorted.slice(1, 4).map(([cat]) => cat);
    const confidence = Math.min(0.95, 0.5 + topScore * 0.08);

    return { primary, subcategories, confidence };
  }

  /**
   * Inspects listing for scam patterns, upfront fees, off-platform diversions.
   */
  public static detectSuspicious(listing: RawDiscoveredListing): HunterFilterVerdict {
    const text = `${listing.title} ${listing.description}`;
    const flags: string[] = [];

    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.regex.test(text)) {
        flags.push(pattern.reason);
      }
    }

    // Abnormal budget check: negative budget or absurdly disproportionate
    if (listing.budgetMin !== undefined && listing.budgetMin < 0) {
      flags.push("Negative budget bound is invalid");
    }
    if (
      listing.budgetMin !== undefined &&
      listing.budgetMax !== undefined &&
      listing.budgetMin > listing.budgetMax
    ) {
      flags.push("Minimum budget exceeds maximum budget");
    }

    // Meaningless title or description check
    if (listing.title.trim().length < 5) {
      flags.push("Title is excessively short or vacuous");
    }
    if (listing.description.trim().length < 15) {
      flags.push("Description lacks substantial project specifications");
    }

    if (flags.length > 0) {
      return {
        isAcceptable: false,
        rejectionReason: "suspicious",
        rejectionDetails: flags.join("; "),
        confidenceScore: 0.95,
        flags,
      };
    }

    return {
      isAcceptable: true,
      confidenceScore: 0.9,
      flags: [],
    };
  }

  /**
   * Determines if a project listing is stale or expired.
   */
  public static detectExpired(listing: RawDiscoveredListing, maxAgeDays = 30): HunterFilterVerdict {
    const text = `${listing.title} ${listing.description}`;
    const flags: string[] = [];

    // Keyword detection
    for (const pattern of EXPIRED_KEYWORD_PATTERNS) {
      if (pattern.test(text)) {
        flags.push("Listing content indicates project is closed, filled, or cancelled");
        break;
      }
    }

    // Past deadline check
    if (listing.deadline) {
      const deadlineDate = new Date(listing.deadline);
      if (!isNaN(deadlineDate.getTime()) && deadlineDate.getTime() < Date.now()) {
        flags.push(`Deadline passed on ${deadlineDate.toISOString().split("T")[0]}`);
      }
    }

    // Stale age check
    if (listing.publishedAt) {
      const publishedDate = new Date(listing.publishedAt);
      if (!isNaN(publishedDate.getTime())) {
        const ageDays = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays > maxAgeDays) {
          flags.push(`Listing was published ${Math.floor(ageDays)} days ago (exceeds ${maxAgeDays}-day freshness window)`);
        }
      }
    }

    if (flags.length > 0) {
      return {
        isAcceptable: false,
        rejectionReason: "expired",
        rejectionDetails: flags.join("; "),
        confidenceScore: 0.9,
        flags,
      };
    }

    return {
      isAcceptable: true,
      confidenceScore: 0.9,
      flags: [],
    };
  }
}
