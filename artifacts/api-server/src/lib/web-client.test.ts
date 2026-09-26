import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { resolveWebClientRoot } from "./web-client";

test("serves nothing when nothing configured a root", () => {
  assert.equal(resolveWebClientRoot({ NODE_ENV: "development" }), undefined);
  assert.equal(
    resolveWebClientRoot({ NODE_ENV: "development", WEB_CLIENT_ROOT: "  " }),
    undefined,
  );
});

test("leaves the frontend to whatever else fronts it in production", () => {
  // An unset root is a warning, not a startup failure: the Deployment sets it
  // from docker/Dockerfile, and a process that only serves /api is a legitimate
  // shape even though nothing here runs that way.
  assert.equal(resolveWebClientRoot({ NODE_ENV: "production" }), undefined);
});

test("resolves the configured root to an absolute path", () => {
  assert.equal(
    resolveWebClientRoot({
      NODE_ENV: "production",
      WEB_CLIENT_ROOT: "/srv/well-tutored/web",
    }),
    "/srv/well-tutored/web",
  );
  assert.equal(
    resolveWebClientRoot({ WEB_CLIENT_ROOT: " ./web " }),
    path.resolve("./web"),
  );
});
