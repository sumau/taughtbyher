# The frontend and the API are served from one origin

The Deployment serves the browser bundle and the API from a single container on
a single origin: `/api/*` is the Express API, everything else is the frontend
build with client-side routes falling back to `index.html`. Splitting them
across a static host and an API host is not a configuration this codebase
supports, and making it one would mean changing two independent things.

## Why

Two mechanisms assume one origin, and each fails differently if it is broken:

- **Clerk's session cookies are same-origin.** A frontend on another host does
  not carry them.
- **`requireTrustedMutationOrigin` rejects mutations** whose `Origin` is not the
  Deployment's own. A separately hosted frontend is, by definition, not that.

The alternative — a CDN or static host for the frontend, the API somewhere else
— is the more conventional shape and is what a reader would expect, which is
why this is written down. It buys cache locality this site does not need, and
costs a rewrite of the auth boundary.

## Consequences

- `clerkMiddleware` is mounted under `/api`, not globally. Clerk answers a
  request that accepts `text/html` with a handshake redirect when it cannot
  establish a session, so a globally mounted Clerk would bounce every page load
  away from the app now that this server serves the HTML.
- `WEB_CLIENT_ROOT` is required at runtime. Without it the server serves the API
  and no frontend — `/api/healthz` stays green while every page 404s.
- `TRUSTED_ORIGINS` must name the Deployment's exact public origin. A mismatch
  rejects every credentialed request, the public Enquiry included, so the site
  looks fine until a visitor tries to use it.
