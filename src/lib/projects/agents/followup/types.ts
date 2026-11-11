/**
 * NEXGEN GLOBAL AI — Agent 7: Follow-up Manager Types & Contracts
 *
 * Defines models for multi-step follow-up sequences, scheduling rules,
 * client response telemetry, classification categories, and audit histories.
 */

import type {
  FollowupSequenceStatus,
  FollowupTaskStatus,
  ClientResponseClassification,
  FollowupActivityEvent,
  OutreachChannel,
} from "../../schema";

export type {
  FollowupSequenceStatus,
  FollowupTaskStatus,
  ClientResponseClassification,
  FollowupActivityEvent,
  OutreachChannel,
};

export type FollowupSequenceRecord = {
  id: string;
  organizationId: string;
  opportunityId: string;
  proposalId: string;
  outreachMessageId: string;
  channel: OutreachChannel;
  status: FollowupSequenceStatus;
  currentStep: number;
  maxSteps: number;
  nextFollowupDue?: string | Date | null;
  lastContactedAt?: string | Date | null;
  clientContact?: string | null;
  clientTimezone?: string;
  pauseReason?: string | null;
  pausedAt?: string | Date | null;
  completedAt?: string | Date | null;
  activityHistory: FollowupActivityEvent[];
  metadata: Record<string, unknown>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type FollowupTaskRecord = {
  id: string;
  organizationId: string;
  sequenceId: string;
  stepNumber: number;
  channel: OutreachChannel;
  status: FollowupTaskStatus;
  version: number;
  dueAt: string | Date;
  subject?: string | null;
  body?: string | null;
  charCount: number;
  approvedByUserId?: string | null;
  approvedAt?: string | Date | null;
  rejectionReason?: string | null;
  revisionFeedback?: string | null;
  reviewerFeedback?: string | null;
  activityHistory: FollowupActivityEvent[];
  sentAt?: string | Date | null;
  failedReason?: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type ClientResponseRecord = {
  id: string;
  organizationId: string;
  opportunityId: string;
  sequenceId?: string | null;
  channel: OutreachChannel;
  providerMessageId: string;
  senderContact: string;
  recipientContact?: string | null;
  subject?: string | null;
  content: string;
  isManual: boolean;
  classification: ClientResponseClassification;
  confidence: number;
  explanation?: string | null;
  evidence?: string | null;
  recommendedAction?: string | null;
  receivedAt: string | Date;
  metadata: Record<string, unknown>;
  createdAt?: string | Date;
};

export type ClassificationResult = {
  classification: ClientResponseClassification;
  confidence: number;
  explanation: string;
  evidence: string;
  recommendedAction: string;
  isOptOut: boolean;
  isPositiveReply: boolean;
  isConfirmed: boolean;
};

export type FollowupScheduleConfig = {
  stepIntervalsBusinessDays: number[]; // default [3, 5, 7]
  maxSteps: number; // default 3
  clientTimezone?: string; // default "UTC"
  skipWeekends?: boolean; // default true
  skipHolidays?: string[]; // YYYY-MM-DD
};

export type FollowupGenerationInput = {
  organizationId: string;
  opportunityId: string;
  projectTitle: string;
  clientName?: string | null;
  clientCompany?: string | null;
  channel: OutreachChannel;
  stepNumber: number;
  previousOutreachSubject?: string | null;
  previousOutreachBody?: string | null;
  clientResponse?: ClientResponseRecord | null;
  revisionFeedback?: string;
  version?: number;
};

export type FollowupDraftOutput = {
  subject: string | null;
  body: string;
  charCount: number;
  channel: OutreachChannel;
  stepNumber: number;
  callToAction: string;
  hasOptOutNotice: boolean;
};
