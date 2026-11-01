"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  RiAlertLine,
  RiArrowLeftLine,
  RiCheckDoubleLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiCpuLine,
  RiExternalLinkLine,
  RiFileEditLine,
  RiFileTextLine,
  RiGitMergeLine,
  RiGlobalLine,
  RiInformationLine,
  RiLoader4Line,
  RiLock2Line,
  RiMailLine,
  RiMoneyDollarCircleLine,
  RiRefreshLine,
  RiSendPlaneLine,
  RiShieldCheckLine,
  RiShieldCrossLine,
  RiSparklingLine,
  RiSpeedUpLine,
  RiTimeLine,
  RiToolsLine,
} from "@remixicon/react";

type ProposalData = {
  id: string;
  version: number;
  title: string;
  executiveSummary: string;
  problemAnalysis?: string;
  proposedSolution?: string;
  architectureBlueprint?: any;
  techStackRecommendations?: any;
  milestones?: Array<{
    phase: number;
    title: string;
    deliverables: string[];
    durationWeeks: number;
    costAllocationPercent: number;
    estimatedCost?: number;
  }>;
  estimatedDurationWeeks?: number;
  totalCostEstimate?: number;
  currency: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "revision_requested" | "dispatched";
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  reviewerFeedback?: string | null;
  dispatchChannel?: string | null;
  createdAt: string;
  updatedAt: string;
};

type OutreachMessageData = {
  id: string;
  proposalId: string;
  opportunityId: string;
  channel: "email" | "linkedin" | "whatsapp";
  status: "draft" | "pending_approval" | "approved" | "rejected" | "revision_requested" | "scheduled" | "sent" | "failed" | "cancelled";
  version: number;
  subject?: string | null;
  body: string;
  metadata?: any;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  revisionFeedback?: string | null;
  activityHistory?: Array<{
    timestamp: string;
    action: string;
    performedByUserId?: string;
    details?: string;
    metadata?: Record<string, unknown>;
  }>;
  createdAt: string;
  updatedAt: string;
};

type FollowupSequenceData = {
  id: string;
  channel: "email" | "linkedin" | "whatsapp";
  status: string;
  currentStep: number;
  maxSteps: number;
  nextFollowupDue?: string | null;
  lastContactedAt?: string | null;
  clientContact?: string | null;
  clientTimezone?: string;
  pauseReason?: string | null;
  pausedAt?: string | null;
  activityHistory?: any[];
};

type FollowupTaskData = {
  id: string;
  sequenceId: string;
  stepNumber: number;
  channel: "email" | "linkedin" | "whatsapp";
  status: string;
  version: number;
  dueAt: string;
  subject?: string | null;
  body?: string | null;
  charCount: number;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  revisionFeedback?: string | null;
  activityHistory?: any[];
};

type ClientResponseData = {
  id: string;
  channel: string;
  providerMessageId: string;
  senderContact: string;
  subject?: string | null;
  content: string;
  isManual: boolean;
  classification: string;
  confidence: number;
  explanation?: string | null;
  recommendedAction?: string | null;
  receivedAt: string;
};

type ProjectDetailData = {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategories?: string[];
  sourcePlatform: string;
  sourceUrl?: string;
  clientName?: string;
  clientDomain?: string;
  clientCountry?: string;
  clientRegion?: string;
  estimatedBudgetMin?: number | null;
  estimatedBudgetMax?: number | null;
  currency: string;
  budgetType: string;
  scopeComplexity?: string;
  timelineDays?: number | null;
  status: string;
  discoveredAt: string;
  clientProfile: {
    companyName?: string;
    domain?: string;
    country?: string;
    credibilityScore: number;
    credibilityTier: string;
    isVerified: boolean;
    riskFlags: string[];
    missingInformation: string[];
    researchSummary?: string;
    evidenceUrls: Array<{ fact: string; sourceUrl: string; verifiedAt: string }>;
    techStackDetected: string[];
  };
  technicalAnalysis: {
    summary?: string;
    complexityLevel: string;
    recommendedArchitecture?: {
      pattern: string;
      summary: string;
      databaseRequirements: string[];
      apiRequirements: string[];
      frontendRequirements: string[];
      backendRequirements: string[];
      aiMlRequirements?: string[];
    };
    technologyRecommendations?: {
      coreStack: string[];
      databases: string[];
      frameworks: string[];
      integrations: string[];
      infrastructure: string[];
    };
    milestones: Array<{
      phase: number;
      title: string;
      deliverables: string[];
      durationWeeks: number;
      costAllocationPercent: number;
    }>;
    deliveryRisks: Array<{
      category: string;
      description: string;
      severity: string;
      mitigationStrategy: string;
    }>;
  };
  scoring: {
    overallScore?: number | null;
    qualificationGrade?: string;
    isQualified: boolean;
    budgetViabilityScore?: number;
    techStackAlignmentScore?: number;
    clientLegitimacyScore?: number;
    competitionScore?: number;
    timelineFeasibilityScore?: number;
    confidenceLevel?: number;
    recommendedAction?: string;
    reasoningSummary?: string;
    scoringFactors?: Record<string, any>;
  };
};

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  // Proposal State
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [reviewingProposal, setReviewingProposal] = useState(false);
  const [reviewerFeedback, setReviewerFeedback] = useState("");
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

  // Agent 6 Outreach State
  const [outreachMessages, setOutreachMessages] = useState<OutreachMessageData[]>([]);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [generatingOutreach, setGeneratingOutreach] = useState(false);
  const [selectedChannelTab, setSelectedChannelTab] = useState<"email" | "linkedin" | "whatsapp">("email");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [outreachDecisionLoading, setOutreachDecisionLoading] = useState(false);
  const [outreachFeedbackInput, setOutreachFeedbackInput] = useState("");
  const [outreachSuccess, setOutreachSuccess] = useState<string | null>(null);
  const [outreachError, setOutreachError] = useState<string | null>(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Failed to load opportunity details");
      const data = await res.json();
      setProject(data);
    } catch (err) {
      console.error("Detail load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProposal = async () => {
    try {
      setProposalLoading(true);
      const res = await fetch(`/api/projects/${id}/proposal`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists && data.proposal) {
          setProposal(data.proposal);
        } else {
          setProposal(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch proposal:", err);
    } finally {
      setProposalLoading(false);
    }
  };

  const fetchOutreach = async () => {
    try {
      setOutreachLoading(true);
      const res = await fetch(`/api/projects/${id}/outreach`);
      if (res.ok) {
        const data = await res.json();
        setOutreachMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch outreach messages:", err);
    } finally {
      setOutreachLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchDetail();
    fetchProposal();
    fetchOutreach();
    fetchFollowup();
  }, [id]);

  const handleGenerateProposal = async (feedbackParam?: string) => {
    try {
      setGeneratingProposal(true);
      setApprovalError(null);
      setApprovalSuccess(null);
      const res = await fetch(`/api/projects/${id}/proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionFeedback: feedbackParam || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate proposal");
      }
      await fetchProposal();
      setApprovalSuccess(`Proposal v${data.proposal?.version || 1} generated successfully.`);
    } catch (err: any) {
      console.error("Proposal generation error:", err);
      setApprovalError(err.message || "Failed to generate proposal");
    } finally {
      setGeneratingProposal(false);
    }
  };

  const handleApprovalDecision = async (action: "approve" | "reject" | "request_revision") => {
    try {
      setReviewingProposal(true);
      setApprovalError(null);
      setApprovalSuccess(null);
      const res = await fetch(`/api/projects/${id}/proposal/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewerFeedback: reviewerFeedback.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit approval decision");
      }
      await fetchProposal();
      await fetchOutreach();
      if (action === "approve") {
        setApprovalSuccess("Proposal approved successfully! External dispatch remains locked.");
      } else if (action === "request_revision") {
        setApprovalSuccess("Revision requested. Feedback recorded for next draft.");
      } else {
        setApprovalSuccess("Proposal rejected.");
      }
      setReviewerFeedback("");
    } catch (err: any) {
      console.error("Approval error:", err);
      setApprovalError(err.message || "Approval action failed");
    } finally {
      setReviewingProposal(false);
    }
  };

  const handleGenerateOutreach = async (channel?: "email" | "linkedin" | "whatsapp") => {
    try {
      setGeneratingOutreach(true);
      setOutreachError(null);
      setOutreachSuccess(null);
      const res = await fetch(`/api/projects/${id}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channel || "all" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate outreach drafts");
      }
      await fetchOutreach();
      setOutreachSuccess(data.message || "Outreach drafts generated successfully.");
    } catch (err: any) {
      console.error("Outreach generation error:", err);
      setOutreachError(err.message || "Failed to generate outreach drafts");
    } finally {
      setGeneratingOutreach(false);
    }
  };

  const handleOutreachDecision = async (messageId: string, action: "approve" | "reject" | "request_revision") => {
    try {
      setOutreachDecisionLoading(true);
      setOutreachError(null);
      setOutreachSuccess(null);
      const res = await fetch(`/api/outreach/${messageId}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewerFeedback: action === "request_revision" ? outreachFeedbackInput : undefined,
          rejectionReason: action === "reject" ? outreachFeedbackInput : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit outreach approval decision");
      }
      await fetchOutreach();
      setOutreachSuccess(data.message || "Outreach approval decision recorded.");
      setOutreachFeedbackInput("");
    } catch (err: any) {
      console.error("Outreach decision error:", err);
      setOutreachError(err.message || "Outreach approval failed");
    } finally {
      setOutreachDecisionLoading(false);
    }
  };

  const handleStartEdit = (msg: OutreachMessageData) => {
    setEditingMessageId(msg.id);
    setEditSubject(msg.subject || "");
    setEditBody(msg.body);
  };

  const handleSaveEdit = async (messageId: string) => {
    try {
      setSavingEdit(true);
      setOutreachError(null);
      const res = await fetch(`/api/outreach/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: editSubject.trim() || undefined,
          body: editBody.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update draft");
      }
      await fetchOutreach();
      setEditingMessageId(null);
      setOutreachSuccess("Outreach draft updated successfully.");
    } catch (err: any) {
      console.error("Draft update error:", err);
      setOutreachError(err.message || "Failed to update draft");
    } finally {
      setSavingEdit(false);
    }
  };

  // Agent 7 Follow-up State
  const [followupSequence, setFollowupSequence] = useState<FollowupSequenceData | null>(null);
  const [followupTasks, setFollowupTasks] = useState<FollowupTaskData[]>([]);
  const [clientResponses, setClientResponses] = useState<ClientResponseData[]>([]);
  const [channelIntegrations, setChannelIntegrations] = useState<any>({});
  const [followupLoading, setFollowupLoading] = useState(false);
  const [creatingSequence, setCreatingSequence] = useState(false);
  const [generatingFollowupDraft, setGeneratingFollowupDraft] = useState(false);
  const [followupDecisionLoading, setFollowupDecisionLoading] = useState(false);
  const [followupFeedbackInput, setFollowupFeedbackInput] = useState("");
  const [followupSuccess, setFollowupSuccess] = useState<string | null>(null);
  const [followupError, setFollowupError] = useState<string | null>(null);

  // Manual Response Recording State
  const [showManualResponseForm, setShowManualResponseForm] = useState(false);
  const [manualSenderContact, setManualSenderContact] = useState("");
  const [manualSubject, setManualSubject] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualChannel, setManualChannel] = useState<"email" | "linkedin" | "whatsapp">("email");
  const [savingManualResponse, setSavingManualResponse] = useState(false);

  const fetchFollowup = async () => {
    try {
      setFollowupLoading(true);
      const res = await fetch(`/api/projects/${id}/followup`);
      if (res.ok) {
        const data = await res.json();
        setFollowupSequence(data.sequence || null);
        setFollowupTasks(data.tasks || []);
        setClientResponses(data.responses || []);
        setChannelIntegrations(data.channelIntegrations || {});
      }
    } catch (err) {
      console.error("Failed to load follow-up sequence:", err);
    } finally {
      setFollowupLoading(false);
    }
  };

  const handleCreateSequence = async (channel: "email" | "linkedin" | "whatsapp" = "email") => {
    try {
      setCreatingSequence(true);
      setFollowupError(null);
      setFollowupSuccess(null);
      const res = await fetch(`/api/projects/${id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_sequence", channel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create follow-up sequence");
      await fetchFollowup();
      setFollowupSuccess(data.message || "Follow-up sequence created successfully.");
    } catch (err: any) {
      console.error("Sequence creation error:", err);
      setFollowupError(err.message || "Failed to create follow-up sequence");
    } finally {
      setCreatingSequence(false);
    }
  };

  const handleGenerateFollowupDraft = async (taskId: string) => {
    try {
      setGeneratingFollowupDraft(true);
      setFollowupError(null);
      setFollowupSuccess(null);
      const res = await fetch(`/api/projects/${id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_draft", taskId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate follow-up draft");
      await fetchFollowup();
      setFollowupSuccess(data.message || "Follow-up draft generated successfully.");
    } catch (err: any) {
      console.error("Follow-up draft error:", err);
      setFollowupError(err.message || "Failed to generate follow-up draft");
    } finally {
      setGeneratingFollowupDraft(false);
    }
  };

  const handleFollowupDecision = async (taskId: string, action: "approve" | "reject" | "request_revision") => {
    try {
      setFollowupDecisionLoading(true);
      setFollowupError(null);
      setFollowupSuccess(null);
      const res = await fetch(`/api/followup/${taskId}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewerFeedback: followupFeedbackInput.trim() || undefined,
          sequenceId: followupSequence?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record approval decision");
      await fetchFollowup();
      setFollowupSuccess(data.message || "Follow-up approval decision recorded.");
      setFollowupFeedbackInput("");
    } catch (err: any) {
      console.error("Approval error:", err);
      setFollowupError(err.message || "Follow-up approval action failed");
    } finally {
      setFollowupDecisionLoading(false);
    }
  };

  const handleSequenceStatusChange = async (action: "pause" | "resume" | "cancel") => {
    if (!followupSequence) return;
    try {
      setFollowupLoading(true);
      setFollowupError(null);
      const res = await fetch(`/api/followup/${followupSequence.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update sequence status");
      await fetchFollowup();
      setFollowupSuccess(data.message || `Sequence ${action}d successfully.`);
    } catch (err: any) {
      console.error("Status update error:", err);
      setFollowupError(err.message || "Failed to update sequence status");
    } finally {
      setFollowupLoading(false);
    }
  };

  const handleRecordManualResponse = async () => {
    try {
      setSavingManualResponse(true);
      setFollowupError(null);
      const res = await fetch(`/api/projects/${id}/followup/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderContact: manualSenderContact.trim(),
          channel: manualChannel,
          subject: manualSubject.trim() || undefined,
          content: manualContent.trim(),
          isManual: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record response");
      await fetchFollowup();
      setShowManualResponseForm(false);
      setManualSenderContact("");
      setManualSubject("");
      setManualContent("");
      setFollowupSuccess(`Client response recorded: Classified as ${data.classification?.category?.replace(/_/g, " ")}. Sequence updated.`);
    } catch (err: any) {
      console.error("Manual response error:", err);
      setFollowupError(err.message || "Failed to record client response");
    } finally {
      setSavingManualResponse(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-xs text-text-sub-600">
        Loading project analysis and scoring breakdown...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12 text-text-strong-950">
        <h2 className="text-base font-semibold">Opportunity Not Found</h2>
        <p className="mt-1 text-xs text-text-sub-600">
          The requested project record could not be located in your organization context.
        </p>
        <Link
          href="/projects"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
        >
          <RiArrowLeftLine className="h-4 w-4" /> Back to Global Discovery
        </Link>
      </div>
    );
  }

  const { clientProfile, technicalAnalysis, scoring } = project;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-bg-white-0 px-6 py-8 text-text-strong-950">
      {/* ── TOP NAV BAR ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between border-b border-stroke-soft-200 pb-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-sub-600 hover:text-blue-600"
        >
          <RiArrowLeftLine className="h-4 w-4" /> Back to Global Discovery
        </Link>

        <div className="flex items-center gap-2">
          {project.sourceUrl && (
            <a
              href={project.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-stroke-soft-200 px-3 py-1.5 text-xs font-medium text-text-sub-600 shadow-sm transition hover:bg-bg-weak-50"
            >
              Original Source <RiExternalLinkLine className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* ── PROJECT TITLE & HERO ─────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold capitalize text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {project.category.replace(/_/g, " ")}
            </span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {project.sourcePlatform}
            </span>
            <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium capitalize text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              {project.scopeComplexity || "Medium"} Complexity
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-strong-950 sm:text-3xl">
            {project.title}
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-text-sub-600 max-w-4xl whitespace-pre-line">
            {project.description}
          </p>
        </div>

        {/* Qualification Hero Badge */}
        <div className="flex flex-col items-end rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-4 shadow-sm min-w-[220px]">
          <div className="text-xs font-medium text-text-sub-600">Opportunity Score</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600">
              {scoring.overallScore ?? "—"}/100
            </span>
            <span className="text-lg font-bold text-text-strong-950">
              Grade {scoring.qualificationGrade || "N/A"}
            </span>
          </div>
          <div className="mt-2">
            {scoring.isQualified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <RiCheckLine className="h-3.5 w-3.5" /> Qualified (&ge;75)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <RiInformationLine className="h-3.5 w-3.5" /> Under Review
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] capitalize text-text-soft-400">
            Action: {scoring.recommendedAction?.replace(/_/g, " ") || "Pending"}
          </div>
        </div>
      </div>

      {/* ── ANIL APPROVAL GATE NOTICE ────────────────────────────────────────── */}
      <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50/60 p-4 text-xs text-amber-900 shadow-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
        <div className="flex items-center gap-2 font-semibold">
          <RiLock2Line className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          Anil Approval Security Guard Active
        </div>
        <p className="mt-1 text-text-sub-600">
          Proposal dispatch and client communications are strictly locked. Only Anil&apos;s authenticated account (<code>anil@nexgen.ai</code>) can authorize technical proposal generation and outreach execution.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── LEFT 2 COLUMNS: TECHNICAL ANALYSIS & BLUEPRINTS ───────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* 5-Factor Scoring Breakdown */}
          <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-text-strong-950">
              5-Factor Opportunity Scoring Matrix
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-text-sub-600">Budget Viability (Weight: 25%)</span>
                  <span className="font-bold text-text-strong-950">{scoring.budgetViabilityScore ?? 55}/100</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-bg-weak-50">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${scoring.budgetViabilityScore ?? 55}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-text-sub-600">Technology Alignment (Weight: 25%)</span>
                  <span className="font-bold text-text-strong-950">{scoring.techStackAlignmentScore ?? 80}/100</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-bg-weak-50">
                  <div className="h-full rounded-full bg-indigo-600" style={{ width: `${scoring.techStackAlignmentScore ?? 80}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-text-sub-600">Client Legitimacy (Weight: 20%)</span>
                  <span className="font-bold text-text-strong-950">{scoring.clientLegitimacyScore ?? 70}/100</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-bg-weak-50">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${scoring.clientLegitimacyScore ?? 70}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-text-sub-600">Competition Factor (Weight: 15% - High Score = Favorable)</span>
                  <span className="font-bold text-text-strong-950">{scoring.competitionScore ?? 75}/100</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-bg-weak-50">
                  <div className="h-full rounded-full bg-purple-600" style={{ width: `${scoring.competitionScore ?? 75}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-text-sub-600">Timeline Feasibility (Weight: 15%)</span>
                  <span className="font-bold text-text-strong-950">{scoring.timelineFeasibilityScore ?? 85}/100</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-bg-weak-50">
                  <div className="h-full rounded-full bg-amber-600" style={{ width: `${scoring.timelineFeasibilityScore ?? 85}%` }} />
                </div>
              </div>
            </div>

            {scoring.reasoningSummary && (
              <div className="mt-4 rounded-lg bg-bg-weak-50 p-3 text-xs leading-relaxed text-text-sub-600">
                <span className="font-semibold text-text-strong-950">Evaluation Reasoning: </span>
                {scoring.reasoningSummary}
              </div>
            )}
          </div>

          {/* Recommended Architecture Blueprint */}
          {technicalAnalysis.recommendedArchitecture && (
            <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <RiCpuLine className="h-5 w-5 text-indigo-600" />
                <h2 className="text-sm font-semibold text-text-strong-950">
                  Recommended Architecture Blueprint: {technicalAnalysis.recommendedArchitecture.pattern.replace(/_/g, " ").toUpperCase()}
                </h2>
              </div>

              <p className="text-xs text-text-sub-600 mb-4">
                {technicalAnalysis.recommendedArchitecture.summary}
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border border-stroke-soft-200 p-3">
                  <div className="font-semibold text-text-strong-950 mb-1">Database Layer</div>
                  <ul className="list-disc pl-4 text-text-sub-600 space-y-1">
                    {technicalAnalysis.recommendedArchitecture.databaseRequirements.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-stroke-soft-200 p-3">
                  <div className="font-semibold text-text-strong-950 mb-1">API & Integration Layer</div>
                  <ul className="list-disc pl-4 text-text-sub-600 space-y-1">
                    {technicalAnalysis.recommendedArchitecture.apiRequirements.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-stroke-soft-200 p-3">
                  <div className="font-semibold text-text-strong-950 mb-1">Frontend Engineering</div>
                  <ul className="list-disc pl-4 text-text-sub-600 space-y-1">
                    {technicalAnalysis.recommendedArchitecture.frontendRequirements.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-stroke-soft-200 p-3">
                  <div className="font-semibold text-text-strong-950 mb-1">Backend & Workers</div>
                  <ul className="list-disc pl-4 text-text-sub-600 space-y-1">
                    {technicalAnalysis.recommendedArchitecture.backendRequirements.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Development Milestones */}
          {technicalAnalysis.milestones && technicalAnalysis.milestones.length > 0 && (
            <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-strong-950">Development Milestones</h2>
                <span className="text-[11px] text-text-soft-400">Architectural Projection</span>
              </div>

              <div className="space-y-3">
                {technicalAnalysis.milestones.map((m) => (
                  <div key={m.phase} className="rounded-lg border border-stroke-soft-200 p-3 text-xs">
                    <div className="flex items-center justify-between font-semibold text-text-strong-950">
                      <span>Phase {m.phase}: {m.title}</span>
                      <span className="text-blue-600">{m.durationWeeks} weeks ({m.costAllocationPercent}%)</span>
                    </div>
                    <ul className="mt-2 list-disc pl-4 text-text-sub-600 space-y-0.5">
                      {m.deliverables.map((del, dIdx) => (
                        <li key={dIdx}>{del}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="mt-4 text-[11px] italic text-text-soft-400">
                Notice: Estimates are technical discovery projections and must never be presented as confirmed client commitments.
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: CLIENT INTELLIGENCE & RISKS ───────────────────────── */}
        <div className="space-y-6">
          {/* Client Research Card */}
          <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-sm text-xs">
            <h2 className="mb-3 text-sm font-semibold text-text-strong-950">
              Client & Enterprise Intelligence
            </h2>

            <div className="space-y-2.5">
              <div className="flex justify-between border-b border-stroke-soft-200 pb-2">
                <span className="text-text-sub-600">Company Name</span>
                <span className="font-semibold text-text-strong-950">{clientProfile.companyName || "Confidential"}</span>
              </div>

              <div className="flex justify-between border-b border-stroke-soft-200 pb-2">
                <span className="text-text-sub-600">Corporate Domain</span>
                <span className="font-semibold text-text-strong-950">{clientProfile.domain || "Unspecified"}</span>
              </div>

              <div className="flex justify-between border-b border-stroke-soft-200 pb-2">
                <span className="text-text-sub-600">Country / Jurisdiction</span>
                <span className="font-semibold text-text-strong-950">{clientProfile.country || "Global"}</span>
              </div>

              <div className="flex justify-between border-b border-stroke-soft-200 pb-2">
                <span className="text-text-sub-600">Credibility Tier</span>
                <span className="font-semibold capitalize text-emerald-600">{clientProfile.credibilityTier.replace(/_/g, " ")}</span>
              </div>
            </div>

            {/* Evidence Links */}
            {clientProfile.evidenceUrls && clientProfile.evidenceUrls.length > 0 && (
              <div className="mt-4">
                <div className="font-semibold text-text-strong-950 mb-1.5">Factual Evidence Links</div>
                <div className="space-y-1">
                  {clientProfile.evidenceUrls.map((ev, eIdx) => (
                    <a
                      key={eIdx}
                      href={ev.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate rounded bg-bg-weak-50 px-2 py-1 text-[11px] text-blue-600 hover:underline"
                    >
                      {ev.fact}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Information */}
            {clientProfile.missingInformation && clientProfile.missingInformation.length > 0 && (
              <div className="mt-4">
                <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1.5">Information Gaps</div>
                <ul className="list-disc pl-4 text-text-sub-600 space-y-0.5 text-[11px]">
                  {clientProfile.missingInformation.map((m, mIdx) => (
                    <li key={mIdx}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Delivery & Technical Risks */}
          {technicalAnalysis.deliveryRisks && technicalAnalysis.deliveryRisks.length > 0 && (
            <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-sm text-xs">
              <h2 className="mb-3 text-sm font-semibold text-text-strong-950">
                Identified Technical & Delivery Risks
              </h2>

              <div className="space-y-3">
                {technicalAnalysis.deliveryRisks.map((risk, rIdx) => (
                  <div key={rIdx} className="rounded-lg border border-rose-200 bg-rose-50/20 p-2.5 dark:border-rose-950 dark:bg-rose-950/10">
                    <div className="flex items-center justify-between font-semibold text-rose-800 dark:text-rose-300">
                      <span className="capitalize">{risk.category} Risk</span>
                      <span className="uppercase text-[10px]">{risk.severity}</span>
                    </div>
                    <div className="mt-1 text-text-sub-600">{risk.description}</div>
                    <div className="mt-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                      Mitigation: {risk.mitigationStrategy}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── AGENT 5: AI TECHNICAL PROPOSAL & HUMAN APPROVAL SECTION ───────────── */}
      <div className="mt-8 border-t border-stroke-soft-200 pt-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Agent 5
              </span>
              <h2 className="text-lg font-bold text-text-strong-950">
                AI Technical Proposal & Commercial Blueprint
              </h2>
              {proposal && (
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  v{proposal.version}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-text-sub-600">
              Synthesizing requirements analysis, multi-factor scoring, architecture blueprints, and velocity-based commercial estimations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {proposal && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                  proposal.status === "approved"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : proposal.status === "rejected"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    : proposal.status === "revision_requested"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {proposal.status === "approved" && <RiCheckLine className="mr-1 h-3.5 w-3.5" />}
                {proposal.status.replace(/_/g, " ")}
              </span>
            )}

            <button
              onClick={() => handleGenerateProposal(proposal?.reviewerFeedback || undefined)}
              disabled={generatingProposal || proposalLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {generatingProposal ? (
                <>
                  <RiLoader4Line className="h-4 w-4 animate-spin" />
                  Generating Proposal...
                </>
              ) : (
                <>
                  <RiSparklingLine className="h-4 w-4" />
                  {proposal ? `Generate Revision (v${proposal.version + 1})` : "Generate Proposal (Agent 5)"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications & Action Banners */}
        {approvalSuccess && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            {approvalSuccess}
          </div>
        )}
        {approvalError && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs font-medium text-rose-800 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-300">
            {approvalError}
          </div>
        )}

        {/* Proposal Content or Empty State */}
        {!proposal ? (
          <div className="rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 p-8 text-center">
            <RiFileTextLine className="mx-auto h-8 w-8 text-text-soft-400" />
            <h3 className="mt-2 text-sm font-semibold text-text-strong-950">
              No Proposal Generated Yet
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-text-sub-600">
              Agent 5 generates a full technical proposal with architecture blueprints, phased milestone schedules, and objective commercial estimates tailored to this opportunity.
            </p>
            <button
              onClick={() => handleGenerateProposal()}
              disabled={generatingProposal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <RiSparklingLine className="h-4 w-4" />
              Generate Proposal Now
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── HUMAN APPROVAL ACTION GATE CARD ── */}
            <div
              className={`rounded-xl border p-5 shadow-sm ${
                proposal.status === "approved"
                  ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900 dark:bg-emerald-950/10"
                  : proposal.status === "rejected"
                  ? "border-rose-200 bg-rose-50/20 dark:border-rose-950 dark:bg-rose-950/10"
                  : "border-amber-200 bg-amber-50/20 dark:border-amber-900 dark:bg-amber-950/10"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <RiLock2Line className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                    <h3 className="text-sm font-semibold text-text-strong-950">
                      Human Approval Security Gate (Owner: Anil)
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-text-sub-600">
                    Strict Policy: Only Anil&apos;s authenticated account (<code>anil@nexgen.ai</code>) is authorized to approve proposals. External dispatch is locked by default.
                  </p>
                </div>

                {proposal.status === "approved" && (
                  <div className="rounded-lg bg-emerald-100/80 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Approved by Anil (User: {proposal.approvedByUserId || "anil@nexgen.ai"})
                    {proposal.approvedAt && ` on ${new Date(proposal.approvedAt).toLocaleDateString()}`}
                  </div>
                )}
              </div>

              {proposal.status === "approved" ? (
                <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <div className="font-semibold">Human Approval Granted</div>
                  <div className="mt-0.5 text-text-sub-600">
                    Proposal is verified and authorized for client presentation. External outreach dispatch is currently locked by system safety policy (<code>ALLOW_EXTERNAL_OUTREACH</code> is disabled).
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-text-sub-600 mb-1">
                      Reviewer Feedback / Revision Notes:
                    </label>
                    <textarea
                      rows={2}
                      value={reviewerFeedback}
                      onChange={(e) => setReviewerFeedback(e.target.value)}
                      placeholder="Add specific architecture feedback, commercial adjustments, or revision requirements..."
                      className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-2.5 text-xs text-text-strong-950 outline-none focus:border-blue-500"
                    />
                  </div>

                  {proposal.reviewerFeedback && (
                    <div className="rounded-lg bg-bg-weak-50 p-2.5 text-xs text-text-sub-600">
                      <span className="font-semibold text-text-strong-950">Previous Feedback: </span>
                      {proposal.reviewerFeedback}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleApprovalDecision("approve")}
                      disabled={reviewingProposal}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <RiCheckLine className="h-4 w-4" />
                      Approve Proposal (Anil Only)
                    </button>

                    <button
                      onClick={() => handleApprovalDecision("request_revision")}
                      disabled={reviewingProposal || !reviewerFeedback.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
                    >
                      <RiFileEditLine className="h-4 w-4" />
                      Request Revision
                    </button>

                    <button
                      onClick={() => handleApprovalDecision("reject")}
                      disabled={reviewingProposal}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                    >
                      <RiCloseCircleLine className="h-4 w-4" />
                      Reject Proposal
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── PROPOSAL DOCUMENT CONTENT ── */}
            <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 shadow-sm space-y-6">
              {/* Proposal Header */}
              <div className="border-b border-stroke-soft-200 pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-text-strong-950">
                    {proposal.title}
                  </h3>
                  <span className="text-xs text-text-soft-400">
                    Generated: {new Date(proposal.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-3 text-xs leading-relaxed text-text-sub-600">
                  <span className="font-semibold text-text-strong-950">Executive Summary: </span>
                  {proposal.executiveSummary}
                </div>
              </div>

              {/* Requirements Understanding */}
              {proposal.architectureBlueprint?.requirementsUnderstanding && (
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-strong-950">
                    Requirements Understanding & Scope Analysis
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                    <div className="rounded-lg bg-bg-weak-50 p-3">
                      <div className="font-semibold text-text-strong-950 mb-1">Business Objectives</div>
                      <ul className="list-disc pl-4 text-text-sub-600 space-y-1">
                        {proposal.architectureBlueprint.requirementsUnderstanding.businessObjectives?.map((b: string, i: number) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg bg-bg-weak-50 p-3">
                      <div className="font-semibold text-text-strong-950 mb-1">Technical Requirements</div>
                      <ul className="list-disc pl-4 text-text-sub-600 space-y-1">
                        {proposal.architectureBlueprint.requirementsUnderstanding.technicalRequirements?.map((t: string, i: number) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Proposed Solution & Architecture */}
              {proposal.proposedSolution && (
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-strong-950">
                    Proposed Solution & Technical Architecture
                  </h4>
                  <div className="rounded-lg border border-stroke-soft-200 p-4 text-xs leading-relaxed text-text-sub-600">
                    {proposal.proposedSolution}
                  </div>
                </div>
              )}

              {/* Recommended Tech Stack */}
              {proposal.techStackRecommendations && (
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-strong-950">
                    Recommended Technology Stack
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(proposal.techStackRecommendations) ? (
                      proposal.techStackRecommendations.map((tech: string, i: number) => (
                        <span key={i} className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {tech}
                        </span>
                      ))
                    ) : (
                      Object.entries(proposal.techStackRecommendations).map(([layer, techs]: [string, any]) => (
                        <div key={layer} className="rounded-lg bg-bg-weak-50 p-2 text-xs">
                          <span className="font-semibold text-text-strong-950 capitalize">{layer}: </span>
                          <span className="text-text-sub-600">
                            {Array.isArray(techs) ? techs.join(", ") : String(techs)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Milestones & Phased Delivery Table */}
              {proposal.milestones && proposal.milestones.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-strong-950">
                      Phased Delivery Milestones & Work Breakdown
                    </h4>
                    <span className="text-xs text-text-soft-400">
                      Total Duration: {proposal.estimatedDurationWeeks ?? "—"} Weeks
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-stroke-soft-200 text-xs">
                    <table className="min-w-full divide-y divide-stroke-soft-200 text-left">
                      <thead className="bg-bg-weak-50 text-text-sub-600">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Phase</th>
                          <th className="px-3 py-2 font-semibold">Milestone Title</th>
                          <th className="px-3 py-2 font-semibold">Duration</th>
                          <th className="px-3 py-2 font-semibold">Allocation</th>
                          <th className="px-3 py-2 font-semibold">Deliverables</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stroke-soft-200">
                        {proposal.milestones.map((m) => (
                          <tr key={m.phase}>
                            <td className="px-3 py-2 font-bold text-text-strong-950">Phase {m.phase}</td>
                            <td className="px-3 py-2 font-medium text-text-strong-950">{m.title}</td>
                            <td className="px-3 py-2 text-text-sub-600">{m.durationWeeks} weeks</td>
                            <td className="px-3 py-2 text-text-sub-600">{m.costAllocationPercent}%</td>
                            <td className="px-3 py-2 text-text-sub-600">
                              <ul className="list-disc pl-4 space-y-0.5">
                                {m.deliverables?.map((del, dIdx) => (
                                  <li key={dIdx}>{del}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Commercial Estimation & Disclaimers */}
              <div className="rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stroke-soft-200 pb-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-text-sub-600">
                      Commercial Budget Recommendation
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-blue-600">
                        {proposal.currency} {proposal.totalCostEstimate ? proposal.totalCostEstimate.toLocaleString() : "Undisclosed"}
                      </span>
                      <span className="text-xs text-text-sub-600">
                        ({proposal.estimatedDurationWeeks || 0} weeks estimated delivery)
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-text-sub-600 sm:text-right">
                    <div className="font-semibold text-text-strong-950">Pricing Model: Sprint Velocity</div>
                    <div>Standard $3,500 - $7,500 / week velocity band</div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-amber-50/50 p-3 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
                  <span className="font-semibold">Mandatory Estimates Disclaimer: </span>
                  All budgetary estimates, timelines, and architectural milestones are automated discovery projections based on engineering scope complexity and NexGen Agency sprint velocity. They must never be represented as confirmed client commitments without formal discovery validation.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── AGENT 6: MULTI-CHANNEL CLIENT OUTREACH MANAGER ──────────────────── */}
      <div className="mt-12 border-t border-stroke-soft-200 pt-8 pb-12">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Agent 6
              </span>
              <h2 className="text-lg font-bold text-text-strong-950">
                Multi-Channel Client Outreach Manager
              </h2>
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <RiLock2Line className="h-3.5 w-3.5" /> External Sending Locked
              </span>
            </div>
            <p className="mt-1 text-xs text-text-sub-600">
              Personalized client communications (Email, LinkedIn, WhatsApp) generated strictly from approved technical proposals with zero-hallucination guardrails.
            </p>
          </div>

          {proposal?.status === "approved" && (
            <button
              onClick={() => handleGenerateOutreach()}
              disabled={generatingOutreach || outreachLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {generatingOutreach ? (
                <>
                  <RiLoader4Line className="h-4 w-4 animate-spin" />
                  Generating Outreach Drafts...
                </>
              ) : (
                <>
                  <RiSparklingLine className="h-4 w-4" />
                  {outreachMessages.length > 0 ? "Regenerate All Drafts (Agent 6)" : "Generate Outreach Drafts (Agent 6)"}
                </>
              )}
            </button>
          )}
        </div>

        {/* Outreach Feedback Messages */}
        {outreachSuccess && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            {outreachSuccess}
          </div>
        )}
        {outreachError && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs font-medium text-rose-800 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-300">
            {outreachError}
          </div>
        )}

        {/* Prerequisite Gate: Proposal Approval Required */}
        {proposal?.status !== "approved" ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-6 text-amber-900 shadow-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <RiAlertLine className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Prerequisite Gate: Human Proposal Approval Required
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-sub-600">
              Agent 6 Outreach draft generation requires an explicit Human Approval on the technical proposal from Anil. Proposals must be in <code className="font-semibold">approved</code> status before client communication drafts can be synthesized.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="font-semibold text-text-strong-950">Current Proposal Status:</span>
              <span className="rounded bg-amber-100 px-2 py-0.5 font-medium capitalize text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {proposal ? proposal.status.replace(/_/g, " ") : "Not Generated Yet"}
              </span>
            </div>
          </div>
        ) : outreachMessages.length === 0 ? (
          /* Empty State for Approved Proposals */
          <div className="rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 p-8 text-center">
            <RiMailLine className="mx-auto h-8 w-8 text-text-soft-400" />
            <h3 className="mt-2 text-sm font-semibold text-text-strong-950">
              No Outreach Messages Generated Yet
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-text-sub-600">
              The technical proposal is approved. You can now generate tailored client communication drafts across Email, LinkedIn, and WhatsApp using Agent 6.
            </p>
            <button
              onClick={() => handleGenerateOutreach()}
              disabled={generatingOutreach}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              <RiSparklingLine className="h-4 w-4" />
              Generate Multi-Channel Outreach Drafts
            </button>
          </div>
        ) : (
          /* Outreach Tabs & Content */
          <div className="space-y-6">
            {/* Channel Selection Tabs */}
            <div className="flex border-b border-stroke-soft-200">
              {(["email", "linkedin", "whatsapp"] as const).map((channel) => {
                const msg = outreachMessages.find((m) => m.channel === channel);
                const isActive = selectedChannelTab === channel;
                return (
                  <button
                    key={channel}
                    onClick={() => {
                      setSelectedChannelTab(channel);
                      setEditingMessageId(null);
                    }}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition ${
                      isActive
                        ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                        : "border-transparent text-text-sub-600 hover:text-text-strong-950"
                    }`}
                  >
                    <span className="capitalize">{channel}</span>
                    {msg && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          msg.status === "approved"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : msg.status === "rejected"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : msg.status === "revision_requested"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        v{msg.version} • {msg.status.replace(/_/g, " ")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Channel Message Container */}
            {(() => {
              const currentMessage = outreachMessages.find((m) => m.channel === selectedChannelTab);

              if (!currentMessage) {
                return (
                  <div className="rounded-xl border border-dashed border-stroke-soft-200 p-6 text-center text-xs text-text-sub-600">
                    No draft generated yet for <span className="font-semibold capitalize">{selectedChannelTab}</span>.
                    <button
                      onClick={() => handleGenerateOutreach(selectedChannelTab)}
                      disabled={generatingOutreach}
                      className="ml-3 inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline"
                    >
                      Generate {selectedChannelTab} draft now
                    </button>
                  </div>
                );
              }

              const isEditing = editingMessageId === currentMessage.id;
              const charCount = isEditing ? editBody.length : currentMessage.body.length;
              const isOverLinkedInLimit = currentMessage.channel === "linkedin" && charCount > 300;

              return (
                <div className="space-y-6">
                  {/* Context Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-4 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <span className="text-text-sub-600">Target Recipient: </span>
                        <span className="font-semibold text-text-strong-950">
                          {currentMessage.metadata?.recipientName || clientProfile.companyName || "Hiring Team / Engineering Leadership"}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-sub-600">Company: </span>
                        <span className="font-semibold text-text-strong-950">
                          {currentMessage.metadata?.companyName || clientProfile.companyName || "Confidential (Discovery Scope)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-sub-600">Channel Guardrail: </span>
                        <span className={`font-semibold ${isOverLinkedInLimit ? "text-rose-600" : "text-text-strong-950"}`}>
                          {currentMessage.channel === "linkedin"
                            ? `${charCount} / 300 characters (Strict Limit)`
                            : `${charCount} characters`}
                        </span>
                      </div>
                    </div>

                    {!isEditing && (currentMessage.status === "draft" || currentMessage.status === "pending_approval" || currentMessage.status === "revision_requested") && (
                      <button
                        onClick={() => handleStartEdit(currentMessage)}
                        className="inline-flex items-center gap-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-1.5 text-xs font-semibold text-text-strong-950 shadow-sm hover:bg-bg-weak-50"
                      >
                        <RiFileEditLine className="h-3.5 w-3.5" /> Edit Draft
                      </button>
                    )}
                  </div>

                  {/* Message Body & Subject Card */}
                  <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 shadow-sm">
                    {isEditing ? (
                      <div className="space-y-4">
                        {currentMessage.channel === "email" && (
                          <div>
                            <label className="block text-xs font-semibold text-text-strong-950 mb-1">
                              Email Subject Line:
                            </label>
                            <input
                              type="text"
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                              className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-2.5 text-xs text-text-strong-950 outline-none focus:border-blue-500"
                            />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-text-strong-950">
                              Message Content:
                            </label>
                            {currentMessage.channel === "linkedin" && (
                              <span className={`text-[11px] font-medium ${editBody.length > 300 ? "text-rose-600 font-bold" : "text-text-sub-600"}`}>
                                {editBody.length} / 300 chars
                              </span>
                            )}
                          </div>
                          <textarea
                            rows={8}
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 text-xs leading-relaxed text-text-strong-950 font-mono outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveEdit(currentMessage.id)}
                            disabled={savingEdit || (currentMessage.channel === "linkedin" && editBody.length > 300)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {savingEdit ? <RiLoader4Line className="h-4 w-4 animate-spin" /> : <RiCheckLine className="h-4 w-4" />}
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingMessageId(null)}
                            className="rounded-lg border border-stroke-soft-200 px-3 py-1.5 text-xs font-medium text-text-sub-600 hover:bg-bg-weak-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {currentMessage.subject && (
                          <div className="border-b border-stroke-soft-200 pb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-text-sub-600">Subject: </span>
                            <span className="text-sm font-semibold text-text-strong-950">{currentMessage.subject}</span>
                          </div>
                        )}

                        <div className="whitespace-pre-wrap rounded-lg bg-bg-weak-50 p-4 font-sans text-xs leading-relaxed text-text-strong-950">
                          {currentMessage.body}
                        </div>

                        {currentMessage.channel === "email" && (
                          <div className="rounded border border-stroke-soft-200 bg-bg-weak-50 p-2 text-[10px] italic text-text-soft-400">
                            Opt-out notice: If this message is not relevant, reply &ldquo;unsubscribe&rdquo; to be removed from future technical discovery communications.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── ANIL OUTREACH APPROVAL SECURITY GATE ── */}
                  <div
                    className={`rounded-xl border p-5 shadow-sm ${
                      currentMessage.status === "approved"
                        ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900 dark:bg-emerald-950/10"
                        : currentMessage.status === "rejected"
                        ? "border-rose-200 bg-rose-50/20 dark:border-rose-950 dark:bg-rose-950/10"
                        : "border-amber-200 bg-amber-50/20 dark:border-amber-900 dark:bg-amber-950/10"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <RiLock2Line className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                          <h3 className="text-sm font-semibold text-text-strong-950">
                            Human Outreach Authorization Gate (Owner: Anil)
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-text-sub-600">
                          Strict Policy: Only Anil&apos;s authenticated account (<code>anil@nexgen.ai</code>) is authorized to approve outreach messages. Autonomous external sending is permanently disabled.
                        </p>
                      </div>

                      {currentMessage.status === "approved" && (
                        <div className="rounded-lg bg-emerald-100/80 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Approved by Anil ({currentMessage.approvedByUserId || "anil@nexgen.ai"})
                          {currentMessage.approvedAt && ` on ${new Date(currentMessage.approvedAt).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>

                    {currentMessage.status === "approved" ? (
                      <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <div className="font-semibold">Message Verified & Authorized</div>
                        <div className="mt-0.5 text-text-sub-600">
                          This draft has been approved for client outreach. Automated external dispatch is blocked by policy guardrails (<code>ALLOW_EXTERNAL_OUTREACH</code> is disabled).
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-text-sub-600 mb-1">
                            Reviewer Feedback / Revision Instructions:
                          </label>
                          <textarea
                            rows={2}
                            value={outreachFeedbackInput}
                            onChange={(e) => setOutreachFeedbackInput(e.target.value)}
                            placeholder="Add tone adjustments, specific phrasing requests, or rejection rationale..."
                            className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-2.5 text-xs text-text-strong-950 outline-none focus:border-blue-500"
                          />
                        </div>

                        {currentMessage.revisionFeedback && (
                          <div className="rounded-lg bg-bg-weak-50 p-2.5 text-xs text-text-sub-600">
                            <span className="font-semibold text-text-strong-950">Previous Revision Feedback: </span>
                            {currentMessage.revisionFeedback}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleOutreachDecision(currentMessage.id, "approve")}
                            disabled={outreachDecisionLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <RiCheckLine className="h-4 w-4" />
                            Approve Outreach (Anil Only)
                          </button>

                          <button
                            onClick={() => handleOutreachDecision(currentMessage.id, "request_revision")}
                            disabled={outreachDecisionLoading || !outreachFeedbackInput.trim()}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
                          >
                            <RiFileEditLine className="h-4 w-4" />
                            Request Revision
                          </button>

                          <button
                            onClick={() => handleOutreachDecision(currentMessage.id, "reject")}
                            disabled={outreachDecisionLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                          >
                            <RiCloseCircleLine className="h-4 w-4" />
                            Reject Outreach
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── ACTIVITY & AUDIT TIMELINE ── */}
                  {currentMessage.activityHistory && currentMessage.activityHistory.length > 0 && (
                    <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 shadow-sm text-xs">
                      <h4 className="font-semibold text-text-strong-950 mb-3">Audit & Execution Timeline</h4>
                      <div className="space-y-2 border-l-2 border-stroke-soft-200 pl-3">
                        {currentMessage.activityHistory.map((ev, eIdx) => (
                          <div key={eIdx} className="text-text-sub-600">
                            <span className="font-medium text-text-strong-950 capitalize">{ev.action.replace(/_/g, " ")}</span>
                            {ev.performedByUserId && <span className="ml-1 text-[11px]">by {ev.performedByUserId}</span>}
                            <span className="ml-2 text-[10px] text-text-soft-400">
                              {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {ev.details && <div className="text-[11px] text-text-soft-400 mt-0.5">{ev.details}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── AGENT 7: AI FOLLOW-UP MANAGER & RESPONSE TRACKING ──────────────── */}
      <div className="mt-12 border-t border-stroke-soft-200 pt-8 pb-16">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                Agent 7
              </span>
              <h2 className="text-lg font-bold text-text-strong-950">
                AI Follow-up Manager & Cadence Orchestration
              </h2>
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <RiLock2Line className="h-3.5 w-3.5" /> External Dispatch Locked
              </span>
            </div>
            <p className="mt-1 text-xs text-text-sub-600">
              Coordinates multi-step follow-up sequences across Email, LinkedIn, and WhatsApp. Enforces business-day scheduling, client response classification, immediate stop conditions, and Anil&apos;s mandatory human approval.
            </p>
          </div>

          {followupSequence && (
            <div className="flex items-center gap-2">
              {followupSequence.status === "active" && (
                <button
                  onClick={() => handleSequenceStatusChange("pause")}
                  className="rounded-lg border border-stroke-soft-200 px-3 py-1.5 text-xs font-semibold text-text-sub-600 shadow-sm hover:bg-bg-weak-50"
                >
                  Pause Sequence
                </button>
              )}
              {followupSequence.status === "paused" && (
                <button
                  onClick={() => handleSequenceStatusChange("resume")}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Resume Sequence
                </button>
              )}
              {followupSequence.status !== "cancelled" && followupSequence.status !== "opted_out" && (
                <button
                  onClick={() => handleSequenceStatusChange("cancel")}
                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50"
                >
                  Cancel Sequence
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feedback Banners */}
        {followupSuccess && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            {followupSuccess}
          </div>
        )}
        {followupError && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs font-medium text-rose-800 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-300">
            {followupError}
          </div>
        )}

        {/* Prerequisite Check: Requires approved outreach message */}
        {!outreachMessages.some((m) => m.status === "approved") ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-6 text-amber-900 shadow-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <RiAlertLine className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Prerequisite Gate: Approved Outreach Message Required
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-sub-600">
              Agent 7 Follow-up sequences require at least one outreach message (Email, LinkedIn, or WhatsApp) to be reviewed and approved by Anil in Agent 6. Follow-up sequences cannot be launched without an authorized initial outreach communication.
            </p>
          </div>
        ) : !followupSequence ? (
          /* Empty State: Initialize Follow-up Cadence */
          <div className="rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 p-8 text-center">
            <RiTimeLine className="mx-auto h-8 w-8 text-text-soft-400" />
            <h3 className="mt-2 text-sm font-semibold text-text-strong-950">
              No Follow-up Sequence Initialized
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-text-sub-600">
              An authorized outreach draft is ready. Initialize an automated follow-up cadence (3 business days $\to$ 5 business days $\to$ 7 business days) with Anil human approval required on every step.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => handleCreateSequence("email")}
                disabled={creatingSequence}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
              >
                <RiSparklingLine className="h-4 w-4" />
                Initialize Email Follow-up Cadence (3 Steps)
              </button>
              <button
                onClick={() => handleCreateSequence("linkedin")}
                disabled={creatingSequence}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-4 py-2 text-xs font-semibold text-text-strong-950 shadow-sm hover:bg-bg-weak-50 disabled:opacity-50"
              >
                LinkedIn Sequence
              </button>
              <button
                onClick={() => handleCreateSequence("whatsapp")}
                disabled={creatingSequence}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-4 py-2 text-xs font-semibold text-text-strong-950 shadow-sm hover:bg-bg-weak-50 disabled:opacity-50"
              >
                WhatsApp Sequence
              </button>
            </div>
          </div>
        ) : (
          /* Active Sequence Workspace */
          <div className="space-y-6">
            {/* 1. Cadence & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-4 text-xs">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-text-sub-600">Current Cadence Step: </span>
                  <span className="font-bold text-text-strong-950">
                    Step {followupSequence.currentStep} of {followupSequence.maxSteps}
                  </span>
                </div>
                <div>
                  <span className="text-text-sub-600">Channel: </span>
                  <span className="font-bold uppercase text-teal-700 dark:text-teal-400">
                    {followupSequence.channel}
                  </span>
                </div>
                <div>
                  <span className="text-text-sub-600">Next Follow-up Due: </span>
                  <span className="font-bold text-text-strong-950">
                    {followupSequence.nextFollowupDue
                      ? new Date(followupSequence.nextFollowupDue).toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-text-sub-600">Sequence Status: </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      followupSequence.status === "active"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : followupSequence.status === "response_received"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        : followupSequence.status === "opted_out"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : followupSequence.status === "paused"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {followupSequence.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {followupSequence.pauseReason && (
                <div className="w-full text-[11px] text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">Status Notice: </span>
                  {followupSequence.pauseReason}
                </div>
              )}
            </div>

            {/* 2. Channel Integration Availability Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
              {Object.entries(channelIntegrations).map(([ch, info]: [string, any]) => (
                <div
                  key={ch}
                  className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between font-semibold text-text-strong-950 capitalize mb-1">
                    <span>{ch} Connector</span>
                    <span
                      className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${
                        info?.mode === "live"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {info?.mode === "live" ? "Live Webhook" : "Manual Sync"}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-sub-600 leading-relaxed">{info?.notice}</div>
                </div>
              ))}
            </div>

            {/* 3. Client Response Log & Manual Entry */}
            <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-sm space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-strong-950">
                    Client Response Log & AI Sentiment Classification
                  </h3>
                  <p className="text-xs text-text-sub-600">
                    Client replies trigger immediate sequence pauses. Opt-out requests permanently suppress further contact.
                  </p>
                </div>
                <button
                  onClick={() => setShowManualResponseForm(!showManualResponseForm)}
                  className="rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-1.5 text-xs font-semibold text-text-strong-950 shadow-sm hover:bg-bg-white-0"
                >
                  {showManualResponseForm ? "Cancel Recording" : "+ Record Inbound Response"}
                </button>
              </div>

              {/* Manual Response Entry Form */}
              {showManualResponseForm && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 text-xs space-y-3 dark:border-blue-900 dark:bg-blue-950/20">
                  <div className="font-semibold text-text-strong-950">Record Inbound Client Communication</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-medium text-text-sub-600 mb-1">Sender Email / Contact ID:</label>
                      <input
                        type="text"
                        value={manualSenderContact}
                        onChange={(e) => setManualSenderContact(e.target.value)}
                        placeholder="e.g. client@example.com"
                        className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-2 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-text-sub-600 mb-1">Channel:</label>
                      <select
                        value={manualChannel}
                        onChange={(e) => setManualChannel(e.target.value as any)}
                        className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-2 text-xs outline-none focus:border-blue-500"
                      >
                        <option value="email">Email</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-sub-600 mb-1">Subject (Optional):</label>
                    <input
                      type="text"
                      value={manualSubject}
                      onChange={(e) => setManualSubject(e.target.value)}
                      placeholder="e.g. Re: Technical Proposal"
                      className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-2 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-sub-600 mb-1">Message Content / Client Reply Text:</label>
                    <textarea
                      rows={3}
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      placeholder="Paste the client's actual message text here..."
                      className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-2.5 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleRecordManualResponse}
                    disabled={savingManualResponse || !manualSenderContact.trim() || !manualContent.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingManualResponse ? <RiLoader4Line className="h-4 w-4 animate-spin" /> : <RiCheckLine className="h-4 w-4" />}
                    Save & Classify Response
                  </button>
                </div>
              )}

              {/* Recorded Responses Timeline */}
              {clientResponses.length === 0 ? (
                <div className="rounded-lg border border-dashed border-stroke-soft-200 p-4 text-center text-xs text-text-sub-600">
                  No responses recorded yet for this opportunity. Sequence will continue according to scheduled intervals.
                </div>
              ) : (
                <div className="space-y-3">
                  {clientResponses.map((resp) => (
                    <div
                      key={resp.id}
                      className={`rounded-lg border p-4 text-xs space-y-2 ${
                        resp.classification === "opt_out_request"
                          ? "border-rose-300 bg-rose-50/30 dark:border-rose-900 dark:bg-rose-950/20"
                          : resp.classification === "interested" || resp.classification === "meeting_requested"
                          ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900 dark:bg-emerald-950/10"
                          : "border-stroke-soft-200 bg-bg-weak-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke-soft-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text-strong-950">{resp.senderContact}</span>
                          <span className="capitalize text-text-sub-600">via {resp.channel}</span>
                          {resp.isManual && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              Manual
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              resp.classification === "opt_out_request"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : resp.classification === "meeting_requested" || resp.classification === "interested"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : resp.classification === "negotiating_budget"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {resp.classification.replace(/_/g, " ")} ({Math.round(Number(resp.confidence) * 100)}%)
                          </span>
                          <span className="text-[11px] text-text-soft-400">
                            {new Date(resp.receivedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-text-strong-950 whitespace-pre-wrap">{resp.content}</div>

                      {resp.explanation && (
                        <div className="rounded bg-bg-white-0 p-2.5 text-[11px] text-text-sub-600 space-y-0.5 border border-stroke-soft-200">
                          <div>
                            <span className="font-semibold text-text-strong-950">Classification Reasoning: </span>
                            {resp.explanation}
                          </div>
                          {resp.recommendedAction && (
                            <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                              Recommended Next Action: {resp.recommendedAction}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Follow-up Tasks & Cadence Steps */}
            <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-text-strong-950">
                Follow-up Cadence Tasks (Anil Approval Required)
              </h3>

              <div className="space-y-4">
                {followupTasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-4 text-xs space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke-soft-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-strong-950">Step {t.stepNumber}</span>
                        <span className="text-text-sub-600">
                          {t.stepNumber === 1
                            ? "(Gentle Check-in & Architecture Spec)"
                            : t.stepNumber === 2
                            ? "(Velocity Plan & Technical Sprint Feasibility)"
                            : "(Final Discovery Cycle Closure)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-text-sub-600">
                          Due: {new Date(t.dueAt).toLocaleDateString()}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            t.status === "approved"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : t.status === "rejected"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : t.status === "revision_requested"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : t.status === "cancelled"
                              ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          v{t.version} • {t.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    {/* Task Draft Preview / Generator */}
                    {!t.body ? (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-text-sub-600">Draft not yet generated for Step {t.stepNumber}.</span>
                        <button
                          onClick={() => handleGenerateFollowupDraft(t.id)}
                          disabled={generatingFollowupDraft || followupSequence.status !== "active"}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
                        >
                          <RiSparklingLine className="h-4 w-4" />
                          Generate Step {t.stepNumber} Draft
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {t.subject && (
                          <div>
                            <span className="font-semibold text-text-strong-950">Subject: </span>
                            <span className="text-text-sub-600">{t.subject}</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap rounded-lg bg-bg-white-0 p-3 text-text-strong-950 border border-stroke-soft-200">
                          {t.body}
                        </div>

                        {/* Anil Human Approval Gate for Step Draft */}
                        <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/10">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-text-strong-950 flex items-center gap-1.5">
                              <RiLock2Line className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                              Step {t.stepNumber} Approval Security Gate (Anil Only)
                            </div>
                            {t.status === "approved" && (
                              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                Approved by Anil ({t.approvedByUserId})
                              </span>
                            )}
                          </div>

                          {t.status === "approved" ? (
                            <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                              Draft approved. External sending remains blocked by safety policy (<code>ALLOW_EXTERNAL_OUTREACH</code> is disabled).
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={followupFeedbackInput}
                                onChange={(e) => setFollowupFeedbackInput(e.target.value)}
                                placeholder="Add revision notes or guidance for this step..."
                                className="w-full rounded border border-stroke-soft-200 bg-bg-white-0 p-2 text-xs outline-none focus:border-blue-500"
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => handleFollowupDecision(t.id, "approve")}
                                  disabled={followupDecisionLoading}
                                  className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <RiCheckLine className="h-3.5 w-3.5" />
                                  Approve Step {t.stepNumber} (Anil Only)
                                </button>
                                <button
                                  onClick={() => handleFollowupDecision(t.id, "request_revision")}
                                  disabled={followupDecisionLoading || !followupFeedbackInput.trim()}
                                  className="inline-flex items-center gap-1 rounded bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
                                >
                                  Request Revision
                                </button>
                                <button
                                  onClick={() => handleFollowupDecision(t.id, "reject")}
                                  disabled={followupDecisionLoading}
                                  className="inline-flex items-center gap-1 rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                                >
                                  Reject Draft
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
