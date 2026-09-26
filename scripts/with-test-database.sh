#!/usr/bin/env bash
set -Eeuo pipefail

# CI may provide a persistent, dedicated PostgreSQL connection. When it does
# not, create an isolated local cluster for this run instead of ever reusing
# DATABASE_URL.
if [[ -n "${TEST_DATABASE_URL:-}" ]]; then
  exec pnpm run verify:ci:checks
fi

for command in initdb pg_ctl createdb node; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Test database unavailable: required command '$command' was not found." >&2
    exit 1
  fi
done

runtime_dir="$(mktemp -d "${TMPDIR:-/tmp}/well-tutored-ci-db.XXXXXX")"
data_dir="$runtime_dir/data"
socket_dir="$runtime_dir/socket"
log_file="$runtime_dir/postgres.log"
db_user="$(id -un)"
db_name="well_tutored_ci"

cleanup() {
  if [[ -d "$data_dir" ]]; then
    pg_ctl -D "$data_dir" -m immediate stop >/dev/null 2>&1 || true
  fi
  rm -rf "$runtime_dir"
}
trap cleanup EXIT

initdb \
  --no-locale \
  --auth=trust \
  --username="$db_user" \
  --pgdata="$data_dir" \
  >/dev/null

port="$(
  node -e '
    const net = require("node:net");
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      process.stdout.write(String(server.address().port));
      server.close();
    });
  '
)"

mkdir -p "$socket_dir"
pg_ctl \
  -D "$data_dir" \
  -l "$log_file" \
  -o "-h 127.0.0.1 -p $port -k $socket_dir" \
  -w \
  start \
  >/dev/null

createdb \
  -h 127.0.0.1 \
  -p "$port" \
  -U "$db_user" \
  --maintenance-db=postgres \
  "$db_name"

test_database_url="postgresql://${db_user}@127.0.0.1:${port}/${db_name}"
echo "Using an isolated PostgreSQL test database for CI."
TEST_DATABASE_URL="$test_database_url" pnpm run verify:ci:checks