/**
 * NEXGEN GLOBAL AI — Agent 7 Response Sentiment Analyzer & Classifier
 *
 * Classifies client inbound communications into 9 standard categories.
 * Strict Rule: Opt-out detection takes absolute priority over all other sentiment analysis.
 */

import type {
  ClientResponseClassification,
  ClassificationResult,
} from "./types";

export class ResponseSentimentAnalyzer {
  /**
   * Analyzes and classifies a client response.
   */
  public static classifyResponse(text: string, subject?: string | null): ClassificationResult {
    const rawContent = `${subject || ""} ${text || ""}`.trim();
    const content = rawContent.toLowerCase();

    // ── 1. ABSOLUTE PRIORITY: OPT-OUT DETECTION ────────────────────────────────
    const optOutKeywords = [
      "unsubscribe",
      "opt-out",
      "opt out",
      "stop emailing",
      "stop contacting",
      "remove me",
      "take me off",
      "do not contact",
      "don't contact",
      "never contact",
      "lose my number",
      "spam",
      "cease and desist",
    ];

    for (const kw of optOutKeywords) {
      if (content.includes(kw)) {
        return {
          classification: "opt_out_request",
          confidence: 0.98,
          explanation: `Explicit opt-out request detected matching keyword '${kw}'.`,
          evidence: rawContent.slice(0, 160),
          recommendedAction: "Permanently suppress contact and cancel all active sequences immediately.",
          isOptOut: true,
          isPositiveReply: false,
          isConfirmed: true,
        };
      }
    }

    // ── 2. OUT OF OFFICE DETECTION ─────────────────────────────────────────────
    const oooKeywords = [
      "out of the office",
      "out of office",
      "on annual leave",
      "on vacation",
      "auto-reply",
      "autoreply",
      "automated response",
      "returning on",
      "away from my desk",
      "away from the office",
    ];

    for (const kw of oooKeywords) {
      if (content.includes(kw)) {
        return {
          classification: "out_of_office",
          confidence: 0.95,
          explanation: `Automated Out-of-Office auto-responder detected matching '${kw}'.`,
          evidence: rawContent.slice(0, 160),
          recommendedAction: "Pause sequence temporarily until client returns to office.",
          isOptOut: false,
          isPositiveReply: false,
          isConfirmed: true,
        };
      }
    }

    // ── 3. MEETING REQUESTED ───────────────────────────────────────────────────
    const meetingKeywords = [
      "hop on a call",
      "jump on a call",
      "schedule a call",
      "let's talk",
      "book time",
      "calendar",
      "zoom",
      "google meet",
      "phone call",
      "available at",
      "available tomorrow",
      "available next week",
      "set up a meeting",
      "discuss on a call",
    ];

    for (const kw of meetingKeywords) {
      if (content.includes(kw)) {
        return {
          classification: "meeting_requested",
          confidence: 0.94,
          explanation: `Client requested a call or calendar scheduling matching '${kw}'.`,
          evidence: rawContent.slice(0, 160),
          recommendedAction: "Notify Anil immediately to send booking calendar link.",
          isOptOut: false,
          isPositiveReply: true,
          isConfirmed: true,
        };
      }
    }

    // ── 4. BUDGET NEGOTIATION ──────────────────────────────────────────────────
    const budgetKeywords = [
      "budget is too high",
      "cost is high",
      "too expensive",
      "can you lower",
      "can you do $",
      "can we negotiate",
      "pricing is steep",
      "out of our budget",
      "discount",
      "hourly rate is high",
      "flexible on price",
      "flexible on budget",
    ];

    for (const kw of budgetKeywords) {
      if (content.includes(kw)) {
        return {
          classification: "negotiating_budget",
          confidence: 0.92,
          explanation: `Commercial negotiation terms detected matching '${kw}'.`,
          evidence: rawContent.slice(0, 160),
          recommendedAction: "Flag for Anil to evaluate sprint velocity or scope trade-offs.",
          isOptOut: false,
          isPositiveReply: true,
          isConfirmed: true,
        };
      }
    }

    // ── 5. REQUESTING MORE INFORMATION ─────────────────────────────────────────
    const infoKeywords = [
      "share more details",
      "send more info",
      "case studies",
      "portfolio",
      "references",
      "architecture details",
      "tell me more",
      "can you send",
      "could you explain",
      "interested in seeing",
      "deck",
      "whitepaper",
    ];

    for (const kw of infoKeywords) {
      if (content.includes(kw)) {
        return {
          classification: "requesting_more_information",
          confidence: 0.90,
          explanation: `Inquiry for technical artifacts or case studies matching '${kw}'.`,
          evidence: rawContent.slice(0, 160),
          recommendedAction: "Draft tailored technical evidence and case study response for Anil's review.",
          isOptOut: false,
          isPositiveReply: true,
          isConfirmed: true,
        };
      }
    }

    // ── 6. NOT INTERESTED / REJECTION ──────────────────────────────────────────
    const notInterestedKeywords = [
      "not interested",
      "already hired",
      "already found someone",
      "position filled",
      "project cancelled",
      "went with another",
      "not looking for agency",
      "not at this time",
      "no thanks",
      "pass on this",
    ];

    for (const kw of notInterestedKeywords) {
      if (content.includes(kw)) {
        return {
          classification: "not_interested",
          confidence: 0.92,
          explanation: `Client polite rejection or project closure matching '${kw}'.`,
          evidence: rawContent.slice(0, 160),
          recommendedAction: "Acknowledge gracefully, record feedback, and mark sequence completed.",
          isOptOut: false,
          isPositiveReply: false,
          isConfirmed: true,
        };
      }
    }

    // ── 7. GENERALLY INTERESTED ────────────────────────────────────────────────
    const interestedKeywords = [
      "interested",
      "sounds great",
      "looks promising",
      "impressive",
      "let's do it",
      "let's proceed",
      "sounds good",
      "like the approach",
      "good fit",
    ];

    for (const kw of interestedKeywords) {
      if (content.includes(kw)) {
        return {
          classification: "interested",
          confidence: 0.88,
          explanation: `Positive sentiment detected matching '${kw}'.`,
          evidence: rawContent.slice(0, 160),
          recommendedAction: "Draft high-priority response proposing discovery kick-off.",
          isOptOut: false,
          isPositiveReply: true,
          isConfirmed: true,
        };
      }
    }

    // ── 8. UNCLEAR / AMBIGUOUS RESPONSE ────────────────────────────────────────
    return {
      classification: "unclear_response",
      confidence: 0.45,
      explanation: "Response text does not decisively match positive, negative, or opt-out intents.",
      evidence: rawContent.slice(0, 160) || "[No content]",
      recommendedAction: "Requires manual human inspection by Anil.",
      isOptOut: false,
      isPositiveReply: false,
      isConfirmed: false,
    };
  }
}
