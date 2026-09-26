# Launch smoke check

The Launch Smoke asserts that a Deployment is *usable*, which a successful
Deploy does not imply. It needs no workspace credentials and writes nothing.

```sh
SMOKE_BASE_URL=https://well-tutored.fly.dev pnpm smoke:launch
```

`SMOKE_BASE_URL` is required and has no default. Nothing infers the target: the
Deployment's origin is committed in `fly.toml`, and a check that picks its own
target is one that can report on a site nobody asked about.

## What it checks

- the API health response at `/api/healthz`;
- the Clerk Frontend API proxy at `/api/__clerk/v1/environment`;
- tutor and resource catalogue responses, including non-empty published data
  and the response fields used by public catalogue links;
- the public home, resources, enquiry, tutor-profile, and resource-detail
  pages, each requested with `Accept: text/html`;
- invalid enquiry recovery by sending `{}` to `POST /api/enquiries`, expecting
  a `400` validation response, and checking health again afterward.

Every request must also finish on the origin it was sent to. A target that
redirects elsewhere fails the check and reports both origins, so an old
hostname redirecting to a replacement is caught before its responses are
treated as healthy.

The command exits non-zero on any failed check.

## Waivers

Three flags waive an assertion the target genuinely cannot meet. Each is named
for the condition under which passing it is correct, not for what it skips, so
a stale one reads as a bug rather than as configuration. A waived check is
reported as skipped rather than silently dropped.

| Flag | Waives | Ends when |
| --- | --- | --- |
| `--dev` | the Clerk proxy check, which the API enables only in production | never; development is a permanent mode |
| `--allow-empty` | the non-empty assertions on `/api/tutors`, `/api/resources` and the pages that address a Tutor or Resource by slug | the Deployment has published content |
| `--dev-clerk-instance` | the Clerk proxy check, which answers `host_invalid` for a development instance whatever the Deployment's health | the Deployment moves to a production Clerk instance |

Two scripts wrap them:

```sh
SMOKE_BASE_URL=http://prod:8080 pnpm smoke:dev
SMOKE_BASE_URL=https://well-tutored.fly.dev pnpm smoke:launch:incomplete
```

`smoke:launch:incomplete` carries the last two flags together and is what the
deploy job in `.github/workflows/ci.yml` runs. When both conditions have ended
it becomes `pnpm run smoke:launch`, and the two script entries go with it.

## Timeout controls

The smoke check applies a timeout to each request and an overall deadline to
the complete check:

- `SMOKE_TIMEOUT_MS` — per-request timeout. Defaults to `15000` ms and accepts
  integer values from `100` through `60000` ms.
- `SMOKE_TOTAL_TIMEOUT_MS` — overall launch-check timeout. Defaults to `60000`
  ms and accepts integer values from `1000` through `300000` ms.

When a target is intentionally slower, override the relevant values for that
run. Increase the overall timeout as well if the complete sequence needs more
time:

```sh
SMOKE_TIMEOUT_MS=30000 SMOKE_TOTAL_TIMEOUT_MS=120000 pnpm smoke:launch
```

These controls do not disable the checks or allow requests to continue past the
overall deadline. Values outside the supported ranges, or values that are not
whole numbers of milliseconds, fail before requests are made.

## The enquiry browser check

The enquiry form also has a real-browser keyboard smoke check. It traverses the
form with native Tab and Enter actions, verifies validation recovery and
disabled-submit behavior, and intercepts the final response so the check never
creates a real Enquiry.

```sh
SMOKE_BASE_URL=https://well-tutored.fly.dev \
  SMOKE_CHROMIUM_PATH=/path/to/chromium pnpm smoke:enquiry
```

`SMOKE_CHROMIUM_PATH` is required: `playwright-core` bundles no browser and
none of this project's images carry one, so this check runs from wherever a
Chromium already exists. It is deliberately not in CI for the same reason.
