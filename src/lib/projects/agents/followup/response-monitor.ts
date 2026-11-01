/**
 * NEXGEN GLOBAL AI — Agent 7 Response Monitor & Ingestion Engine
 *
 * Ingests client responses across Email, LinkedIn, and WhatsApp.
 * Supports manual response recording and verified integration webhooks.
 * Enforces provider message ID idempotency and triggers immediate stop conditions.
 */

import type {
  ClientResponseRecord,
  ClassificationResult,
  OutreachChannel,
} from "./types";
import { ResponseSentimentAnalyzer } from "./sentiment-analyzer";

export type InboundResponseInput = {
  organizationId: string;
  opportunityId: string;
  sequenceId?: string | null;
  channel: OutreachChannel;
  providerMessageId: string;
  senderContact: string;
  recipientContact?: string | null;
  subject?: string | null;
  content: string;
  isManual?: boolean;
  receivedAt?: Date | string;
  metadata?: Record<string, unknown>;
};

export class ResponseMonitor {
  private processedProviderMessageIds: Set<string> = new Set();

  /**
   * Evaluates the integration connection status for a given channel.
   * Clearly labels unverified connectors as unavailable without fabricating live connections.
   */
  public static getIntegrationStatus(channel: OutreachChannel): {
    isAvailable: boolean;
    provider: string;
    mode: "live" | "manual_only" | "disabled";
    notice: string;
  } {
    if (channel === "email") {
      const isConfigured = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
      return {
        isAvailable: isConfigured,
        provider: "Email (Resend/SMTP)",
        mode: isConfigured ? "live" : "manual_only",
        notice: isConfigured
          ? "Live inbound response webhook tracking active."
          : "Live email connector not configured. Manual response recording enabled.",
      };
    }

    if (channel === "linkedin") {
      return {
        isAvailable: false,
        provider: "LinkedIn InMail/Messaging",
        mode: "manual_only",
        notice: "LinkedIn live inbound sync unavailable without Enterprise Partner API. Use manual recording.",
      };
    }

    if (channel === "whatsapp") {
      const isConfigured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_PHONE_NUMBER_ID);
      return {
        isAvailable: isConfigured,
        provider: "WhatsApp Cloud API",
        mode: isConfigured ? "live" : "manual_only",
        notice: isConfigured
          ? "WhatsApp webhook listening active."
          : "WhatsApp API credentials not detected. Manual response recording enabled.",
      };
    }

    return {
      isAvailable: false,
      provider: channel,
      mode: "disabled",
      notice: `Channel '${channel}' is not supported.`,
    };
  }

  /**
   * Ingests an inbound response with idempotency verification and sentiment analysis.
   */
  public ingestResponse(input: InboundResponseInput): {
    response: ClientResponseRecord;
    classification: ClassificationResult;
    requiresImmediatePause: boolean;
    isOptOut: boolean;
  } {
    // 1. Idempotency Check
    const idempotencyKey = `${input.organizationId}:${input.providerMessageId}`.toLowerCase();
    if (this.processedProviderMessageIds.has(idempotencyKey)) {
      throw new Error(
        `Duplicate response detected: Provider message ID '${input.providerMessageId}' has already been processed for this organization.`,
      );
    }

    // 2. Classify response
    const classification = ResponseSentimentAnalyzer.classifyResponse(input.content, input.subject);

    // 3. Mark processed
    this.processedProviderMessageIds.add(idempotencyKey);

    const response: ClientResponseRecord = {
      id: `resp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      sequenceId: input.sequenceId,
      channel: input.channel,
      providerMessageId: input.providerMessageId,
      senderContact: input.senderContact,
      recipientContact: input.recipientContact,
      subject: input.subject || null,
      content: input.content,
      isManual: Boolean(input.isManual),
      classification: classification.classification,
      confidence: classification.confidence,
      explanation: classification.explanation,
      evidence: classification.evidence,
      recommendedAction: classification.recommendedAction,
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
      metadata: {
        ...(input.metadata || {}),
        isOptOut: classification.isOptOut,
        isPositiveReply: classification.isPositiveReply,
        classifiedAt: new Date().toISOString(),
      },
    };

    // 4. Immediate Stop Conditions: Any reply, rejection, or opt-out pauses follow-ups
    const requiresImmediatePause = true; // Every genuine response halts further automated follow-up

    return {
      response,
      classification,
      requiresImmediatePause,
      isOptOut: classification.isOptOut,
    };
  }
}
