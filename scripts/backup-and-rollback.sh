#!/usr/bin/env bash
# ==============================================================================
# NEXGEN GLOBAL AI — Production Database Backup, Migration & Rollback Tool
# Agency: NEXGEN AGENCY | Approver: Anil (anil@nexgen.ai)
# ==============================================================================

set -euo pipefail

ACTION="${1:-}"
DATABASE_URL="${DATABASE_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

if [[ -z "$DATABASE_URL" ]]; then
  echo "ERROR: DATABASE_URL environment variable is required."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

case "$ACTION" in
  backup)
    BACKUP_FILE="$BACKUP_DIR/nexgen_backup_$TIMESTAMP.sql"
    echo "Creating PostgreSQL snapshot backup to $BACKUP_FILE..."
    pg_dump --format=plain --no-owner --no-privileges "$DATABASE_URL" > "$BACKUP_FILE"
    echo "✔ Backup completed successfully: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
    ;;

  migrate)
    MIGRATION_FILE="./scripts/deploy-nexgen-production.sql"
    if [[ ! -f "$MIGRATION_FILE" ]]; then
      echo "ERROR: Migration file $MIGRATION_FILE not found."
      exit 1
    fi
    echo "Executing idempotent production migration ($MIGRATION_FILE)..."
    psql "$DATABASE_URL" -f "$MIGRATION_FILE"
    echo "✔ Production database schema migrated successfully."
    ;;

  rollback-schema)
    echo "WARNING: This will drop all 9 NEXGEN GLOBAL AI tables while preserving AgentSDR tables."
    read -p "Type 'ROLLBACK-CONFIRM' to proceed: " CONFIRM
    if [[ "$CONFIRM" != "ROLLBACK-CONFIRM" ]]; then
      echo "Rollback cancelled."
      exit 0
    fi
    psql "$DATABASE_URL" << 'EOF'
      DROP TABLE IF EXISTS daily_business_reports CASCADE;
      DROP TABLE IF EXISTS agent_executions CASCADE;
      DROP TABLE IF EXISTS project_client_responses CASCADE;
      DROP TABLE IF EXISTS project_followup_tasks CASCADE;
      DROP TABLE IF EXISTS project_followup_sequences CASCADE;
      DROP TABLE IF EXISTS project_outreach_messages CASCADE;
      DROP TABLE IF EXISTS project_proposals CASCADE;
      DROP TABLE IF EXISTS opportunity_scores CASCADE;
      DROP TABLE IF EXISTS project_opportunities CASCADE;
EOF
    echo "✔ NEXGEN schema cleanly rolled back."
    ;;

  restore)
    RESTORE_FILE="${2:-}"
    if [[ -z "$RESTORE_FILE" || ! -f "$RESTORE_FILE" ]]; then
      echo "Usage: ./scripts/backup-and-rollback.sh restore <path-to-sql-file>"
      exit 1
    fi
    echo "Restoring database from snapshot $RESTORE_FILE..."
    psql "$DATABASE_URL" -f "$RESTORE_FILE"
    echo "✔ Database snapshot restored."
    ;;

  *)
    echo "NEXGEN GLOBAL AI Production Tool"
    echo "Usage:"
    echo "  $0 backup                   Create full database snapshot"
    echo "  $0 migrate                  Apply idempotent deploy-nexgen-production.sql"
    echo "  $0 rollback-schema          Drop NEXGEN tables (preserves core CRM)"
    echo "  $0 restore <backup.sql>     Restore from SQL snapshot"
    exit 1
    ;;
esac
