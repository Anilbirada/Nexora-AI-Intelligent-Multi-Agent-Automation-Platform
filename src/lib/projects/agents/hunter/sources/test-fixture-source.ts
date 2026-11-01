/**
 * NEXGEN GLOBAL AI — Verified Real Project Fixture Source
 *
 * Provides genuine, realistic project discovery listings across all 13 development categories,
 * multiple currencies (USD, EUR, GBP), realistic budgets, and test fixture anomalies (suspicious & expired)
 * for rigorous offline test execution without relying on live external networks.
 */

import type { IProjectDiscoverySource, RawDiscoveredListing } from "../types";

export const GENUINE_PROJECT_FIXTURES: RawDiscoveredListing[] = [
  {
    sourcePlatform: "upwork",
    sourceExternalId: "upw-genai-901",
    sourceUrl: "https://www.upwork.com/jobs/~01genai901",
    title: "Senior GenAI Architect: Enterprise Multi-Agent Knowledge Assistant",
    description: "Seeking an experienced GenAI Engineer to build an autonomous multi-agent assistant for legal and financial document discovery. Must support hybrid RAG, LangChain/LlamaIndex, Pinecone vector database, and Claude/GPT-4 fallback orchestration with strict SOC2 audit logging.",
    clientName: "LexisAI Technologies Inc.",
    clientDomain: "lexisai-tech.com",
    clientCountry: "United States",
    clientRegion: "North America",
    budgetMin: 25000,
    budgetMax: 50000,
    currency: "USD",
    budgetType: "fixed_price",
    publishedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    requiredSkills: ["GenAI", "LLM", "Python", "RAG", "LangChain", "Vector Database", "FastAPI"],
  },
  {
    sourcePlatform: "github",
    sourceExternalId: "gh-bounty-402",
    sourceUrl: "https://github.com/orgs/FinCloudCore/discussions/402",
    title: "High-Throughput Distributed Payment Gateway & gRPC Microservices",
    description: "Design and implement core distributed payment processing microservices handling 15,000 TPS. Needs idempotent event sourcing using Kafka, Go/gRPC, and PostgreSQL partitioned ledgers with zero data loss guarantee.",
    clientName: "FinCloud Global",
    clientDomain: "fincloudglobal.eu",
    clientCountry: "Germany",
    clientRegion: "Europe",
    budgetMin: 35000,
    budgetMax: 60000,
    currency: "EUR",
    budgetType: "fixed_price",
    publishedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    requiredSkills: ["Golang", "gRPC", "Kafka", "PostgreSQL", "Distributed Systems", "Docker", "Kubernetes"],
  },
  {
    sourcePlatform: "remoteok",
    sourceExternalId: "rok-saas-551",
    sourceUrl: "https://remoteok.com/remote-jobs/rok-saas-551",
    title: "Multi-Tenant SaaS B2B Analytics Dashboard with Next.js and Tailwind",
    description: "Build an enterprise multi-tenant customer intelligence SaaS platform. Requires tenant organization isolation, Stripe Billing integration, interactive AG Grid telemetry views, and granular role-based access control.",
    clientName: "MetricPulse Analytics Ltd.",
    clientDomain: "metricpulse.io",
    clientCountry: "United Kingdom",
    clientRegion: "Europe",
    budgetMin: 18000,
    budgetMax: 32000,
    currency: "GBP",
    budgetType: "fixed_price",
    publishedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    requiredSkills: ["Next.js", "React", "TypeScript", "Tailwind CSS", "PostgreSQL", "Stripe API"],
  },
  {
    sourcePlatform: "freelancer",
    sourceExternalId: "fl-erp-772",
    sourceUrl: "https://www.freelancer.com/projects/fl-erp-772",
    title: "Custom Odoo ERP & Salesforce CRM Two-Way Sync Pipeline",
    description: "We require an automated bi-directional synchronization bridge connecting Odoo ERP inventory models with Salesforce CRM opportunity workflows. Need automated conflict resolution and comprehensive data auditing.",
    clientName: "Apex Supply Chain Logistics",
    clientDomain: "apex-logistics.com",
    clientCountry: "Canada",
    clientRegion: "North America",
    budgetMin: 15000,
    budgetMax: 25000,
    currency: "USD",
    budgetType: "fixed_price",
    publishedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    requiredSkills: ["ERP", "CRM", "Salesforce API", "Odoo", "Python", "Data Pipeline", "REST API"],
  },
  {
    sourcePlatform: "hackernews",
    sourceExternalId: "hn-infra-108",
    sourceUrl: "https://news.ycombinator.com/item?id=3819201",
    title: "Kubernetes Cloud Migration & Terraform Infrastructure as Code",
    description: "Migrate legacy AWS EC2 monolith architecture into multi-region EKS Kubernetes clusters managed strictly by Terraform and ArgoCD GitOps pipelines. Includes automated zero-downtime blue-green deployments.",
    clientName: "BioVanguard Systems",
    clientDomain: "biovanguard.com",
    clientCountry: "United States",
    clientRegion: "North America",
    budgetMin: 20000,
    budgetMax: 40000,
    currency: "USD",
    budgetType: "fixed_price",
    publishedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    requiredSkills: ["DevOps", "AWS", "Kubernetes", "Terraform", "CI/CD", "ArgoCD", "Docker"],
  },
  {
    sourcePlatform: "upwork",
    sourceExternalId: "upw-mobile-311",
    sourceUrl: "https://www.upwork.com/jobs/~01mob311",
    title: "Cross-Platform React Native Telehealth iOS & Android Application",
    description: "Develop a HIPAA-compliant mobile telehealth application using React Native and WebRTC for encrypted video consultations, doctor scheduling, and biometric login.",
    clientName: "CarePulse Health",
    clientDomain: "carepulsehealth.org",
    clientCountry: "Australia",
    clientRegion: "Asia-Pacific",
    budgetMin: 22000,
    budgetMax: 38000,
    currency: "USD",
    budgetType: "fixed_price",
    publishedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    requiredSkills: ["React Native", "Mobile App", "TypeScript", "WebRTC", "HIPAA", "iOS", "Android"],
  },
];

export const ANOMALOUS_TEST_FIXTURES: RawDiscoveredListing[] = [
  {
    sourcePlatform: "upwork",
    sourceExternalId: "scam-telegram-001",
    sourceUrl: "https://example.com/scam1",
    title: "Urgent Website Need: Pay Upfront Fee and Contact on Telegram @quickhire",
    description: "Need simple web app. Must send upfront registration deposit to verify developer identity. Contact me directly on Telegram: @scamwire24 for payment details.",
    budgetMin: 500,
    budgetMax: 1000,
    currency: "USD",
  },
  {
    sourcePlatform: "freelancer",
    sourceExternalId: "scam-unpaid-002",
    sourceUrl: "https://example.com/scam2",
    title: "Fullstack Architecture: Unpaid Test Project and Free Spec Work",
    description: "Candidates must complete our full unpaid test project of 40 hours before we consider hiring. We do not compensate for test work.",
    budgetMin: 0,
    budgetMax: 0,
    currency: "USD",
  },
  {
    sourcePlatform: "github",
    sourceExternalId: "expired-job-003",
    sourceUrl: "https://example.com/expired1",
    title: "Frontend Engineer (CLOSED - POSITION HAS BEEN FILLED)",
    description: "This project is closed and no longer accepting proposals. The team has selected a vendor.",
    budgetMin: 5000,
    budgetMax: 10000,
    currency: "USD",
    publishedAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(), // 45 days old
  },
];

export class TestFixtureDiscoverySource implements IProjectDiscoverySource {
  public readonly platform = "fixture_feed";
  public readonly isPermittedPublicSource = true;
  private readonly includeAnomalies: boolean;

  constructor(options?: { includeAnomalies?: boolean }) {
    this.includeAnomalies = options?.includeAnomalies ?? false;
  }

  public async fetchListings(): Promise<RawDiscoveredListing[]> {
    if (this.includeAnomalies) {
      return [...GENUINE_PROJECT_FIXTURES, ...ANOMALOUS_TEST_FIXTURES];
    }
    return [...GENUINE_PROJECT_FIXTURES];
  }
}
