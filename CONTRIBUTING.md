# Contributing to Nexora AI

Thank you for your interest in contributing to **Nexora AI — Intelligent Multi-Agent Automation Platform**! We welcome contributions to our autonomous multi-agent pipelines, deterministic NLP engines, outreach schedulers, and CRM integrations.

By participating in this project, you agree to abide by our code of conduct and maintain our high standards for code quality, security, and tenant isolation.

---

## 1. Development Philosophy

Nexora AI is designed with three core engineering principles:
1. **Safety First**: External communications require human-in-the-loop governance (`ALLOW_EXTERNAL_OUTREACH="false"` by default; Anil Approval Gate signoff required).
2. **Deterministic & Cost-Efficient**: Agent pipelines rely on transparent, zero-token deterministic NLP algorithms before falling back to external LLMs.
3. **Strict Multi-Tenancy**: All database queries must enforce compound organization scoping `(id, organization_id)`.

---

## 2. Getting Started

### Prerequisites
- **Node.js**: `>= 20.9.0` (v26+ supported)
- **Bun**: `>= 1.2.0` or **npm** / **pnpm**
- **PostgreSQL**: `>= 16.0` (with pgvector support recommended)
- **Git**

### Local Setup

```bash
# 1. Clone your fork
git clone https://github.com/Anilbirada/Nexora-AI-Intelligent-Multi-Agent-Automation-Platform.git
cd Nexora-AI-Intelligent-Multi-Agent-Automation-Platform

# 2. Install dependencies
npm install  # or bun install

# 3. Environment configuration
cp .env.example .env.local

# 4. Database initialization
npm run db:setup

# 5. Run automated test suite (must pass 122/122)
npm test

# 6. Launch development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the Nexora AI executive console.

---

## 3. Contribution Workflow

1. **Fork & Branch**: Create a descriptive feature branch from `main`:
   ```bash
   git checkout -b feature/agent-enhancement
   ```
2. **Implement Changes**: Write clean, modular TypeScript code with complete type annotations.
3. **Preserve Isolation**: Ensure all database models enforce compound tenant isolation `(opportunity_id, organization_id)`.
4. **Run Tests**:
   ```bash
   npm test
   ```
   All 122+ tests must pass with zero failures.
5. **Commit Message Conventions**:
   Follow conventional commits:
   - `feat(agents): add automated lead deduplication heuristic`
   - `fix(scheduler): resolve race condition in execution lock`
   - `docs(api): document multi-agent executive endpoints`
   - `test(scoring): expand weighted opportunity evaluation assertions`
6. **Pull Request**: Open a PR targeting `main`. Include:
   - Clear summary of changes.
   - Verification steps and test output.
   - Confirmation that no secrets or `.env*` files are included.

---

## 4. Security Disclosures

Please report security issues or sensitive data leaks directly to the maintainer:
- **Lead Maintainer**: Anil Biradar
- **Repository**: [https://github.com/Anilbirada/Nexora-AI-Intelligent-Multi-Agent-Automation-Platform](https://github.com/Anilbirada/Nexora-AI-Intelligent-Multi-Agent-Automation-Platform)
- **Confidentiality**: Do not file public GitHub issues for security vulnerabilities.
