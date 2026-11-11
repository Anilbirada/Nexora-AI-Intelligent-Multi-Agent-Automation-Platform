# Nexora AI — Configuration Reference Guide

This document provides a comprehensive specification of all configuration parameters, environment variables, and operational toggles available in **Nexora AI**.

---

## 1. Core Platform Variables

| Variable Name | Required | Default | Description |
|:---|:---:|:---:|:---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string (`postgres://user:pass@host:port/dbname`). |
| `DATABASE_SSL` | No | `disable` | Set to `disable` for local dev/Docker; leave blank or `require` for cloud SSL. |
| `DB_POOL_MAX` | No | `8` | Maximum simultaneous database connections per Node process. |
| `BETTER_AUTH_URL` | **Yes** | `http://localhost:3000` | Canonical origin used for authentication redirects and webhooks. |
| `NEXT_PUBLIC_APP_URL`| **Yes** | `http://localhost:3000` | Public client-side URL. |
| `BETTER_AUTH_SECRET` | **Yes** | — | 32-byte hexadecimal secret for signing JWTs and session tokens. |
| `PORT` | No | `3000` | Port on which the Next.js server listens. |

---

## 2. Multi-Agent & Approval Gate Configuration

| Variable Name | Required | Default | Description |
|:---|:---:|:---:|:---|
| `ALLOW_EXTERNAL_OUTREACH` | **Yes** | `false` | Master outbound guard. When `false`, all Email, LinkedIn, and WhatsApp communications run in **Simulation Mode** without sending real network traffic. |
| `ANIL_APPROVAL_EMAIL` | No | `anil@nexora.ai` | Primary designated operator email address for the **Anil Approval Center**. |
| `ANIL_USER_ID` | No | — | Optional UUID of the designated executive operator. |
| `DEMO_MODE` | No | `false` | When `true`, logs all users in as demo user with read-only permissions. |

---

## 3. Background Workers & Schedulers

| Variable Name | Required | Default | Description |
|:---|:---:|:---:|:---|
| `INTERNAL_SCHEDULER` | No | `true` | Runs recurring background agent loops inside the app process. Set to `false` if using an external cron runner. |
| `CRON_SECRET` | No | — | Bearer token required for external HTTP cron triggers. |
| `CRM_WORKER_CONCURRENCY` | No | `4` | Concurrency limit for background CRM task processor. |
| `CRM_WORKER_STALE_LOCK_MS` | No | `300000` (5m) | Lock expiration timeout for stalled agent jobs. |

---

## 4. Operational Kill Switches

These environment variables allow administrators to instantly pause specific sub-systems without taking the application offline:

| Switch Name | Default | Effect When `true` |
|:---|:---:|:---|
| `PEOPLE_MIGRATION_MODE` | `false` | Master freeze: halts all campaign mutations, outbound mail, and workers simultaneously. |
| `PAUSE_CAMPAIGN_MUTATIONS` | `false` | Blocks creation, editing, or deletion of active outreach campaigns. |
| `PAUSE_EMAIL_OUTBOUND` | `false` | Pauses email dispatch worker. |
| `PAUSE_LINKEDIN_OUTBOUND` | `false` | Pauses LinkedIn message and connection worker. |
| `PAUSE_LINKEDIN_RESOLUTION` | `false` | Pauses background identifier resolution. |
| `PAUSE_GRID_WORKER` | `false` | Pauses asynchronous table enrichment jobs. |

---

## 5. Security & Secret Rotation

- Never commit `.env`, `.env.local`, or `.env.production` to version control.
- To generate a new cryptographic secret:
  ```bash
  openssl rand -hex 32
  ```
- All third-party credentials (e.g., Unipile API tokens, Google OAuth secrets) are securely encrypted at rest in the database using the master secret before persistence.
