# Nexora AI — System Architecture Specification

**Nexora AI** is an enterprise-grade Autonomous Multi-Agent Automation Platform built on Next.js 16 (App Router), TypeScript, and PostgreSQL (accessed via Drizzle ORM). It coordinates 8 specialized AI agents to discover, qualify, analyze, propose, and execute client outreach with strict human-in-the-loop governance.

---

## 1. High-Level System Architecture

```mermaid
graph TD
    subgraph Client Tier
        UI[Nexora AI Next.js 16 Console]
        Admin[Anil Approval Center]
    end

    subgraph API & Gateway Tier
        Proxy[Proxy & Route Handlers]
        Auth[Better Auth HMAC SHA-256]
        TenantContext[AsyncLocalStorage Tenant Scoping]
    end

    subgraph Multi-Agent Autonomous Fleet
        Hunter[1. Global Project Hunter]
        Researcher[2. Client Researcher]
        Analyzer[3. Project Analyzer]
        Scoring[4. Opportunity Scoring Engine]
        Proposal[5. Technical Proposal Generator]
        Outreach[6. Outreach Manager]
        Followup[7. Follow-up Manager]
        PM[8. AI Project Manager & Orchestrator]
    end

    subgraph Intelligence & Rule Engine
        NLP[Deterministic NLP Engine v1<br/>Zero API Cost / Sub-millisecond]
        LLM[OpenRouter / Gemini / Claude Fallback]
    end

    subgraph Storage & Persistence
        Drizzle[Drizzle ORM Connection Pool]
        Postgres[(PostgreSQL 16+ Database<br/>Compound Foreign Keys)]
    end

    UI --> Proxy
    Admin --> Proxy
    Proxy --> Auth --> TenantContext
    TenantContext --> PM
    PM --> Hunter & Researcher & Analyzer & Scoring & Proposal & Outreach & Followup
    Hunter & Researcher & Analyzer & Scoring & Proposal & Outreach & Followup --> NLP
    NLP -. Optional Fallback .-> LLM
    PM & Hunter & Researcher & Analyzer & Scoring & Proposal & Outreach & Followup --> Drizzle
    Drizzle --> Postgres
```

---

## 2. The 8 Autonomous Agents

The multi-agent system divides business development into modular, testable stages:

1. **`global_project_hunter`**: Ingests project opportunities across RSS feeds, job boards, and public forums, filtering and sanitizing external URLs to guarantee idempotency.
2. **`client_researcher`**: Validates organizational domains, profiles technological footprints, and calculates a 0–100 credibility metric.
3. **`project_analyzer`**: Extracts technical requirements, classifies project complexity (`low`, `medium`, `high`, `enterprise`), and recommends software architectures.
4. **`opportunity_scoring`**: Evaluates opportunities against a weighted multi-factor scoring algorithm (threshold: 75/100).
5. **`proposal_generator`**: Produces commercial and technical proposals with verified 100% milestone financial allocations.
6. **`outreach_manager`**: Creates channel-tailored outreach copy (Email, LinkedIn $\le 300$ chars, WhatsApp) guarded by `ALLOW_EXTERNAL_OUTREACH`.
7. **`followup_manager`**: Maintains a 3-step cadence (3, 5, 7 business days) skipping weekends and handling incoming client responses.
8. **`ai_project_manager`**: Oversees fleet telemetry, manages advisory execution locks, catches failures, and delivers executive dashboards.

---

## 3. Database Schema Architecture

The persistence model enforces strict compound tenant isolation:

```mermaid
erDiagram
    organizations ||--o{ project_opportunities : "owns"
    project_opportunities ||--o{ opportunity_scores : "evaluates"
    project_opportunities ||--o{ project_proposals : "generates"
    project_opportunities ||--o{ project_outreach_messages : "dispatches"
    project_opportunities ||--o{ project_followup_sequences : "schedules"
    project_opportunities ||--o{ project_client_responses : "receives"
    organizations ||--o{ agent_executions : "telemetry"

    project_opportunities {
        uuid id PK
        uuid organization_id FK
        text title
        text description
        varchar status
        integer qualification_score
        timestamp created_at
    }

    project_proposals {
        uuid id PK
        uuid opportunity_id FK
        uuid organization_id FK
        numeric total_budget
        jsonb milestones
        varchar approval_status
        timestamp approved_at
    }
```

---

## 4. Transparent Deterministic NLP Engine

To eliminate unpredictable token expenses, latency spikes, and hallucinations during high-volume qualification, Nexora AI incorporates `nexgen-deterministic-nlp-v1`:
- **Zero Token Cost**: Operates entirely in-memory with sub-millisecond execution.
- **Predictable Rule Sets**: Uses structured heuristic classifiers, keyword frequency maps, and entity extraction regex.
- **Optional LLM Fallback**: Seamlessly queries external LLMs (via OpenRouter or direct APIs) only when unstructured confidence scores drop below calibrated thresholds.
