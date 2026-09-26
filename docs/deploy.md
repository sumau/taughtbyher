# Deploying

Merging to `main` deploys. `.github/workflows/ci.yml` builds the image, runs
`flyctl deploy`, and then runs the launch smoke against the result. This
document covers the parts that are not automatic: the database, the schema, the
Clerk keys, and standing a Deployment up for the first time.

## What runs

One container. `docker/Dockerfile` builds the frontend, bundles the API, and
ships a runtime stage that serves both on a single port:

- `/api/*` — the Express API
- `/api/__clerk/*` — the Clerk Frontend API proxy, active only when
  `NODE_ENV=production` and `CLERK_SECRET_KEY` is set
- everything else — the Vite build from `artifacts/well-tutored/dist/public`,
  with client-side routes falling back to `index.html`

One origin serves both, and splitting them is not a configuration this codebase
supports — [ADR-0001](adr/0001-single-origin-deployment.md) has the three
mechanisms that depend on it.

Plus a PostgreSQL database, hosted separately from the container — see
**Database** below.

## Standing one up, in order

Each step has its own section below; this is the order they have to happen in.

1. **[Database](#database)** — create the Neon project, take the pooled and
   direct connection strings.
2. **[Apply the schema](#applying-the-schema)** — from this checkout, using the
   direct string. Nothing does this for you.
3. **[Clerk keys](#clerk-keys)** — a development instance, because you do not
   control DNS for `*.fly.dev`.
4. **[Deploy](#flyio)** — create the app, set the secrets, put the publishable
   key in `fly.toml`, `fly deploy`.
5. **Expect an empty site.** A fresh database has no tutors or resources — see
   [Content](#content).

Everything can be rehearsed first without deploying: see [Verifying the image
locally](#verifying-the-image-locally).

## Database

[Neon](https://neon.tech) hosts the PostgreSQL. It has a free tier, takes real
backups, and — the part that matters operationally — is reachable over the
public internet, so every step that runs from this checkout (the schema push
below, seeding, copying data in) needs no tunnel.

Create a project, then take **two** connection strings from its dashboard. Neon
marks the pooled one with `-pooler` in the hostname, and they are not
interchangeable:

- The **pooled** string is the application's. Set it as the `DATABASE_URL`
  secret on the Deployment.
- The **direct** string is for schema work. Use it for the push below.

Both need `?sslmode=require` appended: `lib/db/src/index.ts` builds a bare `pg`
pool from `DATABASE_URL` and sets no SSL options of its own, so without it the
connection is refused.

Nothing in the application is Neon-specific — it is a `DATABASE_URL` and
nothing more — so any hosted PostgreSQL substitutes, with the pooled/direct
distinction being whatever that provider's equivalent is. Fly's own Postgres
offerings are deliberately not covered here: the managed one is private-network
only, so every command below would need a proxy in front of it, and the
unmanaged one is something Fly's documentation now says they cannot support.

## Applying the schema

Nothing applies the schema for you, and the Deploy job deliberately does not —
[ADR-0002](adr/0002-schema-by-deliberate-push.md) is why. Drizzle's `push` is
the only mechanism this project has; run it deliberately against the Deployment
database from a checkout.

Export that connection string once per shell, then pass it in **expanded**:

```
export DATABASE_URL='postgres://...?sslmode=require'

docker compose run --rm -e DATABASE_URL="$DATABASE_URL" --entrypoint bash migrate \
  -lc 'pnpm --filter @workspace/db run push'
```

This runs from your machine to the database. Secrets set on Fly play no part in
it, so the connection string has to be supplied here.

Three things about that command:

- **Pass `-e DATABASE_URL="$DATABASE_URL"`, expanded, not bare `-e
  DATABASE_URL`.** `docker-compose.yml` sets `DATABASE_URL` on the `migrate`
  service to the local development database, and an explicit `environment:`
  entry beats anything from `.env`. The bare form asks Compose to forward the
  variable from your shell, and when that forwarding does not happen the service
  default applies — so you push to your local container instead of the
  Deployment, successfully and quietly. The expanded form cannot fail that way:
  your shell substitutes the value before Docker sees it, and an unset variable
  passes an empty string, which fails loudly with `DATABASE_URL, ensure the
  database is provisioned` instead of silently choosing the wrong database.
- **`?sslmode=require`** belongs on the connection string, for the reason given
  under [Database](#database) above.
- **Use Neon's direct connection string here**, not the pooled one — the
  `-pooler` hostname is the application's. Pooled connections are a poor fit for
  DDL.

`push` prompts before anything destructive. Read the prompt, and review the diff
of `lib/db/src/schema/` first — nothing downstream asks. Against an empty
database there is nothing to drop, so a *truncate* prompt there means the
connection string is not pointing where you think it is.

**Renames are the exception, and they prompt on any database, empty or not.**
`push` diffs states, so it cannot tell a renamed type or constraint from a
dropped one and a new one — it asks. The highlighted default is `create`, which
is the drop-and-recreate; the rename is the line below it:

```
Is workspace_account_role enum created or renamed from another enum?
❯ + workspace_account_role                       create enum
  ~ studio_account_role › workspace_account_role rename enum
```

Answered as a rename it emits `ALTER TYPE ... RENAME TO ...` and touches no
rows. Answered with the default it creates the new type, casts the column across
with `USING role::text::<new type>`, restores the default and drops the old
type — which, for a pure rename where the label set is unchanged, lands on the
same state. Verified against a populated table: rows survive intact, and a
second `push` reports no changes.

The default is only dangerous when the rename also **changes the labels**. Then
the cast through `text` fails on any row holding a label the new type lacks, and
you get a partly applied push instead of a clean one. Pick the rename line
anyway — it is the honest description of the change, and it does not depend on
the labels happening to match.

Renaming a constraint additionally asks whether to truncate the table before
adding the new one — answer no; the default is already no.

Check what landed, and check *where* it landed at the same time:

```
docker compose run --rm -e DATABASE_URL="$DATABASE_URL" --entrypoint bash migrate \
  -lc 'psql "$DATABASE_URL" -c "\conninfo" -c "\dt"'
```

`tutors`, `resources`, `enquiries` and `workspace_accounts` should all be
listed.

Read the `\conninfo` line first, and read it twice. It names the host you
actually reached, and it is the only output here that distinguishes the
Deployment from your local container — the table list looks the same either way.
There are two ways to be somewhere you did not intend:

- **Host `db` at port `5432`** — the environment variable did not reach the
  container and you are inspecting, or pushing to, the local database.
- **A hostname containing `-pooler`** — you are on the pooled endpoint, which is
  the application's, not the one for schema work. Drop `-pooler` from the
  hostname to get the direct endpoint. `push` against the pooled endpoint can
  report success without converging, so a `push` that keeps finding the same
  changes run after run is the symptom to watch for.

On the Deployment `workspace_accounts` is empty until the owner bootstrap runs,
so a non-zero count is itself a sign you are on the wrong database.

## Clerk keys

Which keys work depends on the hostname, and getting this wrong is the most
common way a first Deployment fails.

`publishableKeyFromHost` decides this, and the SPA
(`artifacts/well-tutored/src/app/config.ts`) and the API (`app.ts`) both call it:

```js
if (fallbackKey && isDevelopmentFromPublishableKey(fallbackKey)) return fallbackKey;
return buildPublishableKey(`clerk.${hostname}`);
```

- A **development** key (`pk_test_…`) is used exactly as given, so Clerk is
  reached at `<slug>.clerk.accounts.dev` whatever the hostname. This is the only
  configuration that works on a hostname whose DNS you do not control, such as
  `*.fly.dev`, and it needs no records and no proxy.
- A **production** key (`pk_live_…`), or no key at all, is discarded: both sides
  derive a key for `clerk.<hostname>` instead. That expects the CNAME a Clerk
  production instance asks you to add, so it requires a domain of your own.

So stand the Deployment up on development keys, and move to a production
instance when you attach a real domain — at which point `TRUSTED_ORIGINS` and
`app` in `fly.toml` become that domain too, and they change together.
Development instances show a notice in the sign-in UI, share Clerk's OAuth
credentials, and carry lower limits, so they are for getting the Deployment
working rather than for live traffic.

## Fly.io

`fly.toml` is committed and points at `docker/Dockerfile`.

Fly runs the container; Neon holds the database. By this point the Neon
project exists, the schema is pushed, and you have Clerk development keys — all
three are prerequisites, not steps you can take afterwards.

Pass the secrets in from shell variables rather than typing them into the
command. `read -rs` takes each value without echoing it or writing it to shell
history; paste it and press Enter:

```
read -rsp 'Pooled DATABASE_URL: ' POOLED_DATABASE_URL; echo
read -rsp 'CLERK_SECRET_KEY: ' CLERK_SECRET_KEY; echo
read -rsp 'CLERK_PUBLISHABLE_KEY: ' CLERK_PUBLISHABLE_KEY; echo

fly apps create well-tutored
fly secrets set \
  DATABASE_URL="$POOLED_DATABASE_URL" \
  CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
  CLERK_PUBLISHABLE_KEY="$CLERK_PUBLISHABLE_KEY"
```

The connection string is read as `POOLED_DATABASE_URL`, not `DATABASE_URL`, so
it cannot be confused with the `DATABASE_URL` you exported for
[schema work](#applying-the-schema). They are different strings: this one is
the **pooled** endpoint the application runs against, the other is the
**direct** endpoint for DDL. Passing the direct one here works and then quietly
costs you connection pooling in production.

`fly launch --no-deploy` also works, but it rewrites the committed `fly.toml`
from its own guesses; `git diff fly.toml` afterwards and revert what it changed.
`fly apps create` only reserves the name, which is all this repository needs.

CI needs a token of its own. This is the one step nothing else can do for you:

```
fly tokens create deploy
gh secret set FLY_API_TOKEN
```

Then edit two values in `fly.toml` itself. They are committed to the
repository, which is correct for both:

```toml
[build.args]
  # Your Clerk publishable key, pasted in full.
  VITE_CLERK_PUBLISHABLE_KEY = "pk_test_..."

[env]
  # The hostname `fly apps create` gave you, with the scheme and no trailing
  # slash.
  TRUSTED_ORIGINS = "https://well-tutored.fly.dev"
```

**The publishable key has to be here and not in `fly secrets`.** Vite compiles
it into the browser bundle while the image is being built, and a Fly secret only
exists once the container is running — too late. Set it with `fly secrets set`
and the build silently uses the empty string in `fly.toml`, the bundle ships
without a Clerk key, and sign-in never initialises. Committing it is expected
rather than a leak: a publishable key is public by design and is served to every
visitor in the JavaScript. The three secrets above are the opposite case and
must never appear in this file.

**`TRUSTED_ORIGINS` must match the deployed hostname exactly.** A mismatch
rejects every credentialed request, the public enquiry POST included, so the
site looks fine until someone tries to use it.

The health check is already pointed at `/api/healthz`.

After that, merging to `main` deploys. `fly deploy` from a checkout still works
and is how you would ship a first image before any of this is merged.

## Configuration reference

| Variable | When | Notes |
| --- | --- | --- |
| `DATABASE_URL` | runtime, required | Append `?sslmode=require` for a hosted database: `lib/db/src/index.ts` creates a bare `pg` pool with no SSL options of its own. |
| `TRUSTED_ORIGINS` | runtime, required | The exact public origin, e.g. `https://well-tutored.fly.dev`. See below. |
| `PORT` | runtime, required | The image defaults it to `8080`. |
| `WEB_CLIENT_ROOT` | runtime, required | The directory holding the frontend build; `docker/Dockerfile` sets it to `/app/web`. Leaving it unset makes the server skip serving the frontend entirely, so every page answers 404 while `/api/healthz` stays green. It logs a warning in that state. |
| `CLERK_SECRET_KEY` | runtime, required | Not optional: the Clerk middleware fails every `/api` request with a 500 when it is absent, public endpoints included. A production key enables the Clerk proxy and workspace sign-in; a syntactically valid placeholder (`sk_test_` + 32 characters, as in `.env.example`) is enough to serve the public site. |
| `CLERK_PUBLISHABLE_KEY` | runtime | Used by the Clerk middleware. |
| `VITE_CLERK_PUBLISHABLE_KEY` | **build**, as a build argument | Compiled into the browser bundle. Setting it at runtime has no effect. |

`TRUSTED_ORIGINS` is the one that bites. In production nothing infers it, and an
empty trusted-origin set rejects every credentialed request — including the
public enquiry POST, which is the main thing visitors do. Set it to the public
origin, with no trailing path, and update it when the domain changes.

`configuredValues` in `artifacts/api-server/src/middlewares/request-origin.ts`
reads `TRUSTED_ORIGINS` and `CORS_ORIGINS`, treats them as one list, and falls
back to the localhost defaults only outside production. Setting either one
**replaces** those defaults, so a Deployment trusts what `fly.toml` names and
nothing else.

The public site does not need *working* Clerk keys, but it does need
`CLERK_SECRET_KEY` to be present — see the table. With a placeholder, the
directory, resources and enquiry flow all work and `/workspace` simply cannot be
signed into. Pages themselves keep rendering either way, because the Clerk
middleware is mounted under `/api` only.

## Content

`ensureSeedContent()` only runs when `NODE_ENV=development`
(`artifacts/api-server/src/index.ts`), so a fresh Deployment database has no
tutors or resources and the public directory renders empty. Two ways on from
there: deploy empty and create content through `/workspace`, or seed the
illustrative content.

### Deploying against an empty database

Perfectly workable, and the shortest path to a Deployment you can log into. Two
things behave differently and neither is a fault:

- The directory and resource library render their empty states, and `/api/tutors`
  returns an empty list.
- `pnpm run smoke:launch`, run by hand, **fails**, because it asserts at least
  one published tutor and one published resource.
  `pnpm run smoke:launch:incomplete` waives exactly those assertions, and is
  what CI runs while the Deployment is empty. Everything that does not depend on
  content still runs. The two are easy to conflate: **the deploy job's Launch
  smoke step is green on an empty Deployment**, so a red one there is a genuine
  failure rather than this expected state. Drop back to `smoke:launch` once
  there is content, and delete the waived variant:

  ```
  SMOKE_BASE_URL=https://well-tutored.fly.dev pnpm run smoke:launch
  ```

To get the illustrative tutors and resources without copying a database, point
the development API at the Deployment database: its `dev` script sets
`NODE_ENV=development`, which is the condition the seeding is gated on. With a
tunnel to that database open, override `DATABASE_URL` on the `api` service and
interrupt it once it logs that it is listening. Seeding is idempotent, so a
repeat run changes nothing.

### Switching Clerk instances later

Standing the Deployment up on a development instance and moving to a production
one when a domain arrives means your Clerk user ID changes, so budget one step
for it. Tutors, resources, drafts and enquiries are untouched — none of them
reference Clerk. Your `workspace_accounts` row is the exception: the new instance
issues a different `clerk_user_id`, so signing in creates a second, pending
account, and the stale `owner` row makes the `UPDATE` in
[workspace-owner-bootstrap.md](workspace-owner-bootstrap.md) a no-op, since it is
guarded by `AND NOT EXISTS (SELECT 1 FROM workspace_accounts WHERE role =
'owner')`. Delete the stale row first, then sign in on the new instance and
promote again.

## Workspace sign-in

`clerkMiddleware` is mounted under `/api`, not globally. Clerk answers a request
that accepts `text/html` with a handshake redirect when it cannot establish a
session, so a globally mounted Clerk would bounce every page load away from the
app, since this server serves the HTML. The SPA authenticates client-side
through `@clerk/react`.

The Frontend API proxy at `/api/__clerk` is a third path, and is not verified
here. It also needs a production instance — it attributes requests by host and a
dev instance answers `host_invalid` — and the frontend only routes through it
when `VITE_CLERK_PROXY_URL` is set, which nothing in this repository does, while
the API's `clerkMiddleware` passes no matching `proxyUrl`. Treat wiring it up as
work, not configuration.

## Verifying the image locally

The `prod` compose service runs the Deployment image against the local
development database, which has seed content:

```
docker compose up --build prod      # http://localhost:8081
```

That covers the two things most likely to be wrong — whether the frontend is
actually served, and whether `TRUSTED_ORIGINS` permits an enquiry — without
deploying anything. The launch smoke check runs against it over the compose
network, and is the regression test for both:

```
docker compose run --rm --entrypoint bash api -lc 'SMOKE_BASE_URL=http://prod:8080 pnpm run smoke:dev'
```

It requests every public page with `Accept: text/html`, which is what caught the
Clerk handshake redirect described above. The rest of the suite is unchanged:
`docker compose run --rm test`, described in [local-docker.md](local-docker.md).

## Render, Railway, Cloud Run, or anything else

The same image works anywhere that runs a container and injects environment
variables. Build from the repository root — the Dockerfile copies the workspace,
so `docker/` is the wrong build context:

```
docker build -f docker/Dockerfile --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_live_... -t well-tutored .
```

Point the platform's health check at `/api/healthz` and let it supply `PORT` if
it insists on its own.
