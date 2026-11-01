"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  RiArrowRightLine,
  RiCheckDoubleLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiCompass3Line,
  RiCpuLine,
  RiExternalLinkLine,
  RiFileTextLine,
  RiFilter3Line,
  RiGlobalLine,
  RiInformationLine,
  RiLoader4Line,
  RiMailLine,
  RiPlayCircleLine,
  RiRefreshLine,
  RiSearchLine,
  RiSendPlaneLine,
  RiShieldCheckLine,
  RiSparklingLine,
  RiSpeedUpLine,
  RiTimeLine,
} from "@remixicon/react";

type ProjectListing = {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategories: string[];
  sourcePlatform: string;
  sourceUrl?: string;
  clientName?: string;
  clientDomain?: string;
  clientCountry?: string;
  estimatedBudgetMin?: number | null;
  estimatedBudgetMax?: number | null;
  currency: string;
  budgetType: string;
  scopeComplexity?: string;
  timelineDays?: number | null;
  status: string;
  isVerified: boolean;
  credibilityScore: number;
  credibilityTier: string;
  overallScore?: number | null;
  qualificationGrade?: string;
  isQualified: boolean;
  recommendedAction: string;
  analysisSummary?: string;
};

type MetricsData = {
  dailyTargetQualified: number;
  progressTowardsDailyTarget: number;
  isTargetMet: boolean;
  totalProjectsDiscovered: number;
  verifiedProjectsCount: number;
  qualifiedProjectsCount: number;
  unverifiedProjectsCount: number;
  rejectedProjectsCount: number;
  duplicateProjectsCount: number;
  averageOpportunityScore: number;
  countryWiseBreakdown: Record<string, number>;
  categoryWiseBreakdown: Record<string, number>;
  clientResearchStatus: {
    verifiedEnterprise: number;
    establishedBusiness: number;
    earlyStageStartup: number;
    unverified: number;
    highRiskBlocked: number;
  };
  agentExecutionStatus: {
    hunterStatus: "active" | "idle" | "error";
    researcherStatus: "active" | "idle" | "error";
    analyzerStatus: "active" | "idle" | "error";
    scoringStatus: "active" | "idle" | "error";
    totalExecutions: number;
    failureCount: number;
  };
};

export default function ProjectsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [opportunities, setOpportunities] = useState<ProjectListing[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [proposalMetrics, setProposalMetrics] = useState<{
    total: number;
    pendingApproval: number;
    approved: number;
    rejected: number;
    revisionRequested: number;
    dispatched: number;
  } | null>(null);

  const [outreachMetrics, setOutreachMetrics] = useState<{
    total: number;
    drafts: number;
    pendingApproval: number;
    approved: number;
    rejected: number;
    revisionRequested: number;
    scheduled: number;
    sent: number;
    failed: number;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [res, propRes, outreachRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/proposals").catch(() => null),
        fetch("/api/outreach").catch(() => null),
      ]);
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setOpportunities(data.opportunities || []);
      setMetrics(data.metrics || null);

      if (propRes && propRes.ok) {
        const propData = await propRes.json();
        setProposalMetrics(propData.counts || null);
      }

      if (outreachRes && outreachRes.ok) {
        const outData = await outreachRes.json();
        setOutreachMetrics(outData.counts || null);
      }
    } catch (err) {
      console.error("Error loading projects dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerDiscovery = async () => {
    try {
      setTriggering(true);
      const res = await fetch("/api/projects", { method: "POST" });
      if (!res.ok) throw new Error("Discovery execution failed");
      await loadData();
    } catch (err) {
      console.error("Discovery error:", err);
      alert("Pipeline execution encountered an error. Check server logs.");
    } finally {
      setTriggering(false);
    }
  };

  // Extract unique categories & countries for filters
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => {
      if (o.category) set.add(o.category);
    });
    return Array.from(set).sort();
  }, [opportunities]);

  const countriesList = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => {
      if (o.clientCountry) set.add(o.clientCountry);
    });
    return Array.from(set).sort();
  }, [opportunities]);

  // Filtered listings
  const filteredListings = useMemo(() => {
    return opportunities.filter((o) => {
      const matchSearch =
        searchQuery === "" ||
        o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.clientName && o.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.description && o.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = categoryFilter === "all" || o.category === categoryFilter;
      const matchCountry = countryFilter === "all" || o.clientCountry === countryFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "qualified" && o.isQualified) ||
        (statusFilter === "verified" && o.isVerified) ||
        (statusFilter === "review" && !o.isQualified && o.status !== "rejected") ||
        (statusFilter === "rejected" && o.status === "rejected");

      return matchSearch && matchCategory && matchCountry && matchStatus;
    });
  }, [opportunities, searchQuery, categoryFilter, countryFilter, statusFilter]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-bg-white-0 px-6 py-8 text-text-strong-950">
      {/* ── TOP HEADER ───────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 border-b border-stroke-soft-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              NEXGEN GLOBAL AI
            </span>
            <span className="text-xs text-text-sub-600">Enterprise Agency Fleet</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-strong-950 sm:text-3xl">
            Global Project Discovery & Client Intelligence
          </h1>
          <p className="mt-1 text-sm text-text-sub-600">
            Automated 8-Agent discovery, deep client research, technical requirements analysis, and multi-factor qualification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading || triggering}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-xs font-medium text-text-sub-600 shadow-sm transition hover:bg-bg-weak-50"
          >
            <RiRefreshLine className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleTriggerDiscovery}
            disabled={triggering || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {triggering ? (
              <>
                <RiLoader4Line className="h-4 w-4 animate-spin" />
                Executing Agent Fleet...
              </>
            ) : (
              <>
                <RiPlayCircleLine className="h-4 w-4" />
                Trigger Discovery Pipeline
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── DAILY QUOTA HERO GAUGES ──────────────────────────────────────────── */}
      <div className="mb-8 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 p-5 dark:border-blue-900 dark:from-blue-950/20 dark:to-indigo-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <RiSpeedUpLine className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-text-strong-950">
                Daily Agency Qualification Goal: 40 Projects / Day
              </h2>
            </div>
            <p className="mt-1 text-xs text-text-sub-600">
              Only genuine software opportunities meeting the &ge;75/100 multi-factor qualification standard count toward target.
            </p>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-300">
                {metrics?.qualifiedProjectsCount ?? 0} / 40
              </div>
              <div className="text-xs font-medium text-text-sub-600">
                {metrics?.progressTowardsDailyTarget ?? 0}% achieved today
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/40">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${Math.min(100, metrics?.progressTowardsDailyTarget ?? 0)}%` }}
          />
        </div>
      </div>

      {/* ── SECTION 1: 11 EXECUTIVE METRIC CARDS ─────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 shadow-sm">
          <div className="text-xs font-medium text-text-sub-600">Total Discovered</div>
          <div className="mt-1 text-2xl font-bold text-text-strong-950">
            {metrics?.totalProjectsDiscovered ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-text-soft-400">All global sources</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/10">
          <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Verified Clients</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {metrics?.verifiedProjectsCount ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700/70">Factual footprint</div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/10">
          <div className="text-xs font-medium text-blue-800 dark:text-blue-300">Qualified (&ge;75)</div>
          <div className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-400">
            {metrics?.qualifiedProjectsCount ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-blue-700/70">Ready for proposals</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/10">
          <div className="text-xs font-medium text-amber-800 dark:text-amber-300">Unverified</div>
          <div className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
            {metrics?.unverifiedProjectsCount ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-amber-700/70">Requires discovery</div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 shadow-sm dark:border-rose-900 dark:bg-rose-950/10">
          <div className="text-xs font-medium text-rose-800 dark:text-rose-300">Rejected / Stale</div>
          <div className="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-400">
            {metrics?.rejectedProjectsCount ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-rose-700/70">Scams & expired</div>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/10">
          <div className="text-xs font-medium text-indigo-800 dark:text-indigo-300">Avg Score</div>
          <div className="mt-1 text-2xl font-bold text-indigo-700 dark:text-indigo-400">
            {metrics?.averageOpportunityScore ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-indigo-700/70">5-factor matrix</div>
        </div>
      </div>

      {/* ── PROPOSAL PIPELINE OVERVIEW BANNER ───────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-600 p-2 text-white">
            <RiFileTextLine className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-strong-950">
              Agent 5: Proposal Generation & Human Approval Status
            </div>
            <div className="text-xs text-text-sub-600">
              Technical proposals are synthesized from qualification reports and held for Anil&apos;s explicit review.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-1.5 shadow-sm">
            <span className="text-text-sub-600">Generated: </span>
            <span className="font-bold text-text-strong-950">{proposalMetrics?.total ?? 0}</span>
          </div>
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300 shadow-sm">
            <span>Pending Anil Approval: </span>
            <span className="font-bold">{proposalMetrics?.pendingApproval ?? 0}</span>
          </div>
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 shadow-sm">
            <span>Approved: </span>
            <span className="font-bold">{proposalMetrics?.approved ?? 0}</span>
          </div>
          <div className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 font-medium text-purple-800 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-300 shadow-sm">
            <span>Revision/Rejected: </span>
            <span className="font-bold">
              {(proposalMetrics?.revisionRequested ?? 0) + (proposalMetrics?.rejected ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* ── OUTREACH MANAGEMENT PIPELINE OVERVIEW BANNER ───────────────────── */}
      <div className="mb-8 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-600 p-2 text-white">
            <RiSendPlaneLine className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-text-strong-950">
              Agent 6: Outreach Management & Client Communications
              <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                Sending Disabled
              </span>
            </div>
            <div className="text-xs text-text-sub-600">
              Personalized communication drafts across Email, LinkedIn, and WhatsApp. External communication is disabled. All outreach requires explicit authorization.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-1.5 shadow-sm">
            <span className="text-text-sub-600">Total Drafts: </span>
            <span className="font-bold text-text-strong-950">{outreachMetrics?.total ?? 0}</span>
          </div>
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300 shadow-sm">
            <span>Pending Anil: </span>
            <span className="font-bold">{outreachMetrics?.pendingApproval ?? 0}</span>
          </div>
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 shadow-sm">
            <span>Approved: </span>
            <span className="font-bold">{outreachMetrics?.approved ?? 0}</span>
          </div>
          <div className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 font-medium text-purple-800 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-300 shadow-sm">
            <span>Revision/Rejected: </span>
            <span className="font-bold">
              {(outreachMetrics?.revisionRequested ?? 0) + (outreachMetrics?.rejected ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: FLEET TELEMETRY & BREAKDOWNS ──────────────────────────── */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Agent Fleet Execution Status */}
        <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-strong-950">Active AI Agent Fleet</h3>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-stroke-soft-200 pb-2">
              <div className="flex items-center gap-2">
                <RiCompass3Line className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-text-strong-950">1. Global Project Hunter</span>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-stroke-soft-200 pb-2">
              <div className="flex items-center gap-2">
                <RiShieldCheckLine className="h-4 w-4 text-emerald-600" />
                <span className="font-medium text-text-strong-950">2. Client Researcher</span>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-stroke-soft-200 pb-2">
              <div className="flex items-center gap-2">
                <RiCpuLine className="h-4 w-4 text-indigo-600" />
                <span className="font-medium text-text-strong-950">3. Project Analyzer</span>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-stroke-soft-200 pb-2">
              <div className="flex items-center gap-2">
                <RiCheckDoubleLine className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-text-strong-950">4. Opportunity Scoring</span>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-stroke-soft-200 pb-2">
              <div className="flex items-center gap-2">
                <RiFileTextLine className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-text-strong-950">5. AI Proposal Generator</span>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-stroke-soft-200 pb-2">
              <div className="flex items-center gap-2">
                <RiSendPlaneLine className="h-4 w-4 text-emerald-600" />
                <span className="font-medium text-text-strong-950">6. Outreach Manager</span>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiTimeLine className="h-4 w-4 text-teal-600" />
                <span className="font-medium text-text-strong-950">7. Follow-up Manager</span>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-text-strong-950">Category Distribution</h3>
          <div className="space-y-2">
            {Object.entries(metrics?.categoryWiseBreakdown || {}).length === 0 ? (
              <div className="text-xs text-text-soft-400">No categories recorded yet.</div>
            ) : (
              Object.entries(metrics?.categoryWiseBreakdown || {}).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-text-sub-600">{cat.replace(/_/g, " ")}</span>
                  <span className="font-semibold text-text-strong-950">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Country Breakdown */}
        <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-text-strong-950">Geographic Origins</h3>
          <div className="space-y-2">
            {Object.entries(metrics?.countryWiseBreakdown || {}).length === 0 ? (
              <div className="text-xs text-text-soft-400">No geographic data recorded yet.</div>
            ) : (
              Object.entries(metrics?.countryWiseBreakdown || {}).map(([country, count]) => (
                <div key={country} className="flex items-center justify-between text-xs">
                  <span className="text-text-sub-600">{country}</span>
                  <span className="font-semibold text-text-strong-950">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: SEARCH & FILTERS ──────────────────────────────────────── */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft-400" />
          <input
            type="text"
            placeholder="Search projects by title, client, or tech keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-stroke-soft-200 bg-bg-weak-50 py-2 pl-9 pr-4 text-xs text-text-strong-950 outline-none transition focus:border-blue-500 focus:bg-bg-white-0"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1.5 text-xs text-text-sub-600 outline-none"
          >
            <option value="all">All Categories</option>
            {categoriesList.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          {/* Country Filter */}
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1.5 text-xs text-text-sub-600 outline-none"
          >
            <option value="all">All Countries</option>
            {countriesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1.5 text-xs text-text-sub-600 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="qualified">Qualified (&ge;75)</option>
            <option value="verified">Verified Client</option>
            <option value="review">In Review / Monitor</option>
            <option value="rejected">Rejected / Disqualified</option>
          </select>
        </div>
      </div>

      {/* ── SECTION 4: OPPORTUNITIES DATA TABLE ──────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-sm">
        <table className="min-w-full divide-y divide-stroke-soft-200 text-left text-xs">
          <thead className="bg-bg-weak-50 text-text-sub-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Project Opportunity</th>
              <th className="px-4 py-3 font-semibold">Client & Verification</th>
              <th className="px-4 py-3 font-semibold">Category & Scope</th>
              <th className="px-4 py-3 font-semibold">Budget</th>
              <th className="px-4 py-3 font-semibold">Qualification Score</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke-soft-200">
            {filteredListings.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-soft-400">
                  {loading ? "Loading project opportunities..." : "No project opportunities match your filters."}
                </td>
              </tr>
            ) : (
              filteredListings.map((project) => (
                <tr key={project.id} className="transition hover:bg-bg-weak-50/60">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-text-strong-950">{project.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-soft-400">
                      <span className="capitalize">{project.sourcePlatform}</span>
                      {project.sourceUrl && (
                        <a
                          href={project.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                        >
                          Source <RiExternalLinkLine className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium text-text-strong-950">
                      {project.clientName || "Confidential"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {project.isVerified ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <RiShieldCheckLine className="h-3 w-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          Unverified
                        </span>
                      )}
                      <span className="text-[11px] text-text-soft-400">
                        {project.clientCountry || "Global"}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="capitalize font-medium text-text-strong-950">
                      {project.category.replace(/_/g, " ")}
                    </div>
                    <div className="mt-0.5 text-[11px] capitalize text-text-soft-400">
                      {project.scopeComplexity || "Medium"} Complexity
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-text-strong-950">
                      {project.estimatedBudgetMin && project.estimatedBudgetMax
                        ? `${project.currency} ${project.estimatedBudgetMin.toLocaleString()} - ${project.estimatedBudgetMax.toLocaleString()}`
                        : project.estimatedBudgetMin
                        ? `${project.currency} ${project.estimatedBudgetMin.toLocaleString()}+`
                        : "Budget Undisclosed"}
                    </div>
                    <div className="mt-0.5 text-[11px] capitalize text-text-soft-400">
                      {project.budgetType.replace(/_/g, " ")}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          project.isQualified
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : project.status === "rejected"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {project.overallScore !== null ? `${project.overallScore}/100` : "Pending"}
                      </span>
                      <span className="text-xs font-semibold text-text-sub-600">
                        Grade {project.qualificationGrade || "N/A"}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] capitalize text-text-soft-400">
                      {project.recommendedAction.replace(/_/g, " ")}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1 text-xs font-medium text-blue-600 shadow-sm transition hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    >
                      View Analysis <RiArrowRightLine className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
