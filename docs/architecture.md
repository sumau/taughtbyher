# Taught by Her architecture

This project keeps the existing React, Express, Drizzle, Clerk, and generated
OpenAPI client stack. The application is organized around two user-facing
surfaces and a shared API/data layer.

## Public website

The React app serves the public experience:

- `/` — tutor discovery homepage
- `/tutors/:slug` — published tutor profile
- `/resources` — published resource library
- `/resources/:slug` — published resource detail
- `/enquire` — enquiry form

Public pages use the shared `Shell` for navigation, footer, policy dialogs, and
the public visual language. Public API handlers live in
`artifacts/api-server/src/routes/content.ts` and
`artifacts/api-server/src/routes/enquiries.ts`.

## Authentication

Clerk provides the sign-in and sign-up pages:

- `/sign-in` — sign-in flow (including Clerk's nested flow paths)
- `/sign-up` — sign-up flow (including Clerk's nested flow paths)

## Workspace

Workspace routes are protected by Clerk and the workspace account boundary:

- `/workspace` — dashboard
- `/workspace/enquiries` — workspace enquiry list and retry actions
- `/workspace/profile` — tutor profile drafts and publishing
- `/workspace/resources/new` — create a resource
- `/workspace/resources/:id` — edit a resource
- `/workspace/tutors` — owner-only tutor profile management
- `/workspace/accounts` — owner-only account approval and tutor assignment

`/workspace/articles/new` and `/workspace/articles/:id` remain compatibility
aliases and redirect to the canonical resource URLs. Workspace accounts are
stored in the `workspace_accounts` table.

## API boundaries

Workspace code is split by responsibility:

- `auth/workspace-access.ts` — authenticated account lookup and role checks
- `services/workspace-account-service.ts` — Clerk-to-workspace account
  provisioning, tutor assignment initialization, slug allocation, and accent
  availability
- `domain/workspace-validation.ts` — publishability rules for resources and
  tutor profiles
- `presenters/resource-presenter.ts` — resource response mapping and joined
  resource lookup
- `presenters/tutor-presenter.ts` — tutor response mapping and draft overlay
- `routes/workspace.ts` — composition point that mounts the workspace subrouters;
  it does not contain all workspace validation or database mutations
- `routes/workspace-session.ts` — workspace session and current-account
  endpoints
- `routes/workspace-resources.ts` — resource request validation and resource
  mutations
- `routes/workspace-profile.ts` — tutor profile request validation and profile
  mutations
- `routes/workspace-tutors.ts` — owner-only tutor management
- `routes/workspace-accounts.ts` — owner-only workspace account management
- `routes/enquiries.ts` — public enquiry creation and workspace enquiry list and
  retry handlers

The intended direction for future workspace changes is to keep route handlers
thin: authenticate, validate the request, call a domain/service function, and
present the response. Generated API clients and schemas remain generated
artifacts and should not be edited manually.

## Publishing rules

- A published tutor profile can have a private draft.
- Public routes read published tutor and resource state.
- Publishing validates the complete object before changing its status.
- Discarding a tutor profile draft restores the published profile.
- Archived tutors must be restored before editing.
- A tutor account can edit its own resources; an owner can manage all workspace
  records.

### Tutor profiles versus resources

Tutor profiles keep the published profile in `tutors` and store workspace edits
in `tutor_profile_drafts`. This means the public site continues to show the
last published profile while a new version is being edited, and the draft can
be published or discarded as a whole.

Resources use a single `resources` row with a `draft` or `published` status.
New or explicitly draft resources do not appear publicly until published.
Editing an already-published resource while keeping its status as `published`
updates the public resource in place; changing it to `draft` removes it from
public results while it is being revised. Resources do not currently keep a
private draft alongside a live published version.

## Styling payload

The Taught by Her Vite build enables Tailwind's production Lightning CSS
optimization. The primary stylesheet is currently 115,031 bytes raw and
19,737 bytes gzip, with a budget of 115,200 raw and 19,800 gzip; run
`pnpm --filter @workspace/well-tutored run build` followed by
`pnpm --filter @workspace/well-tutored run verify:css` to verify the budget.

The remaining global CSS is intentional: Tailwind preflight, theme variables,
utilities used by both public and authenticated routes, motion states, and
registered custom properties are shared so route transitions do not flash
unstyled content. The authenticated route's separate CSS chunk is currently
negligible; further savings would require splitting shared styles and
reintroducing them during navigation.