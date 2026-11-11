# Nexora AI — Troubleshooting & Diagnostics Guide

This guide provides rapid diagnostic steps and solutions for common operational issues encountered when developing or hosting **Nexora AI**.

---

## 1. Database Issues

### Issue 1: `ECONNREFUSED 127.0.0.1:5432`
- **Root Cause**: PostgreSQL service is stopped or listening on an alternative port (e.g. 5433).
- **Resolution**:
  1. Check PostgreSQL service status:
     ```powershell
     # Windows
     Get-Service postgresql*
     Start-Service postgresql-x64-16
     ```
  2. Verify port in `.env.local`:
     ```env
     DATABASE_URL=postgres://postgres:password@localhost:5433/nexora_ai
     ```

### Issue 2: `self-signed certificate in certificate chain`
- **Root Cause**: SSL negotiation error against local or self-hosted databases.
- **Resolution**:
  Ensure `.env.local` contains:
  ```env
  DATABASE_SSL=disable
  ```

### Issue 3: `relation "project_opportunities" does not exist`
- **Root Cause**: Database tables have not yet been migrated.
- **Resolution**:
  Execute the schema setup script:
  ```bash
  npm run db:setup
  # or: bun run db:setup
  ```

---

## 2. Port & Process Conflicts

### Issue: `Port 3000 is already in use`
- **Resolution**:
  Identify and terminate the blocking process:
  ```powershell
  # Windows PowerShell
  Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object OwningProcess
  Stop-Process -Id <PID> -Force
  ```
  Or run Nexora AI on an alternate port:
  ```powershell
  npx next dev -p 3001
  ```

---

## 3. Better Auth & Session Redirection

### Issue: Page loops continuously between `/sign-in` and `/setup`
- **Root Cause**: `BETTER_AUTH_URL` does not match the exact browser address or protocol (e.g., mismatch between `localhost` vs `127.0.0.1`).
- **Resolution**:
  Verify `.env.local` has matching origins:
  ```env
  BETTER_AUTH_URL=http://localhost:3000
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
  Clear browser session cookies and restart the server.

---

## 4. Multi-Agent Pipeline Diagnostics

### Check Agent Fleet Health
Make an authenticated probe to:
```bash
curl -X GET http://localhost:3000/api/project-manager/health
```

### Inspect Recent Agent Telemetry Logs
Query PostgreSQL directly:
```sql
SELECT agent_name, status, latency_ms, created_at 
FROM agent_executions 
ORDER BY created_at DESC 
LIMIT 20;
```

### Stalled Execution Locks
If an agent crashed mid-run, stale execution locks automatically expire after 5 minutes (`CRM_WORKER_STALE_LOCK_MS`). To manually release locks:
```sql
DELETE FROM project_execution_locks WHERE expires_at < NOW();
```
