/**
 * NEXGEN GLOBAL AI — Agent 3: Project Analyzer
 *
 * Responsibilities:
 * 1. Analyze project titles and descriptions with natural language inspection.
 * 2. Extract business, functional, and non-functional requirements.
 * 3. Identify missing requirements and ambiguities.
 * 4. Determine technical complexity (low, medium, high, enterprise).
 * 5. Recommend software architecture and system blueprints.
 * 6. Recommend optimal modern tech stack and infrastructure.
 * 7. Estimate development duration without presenting as confirmed commitments.
 * 8. Formulate delivery milestones and technical risk mitigations.
 * 9. Produce comprehensive StructuredProjectAnalysis.
 */

import type { QualifiedHunterProject } from "../hunter/hunter";
import type { ResearchedClientProfile } from "../researcher/types";
import type {
  ArchitecturePattern,
  DeliveryRisk,
  EstimatedDuration,
  ProjectMilestone,
  RecommendedArchitecture,
  StructuredProjectAnalysis,
  TechnicalComplexityLevel,
  TechnologyRecommendations,
} from "./types";

export class ProjectAnalyzer {
  public static readonly DURATION_DISCLAIMER =
    "Estimates are technical discovery projections and must never be presented as confirmed client commitments.";

  /**
   * Conducts in-depth technical analysis on a qualified project opportunity.
   */
  public async analyzeProject(
    project: QualifiedHunterProject,
    clientProfile?: ResearchedClientProfile,
  ): Promise<StructuredProjectAnalysis> {
    const rawText = `${project.title}\n${project.description}`;
    const skills = project.requiredSkills || [];

    // 1. Business Requirements Extraction
    const businessRequirements = this.extractBusinessRequirements(rawText, project.primaryCategory);

    // 2. Functional Requirements Extraction
    const functionalRequirements = this.extractFunctionalRequirements(rawText, skills);

    // 3. Non-Functional Requirements Extraction
    const nonFunctionalRequirements = this.extractNonFunctionalRequirements(rawText);

    // 4. Missing Information Detection
    const missingInformation = this.identifyMissingRequirements(rawText, project);

    // 5. Complexity Assessment
    const complexityLevel = this.assessComplexity(rawText, functionalRequirements, nonFunctionalRequirements);

    // 6. Architecture & Technology Synthesis
    const recommendedArchitecture = this.recommendArchitecture(project.primaryCategory, rawText, complexityLevel);
    const technologyRecommendations = this.recommendTechnologyStack(
      project.primaryCategory,
      rawText,
      skills,
      clientProfile?.techStackDetected || [],
    );

    // 7. Timeline & Duration Estimation
    const estimatedDuration = this.estimateDuration(complexityLevel, functionalRequirements.length);

    // 8. Milestone Breakdown
    const milestones = this.generateMilestones(complexityLevel, estimatedDuration.weeksMax, project.primaryCategory);

    // 9. Delivery Risk Identification
    const risks = this.identifyRisks(rawText, complexityLevel, missingInformation);

    // 10. Confidence Level (Based on specification richness vs missing elements)
    const confidenceLevel = Math.max(
      0.5,
      Math.min(0.95, 0.9 - missingInformation.length * 0.08 + Math.min(0.15, functionalRequirements.length * 0.03)),
    );

    const projectSummary = `Architectural analysis for "${project.title}": ${complexityLevel.toUpperCase()} complexity ${project.primaryCategory.replace(/_/g, " ")} initiative targeting ${recommendedArchitecture.pattern.replace(/_/g, " ")} architecture.`;

    return {
      projectSummary,
      businessRequirements,
      functionalRequirements,
      nonFunctionalRequirements,
      recommendedArchitecture,
      technologyRecommendations,
      complexityLevel,
      estimatedDuration,
      milestones,
      risks,
      missingInformation,
      confidenceLevel: Math.round(confidenceLevel * 100) / 100,
      analyzedAt: new Date(),
    };
  }

  private extractBusinessRequirements(text: string, category: string): string[] {
    const reqs: string[] = [];
    const t = text.toLowerCase();

    if (t.includes("cost") || t.includes("budget") || t.includes("reduce")) {
      reqs.push("Cost optimization and automated resource efficiency");
    }
    if (t.includes("scale") || t.includes("high-throughput") || t.includes("tps")) {
      reqs.push("High-throughput scalability to handle growing enterprise transaction volume");
    }
    if (t.includes("customer") || t.includes("client") || t.includes("user")) {
      reqs.push("Enhanced customer engagement and seamless digital workflow experience");
    }
    if (t.includes("automate") || t.includes("automation") || t.includes("pipeline")) {
      reqs.push("Elimination of manual operational bottlenecks through automated pipelines");
    }
    if (t.includes("compliance") || t.includes("hipaa") || t.includes("soc2") || t.includes("security")) {
      reqs.push("Adherence to strict industry regulatory compliance and auditability standards");
    }

    if (reqs.length === 0) {
      reqs.push(`Modernization and enterprise delivery for ${category.replace(/_/g, " ")} platform`);
    }

    return reqs;
  }

  private extractFunctionalRequirements(text: string, skills: string[]): string[] {
    const sentences = text.split(/[.\n;]+/).map((s) => s.trim()).filter((s) => s.length > 15);
    const funcs: string[] = [];
    const actionRegex = /\b(?:build|develop|create|implement|design|integrate|provide|support|ingest|enable|manage|track|generate|sync)\b/i;

    for (const sentence of sentences) {
      if (actionRegex.test(sentence) && !funcs.includes(sentence)) {
        // Clean and format as a crisp requirement statement
        const cleaned = sentence.replace(/^[-*•\d.]+\s*/, "");
        if (cleaned.length > 20 && cleaned.length < 180) {
          funcs.push(cleaned);
        }
      }
    }

    // Fallbacks if text lacks explicit action verbs
    if (funcs.length === 0) {
      funcs.push(`Core ${skills.slice(0, 3).join(", ") || "software"} service implementation and business logic`);
      funcs.push("User interface and API orchestration endpoints");
      funcs.push("Data persistence, schema migration, and transaction management");
    }

    return funcs.slice(0, 6);
  }

  private extractNonFunctionalRequirements(text: string): string[] {
    const nfrs: string[] = [];
    const t = text.toLowerCase();

    if (t.includes("hipaa")) nfrs.push("HIPAA Compliance: End-to-end encryption for ePHI and immutable audit logging");
    if (t.includes("soc2") || t.includes("soc 2")) nfrs.push("SOC2 Type II: Granular role-based access control (RBAC) and least-privilege security");
    if (t.includes("latency") || t.includes("real-time") || t.includes("webrtc")) nfrs.push("Performance: Sub-200ms latency on real-time interactive pathways");
    if (t.includes("multi-tenant") || t.includes("saas")) nfrs.push("Tenancy: Strict mathematical organization data isolation at the database layer");
    if (t.includes("zero data loss") || t.includes("idempotent") || t.includes("kafka")) nfrs.push("Reliability: Idempotent message processing and guaranteed delivery");

    // Standard non-functional guarantees
    nfrs.push("Security: TLS 1.3 in transit, AES-256 at rest, and secret token isolation");
    nfrs.push("Maintainability: Fully typed TypeScript/Python codebases with modular test suites");

    return nfrs;
  }

  private identifyMissingRequirements(text: string, project: QualifiedHunterProject): string[] {
    const missing: string[] = [];
    const t = text.toLowerCase();

    if (!t.includes("database") && !t.includes("postgres") && !t.includes("sql") && !t.includes("mongo")) {
      missing.push("Target database preferences and schema models unspecified");
    }
    if (!t.includes("aws") && !t.includes("gcp") && !t.includes("azure") && !t.includes("deploy") && !t.includes("docker")) {
      missing.push("Production cloud hosting and deployment environment unspecified");
    }
    if (!t.includes("auth") && !t.includes("oauth") && !t.includes("login") && !t.includes("sso")) {
      missing.push("Authentication/SSO requirements and user role taxonomy unspecified");
    }
    if (!project.budgetMin && !project.budgetMax) {
      missing.push("Client budget parameters are undisclosed");
    }
    if (!project.deadline) {
      missing.push("Target delivery date or milestone deadlines unspecified");
    }

    return missing;
  }

  private assessComplexity(
    text: string,
    funcs: string[],
    nfrs: string[],
  ): TechnicalComplexityLevel {
    const t = text.toLowerCase();
    let score = 0;

    if (t.includes("enterprise") || t.includes("distributed") || t.includes("multi-agent") || t.includes("tps")) score += 4;
    if (t.includes("hipaa") || t.includes("soc2") || t.includes("microservices")) score += 3;
    if (t.includes("webrtc") || t.includes("kafka") || t.includes("vector") || t.includes("rag")) score += 3;
    if (funcs.length >= 4) score += 2;
    if (nfrs.length >= 4) score += 2;

    if (score >= 8) return "enterprise";
    if (score >= 5) return "high";
    if (score >= 3) return "medium";
    return "low";
  }

  private recommendArchitecture(
    category: string,
    text: string,
    complexity: TechnicalComplexityLevel,
  ): RecommendedArchitecture {
    const t = text.toLowerCase();

    if (category === "genai" || t.includes("agent") || t.includes("rag") || t.includes("llm")) {
      return {
        pattern: "rag_multi_agent_system",
        summary: "Hybrid Multi-Agent Retrieval-Augmented Generation (RAG) Architecture with Vector Embeddings and Tool Orchestration.",
        databaseRequirements: [
          "PostgreSQL with pgvector or dedicated vector store (Pinecone/Qdrant)",
          "Redis for semantic caching, session state, and rate-limit counters",
        ],
        apiRequirements: [
          "FastAPI / Node.js async streaming endpoints for LLM token streams (Server-Sent Events)",
          "RESTful management API with HMAC/Bearer token validation",
        ],
        frontendRequirements: [
          "Next.js App Router with streaming UI, markdown rendering, and interactive feedback",
        ],
        backendRequirements: [
          "Python / TypeScript agent workers with LangChain/LlamaIndex and fallback circuit breakers",
        ],
        aiMlRequirements: [
          "Context window optimization, prompt template versioning, and chunk embedding pipelines",
        ],
      };
    }

    if (complexity === "enterprise" || t.includes("microservices") || t.includes("kafka")) {
      return {
        pattern: "event_driven_microservices",
        summary: "Event-Driven Distributed Microservices Architecture with Idempotent Message Brokers.",
        databaseRequirements: [
          "Partitioned PostgreSQL databases per domain service with read replicas",
          "Apache Kafka / RabbitMQ for event-driven pub/sub messaging",
        ],
        apiRequirements: [
          "High-performance gRPC internal service mesh with OpenAPI gateway for client endpoints",
        ],
        frontendRequirements: [
          "React / Next.js enterprise portal with role-based component gates and AG Grid views",
        ],
        backendRequirements: [
          "Go / Node.js microservices wrapped in Docker containers orchestrated via Kubernetes",
        ],
      };
    }

    if (category === "mobile_development" || t.includes("mobile") || t.includes("react native")) {
      return {
        pattern: "cross_platform_mobile",
        summary: "Cross-Platform Native Mobile Architecture with Offline-First State Synchronization.",
        databaseRequirements: ["Local SQLite / WatermelonDB sync with Cloud PostgreSQL"],
        apiRequirements: ["REST / GraphQL API with offline queue replay capability"],
        frontendRequirements: ["React Native / Expo with native biometric modules and WebRTC"],
        backendRequirements: ["Node.js / Express or FastAPI backend with push notification dispatch"],
      };
    }

    // Default: Modular Monolith
    return {
      pattern: "modular_monolith",
      summary: "Clean Architecture Modular Monolith with Domain-Driven Tenant Isolation.",
      databaseRequirements: ["PostgreSQL with Drizzle/Prisma ORM and connection pooling"],
      apiRequirements: ["Next.js Server Actions and validated REST endpoints"],
      frontendRequirements: ["Tailwind CSS, React 19, and Radix UI accessible component primitives"],
      backendRequirements: ["TypeScript runtime with automated background job queues (BullMQ/pg-boss)"],
    };
  }

  private recommendTechnologyStack(
    category: string,
    text: string,
    skills: string[],
    clientTech: string[],
  ): TechnologyRecommendations {
    const t = text.toLowerCase();
    const core = new Set<string>(["TypeScript", "PostgreSQL"]);

    if (category === "genai" || t.includes("python") || t.includes("ai")) {
      core.add("Python");
      core.add("FastAPI");
    } else {
      core.add("Next.js");
      core.add("Node.js");
    }

    // Merge explicitly detected client skills
    for (const skill of [...skills, ...clientTech]) {
      if (skill.length > 1) core.add(skill);
    }

    return {
      coreStack: Array.from(core).slice(0, 6),
      databases: ["PostgreSQL (Relational)", "Redis (Cache & Queues)"],
      frameworks: ["Next.js 16", "Tailwind CSS v4", "FastAPI"],
      integrations: ["Stripe / Payment API", "Better-Auth / SSO", "OpenAI / Claude API"],
      infrastructure: ["Docker", "GitHub Actions CI/CD", "AWS ECS / Vercel"],
    };
  }

  private estimateDuration(
    complexity: TechnicalComplexityLevel,
    reqCount: number,
  ): EstimatedDuration {
    let weeksMin = 3;
    let weeksMax = 6;

    if (complexity === "enterprise") {
      weeksMin = 10;
      weeksMax = 18;
    } else if (complexity === "high") {
      weeksMin = 6;
      weeksMax = 12;
    } else if (complexity === "medium") {
      weeksMin = 4;
      weeksMax = 8;
    }

    // Adjust slightly for requirement count
    if (reqCount >= 5) {
      weeksMin += 1;
      weeksMax += 2;
    }

    const estimatedTimelineDays = Math.round(((weeksMin + weeksMax) / 2) * 7);

    return {
      weeksMin,
      weeksMax,
      estimatedTimelineDays,
      disclaimer: ProjectAnalyzer.DURATION_DISCLAIMER,
    };
  }

  private generateMilestones(
    complexity: TechnicalComplexityLevel,
    totalWeeks: number,
    category: string,
  ): ProjectMilestone[] {
    const w1 = Math.max(1, Math.round(totalWeeks * 0.25));
    const w2 = Math.max(1, Math.round(totalWeeks * 0.35));
    const w3 = Math.max(1, Math.round(totalWeeks * 0.25));
    const w4 = Math.max(1, totalWeeks - (w1 + w2 + w3));

    return [
      {
        phase: 1,
        title: "Architecture Blueprint, Core Schema & Infrastructure",
        deliverables: [
          "System architecture document and entity relationship diagram (ERD)",
          "Multi-tenant database schema migrations and seed scripts",
          "CI/CD deployment pipelines and local development containerization",
        ],
        durationWeeks: w1,
        costAllocationPercent: 25,
      },
      {
        phase: 2,
        title: `Core Engine & Functional ${category.replace(/_/g, " ").toUpperCase()} Implementation`,
        deliverables: [
          "Implementation of business logic and core functional workflows",
          "Secure API endpoints and integration with external providers",
          "Automated integration test suites covering critical pathways",
        ],
        durationWeeks: w2,
        costAllocationPercent: 35,
      },
      {
        phase: 3,
        title: "Frontend Dashboard, Admin Controls & Telemetry",
        deliverables: [
          "Interactive user interfaces and responsive portal views",
          "Role-based access control and tenant permission guards",
          "Real-time analytics and telemetry tracking",
        ],
        durationWeeks: w3,
        costAllocationPercent: 25,
      },
      {
        phase: 4,
        title: "Security Hardening, End-to-End QA & Staging Handover",
        deliverables: [
          "End-to-end user acceptance testing and performance benchmarking",
          "OWASP Top 10 security audit and vulnerability scan",
          "Production cutover plan, rollback runbook, and documentation",
        ],
        durationWeeks: w4,
        costAllocationPercent: 15,
      },
    ];
  }

  private identifyRisks(
    text: string,
    complexity: TechnicalComplexityLevel,
    missing: string[],
  ): DeliveryRisk[] {
    const risks: DeliveryRisk[] = [];
    const t = text.toLowerCase();

    if (missing.length > 2) {
      risks.push({
        category: "scope",
        description: "Scope creep risk due to underspecified client requirements and undisclosed hosting environment.",
        severity: "medium",
        mitigationStrategy: "Include a mandatory Phase 0 technical alignment workshop before fixed scope commitment.",
      });
    }

    if (t.includes("ai") || t.includes("rag") || t.includes("llm")) {
      risks.push({
        category: "technical",
        description: "LLM hallucination, context token limits, and upstream provider rate limit spikes.",
        severity: "high",
        mitigationStrategy: "Implement strict JSON schema output validation and multi-model fallback circuit breakers.",
      });
    }

    if (t.includes("sync") || t.includes("salesforce") || t.includes("two-way")) {
      risks.push({
        category: "integration",
        description: "Third-party API rate limiting and data reconciliation conflicts during bidirectional sync.",
        severity: "medium",
        mitigationStrategy: "Employ asynchronous message queues with idempotent retry schedules and conflict resolution logs.",
      });
    }

    if (complexity === "enterprise") {
      risks.push({
        category: "compliance",
        description: "Strict regulatory audit failures under enterprise or medical data sovereignty standards.",
        severity: "high",
        mitigationStrategy: "Enforce zero-trust encrypted storage, immutable audit logs, and SOC2/HIPAA compliance checklists.",
      });
    }

    return risks;
  }
}
