# Local Docker development

Runs the full stack — PostgreSQL, the API server, and the Vite frontend — in
containers, so no Node, pnpm, or PostgreSQL install is needed on the host.

## Prerequisites

Docker with Compose v2. Nothing else.

## First run

```
cp .env.example .env
docker compose run --rm deps        # installs the workspace (a few minutes)
docker compose up -d db
docker compose run --rm migrate     # pushes the Drizzle schema
docker compose up api web
```

Then open <http://localhost:5173>. The API is also reachable directly on
<http://localhost:8080>, and PostgreSQL on port 5432.

On first boot the API seeds illustrative tutors and resources, because the
`dev` script sets `NODE_ENV=development`.

## Everyday use

```
docker compose up api web           # start
docker compose logs -f api          # follow logs
docker compose down                 # stop, keeping the database
docker compose down -v              # stop and discard the database
```

The repository is bind-mounted, so edits on the host apply inside the
containers. Vite hot-reloads. The API server builds with esbuild and does not
watch, so restart it after server changes:

```
docker compose restart api
```

After changing `lib/api-spec/openapi.yaml`, regenerate the client inside the
container, then restart:

```
docker compose exec api pnpm --filter @workspace/api-spec run codegen
```

Schema changes are applied the same way as the initial push, with
`pnpm --filter @workspace/db run push` via `docker compose run --rm migrate`.

## Tests

```
docker compose run --rm test
```

Runs the whole CI suite — database-backed API integration tests, frontend
component tests, smoke checks, documentation checks, typecheck, and build —
against a second database, `well_tutored_test`, on the same PostgreSQL
service. The service creates that database on first use.

Integration tests never touch `well_tutored`. `lib/db/src/index.ts` reads
`TEST_DATABASE_URL` instead of `DATABASE_URL` whenever `NODE_ENV=test`, and
refuses to start if the two are equal, so a misconfigured run fails rather
than mutating application data.

Running `pnpm run verify:ci` directly inside `api` or `web` does not work.
Without `TEST_DATABASE_URL` it tries to build a throwaway cluster with
`initdb` and `pg_ctl`, and the image carries only the PostgreSQL client
binaries:

```
Test database unavailable: required command 'initdb' was not found.
```

The `test` service supplies the connection, which takes the other branch of
`scripts/with-test-database.sh`. CI takes the same branch, with the dedicated
connection coming from its `postgres:16` service container instead.

The suite needs no Clerk credentials and passes without them, so the keys in
`.env` are irrelevant here even though Compose loads them. See
[CI and deploy validation](ci-validation.md) for why, and for what does
depend on a live Clerk instance.

Browser smoke checks are excluded; they need a Chromium these images do not
carry, named by `SMOKE_CHROMIUM_PATH`.

## How requests are routed

The Deployment serves the frontend and the API from one origin, so the frontend
calls `/api` with relative paths. Locally the two run on separate ports, so the
Vite dev server proxies `/api` to the API service. The target is set by
`API_PROXY_TARGET` (`http://api:8080` in Compose, defaulting to
`http://localhost:8080` for a host-native run).

The proxy deliberately does not rewrite the `Origin` header: the API only
trusts the frontend's own origin, which Compose states explicitly through
`TRUSTED_ORIGINS`.

## Clerk

`CLERK_SECRET_KEY` is required even for the public site. The API mounts Clerk
middleware under `/api`, so without a key every request there fails with a 500.
The placeholder in `.env.example` is enough to browse the public experience;
signing in to `/workspace` needs real Clerk keys.

They must be **development** keys (`pk_test_` / `sk_test_`), not production
keys. Both the frontend and the API resolve their
key through `publishableKeyFromHost`, which returns the configured key as-is
only when it is a development key; a `pk_live_` key is discarded and a key is
derived from the hostname instead, producing `clerk.localhost`, which does not
resolve. Clerk development instances accept any host, so localhost needs no
domain configuration.

Get a set of keys in one of these ways:

- `npx clerk@latest init --accountless` creates an unclaimed development
  application and writes its keys, with no Clerk account or login. Run it in a
  scratch directory and copy the keys over: it is framework-aware and will
  otherwise try to scaffold Clerk into this repository, which already has it
  wired up.
- `npx clerk@latest env pull` writes the keys of an application you already
  own, after logging in.
- Copy them from <https://dashboard.clerk.com/~/api-keys>.

Put all three variables in `.env`, using the same publishable value twice:

```
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Then recreate the containers. A plain restart keeps the old environment:

```
docker compose up -d --force-recreate api web
```

## Signing in to the workspace

Sign up before trying to sign in. A Clerk application starts with no users, and
the sign-in form answers an unknown address with "Couldn't find your account",
which reads like a configuration fault but is not one. Go to
<http://localhost:5173/sign-up>.

Development instances accept `+clerk_test` subaddresses and never send mail to
them: register `you+clerk_test@example.com` and enter the fixed verification
code `424242`. A real address works too, and Clerk emails a genuine code.

Authenticating is not the same as having workspace access. On first sign-in the
API creates a `workspace_accounts` row with the role `pending`, which the
workspace boundary refuses. A database created by Compose contains no owner to
approve it, so the first account has to be promoted directly:

```
docker compose exec -T db psql -U postgres -d well_tutored -c "
UPDATE workspace_accounts
   SET role = 'owner', updated_at = NOW()
 WHERE lower(email) = lower('you+clerk_test@example.com')
   AND role = 'pending'
   AND NOT EXISTS (SELECT 1 FROM workspace_accounts WHERE role = 'owner')
RETURNING id, email, role;"
```

The guards make this safe to repeat: once an owner exists it changes nothing.
No rows returned means the address matched no pending account. Every later
account is approved by the owner through the workspace UI instead. See
[Workspace owner bootstrap](workspace-owner-bootstrap.md) for the full
procedure and its safety rules.

### What survives what

Restarts and `docker compose down` keep both the Clerk user and the database,
so access carries over untouched.

`docker compose down -v` discards the database, and every account role with it.
The Clerk user is unaffected, because it lives on Clerk's side rather than in
PostgreSQL — so sign in rather than sign up, which writes a fresh `pending`
row, then repeat the promotion above.

An unclaimed accountless application expires on its own and takes its users
with it. The database is untouched, and this is the case that looks worse than
it is: workspace accounts are keyed on the verified email address, not the
Clerk user id. A new Clerk identity presenting an email that already has an
account resolves to that account and creates no duplicate, which
`artifacts/api-server/src/routes/workspace.lifecycle.test.ts` asserts. So
recovery is not a fresh start:

1. Create a replacement application, as described above.
2. Put its three keys in `.env`.
3. Recreate the containers: `docker compose up -d --force-recreate api web`.
4. Sign up with the same email address as before.

The existing account is picked up again, owner role included. Only losing the
application and the database together calls for a new sign-up followed by the
promotion.

Claiming the application with `clerk auth login` avoids the expiry altogether,
and is worth doing once if this login is meant to last.

## Notes on the image

- Debian (glibc), not Alpine: `pnpm-workspace.yaml` excludes every `*-musl`
  native binary, so a musl base cannot resolve lightningcss, Tailwind's oxide
  binary, or rollup.
- `linux/amd64`: the same overrides keep only the `linux-x64` esbuild binary.
- pnpm is pinned in the image to the exact version in the root
  `package.json` `packageManager` field.
  Two versions of pnpm writing `pnpm-lock.yaml` produce churn, and both the
  deployment build and `scripts/post-merge.sh` install with
  `--frozen-lockfile`, so a mismatch fails the deploy rather than resolving
  itself.
- The pnpm store lives at `.pnpm-store/` in the repository (gitignored). It
  has to share a filesystem with the installed packages so that hardlinking
  works, and node_modules is in the bind mount; a named volume would sit on
  another device and be ignored. It survives `docker compose down -v`, so
  reinstalls stay fast. Delete the directory to reclaim the space (~500 MB).
