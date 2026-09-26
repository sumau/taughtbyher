import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceAuthBoundaryView } from "./WorkspaceAuthBoundary";
import type { WorkspaceSession } from "@workspace/api-client-react";

const session = (role: WorkspaceSession["role"]): WorkspaceSession => ({
  id: 1,
  email: "tutor@example.test",
  displayName: "Test Tutor",
  role,
  tutor: null,
  availableTutorAccents: [],
});

function renderBoundary(
  overrides: Partial<Parameters<typeof WorkspaceAuthBoundaryView>[0]> = {},
) {
  const props: Parameters<typeof WorkspaceAuthBoundaryView>[0] = {
    children: "Workspace content",
    isLoaded: true,
    isSignedIn: true,
    isLoading: false,
    isError: false,
    isFetching: false,
    session: session("tutor"),
    onRetry: () => undefined,
    onSignOut: () => undefined,
    ...overrides,
  };

  return renderToStaticMarkup(
    <WorkspaceAuthBoundaryView {...props} />,
  );
}

test("renders a safe loading shell until Clerk and the workspace session are ready", () => {
  const clerkLoading = renderBoundary({ isLoaded: false, isSignedIn: false });
  const sessionLoading = renderBoundary({ isLoading: true });

  for (const markup of [clerkLoading, sessionLoading]) {
    assert.match(markup, /skeleton-shimmer/);
    assert.doesNotMatch(markup, /Workspace content/);
  }
});

test("renders workspace children for a signed-in approved session", () => {
  const markup = renderBoundary();

  assert.match(markup, /Workspace content/);
  assert.doesNotMatch(markup, /Awaiting approval|Authentication Error/);
});

test("renders the pending approval state with a sign-out action", () => {
  const markup = renderBoundary({ session: session("pending") });

  assert.match(markup, /Awaiting approval/);
  assert.match(markup, />Sign Out</);
  assert.doesNotMatch(markup, /Workspace content/);
});

test("renders workspace-session errors with retry and sign-out actions", () => {
  const markup = renderBoundary({ isError: true });

  assert.match(markup, /Authentication Error/);
  assert.match(markup, />Try again</);
  assert.match(markup, />Sign out</);
  assert.doesNotMatch(markup, /Workspace content/);
});

test("shows retry progress while an errored session is being refetched", () => {
  const markup = renderBoundary({ isError: true, isFetching: true });

  assert.match(markup, /Retrying\.\.\./);
  assert.match(markup, /disabled=""/);
  assert.doesNotMatch(markup, />Try again</);
});