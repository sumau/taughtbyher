import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL_ENV_KEY = "SMOKE_BASE_URL";
export const SMOKE_TIMEOUT_MIN_MS = 100;
export const SMOKE_TIMEOUT_MAX_MS = 60_000;
export const SMOKE_TOTAL_TIMEOUT_MIN_MS = 1_000;
export const SMOKE_TOTAL_TIMEOUT_MAX_MS = 300_000;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_TOTAL_TIMEOUT_MS = 60_000;
const SMOKE_TIMEOUT_FORMAT = /^\d+$/;
const DEVELOPMENT_CHECK_FLAG = "--dev";
// Both waivers are named for the condition under which passing them is
// correct, not for what they skip: a stale one in CI should read as a bug.
const EMPTY_CONTENT_CHECK_FLAG = "--allow-empty";
const DEVELOPMENT_CLERK_INSTANCE_FLAG = "--dev-clerk-instance";

type JsonRecord = Record<string, unknown>;

type SmokeCheckModes = {
  isDevelopmentCheck: boolean;
  allowsEmptyContent: boolean;
  hasDevelopmentClerkInstance: boolean;
};

type ResponseData = {
  response: Response;
  body: string;
  contentType: string;
};

class SmokeCheckError extends Error {}

type SmokeDeadline = {
  timeoutMs: number;
  signal: AbortSignal;
  remainingMs: () => number;
  assertAvailable: (path: string) => void;
  isExpired: () => boolean;
  close: () => void;
};

function overallDeadlineError(path: string, timeoutMs: number) {
  return new SmokeCheckError(
    `${path}: overall smoke check timed out after ${timeoutMs}ms. ` +
      `Increase SMOKE_TOTAL_TIMEOUT_MS only if this target is expected to be slow, ` +
      `or fix the slow or unavailable check.`,
  );
}

function createSmokeDeadline(timeoutMs: number): SmokeDeadline {
  const controller = new AbortController();
  const startedAt = Date.now();
  let expired = false;
  const expire = () => {
    if (expired) return;
    expired = true;
    controller.abort();
  };
  const timer = setTimeout(expire, timeoutMs);

  return {
    timeoutMs,
    signal: controller.signal,
    remainingMs: () => Math.max(0, timeoutMs - (Date.now() - startedAt)),
    assertAvailable: (path: string) => {
      if (expired || Date.now() - startedAt >= timeoutMs) {
        expire();
        throw overallDeadlineError(path, timeoutMs);
      }
    },
    isExpired: () => expired || Date.now() - startedAt >= timeoutMs,
    close: () => clearTimeout(timer),
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): JsonRecord {
  if (!isRecord(value)) {
    throw new SmokeCheckError(`${label}: expected a JSON object.`);
  }
  return value;
}

function requireNonEmptyString(
  value: unknown,
  field: string,
  label: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SmokeCheckError(
      `${label}: expected a non-empty "${field}" string.`,
    );
  }
  return value;
}

function requireInteger(value: unknown, field: string, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new SmokeCheckError(`${label}: expected an integer "${field}".`);
  }
  return value;
}

function requireArray(value: unknown, field: string, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new SmokeCheckError(`${label}: expected an array "${field}".`);
  }
  return value;
}

function parseJson(data: ResponseData, label: string): unknown {
  if (!data.contentType.toLowerCase().includes("application/json")) {
    throw new SmokeCheckError(
      `${label}: expected JSON content, received "${data.contentType || "none"}".`,
    );
  }

  try {
    return JSON.parse(data.body) as unknown;
  } catch {
    throw new SmokeCheckError(`${label}: response was not valid JSON.`);
  }
}

function expectStatus(data: ResponseData, expected: number, label: string) {
  if (data.response.status !== expected) {
    const bodyPreview = data.body.replace(/\s+/g, " ").slice(0, 180);
    throw new SmokeCheckError(
      `${label}: expected HTTP ${expected}, received ${data.response.status}.` +
        (bodyPreview ? ` Body: ${bodyPreview}` : ""),
    );
  }
}

function expectResource(value: unknown, label: string): JsonRecord {
  const resource = requireRecord(value, label);
  requireInteger(resource.id, "id", label);
  requireNonEmptyString(resource.slug, "slug", label);
  requireNonEmptyString(resource.title, "title", label);
  requireNonEmptyString(resource.tutorSlug, "tutorSlug", label);
  requireNonEmptyString(resource.tutorName, "tutorName", label);
  requireNonEmptyString(resource.type, "type", label);
  requireInteger(resource.readMinutes, "readMinutes", label);
  requireNonEmptyString(resource.excerpt, "excerpt", label);
  requireNonEmptyString(resource.publishedAt, "publishedAt", label);
  if (Number.isNaN(Date.parse(resource.publishedAt as string))) {
    throw new SmokeCheckError(`${label}: expected a valid "publishedAt" date.`);
  }
  return resource;
}

function expectTutor(value: unknown, label: string): JsonRecord {
  const tutor = requireRecord(value, label);
  requireInteger(tutor.id, "id", label);
  requireNonEmptyString(tutor.slug, "slug", label);
  requireNonEmptyString(tutor.name, "name", label);
  requireNonEmptyString(tutor.subject, "subject", label);
  requireArray(tutor.resources, "resources", label);
  return tutor;
}

function resolveConfiguredBaseUrl(): { value: string; source: string } {
  const explicit = process.env[BASE_URL_ENV_KEY]?.trim();
  if (!explicit) {
    throw new SmokeCheckError(
      `${BASE_URL_ENV_KEY} must name the target of this check. There is no ` +
        `default: the Deployment's origin is committed in fly.toml, and a ` +
        `smoke check that infers its own target is one that can report on a ` +
        `site nobody asked about.`,
    );
  }

  return { value: explicit, source: BASE_URL_ENV_KEY };
}

function parseHttpUrl(value: string, source: string): URL {
  let baseUrl: URL;
  try {
    baseUrl = new URL(value);
  } catch {
    throw new SmokeCheckError(
      `${source} must be an absolute HTTP(S) URL; received "${value}".`,
    );
  }

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new SmokeCheckError(
      `${source} must use http or https; received "${baseUrl.protocol}".`,
    );
  }

  baseUrl.pathname = baseUrl.pathname.replace(/\/+$/, "") || "/";
  return baseUrl;
}

export function resolveBaseUrl(): URL {
  const configured = resolveConfiguredBaseUrl();
  return parseHttpUrl(configured.value, configured.source);
}

export function resolveTimeoutMs(): number {
  const rawConfigured = process.env.SMOKE_TIMEOUT_MS;
  const configured =
    rawConfigured === undefined ? DEFAULT_TIMEOUT_MS : Number(rawConfigured);
  if (
    (rawConfigured !== undefined &&
      !SMOKE_TIMEOUT_FORMAT.test(rawConfigured)) ||
    !Number.isSafeInteger(configured) ||
    configured < SMOKE_TIMEOUT_MIN_MS ||
    configured > SMOKE_TIMEOUT_MAX_MS
  ) {
    throw new SmokeCheckError(
      `SMOKE_TIMEOUT_MS must be an integer number of milliseconds between ` +
        `${SMOKE_TIMEOUT_MIN_MS} and ${SMOKE_TIMEOUT_MAX_MS}; received "${rawConfigured}".`,
    );
  }
  return configured;
}

export function resolveTotalTimeoutMs(): number {
  const rawConfigured = process.env.SMOKE_TOTAL_TIMEOUT_MS;
  const configured =
    rawConfigured === undefined
      ? DEFAULT_TOTAL_TIMEOUT_MS
      : Number(rawConfigured);
  if (
    (rawConfigured !== undefined &&
      !SMOKE_TIMEOUT_FORMAT.test(rawConfigured)) ||
    !Number.isSafeInteger(configured) ||
    configured < SMOKE_TOTAL_TIMEOUT_MIN_MS ||
    configured > SMOKE_TOTAL_TIMEOUT_MAX_MS
  ) {
    throw new SmokeCheckError(
      `SMOKE_TOTAL_TIMEOUT_MS must be an integer number of milliseconds between ` +
        `${SMOKE_TOTAL_TIMEOUT_MIN_MS} and ${SMOKE_TOTAL_TIMEOUT_MAX_MS}; received "${rawConfigured}".`,
    );
  }
  return configured;
}

async function request(
  baseUrl: URL,
  path: string,
  timeoutMs: number,
  init?: RequestInit,
  deadline?: SmokeDeadline,
): Promise<ResponseData> {
  const url = new URL(path, baseUrl);
  deadline?.assertAvailable(path);
  const controller = new AbortController();
  const abortForDeadline = () => controller.abort();
  deadline?.signal.addEventListener("abort", abortForDeadline, { once: true });
  const requestTimeoutMs = Math.max(
    1,
    Math.min(timeoutMs, deadline?.remainingMs() ?? timeoutMs),
  );
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  let response: Response;
  let body: string;

  try {
    response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
    body = await response.text();
  } catch (error) {
    if (deadline?.isExpired()) {
      throw overallDeadlineError(path, deadline.timeoutMs);
    }
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `timed out after ${requestTimeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    throw new SmokeCheckError(`${path}: request failed: ${reason}`);
  } finally {
    clearTimeout(timeout);
    deadline?.signal.removeEventListener("abort", abortForDeadline);
  }

  const finalUrl = new URL(response.url);
  if (finalUrl.origin !== baseUrl.origin) {
    throw new SmokeCheckError(
      `${path}: response redirected from configured origin "${baseUrl.origin}" ` +
        `to final origin "${finalUrl.origin}".`,
    );
  }

  return {
    response,
    body,
    contentType: response.headers.get("content-type") ?? "",
  };
}

async function checkJson(
  baseUrl: URL,
  path: string,
  timeoutMs: number,
  expectedStatus: number,
  deadline: SmokeDeadline,
): Promise<unknown> {
  const data = await request(baseUrl, path, timeoutMs, undefined, deadline);
  expectStatus(data, expectedStatus, path);
  return parseJson(data, path);
}

async function checkPublicPage(
  baseUrl: URL,
  path: string,
  timeoutMs: number,
  deadline: SmokeDeadline,
) {
  const data = await request(
    baseUrl,
    path,
    timeoutMs,
    { headers: { Accept: "text/html" } },
    deadline,
  );
  expectStatus(data, 200, path);
  if (!data.contentType.toLowerCase().includes("text/html")) {
    throw new SmokeCheckError(
      `${path}: expected HTML content, received "${data.contentType || "none"}".`,
    );
  }
  if (!/<title>Well Tutored<\/title>/i.test(data.body)) {
    throw new SmokeCheckError(
      `${path}: response did not contain the Well Tutored document.`,
    );
  }
}

async function runSmokeCheckSteps(
  baseUrl: URL,
  timeoutMs: number,
  deadline: SmokeDeadline,
  modes: SmokeCheckModes,
) {
  const passed: string[] = [];
  const skipped: string[] = [];

  const health = requireRecord(
    await checkJson(baseUrl, "/api/healthz", timeoutMs, 200, deadline),
    "/api/healthz",
  );
  if (health.status !== "ok") {
    throw new SmokeCheckError(`/api/healthz: expected {"status":"ok"}.`);
  }
  passed.push("/api/healthz");

  if (modes.isDevelopmentCheck) {
    skipped.push(
      "/api/__clerk/v1/environment (Clerk proxy is production-only)",
    );
  } else if (modes.hasDevelopmentClerkInstance) {
    // The proxy attributes a request to an instance by the host in
    // Clerk-Proxy-Url. A development instance has no such host registered, so
    // Clerk answers host_invalid however healthy the Deployment is.
    skipped.push(
      "/api/__clerk/v1/environment (Deployment is on a development Clerk instance)",
    );
  } else {
    const clerkEnvironment = requireRecord(
      await checkJson(
        baseUrl,
        "/api/__clerk/v1/environment",
        timeoutMs,
        200,
        deadline,
      ),
      "/api/__clerk/v1/environment",
    );
    const clerkAuthConfig = requireRecord(
      clerkEnvironment.auth_config,
      "/api/__clerk/v1/environment.auth_config",
    );
    const clerkDisplayConfig = requireRecord(
      clerkEnvironment.display_config,
      "/api/__clerk/v1/environment.display_config",
    );
    if (clerkAuthConfig.object !== "auth_config") {
      throw new SmokeCheckError(
        `/api/__clerk/v1/environment: unexpected auth_config object.`,
      );
    }
    if (clerkDisplayConfig.object !== "display_config") {
      throw new SmokeCheckError(
        `/api/__clerk/v1/environment: unexpected display_config object.`,
      );
    }
    passed.push("/api/__clerk/v1/environment");
  }

  const tutors = requireArray(
    await checkJson(baseUrl, "/api/tutors", timeoutMs, 200, deadline),
    "/api/tutors",
    "/api/tutors",
  );
  if (tutors.length === 0) {
    if (!modes.allowsEmptyContent) {
      throw new SmokeCheckError(
        "/api/tutors: expected at least one published tutor.",
      );
    }
    skipped.push("/api/tutors has a published Tutor (deployment is empty)");
  }
  const parsedTutors = tutors.map((tutor, index) =>
    expectTutor(tutor, `/api/tutors[${index}]`),
  );
  for (const [index, tutor] of parsedTutors.entries()) {
    const resources = requireArray(
      tutor.resources,
      `/api/tutors[${index}].resources`,
      "tutor",
    );
    resources.forEach((resource, resourceIndex) =>
      expectResource(
        resource,
        `/api/tutors[${index}].resources[${resourceIndex}]`,
      ),
    );
  }
  passed.push("/api/tutors");

  const resourceCatalogue = await checkJson(
    baseUrl,
    "/api/resources",
    timeoutMs,
    200,
    deadline,
  );
  let resources: unknown[];
  if (Array.isArray(resourceCatalogue)) {
    // Tolerated for a Deployment still serving the pre-pagination list shape.
    resources = resourceCatalogue;
  } else {
    const catalogue = requireRecord(resourceCatalogue, "/api/resources");
    resources = requireArray(
      catalogue.items,
      "/api/resources.items",
      "/api/resources",
    );
    if (catalogue.page !== 1) {
      throw new SmokeCheckError("/api/resources: expected the first page.");
    }
    requireInteger(catalogue.pageSize, "pageSize", "/api/resources");
    requireInteger(catalogue.total, "total", "/api/resources");
    if (typeof catalogue.hasMore !== "boolean") {
      throw new SmokeCheckError('/api/resources: expected boolean "hasMore".');
    }
    if ((catalogue.total as number) < resources.length) {
      throw new SmokeCheckError(
        "/api/resources: total was smaller than items.length.",
      );
    }
  }
  if (resources.length === 0) {
    if (!modes.allowsEmptyContent) {
      throw new SmokeCheckError(
        "/api/resources: expected at least one published resource.",
      );
    }
    skipped.push(
      "/api/resources has a published Resource (deployment is empty)",
    );
  }
  const parsedResources = resources.map((resource, index) =>
    expectResource(resource, `/api/resources[${index}]`),
  );
  passed.push("/api/resources");

  for (const path of ["/", "/resources", "/enquire"]) {
    await checkPublicPage(baseUrl, path, timeoutMs, deadline);
    passed.push(path);
  }

  if (parsedTutors.length === 0) {
    skipped.push("/tutors/:slug (no published Tutor to address)");
  } else {
    const tutorSlug = parsedTutors[0].slug as string;
    const tutorPath = `/tutors/${encodeURIComponent(tutorSlug)}`;
    await checkPublicPage(baseUrl, tutorPath, timeoutMs, deadline);
    passed.push(tutorPath);
  }

  if (parsedResources.length === 0) {
    skipped.push("/resources/:slug (no published Resource to address)");
  } else {
    const resourceSlug = parsedResources[0].slug as string;
    const resourcePath = `/resources/${encodeURIComponent(resourceSlug)}`;
    await checkPublicPage(baseUrl, resourcePath, timeoutMs, deadline);
    passed.push(resourcePath);
  }

  const invalidEnquiry = await request(
    baseUrl,
    "/api/enquiries",
    timeoutMs,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      // Deliberately fails validation before tutor lookup or database insertion.
      body: JSON.stringify({}),
    },
    deadline,
  );
  expectStatus(invalidEnquiry, 400, "POST /api/enquiries (invalid payload)");
  const invalidEnquiryBody = requireRecord(
    parseJson(invalidEnquiry, "POST /api/enquiries (invalid payload)"),
    "POST /api/enquiries (invalid payload)",
  );
  requireNonEmptyString(
    invalidEnquiryBody.error,
    "error",
    "POST /api/enquiries (invalid payload)",
  );
  passed.push("POST /api/enquiries (invalid payload)");

  const recoveryHealth = requireRecord(
    await checkJson(baseUrl, "/api/healthz", timeoutMs, 200, deadline),
    "/api/healthz after invalid enquiry",
  );
  if (recoveryHealth.status !== "ok") {
    throw new SmokeCheckError(
      '/api/healthz after invalid enquiry: expected status "ok".',
    );
  }
  passed.push("/api/healthz after invalid enquiry");

  deadline.assertAvailable("launch smoke check completion");
  console.log(`Launch smoke check passed for ${baseUrl.origin}`);
  for (const check of passed) {
    console.log(`  ✓ ${check}`);
  }
  for (const check of skipped) {
    console.log(`  - ${check}`);
  }
}

export async function runSmokeCheck() {
  const baseUrl = resolveBaseUrl();
  const timeoutMs = resolveTimeoutMs();
  const totalTimeoutMs = resolveTotalTimeoutMs();
  const deadline = createSmokeDeadline(totalTimeoutMs);

  try {
    await runSmokeCheckSteps(baseUrl, timeoutMs, deadline, {
      isDevelopmentCheck: process.argv.includes(DEVELOPMENT_CHECK_FLAG),
      allowsEmptyContent: process.argv.includes(EMPTY_CONTENT_CHECK_FLAG),
      hasDevelopmentClerkInstance: process.argv.includes(
        DEVELOPMENT_CLERK_INSTANCE_FLAG,
      ),
    });
  } finally {
    deadline.close();
  }
}

export async function main(): Promise<number> {
  try {
    await runSmokeCheck();
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Launch smoke check failed: ${message}`);
    return 1;
  }
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : undefined;
const currentFile = resolve(fileURLToPath(import.meta.url));

if (invokedFile === currentFile) {
  process.exitCode = await main();
}
