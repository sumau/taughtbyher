import type { RequestHandler } from "express";
import { getTrustedOrigins, normalizeOrigin } from "./request-origin";

type Environment = Record<string, string | undefined>;

// Fly's health checks address the machine directly rather than by hostname, so
// redirecting them would fail every check on a healthy Deployment.
const EXEMPT_PATHS = new Set(["/api/healthz"]);

/**
 * Read PUBLIC_ORIGIN, the one origin the Deployment is known by. Unset means
 * no redirect, which is every local, compose and test run. When it is set it
 * must be a bare origin that TRUSTED_ORIGINS also names: redirecting visitors
 * to an origin whose enquiries are then rejected is worse than not starting.
 */
export function getPublicOrigin(environment: Environment = process.env): string | undefined {
  const configured = environment.PUBLIC_ORIGIN?.trim();
  if (!configured) return undefined;

  const origin = normalizeOrigin(configured);
  if (!origin) {
    throw new Error(
      `PUBLIC_ORIGIN must be a bare origin such as https://example.test; received "${configured}".`,
    );
  }
  if (!getTrustedOrigins(environment).has(origin)) {
    throw new Error(
      `PUBLIC_ORIGIN "${origin}" is not listed in TRUSTED_ORIGINS, so every enquiry sent from it would be rejected.`,
    );
  }
  return origin;
}

function hostOf(hostHeader: string | undefined, protocol: string): string | undefined {
  if (!hostHeader) return undefined;
  try {
    // Parsed with the Public Origin's scheme so that a default port written
    // out in full (welltutored.co.uk:443) compares equal to one left implicit.
    return new URL(`${protocol}//${hostHeader}`).host;
  } catch {
    return undefined;
  }
}

/**
 * Permanently redirect any request that reached the Deployment by another
 * hostname — www, the .com, the fly.dev address — to the same path and query
 * on the Public Origin.
 */
export function redirectToPublicOrigin(environment: Environment = process.env): RequestHandler {
  const publicOrigin = getPublicOrigin(environment);
  if (!publicOrigin) {
    return (_req, _res, next) => next();
  }
  const { host: publicHost, protocol } = new URL(publicOrigin);

  return (req, res, next) => {
    if (EXEMPT_PATHS.has(req.path) || hostOf(req.headers.host, protocol) === publicHost) {
      next();
      return;
    }
    res.redirect(301, `${publicOrigin}${req.originalUrl}`);
  };
}
