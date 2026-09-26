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

type RenderedForm = {
  container: HTMLDivElement;
  root: Root;
  queryClient: QueryClient;
  dom: JSDOM;
};

type RenderFormOptions = {
  tutor?: Tutor;
  tutors?: Tutor[];
};

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLSelectElement: dom.window.HTMLSelectElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  Object.defineProperty(dom.window.HTMLElement.prototype, "attachEvent", {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(dom.window.HTMLElement.prototype, "detachEvent", {
    configurable: true,
    value: () => undefined,
  });

  return dom;
}

async function renderForm(options: RenderFormOptions = {}): Promise<RenderedForm> {
  const dom = installDom();
  const [{ createRoot }, { EnquiryForm }] = await Promise.all([
    import("react-dom/client"),
    import("./EnquiryForm"),
  ]);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <EnquiryForm
          tutor={Object.prototype.hasOwnProperty.call(options, "tutor") ? options.tutor : tutor}
          tutors={options.tutors}
        />
      </QueryClientProvider>,
    );
  });

  return { container, root, queryClient, dom };
}

async function cleanupForm({ container, root, queryClient, dom }: RenderedForm) {
  await act(async () => {
    root.unmount();
  });
  queryClient.clear();
  container.remove();
  dom.window.close();
}

function submitForm(form: HTMLFormElement) {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function submitWithKeyboard(form: HTMLFormElement, button: HTMLButtonElement) {
  button.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    bubbles: true,
  }));
  form.requestSubmit(button);
}

function activateButtonWithKeyboard(button: HTMLButtonElement, key: "Enter" | " ") {
  button.dispatchEvent(new KeyboardEvent("keydown", {
    key,
    code: key === "Enter" ? "Enter" : "Space",
    bubbles: true,
  }));
  button.click();
}

function tabToNext(current: HTMLElement, next: HTMLElement) {
  current.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Tab",
    code: "Tab",
    bubbles: true,
  }));
  next.focus();
}

function setFieldValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const prototype = element instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  valueSetter?.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", {
    bubbles: true,
  }));
}

function fillCompleteForm(container: HTMLDivElement, overrides: Record<string, string> = {}) {
  const values = {
    name: "Eleanor James",
    email: "eleanor@example.com",
    studentName: "Maya",
    studentAge: "13-15",
    subjectLevel: "GCSE English Literature",
    message: "Maya would benefit from essay planning support.",
    ...overrides,
  };

  setFieldValue(container.querySelector("#enquiry-parent-name")!, values.name);
  setFieldValue(container.querySelector("#enquiry-parent-email")!, values.email);
  setFieldValue(container.querySelector("#enquiry-student-name")!, values.studentName);
  setFieldValue(container.querySelector("#enquiry-student-age")!, values.studentAge);
  setFieldValue(container.querySelector("#enquiry-subject-level")!, values.subjectLevel);
  setFieldValue(container.querySelector("#enquiry-message")!, values.message);
}

test("empty submission focuses the first invalid field and exposes its error", async () => {
  const rendered = await renderForm();
  const form = rendered.container.querySelector<HTMLFormElement>("[data-testid=enquiry-form]")!;
  const name = rendered.container.querySelector<HTMLInputElement>("#enquiry-parent-name")!;

  await act(async () => {
    submitForm(form);
  });

  assert.equal(document.activeElement, name);
  assert.equal(name.getAttribute("aria-invalid"), "true");
  assert.equal(name.getAttribute("aria-describedby"), "enquiry-parent-name-error");

  const error = rendered.container.querySelector("#enquiry-parent-name-error")!;
  assert.equal(error.getAttribute("role"), "alert");
  assert.equal(error.textContent, "Enter the parent or guardian's name.");

  await cleanupForm(rendered);
});

test("invalid email and short message errors are announced and tied to their fields", async () => {
  const rendered = await renderForm();
  const form = rendered.container.querySelector<HTMLFormElement>("[data-testid=enquiry-form]")!;

  await act(async () => {
    fillCompleteForm(rendered.container, {
      email: "not-an-email",
      message: "Too short",
    });
    submitForm(form);
  });

  const email = rendered.container.querySelector<HTMLInputElement>("#enquiry-parent-email")!;
  const emailError = rendered.container.querySelector("#enquiry-parent-email-error")!;
  const message = rendered.container.querySelector<HTMLTextAreaElement>("#enquiry-message")!;
  const messageError = rendered.container.querySelector("#enquiry-message-error")!;

  assert.equal(email.getAttribute("aria-invalid"), "true");
  assert.equal(email.getAttribute("aria-describedby"), "enquiry-parent-email-error");
  assert.equal(emailError.getAttribute("role"), "alert");
  assert.equal(emailError.textContent, "Enter a valid email address.");
  assert.equal(message.getAttribute("aria-invalid"), "true");
  assert.equal(message.getAttribute("aria-describedby"), "enquiry-message-error");
  assert.equal(messageError.getAttribute("role"), "alert");
  assert.equal(messageError.textContent, "Use at least 10 characters so the tutor has useful context.");

  await cleanupForm(rendered);
});

test("keyboard users can complete an enquiry, recover validation focus, and reach the success receipt", async () => {
  const rendered = await renderForm({ tutor: undefined, tutors: [tutor] });
  const form = rendered.container.querySelector<HTMLFormElement>("[data-testid=enquiry-form]")!;
  const controls = Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(
      "input, select, textarea, button[type=submit]",
    ),
  );
  const expectedIds = [
    "enquiry-parent-name",
    "enquiry-parent-email",
    "enquiry-tutor",
    "enquiry-student-name",
    "enquiry-student-age",
    "enquiry-subject-level",
    "enquiry-message",
    "button-submit-enquiry",
  ];

  assert.deepEqual(controls.map((control) => control.id || control.dataset.testid), expectedIds);

  const values = [
    "Eleanor James",
    "eleanor@example.com",
    "alice-smith",
    "Maya",
    "13-15",
    "GCSE English Literature",
    "Maya would benefit from essay planning support.",
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        id: 42,
        tutorName: "Alice Smith",
        receivedAt: "2026-09-19T12:00:00.000Z",
        deliveryStatus: "delivered",
        message: "Your enquiry has been sent securely.",
      }),
      {
        status: 201,
        headers: { "content-type": "application/json" },
      },
    );

  try {
    for (let index = 0; index < controls.length - 1; index += 1) {
      const control = controls[index];
      await act(async () => {
        if (index === 0) {
          control.focus();
        } else {
          tabToNext(controls[index - 1], control);
        }
        setFieldValue(control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, values[index]);
      });
      assert.equal(document.activeElement, control);
    }

    const email = rendered.container.querySelector<HTMLInputElement>("#enquiry-parent-email")!;
    await act(async () => {
      setFieldValue(email, "not-an-email");
      submitForm(form);
    });
    assert.equal(document.activeElement, email);
    assert.equal(email.getAttribute("aria-invalid"), "true");
    assert.equal(email.getAttribute("aria-describedby"), "enquiry-parent-email-error");

    const tutorSelect = rendered.container.querySelector<HTMLSelectElement>("#enquiry-tutor")!;
    await act(async () => {
      setFieldValue(email, "eleanor@example.com");
      tabToNext(email, tutorSelect);
    });
    assert.equal(document.activeElement, tutorSelect);

    const controlsAfterRecovery = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(
        "input, select, textarea, button[type=submit]",
      ),
    );
    for (let index = 3; index < controlsAfterRecovery.length - 1; index += 1) {
      const control = controlsAfterRecovery[index];
      await act(async () => {
        tabToNext(controlsAfterRecovery[index - 1], control);
      });
      assert.equal(document.activeElement, control);
    }

    const submitButton = rendered.container.querySelector<HTMLButtonElement>("[data-testid=button-submit-enquiry]")!;
    assert.equal(submitButton.disabled, false);
    await act(async () => {
      tabToNext(controlsAfterRecovery[6], submitButton);
      submitWithKeyboard(form, submitButton);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

     const receipt = rendered.container.querySelector<HTMLDivElement>("[data-testid=enquiry-success]")!;
    assert.equal(document.activeElement, receipt);
    assert.equal(receipt.getAttribute("role"), "status");
    assert.equal(receipt.getAttribute("aria-live"), "polite");
    assert.match(receipt.textContent ?? "", /Message delivered/);
    assert.match(receipt.textContent ?? "", /Your enquiry has been sent securely\./);

    const resetButton = rendered.container.querySelector<HTMLButtonElement>("[data-testid=enquiry-reset]")!;
    await act(async () => {
      tabToNext(receipt, resetButton);
    });
    assert.equal(document.activeElement, resetButton);

    await act(async () => {
      activateButtonWithKeyboard(resetButton, "Enter");
    });
    assert.equal(rendered.container.querySelector("[data-testid=enquiry-success]"), null);
    assert.equal(document.activeElement, rendered.container.querySelector("#enquiry-parent-name"));
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupForm(rendered);
  }
});

test("repeated Enter presses send one enquiry while the request is pending", async () => {
  const rendered = await renderForm();
  const form = rendered.container.querySelector<HTMLFormElement>("[data-testid=enquiry-form]")!;
  const submitButton = rendered.container.querySelector<HTMLButtonElement>("[data-testid=button-submit-enquiry]")!;
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  let resolveFetch: ((response: Response) => void) | undefined;

  globalThis.fetch = async () => {
    requestCount += 1;
    return new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
  };

  try {
    await act(async () => {
      fillCompleteForm(rendered.container);
    });

    await act(async () => {
      submitButton.focus();
      submitWithKeyboard(form, submitButton);
      submitWithKeyboard(form, submitButton);
    });

    assert.equal(requestCount, 1);
    assert.equal(submitButton.disabled, true);
    assert.equal(submitButton.textContent?.includes("Submitting..."), true);

    await act(async () => {
      resolveFetch?.(new Response(
        JSON.stringify({
          id: 42,
          tutorName: "Alice Smith",
          receivedAt: "2026-09-19T12:00:00.000Z",
          deliveryStatus: "delivered",
          message: "Your enquiry has been sent securely.",
        }),
        {
          status: 201,
          headers: { "content-type": "application/json" },
        },
      ));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.equal(rendered.container.querySelector("[data-testid=enquiry-success]") !== null, true);
    assert.equal(requestCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupForm(rendered);
  }
});

test("a failed submission keeps an announced form error and a successful retry focuses the receipt", async () => {
  const rendered = await renderForm();
  const form = rendered.container.querySelector<HTMLFormElement>("[data-testid=enquiry-form]")!;
  const submitButton = rendered.container.querySelector<HTMLButtonElement>("[data-testid=button-submit-enquiry]")!;
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = async () => {
    requestCount += 1;

    if (requestCount === 1) {
      return new Response(
        JSON.stringify({ message: "The enquiry could not be recorded." }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        id: 42,
        tutorName: "Alice Smith",
        receivedAt: "2026-09-19T12:00:00.000Z",
        deliveryStatus: "delivered",
        message: "Your enquiry has been sent securely.",
      }),
      {
        status: 201,
        headers: { "content-type": "application/json" },
      },
    );
  };

  try {
    await act(async () => {
      fillCompleteForm(rendered.container);
    });

    await act(async () => {
      submitButton.focus();
      submitWithKeyboard(form, submitButton);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const submitError = rendered.container.querySelector("[data-testid=error-enquiry-submit]")!;
    assert.equal(submitError.getAttribute("role"), "alert");
    assert.equal(
      submitError.textContent,
      "We could not record your enquiry. Please check the details and try again.",
    );
    assert.equal(form.contains(submitError), true);
    assert.equal(rendered.container.querySelector("[data-testid=enquiry-success]"), null);
    assert.equal(document.activeElement, submitButton);
    assert.equal(rendered.container.querySelector<HTMLInputElement>("#enquiry-parent-name")?.value, "Eleanor James");
    assert.equal(rendered.container.querySelector<HTMLInputElement>("#enquiry-parent-email")?.value, "eleanor@example.com");
    assert.equal(rendered.container.querySelector<HTMLInputElement>("#enquiry-student-name")?.value, "Maya");
    assert.equal(rendered.container.querySelector<HTMLSelectElement>("#enquiry-student-age")?.value, "13-15");
    assert.equal(rendered.container.querySelector<HTMLInputElement>("#enquiry-subject-level")?.value, "GCSE English Literature");
    assert.equal(rendered.container.querySelector<HTMLTextAreaElement>("#enquiry-message")?.value, "Maya would benefit from essay planning support.");

    await act(async () => {
      submitWithKeyboard(form, submitButton);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const receipt = rendered.container.querySelector("[data-testid=enquiry-success]")!;
    assert.equal(requestCount, 2);
    assert.equal(document.activeElement, receipt);
    assert.equal(receipt.getAttribute("role"), "status");
    assert.equal(receipt.getAttribute("aria-live"), "polite");
    assert.match(receipt.textContent ?? "", /Message delivered/);
    assert.match(receipt.textContent ?? "", /Your enquiry has been sent securely\./);
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupForm(rendered);
  }
});

test("a dropped connection keeps the enquiry details and supports a keyboard retry", async () => {
  const rendered = await renderForm();
  const form = rendered.container.querySelector<HTMLFormElement>("[data-testid=enquiry-form]")!;
  const submitButton = rendered.container.querySelector<HTMLButtonElement>("[data-testid=button-submit-enquiry]")!;
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = async () => {
    requestCount += 1;

    if (requestCount === 1) {
      throw new TypeError("The network connection was lost.");
    }

    return new Response(
      JSON.stringify({
        id: 42,
        tutorName: "Alice Smith",
        receivedAt: "2026-09-19T12:00:00.000Z",
        deliveryStatus: "delivered",
        message: "Your enquiry has been sent securely.",
      }),
      {
        status: 201,
        headers: { "content-type": "application/json" },
      },
    );
  };

  try {
    await act(async () => {
      fillCompleteForm(rendered.container);
      submitButton.focus();
      submitWithKeyboard(form, submitButton);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const submitError = rendered.container.querySelector("[data-testid=error-enquiry-submit]")!;
    assert.equal(submitError.getAttribute("role"), "alert");
    assert.equal(
      submitError.textContent,
      "We could not record your enquiry. Please check the details and try again.",
    );
    assert.equal(document.activeElement, submitButton);
    assert.equal(rendered.container.querySelector<HTMLInputElement>("#enquiry-parent-name")?.value, "Eleanor James");
    assert.equal(rendered.container.querySelector<HTMLInputElement>("#enquiry-parent-email")?.value, "eleanor@example.com");
    assert.equal(rendered.container.querySelector<HTMLInputElement>("#enquiry-student-name")?.value, "Maya");
    assert.equal(rendered.container.querySelector<HTMLSelectElement>("#enquiry-student-age")?.value, "13-15");
    assert.equal(rendered.container.querySelector<HTMLInputElement>("#enquiry-subject-level")?.value, "GCSE English Literature");
    assert.equal(rendered.container.querySelector<HTMLTextAreaElement>("#enquiry-message")?.value, "Maya would benefit from essay planning support.");

    await act(async () => {
      submitWithKeyboard(form, submitButton);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const receipt = rendered.container.querySelector("[data-testid=enquiry-success]")!;
    assert.equal(requestCount, 2);
    assert.equal(document.activeElement, receipt);
    assert.equal(receipt.getAttribute("role"), "status");
    assert.equal(receipt.getAttribute("aria-live"), "polite");
    assert.match(receipt.textContent ?? "", /Message delivered/);
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupForm(rendered);
  }
});

test("a successful receipt receives focus and announces the delivery outcome", async () => {
  const rendered = await renderForm();
  const form = rendered.container.querySelector<HTMLFormElement>("[data-testid=enquiry-form]")!;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        id: 42,
        tutorName: "Alice Smith",
        receivedAt: "2026-09-19T12:00:00.000Z",
        deliveryStatus: "delivered",
        message: "Your enquiry has been sent securely.",
      }),
      {
        status: 201,
        headers: { "content-type": "application/json" },
      },
    );

  try {
    await act(async () => {
      fillCompleteForm(rendered.container);
    });

    assert.equal(
      rendered.container.querySelector<HTMLButtonElement>("[data-testid=button-submit-enquiry]")?.disabled,
      false,
    );

    await act(async () => {
      submitForm(form);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const receipt = rendered.container.querySelector("[data-testid=enquiry-success]")!;
    assert.equal(document.activeElement, receipt);
    assert.equal(receipt.getAttribute("role"), "status");
    assert.equal(receipt.getAttribute("aria-live"), "polite");
    assert.match(receipt.textContent ?? "", /Message delivered/);
    assert.match(receipt.textContent ?? "", /Your enquiry has been sent securely\./);
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupForm(rendered);
  }
});