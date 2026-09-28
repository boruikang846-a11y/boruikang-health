#!/usr/bin/env bash
# Run manually through Jenkins. Product SQL remains authoritative.
set -euo pipefail
umask 077
[[ "${ENVIRONMENT:-}" == dev ]] || { echo 'Only dev migration is supported' >&2; exit 1; }
: "${MYSQL_HOST:?}" "${MYSQL_USER:?}" "${MYSQL_PWD:?}" "${BACKUP_DIR:?}"
[[ "$BACKUP_DIR" == /* && -d "$BACKUP_DIR" ]] || { echo 'Existing absolute backup directory required' >&2; exit 1; }
export MYSQL_PWD
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARGS=(--protocol=TCP --host="$MYSQL_HOST" --port="${MYSQL_PORT:-3306}" --user="$MYSQL_USER" --default-character-set=utf8mb4)
MYSQL=(mysql "${ARGS[@]}" --connect-timeout=15)
columns="$("${MYSQL[@]}" -N -B -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='bgssai_health' AND table_name='care_task' AND column_name IN ('followup_stage','next_contact_at','contact_result','identity_verified','handover_status','doctor_feedback','acknowledged_at')")"
[[ "$columns" == 0 || "$columns" == 7 ]] || { echo 'Partial schema detected; inspect before continuing' >&2; exit 1; }
backup="$(mktemp "${BACKUP_DIR%/}/health-before-1.3-$(date +%Y%m%d-%H%M%S)-XXXXXX.sql")"
mysqldump "${ARGS[@]}" --single-transaction --no-tablespaces --set-gtid-purged=OFF bgssai_health > "$backup"
[[ -s "$backup" ]] || { echo 'Backup is empty; migration refused' >&2; exit 1; }
echo "Backup created: $backup"
if [[ "$columns" == 0 ]]; then
  "${MYSQL[@]}" < "$ROOT/sql/migrations/20260928-followup-operations.sql"
fi
tables="$("${MYSQL[@]}" -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='bgssai_health' AND table_name IN ('contact_attempt','operations_report')")"
[[ "$tables" == 2 ]] || { echo 'Required tables missing; inspect migration' >&2; exit 1; }
cat "$ROOT/sql/DML.sql" "$ROOT/sql/dev/DML.sql" | "${MYSQL[@]}"
"${MYSQL[@]}" -B -e "SELECT COUNT(*) AS patients FROM bgssai_health.patient; SELECT COUNT(*) AS tasks FROM bgssai_health.care_task; SELECT COUNT(*) AS contact_attempts FROM bgssai_health.contact_attempt;"
echo 'HEALTH dev 1.3 migration complete. Existing rows retained.'
