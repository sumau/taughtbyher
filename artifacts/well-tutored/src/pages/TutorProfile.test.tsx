import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Tutor } from "@workspace/api-client-react";
import { TutorEnquiry } from "./TutorProfile";

const unavailableTutor: Tutor = {
  id: 2,
  slug: "maya-shah",
  name: "Maya Shah",
  firstName: "Maya",
  lastName: "Shah",
  initials: "MS",
  subject: "Mathematics",
  support: "GCSE Mathematics",
  profileSummary: "A thoughtful mathematics tutor.",
  university: "University of Cambridge",
  qualification: "BA Mathematics",
  bio: "Maya helps students build confidence.",
  style: "Calm and structured",
  teachingIntro: "Clear explanations and practical guidance.",
  teachingPoints: [{ title: "Clarity", body: "Lessons are structured around the student's goals." }],
  rate: 45,
  availability: "unavailable",
  tint: "#123456",
  resources: [],
};

test("unavailable tutor profiles explain the enquiry restriction without rendering a form", () => {
  const markup = renderToStaticMarkup(<TutorEnquiry tutor={unavailableTutor} />);

  assert.match(markup, /data-testid="tutor-enquiry-unavailable"/);
  assert.match(markup, /Maya Shah is not currently accepting enquiries/);
  assert.doesNotMatch(markup, /data-testid="enquiry-form"/);
  assert.doesNotMatch(markup, /data-testid="button-submit-enquiry"/);
  assert.doesNotMatch(markup, /<form/);
});