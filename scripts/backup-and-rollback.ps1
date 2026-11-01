<#
.SYNOPSIS
  NEXGEN GLOBAL AI — Production Database Backup, Migration & Rollback Script (PowerShell)
  Agency: NEXGEN AGENCY | Approver: Anil (anil@nexgen.ai)

.DESCRIPTION
  Provides native PostgreSQL backup, migration, and rollback operations for Windows / PowerShell deployments.
#>

param(
  [Parameter(Mandatory=$true, Position=0)]
  [ValidateSet("backup", "migrate", "rollback-schema", "restore")]
  [string]$Action,

  [Parameter(Mandatory=$false, Position=1)]
  [string]$TargetFile,

  [Parameter(Mandatory=$false)]
  [string]$DatabaseUrl = $env:DATABASE_URL,

  [Parameter(Mandatory=$false)]
  [string]$BackupDir = ".\backups"
)

if (-not $DatabaseUrl) {
  Write-Error "DATABASE_URL environment variable or -DatabaseUrl parameter is required."
  exit 1
}

if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

switch ($Action) {
  "backup" {
    $backupPath = Join-Path $BackupDir "nexgen_backup_$timestamp.sql"
    Write-Host "Creating PostgreSQL snapshot backup to $backupPath..." -ForegroundColor Cyan
    & pg_dump --format=plain --no-owner --no-privileges $DatabaseUrl | Out-File -FilePath $backupPath -Encoding utf8
    Write-Host "✔ Backup completed successfully: $backupPath" -ForegroundColor Green
  }

  "migrate" {
    $migrationPath = ".\scripts\deploy-nexgen-production.sql"
    if (-not (Test-Path $migrationPath)) {
      Write-Error "Migration file $migrationPath not found."
      exit 1
    }
    Write-Host "Executing idempotent production migration ($migrationPath)..." -ForegroundColor Cyan
    & psql $DatabaseUrl -f $migrationPath
    Write-Host "✔ Production database schema migrated successfully." -ForegroundColor Green
  }

  "rollback-schema" {
    Write-Host "WARNING: This will drop all 9 NEXGEN GLOBAL AI tables while preserving AgentSDR base tables." -ForegroundColor Yellow
    $confirm = Read-Host "Type 'ROLLBACK-CONFIRM' to proceed"
    if ($confirm -ne "ROLLBACK-CONFIRM") {
      Write-Host "Rollback cancelled." -ForegroundColor Red
      exit 0
    }
    $rollbackSql = @"
      DROP TABLE IF EXISTS daily_business_reports CASCADE;
      DROP TABLE IF EXISTS agent_executions CASCADE;
      DROP TABLE IF EXISTS project_client_responses CASCADE;
      DROP TABLE IF EXISTS project_followup_tasks CASCADE;
      DROP TABLE IF EXISTS project_followup_sequences CASCADE;
      DROP TABLE IF EXISTS project_outreach_messages CASCADE;
      DROP TABLE IF EXISTS project_proposals CASCADE;
      DROP TABLE IF EXISTS opportunity_scores CASCADE;
      DROP TABLE IF EXISTS project_opportunities CASCADE;
"@
    $rollbackSql | & psql $DatabaseUrl
    Write-Host "✔ NEXGEN schema cleanly rolled back." -ForegroundColor Green
  }

  "restore" {
    if (-not $TargetFile -or -not (Test-Path $TargetFile)) {
      Write-Error "Usage: .\scripts\backup-and-rollback.ps1 restore -TargetFile <path-to-sql>"
      exit 1
    }
    Write-Host "Restoring database from snapshot $TargetFile..." -ForegroundColor Cyan
    & psql $DatabaseUrl -f $TargetFile
    Write-Host "✔ Database snapshot restored." -ForegroundColor Green
  }
}
