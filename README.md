# Nexora AI — Intelligent Multi-Agent Automation Platform

<p align="center">
  <img src="https://img.shields.io/badge/Nexora_AI-Enterprise_v1.0.0-6366f1?style=for-the-badge&logo=probot&logoColor=white" alt="Nexora AI Version" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-16.2.9-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16+-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tests-122%2F122_Passing-success?style=for-the-badge&logo=checkmarx&logoColor=white" alt="Tests" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <strong>An autonomous, multi-agent AI ecosystem designed to discover high-value software opportunities, profile client organizations, analyze architectural requirements, calculate multi-factor viability scores, formulate commercial proposals, and execute human-governed omnichannel outreach across Email, LinkedIn, and WhatsApp.</strong>
</p>

<p align="center">
  <em>Architected and Engineered by <strong><a href="https://github.com/Anilbirada">Anil Biradar</a></strong></em>
</p>

---

## 📑 Table of Contents

- [1. Executive Overview](#1-executive-overview)
- [2. Key Architectural Features](#2-key-architectural-features)
- [3. Multi-Agent Fleet Architecture](#3-multi-agent-fleet-architecture)
- [4. The 8 Autonomous AI Agents](#4-the-8-autonomous-ai-agents)
- [5. Deterministic NLP Engine (`$0.00` Cost)](#5-deterministic-nlp-engine-000-cost)
- [6. Human-in-the-Loop Governance (Anil Approval Gate)](#6-human-in-the-loop-governance-anil-approval-gate)
- [7. Complete Technology Stack](#7-complete-technology-stack)
- [8. Installation & Setup Guide](#8-installation--setup-guide)
- [9. Environment Configuration](#9-environment-configuration)
- [10. Running the Application & Test Suite](#10-running-the-application--test-suite)
- [11. Verification & Test Metrics](#11-verification--test-metrics)
- [12. Deployment Guide](#12-deployment-guide)
- [13. Security & Multi-Tenant Data Isolation](#13-security--multi-tenant-data-isolation)
- [14. Technical Documentation Directory](#14-technical-documentation-directory)
- [15. License & Attribution](#15-license--attribution)

---

## 1. Executive Overview

### The Problem
Traditional business development and sales engineering processes are fragmented, manual, and expensive. Teams spend dozens of hours every week searching across disparate project boards, vetting client legitimacy, estimating software architectures, and drafting commercial proposals — often pursuing unqualified or low-budget leads that fail to convert.

### The Nexora AI Solution
**Nexora AI** transforms this pipeline into a continuous, autonomous software assembly line:
1. **Discovers** qualified software contracts across global platforms automatically.
2. **Researches & Scores** client legitimacy and budget viability using weighted deterministic criteria.
3. **Decomposes Architecture** into precise engineering requirements and milestone allocations.
4. **Drafts Bespoke Proposals** with 100% verifiable milestone financial breakdowns.
5. **Governs Communication** through the **Anil Approval Center**, ensuring zero unauthorized messages leave the system.
6. **Automates Omnichannel Follow-ups** across Email, LinkedIn, and WhatsApp while respecting business days and holidays.

---

## 2. Key Architectural Features

- 🤖 **Autonomous Multi-Agent Fleet**: 8 specialized agents working in choreographed synchronization.
- ⚡ **Zero-Token Deterministic NLP**: Powered by `nexgen-deterministic-nlp-v1`, delivering sub-millisecond execution times and \$0.00 LLM API spend during core qualification.
- 🛡️ **Anil Approval Gate**: Human-in-the-loop executive control requiring explicit human signoff before any external proposal or outreach message is dispatched.
- 🔒 **Compound Tenant Isolation**: Strict multi-tenancy enforced at the database level with `(opportunity_id, organization_id)` composite foreign keys.
- 📬 **Omnichannel Outreach Engine**: Channel-tailored copy generation for Email (with one-click opt-out), LinkedIn ($\le 300$ characters), and WhatsApp Business.
- 📅 **Intelligent Cadence Engine**: Automated 3-stage follow-up cadence (3, 5, 7 business days) with built-in weekend protection.
- 📊 **Executive Command Center**: Live telemetry, health probes, agent concurrency management, and daily intelligence summaries.

---

## 3. Multi-Agent Fleet Architecture

```mermaid
flowchart TD
    subgraph Ingestion & Intelligence
        Hunter["1. Global Project Hunter<br/><i>global_project_hunter</i><br/>(Target: 40 leads/day)"]
        Researcher["2. Client Researcher<br/><i>client_researcher</i><br/>(0–100 Legitimacy Score)"]
        Analyzer["3. Project Analyzer<br/><i>project_analyzer</i><br/>(Architecture & Complexity)"]
        Scoring["4. Opportunity Scoring Engine<br/><i>opportunity_scoring</i><br/>(5-Factor Weighted Gate)"]
        
        Hunter -->|Sanitized Opportunity| Researcher
        Researcher -->|Enriched Company Profile| Analyzer
        Analyzer -->|Tech Blueprint & Duration| Scoring
    end

    subgraph Proposal & Human Governance
        Scoring -->|Score >= 75| Proposal["5. Proposal Generator<br/><i>proposal_generator</i><br/>(100% Milestone Allocation)"]
        Scoring -->|Score < 75| Archive["Disqualified & Archived"]
        
        Proposal -->|Pending Draft| Gate{"Anil Approval Gate<br/><i>Human-in-the-Loop</i>"}
        Gate -->|Approved| Outreach["6. Outreach Manager<br/><i>outreach_manager</i>"]
        Gate -->|Revision Requested| Proposal
        Gate -->|Rejected| Discard["Opportunity Closed"]
    end

    subgraph Outreach & Relationship Lifecycle
        Outreach -->|Dispatched Message| Followup["7. Follow-up Manager<br/><i>followup_manager</i><br/>(3-Stage Business Day Cadence)"]
        Followup -->|Client Replies| Sentiment{"Sentiment Classifier<br/><i>Interested / Opt-out</i>"}
        Sentiment -->|Positive| CRM["CRM Deal Pipeline"]
        Sentiment -->|Opt-Out| Blacklist["Domain Suppression List"]
    end

    subgraph Fleet Governance & Orchestration
        PM["8. AI Project Manager<br/><i>ai_project_manager</i><br/>(Locks, Telemetry, Health, Reports)"]
        PM -. Monitors .-> Hunter
        PM -. Monitors .-> Researcher
        PM -. Monitors .-> Analyzer
        PM -. Monitors .-> Scoring
        PM -. Monitors .-> Proposal
        PM -. Monitors .-> Outreach
        PM -. Monitors .-> Followup
    end
```

---

## 4. The 8 Autonomous AI Agents

| # | Agent Name | System Identifier | Primary Role | Core Output |
|:---:|:---|:---|:---|:---|
| **1** | **Global Project Hunter** | `global_project_hunter` | Multi-source ingestion & URL deduplication | Canonical `project_opportunities` record |
| **2** | **Client Researcher** | `client_researcher` | Company domain investigation & DNS footprinting | Legitimacy score (0–100) & tech stack |
| **3** | **Project Analyzer** | `project_analyzer` | Architectural sizing & scope grading | Complexity (`low` to `enterprise`) & duration |
| **4** | **Opportunity Scoring** | `opportunity_scoring` | 5-factor weighted qualification gate | Viability score & qualification status ($\ge 75$) |
| **5** | **Proposal Generator** | `proposal_generator` | High-conversion technical & commercial proposals | Proposal draft with 100% milestone split |
| **6** | **Outreach Manager** | `outreach_manager` | Omnichannel copy generation & dispatch | Email / LinkedIn / WhatsApp message payload |
| **7** | **Follow-up Manager** | `followup_manager` | 3-stage non-intrusive cadence & sentiment | Followup tasks skipping weekends |
| **8** | **AI Project Manager** | `ai_project_manager` | Fleet telemetry, concurrency locks & approvals | Executive dashboard & daily report |

---

## 5. Deterministic NLP Engine (`$0.00` Cost)

Nexora AI introduces a **hybrid deterministic intelligence architecture**:
- **Zero API Invocations**: Standard categorization, keyword decomposition, technical complexity estimation, and milestone budgeting run on an in-memory deterministic parser (`nexgen-deterministic-nlp-v1`).
- **Sub-Millisecond Response**: Processes complex job specifications in under $5\text{ ms}$, saving thousands of dollars in LLM API bills.
- **Graceful Fallback**: If an opportunity features unstructured or ambiguous requirements, the pipeline seamlessly consults secondary LLMs (OpenRouter, Gemini, or Claude).

---

## 6. Human-in-the-Loop Governance (Anil Approval Gate)

To guarantee brand integrity and prevent automated communication errors:
1. **Hardcoded Outbound Guard**: The environment variable `ALLOW_EXTERNAL_OUTREACH` defaults to `"false"`. Outbound messages run in **Simulation Mode** unless explicitly authorized.
2. **Executive Control Center**: Generated proposals and outreach drafts are held in `awaiting_approval` status in the **Anil Approval Center**.
3. **Audit Trail**: Every approval action logs the approver's identity, timestamp, and review commentary directly into PostgreSQL.

---

## 7. Complete Technology Stack

- **Application Framework**: [Next.js 16.2.9](https://nextjs.org/) (App Router, Server Actions, React 19)
- **Language**: [TypeScript 5.x](https://www.typescriptlang.org/)
- **Runtime Environment**: [Node.js v20.9+ / v26+](https://nodejs.org/) & [Bun v1.2+](https://bun.sh/)
- **Database & Persistence**: [PostgreSQL 16+](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication & Security**: [Better Auth](https://better-auth.com/) with HMAC SHA-256 session encryption
- **Styling & UI Components**: Tailwind CSS, Radix UI Primitives, Lucide Icons
- **Testing Framework**: Node.js Native Test Runner with `tsx` (`--test`)

---

## 8. Installation & Setup Guide

### Prerequisites
- Node.js `>= 20.9.0` (or Bun `>= 1.2.0`)
- PostgreSQL `>= 16.0`
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Anilbirada/Nexora-AI-Intelligent-Multi-Agent-Automation-Platform.git
cd Nexora-AI-Intelligent-Multi-Agent-Automation-Platform
```

### 2. Install Dependencies
```bash
npm install
# or: bun install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env.local
```
Edit `.env.local` with your database credentials:
```env
DATABASE_URL="postgres://postgres:your_password@localhost:5432/nexora_ai"
DATABASE_SSL="disable"
BETTER_AUTH_SECRET="generate-32-byte-hex-with-openssl-rand-hex-32"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ALLOW_EXTERNAL_OUTREACH="false"
ANIL_APPROVAL_EMAIL="anil@nexora.ai"
```

### 4. Initialize Database Schema
```bash
npm run db:setup
```

---

## 9. Environment Configuration

| Variable | Description | Default |
|:---|:---|:---:|
| `DATABASE_URL` | PostgreSQL connection string | *Required* |
| `DATABASE_SSL` | SSL mode (`disable` or `require`) | `disable` |
| `BETTER_AUTH_SECRET` | 32-byte hexadecimal encryption key | *Required* |
| `BETTER_AUTH_URL` | Web application public base URL | `http://localhost:3000` |
| `ALLOW_EXTERNAL_OUTREACH` | Master outbound communication safety lock | `false` |
| `ANIL_APPROVAL_EMAIL` | Designee operator for executive approvals | `anil@nexora.ai` |

---

## 10. Running the Application & Test Suite

### Development Server
```bash
npm run dev
# Open http://localhost:3000 in your browser
```

### Run Automated Regression Test Suite
```bash
npm test
```
The test suite verifies all 8 agents, opportunity scoring mathematics, milestone allocation constraints, and weekend-skipping cadence calculations.

### Production Build
```bash
npm run build
npm run start
```

---

## 11. Verification & Test Metrics

```text
✔ global_project_hunter > deduplicates incoming feeds via SHA-256 (2.1ms)
✔ client_researcher > calculates domain legitimacy and tech stack footprint (3.4ms)
✔ project_analyzer > decomposes functional specs and grades complexity (1.8ms)
✔ opportunity_scoring > executes 5-factor weighted algorithm at threshold 75 (2.0ms)
✔ proposal_generator > generates milestone allocations strictly summing to 100% (2.5ms)
✔ outreach_manager > enforces character limits (<300) and email opt-out clauses (3.1ms)
✔ followup_manager > calculates 3-stage cadence skipping Saturdays and Sundays (2.9ms)
✔ ai_project_manager > manages fleet advisory execution locks and approvals (4.2ms)

--------------------------------------------------------------------------------
Summary: 122 / 122 tests passed (100% success rate, 0 failures, 0 flakiness)
Execution Time: 2.51s
--------------------------------------------------------------------------------
```

---

## 12. Deployment Guide

### Deploying to Render
1. Create a **Managed PostgreSQL 16** instance on [Render](https://render.com).
2. Create a new **Web Service**, connecting the repository: `https://github.com/Anilbirada/Nexora-AI-Intelligent-Multi-Agent-Automation-Platform`.
3. Set build command: `npm install && npm run build`.
4. Set start command: `npm run start`.
5. Add production environment variables (`DATABASE_URL`, `DATABASE_SSL=require`, `BETTER_AUTH_SECRET`, `ALLOW_EXTERNAL_OUTREACH=false`).
6. Run `npm run db:setup` via the Render Shell.

*Detailed deployment walkthroughs for Docker Compose and VPS are available in [docs/deployment_guide.md](docs/deployment_guide.md).*

---

## 13. Security & Multi-Tenant Data Isolation

- **Compound Isolation**: Queries strictly scope data through compound foreign key relationships `(id, organization_id)`.
- **Session Protection**: Better Auth sessions are signed with HMAC SHA-256 and stored in `HttpOnly`, `SameSite=Lax` cookies.
- **Fail-Safe Outreach**: Outbound communications are blocked at runtime unless explicitly unlocked by environment configuration and human approval.

---

## 14. Technical Documentation Directory

Deep dive into the technical specifications in the `docs/` directory:

- 🏗️ [docs/architecture.md](docs/architecture.md) — Comprehensive system architecture and database design.
- 🤖 [docs/agent_documentation.md](docs/agent_documentation.md) — Complete specifications for all 8 agents.
- 🔄 [docs/workflow_documentation.md](docs/workflow_documentation.md) — End-to-end multi-agent execution workflows.
- 💻 [docs/installation_guide.md](docs/installation_guide.md) — Step-by-step installation instructions.
- ⚙️ [docs/configuration_guide.md](docs/configuration_guide.md) — Environment variables and worker settings.
- 📡 [docs/api_documentation.md](docs/api_documentation.md) — REST API endpoints for fleet management.
- 🚀 [docs/deployment_guide.md](docs/deployment_guide.md) — Production deployment on Render and Docker.
- 🔐 [docs/security.md](docs/security.md) — Multi-tenant security and credential protection.
- 🛠️ [docs/troubleshooting.md](docs/troubleshooting.md) — Common diagnostic procedures and resolutions.

---

## 15. License & Attribution

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed & Maintained by **[Anil Biradar](https://github.com/Anilbirada)**.
