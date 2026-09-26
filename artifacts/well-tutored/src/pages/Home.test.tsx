import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Tutor } from "@workspace/api-client-react";

const tutor: Tutor = {
  id: 1,
  slug: "alice-smith",
  name: "Alice Smith",
  firstName: "Alice",
  lastName: "Smith",
  initials: "AS",
  subject: "English",
  support: "GCSE English",
  profileSummary: "A supportive English tutor.",
  university: "University of Oxford",
  qualification: "BA English",
  bio: "Alice helps students build confidence.",
  style: "Warm and structured",
  teachingIntro: "Clear explanations and practical guidance.",
  teachingPoints: [{ title: "Clarity", body: "Lessons are structured around the student's goals." }],
  rate: 45,
  availability: "accepting",
  tint: "#123456",
  resources: [],
};

type RenderedHome = {
  container: HTMLDivElement;
  root: Root;
  queryClient: QueryClient;
  dom: JSDOM;
  originalFetch: typeof globalThis.fetch;
};

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    history: dom.window.history,
    addEventListener: dom.window.addEventListener.bind(dom.window),
    removeEventListener: dom.window.removeEventListener.bind(dom.window),
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });

  return dom;
}

async function renderHome(fetchImplementation: typeof globalThis.fetch): Promise<RenderedHome> {
  const dom = installDom();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImplementation;
  const [{ createRoot }, { default: Home }] = await Promise.all([
    import("react-dom/client"),
    import("./Home"),
  ]);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Home />
      </QueryClientProvider>,
    );
  });

  return { container, root, queryClient, dom, originalFetch };
}

async function cleanupHome({ container, root, queryClient, dom, originalFetch }: RenderedHome) {
  await act(async () => {
    root.unmount();
  });
  queryClient.clear();
  globalThis.fetch = originalFetch;
  container.remove();
  dom.window.close();
}

test("renders the homepage structure and a localized tutor loading state immediately", async () => {
  let resolveRequest!: (response: Response) => void;
  const request = new Promise<Response>((resolve) => {
    resolveRequest = resolve;
  });
  const rendered = await renderHome(async () => request);

  assert.equal(rendered.container.querySelector("[data-testid=hero-title]")?.textContent, "Academic excellence,personalised for her.");
  assert.ok(rendered.container.querySelector("[data-testid=button-home-enquire]"));
  assert.ok(rendered.container.querySelector("[data-testid=tutor-loading-state]"));
  assert.equal(rendered.container.querySelector("[data-testid=loading-state]"), null);
  const skeletonGrid = rendered.container.querySelector("[data-testid=tutor-card-skeleton-3]")?.parentElement;
  assert.equal(skeletonGrid?.getAttribute("aria-hidden"), "true");

  await act(async () => {
    resolveRequest(new Response("[]", { headers: { "content-type": "application/json" } }));
    await Promise.resolve();
  });
  await cleanupHome(rendered);
});

test("renders tutor cards after the tutor request succeeds without replacing the homepage", async () => {
  const rendered = await renderHome(async () =>
    new Response(JSON.stringify([tutor]), {
      headers: { "content-type": "application/json" },
    }),
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  assert.ok(rendered.container.querySelector("[data-testid=hero-title]"));
  assert.ok(rendered.container.querySelector("[data-testid=tutor-grid]"));
  assert.ok(rendered.container.querySelector("[data-testid=tutor-card-alice-smith]"));
  assert.equal(rendered.container.querySelector("[data-testid=tutor-loading-state]"), null);

  await cleanupHome(rendered);
});

test("keeps the homepage visible and offers retry when tutors fail to load", async () => {
  const rendered = await renderHome(async () =>
    new Response(JSON.stringify({ message: "Tutor service unavailable" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    }),
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  assert.ok(rendered.container.querySelector("[data-testid=hero-title]"));
  assert.ok(rendered.container.querySelector("[data-testid=button-home-enquire]"));
  assert.ok(rendered.container.querySelector("[data-testid=error-state]"));
  assert.equal(rendered.container.querySelector("[data-testid=tutor-grid]"), null);
  assert.equal(rendered.container.querySelector("[data-testid=button-retry]")?.textContent?.trim(), "Try again");

  await cleanupHome(rendered);
});