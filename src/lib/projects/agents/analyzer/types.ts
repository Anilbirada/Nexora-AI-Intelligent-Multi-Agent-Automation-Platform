/**
 * NEXGEN GLOBAL AI — Agent 3: Project Analyzer Types & Contracts
 */

export type TechnicalComplexityLevel = "low" | "medium" | "high" | "enterprise";

export type ArchitecturePattern =
  | "rag_multi_agent_system"
  | "event_driven_microservices"
  | "modular_monolith"
  | "serverless_cloud_native"
  | "distributed_data_pipeline"
  | "cross_platform_mobile";

export type ProjectMilestone = {
  phase: number;
  title: string;
  deliverables: string[];
  durationWeeks: number;
  costAllocationPercent: number;
};

export type DeliveryRisk = {
  category: "technical" | "scope" | "integration" | "compliance" | "timeline";
  description: string;
  severity: "low" | "medium" | "high";
  mitigationStrategy: string;
};

export type RecommendedArchitecture = {
  pattern: ArchitecturePattern;
  summary: string;
  databaseRequirements: string[];
  apiRequirements: string[];
  frontendRequirements: string[];
  backendRequirements: string[];
  aiMlRequirements?: string[];
};

export type TechnologyRecommendations = {
  coreStack: string[];
  databases: string[];
  frameworks: string[];
  integrations: string[];
  infrastructure: string[];
};

export type EstimatedDuration = {
  weeksMin: number;
  weeksMax: number;
  estimatedTimelineDays: number;
  disclaimer: string;
};

export type StructuredProjectAnalysis = {
  projectSummary: string;
  businessRequirements: string[];
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  recommendedArchitecture: RecommendedArchitecture;
  technologyRecommendations: TechnologyRecommendations;
  complexityLevel: TechnicalComplexityLevel;
  estimatedDuration: EstimatedDuration;
  milestones: ProjectMilestone[];
  risks: DeliveryRisk[];
  missingInformation: string[];
  confidenceLevel: number; // 0.0 - 1.0
  analyzedAt: Date;
};
