# Nexora AI — Installation & Setup Guide

This guide provides tested, step-by-step instructions for installing and running the **Nexora AI** platform on **Windows PowerShell** and **Linux / macOS**.

---

## 1. System Prerequisites

Ensure the host environment meets the following minimum requirements:

| Component | Minimum Version | Recommended Version | Notes |
|:---|:---|:---|:---|
| **Node.js** | `>= 20.9.0` | `22.x` or `26.x` | Required for Next.js runtime |
| **Bun** | `>= 1.2.0` | `1.3.x` | Fast package management & scripts |
| **npm** | `>= 9.0.0` | `10.x` | Supported alternative to Bun |
| **PostgreSQL** | `>= 16.0` | `16.x` | Relational database with JSONB support |
| **Git** | `>= 2.30.0` | Latest | Version control |

---

## 2. Cloning the Repository

### Windows (PowerShell)
```powershell
git clone https://github.com/Anilbirada/Nexora-AI-Intelligent-Multi-Agent-Automation-Platform.git
Set-Location "Nexora-AI-Intelligent-Multi-Agent-Automation-Platform"
```

### Linux / macOS (Bash / Zsh)
```bash
git clone https://github.com/Anilbirada/Nexora-AI-Intelligent-Multi-Agent-Automation-Platform.git
cd Nexora-AI-Intelligent-Multi-Agent-Automation-Platform
```

---

## 3. Dependency Installation

### Using npm:
```bash
npm install
```

### Using Bun (Recommended):
```bash
bun install
```

---

## 4. Environment Configuration

1. Create your local environment configuration file:
   ```bash
   cp .env.example .env.local
   ```

2. Configure required keys in `.env.local`:
   ```env
   # PostgreSQL Connection URL
   DATABASE_URL="postgres://postgres:your_password@localhost:5432/nexora_ai"
   DATABASE_SSL="disable"

   # Application Base URL
   BETTER_AUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # Master Secret (Generate with: openssl rand -hex 32)
   BETTER_AUTH_SECRET="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

   # Safety Policy for Multi-Agent Outbound Communication
   ALLOW_EXTERNAL_OUTREACH="false"

   # Dedicated Operator for Approval Gate
   ANIL_APPROVAL_EMAIL="anil@nexora.ai"
   ```

---

## 5. Database Initialization

Ensure PostgreSQL is running, then initialize the database tables:

### Using npm:
```bash
npm run db:setup
```

### Using Bun:
```bash
bun run db:setup
```

*(Optional) Seed fictional demonstration data:*
```bash
npm run db:seed:demo  # or: bun run db:seed:demo
```

---

## 6. Running Verification Tests

Execute the comprehensive automated test suite (all 122 tests must pass):

### Windows (PowerShell)
```powershell
npm.cmd test
```

### Linux / macOS
```bash
npm test
```

Expected output:
```text
✔ global project hunter > deduplicates incoming feeds (2.1ms)
✔ client researcher > generates domain legitimacy score (3.4ms)
✔ project analyzer > grades scope complexity (1.8ms)
✔ opportunity scoring > filters opportunities by threshold (2.0ms)
✔ proposal generator > calculates 100% milestone allocation (2.5ms)
✔ outreach generator > enforces character limits & opt-out (3.1ms)
✔ followup generator > skips weekends and respects business days (2.9ms)
✔ ai project manager > governs fleet and handles approvals (4.2ms)
...
ℹ tests 122
ℹ suites 0
ℹ pass 122
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

---

## 7. Starting the Application

### Development Mode
```bash
npm run dev
# Server accessible at http://localhost:3000
```

### Production Build & Launch
```bash
# 1. Compile Next.js build
npm run build

# 2. Launch production server
npm run start
```

Visit the **Nexora AI** Executive Center at:
[http://localhost:3000/project-manager](http://localhost:3000/project-manager)
