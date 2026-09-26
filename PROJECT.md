# Taught by Her

Taught by Her helps families discover women tutors, read tutor-written resources, and send named-tutor enquiries.

The vocabulary every package shares is in [CONTEXT.md](CONTEXT.md), and the
decisions a reader will question are in [docs/adr/](docs/adr/).

## Run & Operate

- `PORT=8080 pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — docs check + typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — apply schema changes, deliberately and by hand ([ADR-0002](docs/adr/0002-schema-by-deliberate-push.md))
- `pnpm run prepare:test-database` — validate `TEST_DATABASE_URL` and apply the
  current schema to the dedicated integration-test database
- Required env: `DATABASE_URL` for PostgreSQL access; `VITE_CLERK_PUBLISHABLE_KEY` for the Taught by Her frontend; and `CLERK_PUBLISHABLE_KEY` for the API's Clerk middleware
- Integration tests require a separate `TEST_DATABASE_URL`. The integration test script sets `NODE_ENV=test`, so the database package uses `TEST_DATABASE_URL` only for that process and rejects a test URL identical to `DATABASE_URL`. `pnpm run verify:ci` provisions a temporary local PostgreSQL connection when no dedicated URL is supplied, or uses the supplied dedicated URL, then applies the current schema before running the API suite.
- Production-only API env: `CLERK_SECRET_KEY` enables the Clerk Frontend API proxy used by the Deployment. It is not required for development previews.

Everything above runs in containers here — see
[docs/local-docker.md](docs/local-docker.md) for the prefixes.

## Deploying

**Merging to `main` ships.** CI deploys the container to Fly and then runs the
launch smoke against it; nothing else deploys. `docker/Dockerfile` and
`fly.toml` are the whole configuration, and
[docs/deploy.md](docs/deploy.md) is the walkthrough.

Schema changes are not part of that. Apply them yourself, before merging
anything that expects them — [ADR-0002](docs/adr/0002-schema-by-deliberate-push.md).

The trap worth knowing: `TRUSTED_ORIGINS` must name the public origin exactly.
Nothing infers it, and an empty trusted-origin set rejects every credentialed
request, the public enquiry included.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/well-tutored/src` — public directory, tutor/resource pages, enquiry flow, auth screens, and private workspace
- `artifacts/api-server/src` — Express routes, Clerk middleware, seed/bootstrap behavior, and server startup
- `lib/db/src/schema` — Drizzle/PostgreSQL schema
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/api-client-react` and `lib/api-zod` — generated frontend hooks and runtime schemas
- `artifacts/well-tutored/src/index.css` — editorial visual system and theme tokens

## Architecture decisions

- The frontend and the API are served from one origin, by one container — [ADR-0001](docs/adr/0001-single-origin-deployment.md).
- The public site remains accessible without an account; Clerk gates only the private workspace.
- `clerkMiddleware` is mounted under `/api` rather than globally: Clerk answers
  `text/html` requests with a handshake redirect, which would otherwise
  intercept every page load, since the API also serves the frontend build.
- Browser API requests use Clerk's same-origin session cookies; bearer-token wiring is reserved for mobile clients.
- Public tutor/resource content is served through the API and seeded for a useful first preview.
- OpenAPI generates both React Query hooks and Zod schemas to keep client/server contracts aligned.

## Product

The public experience presents women tutors educated at Russell Group universities, their expertise and availability, and a library of tutor-written learning resources. Visitors can open a tutor profile and submit a named-tutor enquiry. Approved workspace users can manage tutor profiles, resources, and workspace accounts.

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.
- The Vite configs default artifact `PORT` and `BASE_PATH`; compose and the
  images override them.
- The Deployment runs on a development Clerk instance until a custom domain
  exists, which is why the launch smoke in CI waives the Clerk proxy assertion.
