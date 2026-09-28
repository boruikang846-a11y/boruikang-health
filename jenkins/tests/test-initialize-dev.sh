#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TASK_TMP="$(mktemp -d)"
[[ "${TASK_TMP}" == /tmp/* ]] || exit 1
trap 'rm -rf "${TASK_TMP}"' EXIT
mkdir -p "${TASK_TMP}/bin"
cat > "${TASK_TMP}/bin/mysql" <<'STUB'
#!/usr/bin/env bash
if [[ "$*" == *information_schema.tables* ]]; then
  printf '%s\n' "${TABLE_COUNT}"
elif [[ "$*" == *--execute* ]]; then
  echo 'demo counts'
else
  cat > "${CAPTURE}"
fi
STUB
chmod +x "${TASK_TMP}/bin/mysql"
export PATH="${TASK_TMP}/bin:${PATH}" MYSQL_HOST=test MYSQL_USER=test MYSQL_PWD=fixture
export CAPTURE="${TASK_TMP}/executed.sql" TABLE_COUNT=0
if ENVIRONMENT=prod bash "${ROOT}/jenkins/initialize-dev.sh" > "${TASK_TMP}/out" 2>&1; then exit 1; fi
[[ ! -e "${CAPTURE}" ]]
TABLE_COUNT=7
if ENVIRONMENT=dev bash "${ROOT}/jenkins/initialize-dev.sh" > "${TASK_TMP}/out" 2>&1; then exit 1; fi
[[ ! -e "${CAPTURE}" ]]
TABLE_COUNT=0
ENVIRONMENT=dev bash "${ROOT}/jenkins/initialize-dev.sh" > "${TASK_TMP}/out" 2>&1
grep -q 'CREATE TABLE IF NOT EXISTS patient' "${CAPTURE}"
grep -q 'DEMO-HP-' "${CAPTURE}"
if grep -qi 'DROP DATABASE' "${CAPTURE}"; then exit 1; fi
echo 'PASS: refuse prod and existing schema; initialize empty dev with authoritative DDL/DML'
