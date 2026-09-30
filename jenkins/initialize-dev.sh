#!/usr/bin/env bash
# One-time initialization, run manually through Jenkins with bound MySQL credentials.
# Refuse an existing schema with tables. Never drop a database or overwrite live data.
set -euo pipefail
[[ "${ENVIRONMENT:-}" == dev ]] || { echo 'ENVIRONMENT must be dev' >&2; exit 1; }
: "${MYSQL_HOST:?MYSQL_HOST is required}"
: "${MYSQL_USER:?MYSQL_USER is required}"
: "${MYSQL_PWD:?MYSQL_PWD is required}"
export MYSQL_PWD
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MYSQL=(mysql --protocol=TCP --host="${MYSQL_HOST}" --port="${MYSQL_PORT:-3306}" --user="${MYSQL_USER}" --default-character-set=utf8mb4 --connect-timeout=15)
for sql in sql/DDL.sql sql/DML.sql sql/dev/DML.sql; do
  [[ -s "${ROOT}/${sql}" ]] || { echo "Missing ${sql}" >&2; exit 1; }
done
tables="$("${MYSQL[@]}" --batch --skip-column-names --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='bgssai_health'")"
[[ "${tables}" == 0 ]] || { echo 'bgssai_health already contains tables; inspect and migrate it explicitly. Initialization refused.' >&2; exit 1; }
cat "${ROOT}/sql/DDL.sql" "${ROOT}/sql/DML.sql" "${ROOT}/sql/dev/DML.sql" | "${MYSQL[@]}"
"${MYSQL[@]}" --batch --execute="SELECT COUNT(*) AS demo_patients FROM bgssai_health.patient; SELECT COUNT(*) AS demo_tasks FROM bgssai_health.care_task;"
echo 'HEALTH dev initialization completed with fictional demonstration data.'
