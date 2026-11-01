"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  RiArrowRightLine,
  RiCheckDoubleLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiCompass3Line,
  RiCpuLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiFileTextLine,
  RiFilter3Line,
  RiGlobalLine,
  RiInformationLine,
  RiLoader4Line,
  RiLockLine,
  RiMailLine,
  RiPlayCircleLine,
  RiRefreshLine,
  RiRestartLine,
  RiSearchLine,
  RiSendPlaneLine,
  RiShieldCheckLine,
  RiSparklingLine,
  RiSpeedUpLine,
  RiTimeLine,
  RiUserVoiceLine,
} from "@remixicon/react";

export default function ProjectManagerExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "fleet" | "pipeline" | "approvals" | "recovery" | "reports">("overview");

  // Telemetry & Data States
  const [overview, setOverview] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Approval modal / action states
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [reviewerFeedback, setReviewerFeedback] = useState("");
  const [processingDecision, setProcessingDecision] = useState(false);

  // Report viewing state
  const [generatingReport, setGeneratingReport] = useState(false);

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      const [ovRes, agRes, pipRes, appRes, hlRes, repRes] = await Promise.all([
        fetch("/api/project-manager/overview"),
        fetch("/api/project-manager/agents"),
        fetch("/api/project-manager/pipeline"),
        fetch("/api/project-manager/approvals"),
        fetch("/api/project-manager/health"),
        fetch("/api/project-manager/reports"),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (agRes.ok) {
        const agData = await agRes.json();
        setAgents(agData.agents || []);
      }
      if (pipRes.ok) setPipeline(await pipRes.json());
      if (appRes.ok) {
        const appData = await appRes.json();
        setApprovals(appData.items || []);
      }
      if (hlRes.ok) setHealth(await hlRes.json());
      if (repRes.ok) {
        const repData = await repRes.json();
        setReports(repData.reports || []);
      }
    } catch (err: any) {
      console.error("Failed to load project manager dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleApprovalDecision = async (itemId: string, itemType: string, action: "approve" | "reject" | "request_revision") => {
    try {
      setProcessingDecision(true);
      const res = await fetch("/api/project-manager/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          itemType,
          action,
          reviewerFeedback,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setActionNotice({ message: result.error || "Decision failed", type: "error" });
      } else {
        setActionNotice({ message: result.message, type: "success" });
        setSelectedApproval(null);
        setReviewerFeedback("");
        loadAllData();
      }
    } catch (err: any) {
      setActionNotice({ message: err.message, type: "error" });
    } finally {
      setProcessingDecision(false);
    }
  };

  const handleRetryJob = async (executionId: string) => {
    try {
      const res = await fetch(`/api/project-manager/jobs/${executionId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setActionNotice({ message: data.message, type: "success" });
        loadAllData();
      } else {
        setActionNotice({ message: data.error || "Retry failed", type: "error" });
      }
    } catch (err: any) {
      setActionNotice({ message: err.message, type: "error" });
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      const res = await fetch("/api/project-manager/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setActionNotice({ message: "Daily executive report generated and persisted.", type: "success" });
        loadAllData();
      } else {
        setActionNotice({ message: data.error || "Report generation failed", type: "error" });
      }
    } catch (err: any) {
      setActionNotice({ message: err.message, type: "error" });
    } finally {
      setGeneratingReport(false);
    }
  };

  const quota = overview?.quota || {
    target: 40,
    discoveredCount: 0,
    uniqueCount: 0,
    verifiedCount: 0,
    qualifiedCount: 0,
    unverifiedCount: 0,
    rejectedCount: 0,
    duplicateCount: 0,
    remainingTarget: 40,
    completionPercentage: 0,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Top Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <RiCpuLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">NEXGEN GLOBAL AI</h1>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Agent 8: AI Project Manager
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Agency: <span className="text-slate-200 font-medium">NEXGEN AGENCY</span> • Approver: <span className="text-indigo-300 font-semibold">Anil</span> (anil@nexgen.ai)
              </p>
            </div>
          </div>

          {/* Top Actions & Safety Guard */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <RiLockLine className="w-4 h-4" />
              <span>Safety Guard: LOCKED (Outreach Disabled)</span>
            </div>

            <button
              onClick={loadAllData}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700"
            >
              <RiRefreshLine className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-md shadow-indigo-600/20"
            >
              {generatingReport ? <RiLoader4Line className="w-4 h-4 animate-spin" /> : <RiFileTextLine className="w-4 h-4" />}
              <span>Generate Daily Report</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6 text-sm border-t border-slate-800/60 pt-2">
          {[
            { id: "overview", label: "Executive Overview" },
            { id: "fleet", label: `8-Agent Fleet (${agents.length})` },
            { id: "pipeline", label: "Pipeline & Bottlenecks" },
            { id: "approvals", label: `Approval Center (${approvals.length})` },
            { id: "recovery", label: `Failure & Recovery (${health?.stalledJobsCount || 0})` },
            { id: "reports", label: `Daily Reports (${reports.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 font-medium transition relative ${
                activeTab === tab.id
                  ? "text-indigo-400 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {actionNotice && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
              actionNotice.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : actionNotice.type === "error"
                ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
            }`}
          >
            <span>{actionNotice.message}</span>
            <button onClick={() => setActionNotice(null)} className="text-xs hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* ── SECTION 1 & 2: Executive Overview & Daily Quota Gauge ─────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Quota Card */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">Section 2 • Daily Target Progress</span>
                <h2 className="text-2xl font-bold text-white mt-0.5">
                  {quota.qualifiedCount} <span className="text-slate-500 text-lg font-normal">/ {quota.target} Qualified Opportunities</span>
                </h2>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-indigo-400">{quota.completionPercentage}%</span>
                <p className="text-xs text-slate-400">Target Completion</p>
              </div>
            </div>

            {/* Quota Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden mb-6">
              <div
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, quota.completionPercentage)}%` }}
              />
            </div>

            {/* Quota Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-xs text-slate-400">Discovered</span>
                <p className="text-lg font-bold text-slate-100">{quota.discoveredCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-xs text-slate-400">Unique</span>
                <p className="text-lg font-bold text-emerald-400">{quota.uniqueCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-xs text-slate-400">Verified</span>
                <p className="text-lg font-bold text-indigo-400">{quota.verifiedCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-xs text-slate-400">Duplicates Filtered</span>
                <p className="text-lg font-bold text-slate-400">{quota.duplicateCount}</p>
              </div>
            </div>
          </div>

          {/* Fleet Status Snapshot Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">Section 1 • Agent Fleet Fleet Telemetry</span>
              <h3 className="text-xl font-bold text-white mt-1">8 Autonomous Agents</h3>
              <p className="text-xs text-slate-400 mt-1">Real database execution telemetry.</p>

              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Operational
                  </span>
                  <span className="font-semibold text-emerald-400">{overview?.fleetSummary?.operational || 8}</span>
                </div>
                <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Degraded
                  </span>
                  <span className="font-semibold text-amber-400">{overview?.fleetSummary?.degraded || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm py-1.5">
                  <span className="text-slate-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Failed / Stalled
                  </span>
                  <span className="font-semibold text-rose-400">{overview?.fleetSummary?.failed || 0}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Unified Pending Approvals:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {overview?.pendingApprovalsCount || 0} Awaiting Anil
              </span>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: Eight-Agent Fleet Matrix ──────────────────────────────── */}
        {(activeTab === "overview" || activeTab === "fleet") && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Section 4 • Eight-Agent Fleet Telemetry</h3>
                <p className="text-xs text-slate-400">Live health monitoring based on real execution telemetry, duration, and error counts.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {agents.map((agent) => {
                const t = agent.telemetry || {};
                const statusColor =
                  t.status === "operational"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : t.status === "running"
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    : t.status === "degraded"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : t.status === "failed"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-slate-800 text-slate-400 border-slate-700";

                return (
                  <div key={agent.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500">Agent {agent.number}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColor}`}>
                          {t.status || "idle"}
                        </span>
                      </div>
                      <h4 className="font-semibold text-white text-sm">{agent.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{agent.role}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/60 text-xs space-y-1.5 text-slate-400">
                      <div className="flex justify-between">
                        <span>Avg Latency:</span>
                        <span className="text-slate-200 font-mono">{t.averageDurationMs ? `${t.averageDurationMs}ms` : "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Consecutive Failures:</span>
                        <span className={t.consecutiveFailures > 0 ? "text-rose-400 font-bold" : "text-slate-300"}>
                          {t.consecutiveFailures || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Executions:</span>
                        <span className="text-slate-300">{t.totalExecutions || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── SECTION 5 & 6: Pipeline Performance & Unified Approvals ─────────── */}
        {(activeTab === "overview" || activeTab === "approvals") && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Section 6 • Unified Anil Approval Center</h3>
                <p className="text-xs text-slate-400">
                  Proposals, outreach messages, and follow-up drafts awaiting human authorization. Only Anil can approve.
                </p>
              </div>
              <span className="text-xs font-mono text-indigo-400">{approvals.length} items pending</span>
            </div>

            {approvals.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm">
                <RiCheckDoubleLine className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <span>Unified approval queue is empty. No pending items requiring Anil's signoff.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {approvals.map((item) => (
                  <div key={item.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          item.type === "proposal"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : item.type === "outreach"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-xs text-slate-400">• Client: <span className="text-slate-200 font-medium">{item.clientName}</span></span>
                        <span className="text-xs text-slate-500 font-mono">({item.pendingAgeHours}h pending)</span>
                      </div>
                      <h4 className="font-semibold text-white text-base">{item.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">{item.summaryOrPreview}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedApproval(item)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
                      >
                        Inspect & Feedback
                      </button>
                      <button
                        onClick={() => handleApprovalDecision(item.id, item.type, "approve")}
                        disabled={processingDecision}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-600/20"
                      >
                        Approve (Anil)
                      </button>
                      <button
                        onClick={() => handleApprovalDecision(item.id, item.type, "reject")}
                        disabled={processingDecision}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-md shadow-rose-600/20"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── SECTION 9: Failure & Recovery Monitor ───────────────────────────── */}
        {(activeTab === "overview" || activeTab === "recovery") && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Section 9 • Failure Detection & Exponential Backoff Recovery</h3>
                <p className="text-xs text-slate-400">Monitors stalled jobs (&gt;15 mins) and manages controlled idempotent retries.</p>
              </div>
            </div>

            {(!health?.stalledJobs || health.stalledJobs.length === 0) ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm">
                <RiShieldCheckLine className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <span>Zero stalled or dead-letter jobs detected. System execution health is normal.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {health.stalledJobs.map((stalled: any) => (
                  <div key={stalled.executionId} className="p-4 rounded-xl bg-slate-900 border border-rose-900/40 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          STALLED
                        </span>
                        <span className="text-xs font-mono text-slate-400">{stalled.agentType}</span>
                      </div>
                      <p className="text-xs text-rose-300">{stalled.failureReason}</p>
                      <p className="text-xs text-slate-500">
                        Elapsed: {Math.round(stalled.elapsedMs / 1000)}s | Retries: {stalled.retryCount}/{stalled.maxRetries}
                      </p>
                    </div>

                    {stalled.isEligibleForRetry && (
                      <button
                        onClick={() => handleRetryJob(stalled.executionId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 shrink-0"
                      >
                        <RiRestartLine className="w-4 h-4" />
                        <span>Retry with Backoff</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── SECTION 10: Daily Business Reports ──────────────────────────────── */}
        {(activeTab === "overview" || activeTab === "reports") && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Section 10 • Daily Business Intelligence Reports</h3>
                <p className="text-xs text-slate-400">Historical executive intelligence reports generated for Anil.</p>
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm">
                <RiFileTextLine className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <span>No daily reports generated yet. Click &quot;Generate Daily Report&quot; above to create the report for today.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((rep) => (
                  <div key={rep.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{rep.reportDate}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {rep.projectsQualifiedCount}/40 Qualified
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-3">{rep.executiveSummary}</p>
                    <div className="pt-2 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
                      <span>Proposals: {rep.proposalsApprovedCount} approved</span>
                      <span>Pipeline Value: ${Number(rep.pipelineValueTotal || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── Modal for Inspection & Feedback ───────────────────────────────────── */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                Inspect Item: {selectedApproval.title}
              </h3>
              <button onClick={() => setSelectedApproval(null)} className="text-slate-400 hover:text-white">
                <RiCloseCircleLine className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-slate-400">Content / Preview:</span>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap">
                {selectedApproval.summaryOrPreview}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Anil Reviewer Feedback (Optional / Revision Notes):</label>
              <textarea
                value={reviewerFeedback}
                onChange={(e) => setReviewerFeedback(e.target.value)}
                rows={3}
                placeholder="Enter feedback or instructions for revision..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedApproval(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprovalDecision(selectedApproval.id, selectedApproval.type, "request_revision")}
                disabled={processingDecision}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium"
              >
                Request Revision
              </button>
              <button
                onClick={() => handleApprovalDecision(selectedApproval.id, selectedApproval.type, "reject")}
                disabled={processingDecision}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
              >
                Reject
              </button>
              <button
                onClick={() => handleApprovalDecision(selectedApproval.id, selectedApproval.type, "approve")}
                disabled={processingDecision}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-600/20"
              >
                Approve (Anil)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
