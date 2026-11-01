/**
 * NEXGEN GLOBAL AI — Agent 6: Outreach Manager Types & Contracts
 *
 * Defines data structures for multi-channel client communication drafts,
 * personalization contexts, approval lifecycles, and audit history.
 */

import type { OutreachChannel, OutreachMessageStatus, OutreachActivityEvent } from "../../schema";
import type { StructuredProposalDocument } from "../proposal/types";
import type { StructuredProjectAnalysis } from "../analyzer/types";
import type { DetailedScoringReport } from "../scoring/types";
import type { ResearchedClientProfile } from "../researcher/types";

export type { OutreachChannel, OutreachMessageStatus, OutreachActivityEvent };

export type PersonalizationContext = {
  opportunityId: string;
  projectTitle: string;
  category: string;
  clientName: string | null;
  clientCompany: string;
  clientDomain?: string;
  clientCountry?: string;
  isClientVerified: boolean;
  keyRequirements: string[];
  technicalChallenges: string[];
  recommendedArchitecturePattern: string;
  recommendedTechStack: string[];
  proposalVersion: number;
  proposalTotalCost?: number;
  proposalDurationWeeks?: number;
  currency: string;
  missingInformationFlags: string[];
  verifiedFactsUsed: string[];
};

export type OutreachMessageDraft = {
  id?: string;
  organizationId: string;
  opportunityId: string;
  proposalId: string;
  channel: OutreachChannel;
  status: OutreachMessageStatus;
  version: number;
  subject?: string | null;
  body: string;
  charCount: number;
  recipientName: string | null;
  recipientContact: string | null;
  recipientCompany: string;
  personalizationContext: PersonalizationContext;
  approvedByUserId?: string | null;
  approvedAt?: Date | string | null;
  reviewerFeedback?: string | null;
  activityHistory: OutreachActivityEvent[];
  scheduledFor?: Date | string | null;
  sentAt?: Date | string | null;
  failedReason?: string | null;
  metadata: {
    generationDurationMs: number;
    tokensUsed: number;
    aiModel: string;
    executionMode: "DETERMINISTIC" | "LLM_LIVE" | "LLM_FALLBACK" | "SIMULATED" | "FIXTURE";
    actualProvider?: string;
    tokenUsage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    estimatedCostUSD?: number;
    fallbackStatus?: "none" | "active" | "recovered";
    fallbackReason?: string;
    generatedAt: Date | string;
    hasOptOutNotice: boolean;
    channelCompliancePassed: boolean;
    revisionNotes?: string;
    revisionFeedback?: string;
    connectionRequestNote?: string;
    inMailDraft?: string;
  };
};

export type LinkedInDraftPackage = {
  connectionRequestNote: string; // Max 300 chars
  inMailOrMessage: string;
};

export type OutreachGenerationInput = {
  organizationId: string;
  opportunity: {
    id: string;
    title: string;
    description: string;
    category: string;
    sourcePlatform: string;
    sourceUrl?: string;
    clientName?: string | null;
    clientDomain?: string | null;
    clientCountry?: string | null;
    currency?: string;
    status: string;
  };
  clientProfile?: ResearchedClientProfile | null;
  analysis: StructuredProjectAnalysis;
  scoring: DetailedScoringReport;
  proposal: {
    id: string;
    version: number;
    title: string;
    status: string;
    approvedByUserId?: string | null;
    approvedAt?: Date | string | null;
    document: StructuredProposalDocument;
  };
  channel: OutreachChannel;
  version?: number;
  revisionFeedback?: string;
  suppressionList?: string[];
};

export type OutreachApprovalDecisionInput = {
  messageId: string;
  action: "approve" | "reject" | "request_revision";
  userId: string;
  userEmail?: string | null;
  userRoles?: string[];
  reviewerFeedback?: string;
  scheduledFor?: Date | string | null;
  isTrustedServerContext?: boolean;
  isAnilExplicit?: boolean;
};
