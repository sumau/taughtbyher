---
name: Development smoke checks
description: Environment-specific constraints for running launch smoke checks against the local development stack.
---

Development launch smoke checks must use an explicit target and must not
require a Clerk production instance. The launch check asks Clerk's
`/v1/environment` at `SMOKE_CLERK_FRONTEND_API` for a production instance, and
a local stack runs on a development one.

**Why:** A generic production smoke check against a development target
produced a false failure even though the API, catalogue, public pages, and
enquiry flow were healthy.

**How to apply:** Keep the development mode separate. `SMOKE_BASE_URL` is
required in every mode and has no default, so no run can accidentally pick its
own target; `--dev` skips only the Clerk production-instance check, and every
other mode requires `SMOKE_CLERK_FRONTEND_API`.
