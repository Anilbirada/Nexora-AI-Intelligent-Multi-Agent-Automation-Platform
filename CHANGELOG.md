# Changelog

All notable changes to **Nexora AI — Intelligent Multi-Agent Automation Platform** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-11 — Enterprise Multi-Agent Release

### Added
- **8 Autonomous AI Agents**:
  - `global_project_hunter`: Autonomous RSS & web discovery with deduplication and domain qualification (target 40 leads/day).
  - `client_researcher`: Comprehensive organization profiling, engineering tech-stack footprinting, and credibility scoring (0–100).
  - `project_analyzer`: Functional requirement extraction, architecture recommendation, and complexity grading (Low, Medium, High).
  - `opportunity_scoring`: Multi-factor weighted algorithm (budget, tech fit, client legitimacy, competition, timeline urgency) with qualification gate (threshold 75).
  - `proposal_generator`: High-conversion technical consulting proposals with milestone-based budget breakdowns totalling 100%.
  - `outreach_manager`: Multi-channel copy generation (Email with one-click opt-out, LinkedIn $\le$ 300 chars, WhatsApp business updates).
  - `followup_manager`: Automated 3-step cadence (3, 5, 7 business days) with sentiment analysis and calendar/weekend skipping.
  - `ai_project_manager`: Fleet governance orchestrator with advisory execution locks, quota tracking, failure mitigation, and the Anil Approval Center.
- **Deterministic NLP Engine (`nexgen-deterministic-nlp-v1`)**:
  - Transparent, zero-cost, zero-token rule-based NLP pipeline delivering sub-millisecond execution times without external API dependencies.
- **Anil Approval Center**:
  - Human-in-the-loop executive control interface with 1-click Approve, Reject, Revise, and Bulk-Action capabilities.
- **Safety Policy (`ALLOW_EXTERNAL_OUTREACH="false"`)**:
  - Outbound communication isolation ensuring simulated delivery during pilot phases.
- **Automated Regression Suite**:
  - Comprehensive TypeScript test suite with 122 automated unit and integration tests passing at 100%.

### Security & Multi-Tenancy
- Compound foreign key constraints `(opportunity_id, organization_id)` preventing cross-tenant leakage.
- HMAC SHA-256 session signature verification with encrypted credential vaulting.
- Additive PostgreSQL DDL schema with non-destructive migrations.

---

## [0.3.1] - 2026-10-08
- Base SDR infrastructure enhancements and background worker stability updates.
