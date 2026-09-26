# CI and deploy validation

The project uses separate checks for deterministic code quality, the running
development stack, and the live Deployment.

## Deterministic CI validation

Run the complete repository verification with:

```sh
pnpm run verify:ci
```

This command runs, in order:

1. The test-database configuration guard tests.
2. The required test-database environment check.
3. Schema preparation against the dedicated `TEST_DATABASE_URL` connection.
4. The complete API server test suite, including database-backed workspace
   lifecycle integration tests.
5. Taught by Her web tests.
6. Smoke-check tests.
7. `pnpm run build`, which checks documented commands, type-checks libraries
   and workspace packages, and builds the packages that define a build script.

The command stops at the first failure and returns a non-zero exit code. It is
the deterministic quality gate and does not depend on a running dev stack or a
deployed URL.

The command uses an externally supplied `TEST_DATABASE_URL` when one is available.
Otherwise, it provisions a temporary local PostgreSQL cluster for the run,
exports its separate connection as `TEST_DATABASE_URL`, and removes the
cluster when validation finishes. It never falls back to `DATABASE_URL`.

CI is the only automated validation path that runs the database-backed API
integration suite. Those tests create, update, publish, and delete test
records, so they must use an isolated test database rather than a live
environment. The gate rejects a value equal to `DATABASE_URL` and
applies the current schema to the test connection before the API suite starts.
If an external test URL is provided but is missing or the schema cannot be
applied, validation stops with an actionable test-database error instead of
falling back to the application database.

## GitHub Actions

[.github/workflows/ci.yml](../.github/workflows/ci.yml) runs this same gate on
every pull request and on pushes to `main`, and a push to `main` that passes it
goes on to deploy. The gate therefore runs before a merge, not only after one.

The workflow supplies a `postgres:16` service container and points
`TEST_DATABASE_URL` at a `well_tutored_test` database that it creates first.
Supplying a connection takes the externally-provided branch of
`scripts/with-test-database.sh`, so no throwaway cluster is built for the run.
`DATABASE_URL` is set as well, to a different database on the same server, so
the refusal to share a connection between application and integration-test data
is exercised rather than vacuously satisfied by an absent value.

Two environment constraints are load-bearing. The job runs on `ubuntu-latest`
because it is linux-x64 with glibc, and `pnpm-workspace.yaml` prunes every other
platform's native binaries from the lockfile. And pnpm is installed from the
`packageManager` field rather than a version named in the workflow, so the pin
that `docker/Dockerfile.dev` and the deployment build also depend on stays in
one place.

`docs:check` also reads this workflow's `run:` steps and validates the `pnpm`
scripts they name, so a renamed script cannot reach a deploy job that calls it.

No Clerk credentials are configured for the workflow, for the reasons below.

## Credentials

`pnpm run verify:ci` needs no Clerk credentials. The suite passes with
`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY`
all absent, so CI should not be given Clerk secrets, and the interactive
`clerk auth login` flow has no place in it: that command authenticates a person
through a browser, which CI does not have.

Nothing in the suite reaches Clerk over the network. The workspace lifecycle
tests replace `clerkClient.users.getUser` on its prototype and supply
authentication through the `@clerk/express.auth` symbol, the web tests render
under JSDOM, and `test:smoke` exercises the smoke scripts' own logic rather
than launching them against a running host.

The one check that depends on a live Clerk instance is the Frontend API proxy
assertion in the launch smoke check, which runs against the Deployment and uses
its own configured keys rather than anything CI supplies. Development smoke
skips it, because the API server enables the proxy only in production, and the
deploy job waives it while the Deployment is on a development Clerk instance.

The dedicated test database is therefore the only external dependency the
deterministic gate has.

## The deploy job

The `deploy` job in the same workflow runs only on a push to `main`, and only
once `verify` has passed — `needs: verify` is what makes a failed verification
stop a deploy. It checks out, installs `flyctl`, runs `flyctl deploy`, and then
runs the launch smoke against the live site.

It has its own `concurrency` group, without `cancel-in-progress`. The
workflow-level group cancels superseded pull-request runs, which is right for
verification and wrong for a deploy: a cancelled one leaves the Deployment
wherever `flyctl` had got to. Deploys queue instead.

It does **not** apply the schema. That is
[ADR-0002](adr/0002-schema-by-deliberate-push.md), and it is the point.

## Development smoke validation

With the local stack running, validate it through the Vite dev server, which
proxies `/api` to the API service:

```sh
SMOKE_BASE_URL=http://localhost:5173 pnpm smoke:dev
```

The development launch check validates health, catalogue data, public routes,
and invalid-enquiry recovery. It intentionally skips the Clerk Frontend API
proxy assertion because the API server only enables that proxy in production.

`SMOKE_BASE_URL` is required and has no default, in every mode — see
[launch-smoke-check.md](launch-smoke-check.md). Target the dev server rather
than the API port directly, so the web application and `/api` are checked
together.

The browser check (`pnpm smoke:enquiry`) validates the enquiry flow with
keyboard navigation, validation recovery, retry behavior, and an announced
success receipt. Its requests are intercepted so it does not create a real
Enquiry. It needs `SMOKE_CHROMIUM_PATH`, which is why it is not in CI.

## Post-deploy validation

The deploy job finishes by running the launch smoke against the live site:

```sh
SMOKE_BASE_URL=https://well-tutored.fly.dev pnpm run smoke:launch:incomplete
```

A successful Deploy does not mean a usable Deployment, which is why this runs
at all. The check fails if the site is unhealthy or redirects to another
origin.

`smoke:launch:incomplete` is the ordinary launch smoke with two waivers, for
the two conditions this Deployment is still in: it has no published content,
and its Clerk instance is a development one. Each has its own end. When the
last one goes, this becomes `pnpm run smoke:launch`.

**This step is expected to pass, including while the Deployment is empty** —
the waivers are exactly what make that true. So a red Launch smoke on a merge
to `main` is a real failure: an unhealthy site, a redirect to another origin, a
broken public page. It is not the known-empty state, and it is not something to
wave through. Only the flagless `pnpm run smoke:launch`, run by hand, fails on
absent content.

## Recommended release sequence

1. Run `pnpm run verify:ci`. It prepares and uses only the dedicated
   integration-test database for database-backed tests.
2. Bring the local stack up and run the development smoke against it.
3. Apply any schema change to the Deployment database first —
   [ADR-0002](adr/0002-schema-by-deliberate-push.md).
4. Merge. That deploys, and the deploy job runs the launch smoke.

The development smoke is deliberately separate from `verify:ci` because it
needs a running stack, and the launch smoke is separate because it validates
the Deployment visitors actually reach.