import assert from "node:assert/strict";
import test from "node:test";
import { getPublicOrigin, redirectToPublicOrigin } from "./public-origin";

const deployment = {
  NODE_ENV: "production",
  PUBLIC_ORIGIN: "https://welltutored.example",
  TRUSTED_ORIGINS: "https://welltutored.example",
};

type Outcome = { next: true } | { redirect: { status: number; location: string } };

function runRedirect(
  environment: Record<string, string | undefined>,
  host: string | undefined,
  originalUrl: string,
  method = "GET",
): Outcome {
  let outcome: Outcome | undefined;
  redirectToPublicOrigin(environment)(
    {
      method,
      headers: host === undefined ? {} : { host },
      path: originalUrl.split("?")[0],
      originalUrl,
    } as never,
    {
      redirect(status: number, location: string) {
        outcome = { redirect: { status, location } };
      },
    } as never,
    () => {
      outcome = { next: true };
    },
  );
  assert.ok(outcome, "the middleware neither redirected nor called next");
  return outcome;
}

test("does nothing when PUBLIC_ORIGIN is unset", () => {
  assert.equal(getPublicOrigin({ NODE_ENV: "production" }), undefined);
  assert.deepEqual(
    runRedirect({ NODE_ENV: "production" }, "anything.example", "/resources"),
    { next: true },
  );
});

test("refuses a PUBLIC_ORIGIN that is not a bare origin", () => {
  assert.throws(
    () => getPublicOrigin({ ...deployment, PUBLIC_ORIGIN: "https://welltutored.example/home" }),
    /PUBLIC_ORIGIN must be a bare origin/,
  );
});

test("refuses a PUBLIC_ORIGIN that TRUSTED_ORIGINS does not name", () => {
  assert.throws(
    () => getPublicOrigin({ ...deployment, TRUSTED_ORIGINS: "https://other.example" }),
    /is not listed in TRUSTED_ORIGINS/,
  );
  // Outside production the localhost defaults apply, and they do not name it either.
  assert.throws(
    () => getPublicOrigin({ NODE_ENV: "development", PUBLIC_ORIGIN: "https://welltutored.example" }),
    /is not listed in TRUSTED_ORIGINS/,
  );
});

test("serves requests that arrive on the Public Origin", () => {
  assert.deepEqual(runRedirect(deployment, "welltutored.example", "/resources"), { next: true });
  assert.deepEqual(runRedirect(deployment, "WellTutored.example", "/"), { next: true });
  assert.deepEqual(runRedirect(deployment, "welltutored.example:443", "/"), { next: true });
});

test("redirects every other hostname to the same path and query on the Public Origin", () => {
  for (const host of [
    "www.welltutored.example",
    "welltutored.example.com",
    "welltutored.fly.dev",
    "welltutored.example:8080",
  ]) {
    assert.deepEqual(runRedirect(deployment, host, "/tutors/ada?ref=home"), {
      redirect: { status: 301, location: "https://welltutored.example/tutors/ada?ref=home" },
    });
  }
  assert.deepEqual(runRedirect(deployment, "welltutored.fly.dev", "/api/enquiries", "POST"), {
    redirect: { status: 301, location: "https://welltutored.example/api/enquiries" },
  });
  assert.deepEqual(runRedirect(deployment, undefined, "/"), {
    redirect: { status: 301, location: "https://welltutored.example/" },
  });
});

test("never redirects the health check, whatever the hostname", () => {
  assert.deepEqual(runRedirect(deployment, "172.19.0.2:8080", "/api/healthz"), { next: true });
});
