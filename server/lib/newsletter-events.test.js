import test from "node:test";
import assert from "node:assert/strict";

import { detectNewsletterEvents } from "./newsletter-events.js";

test("detects newly added singles", () => {
  const previousDb = {
    members: [],
    singles: [{ id: "s1", title: "1st Single" }],
  };
  const nextDb = {
    members: [],
    singles: [
      { id: "s1", title: "1st Single" },
      { id: "s2", title: "2nd Single" },
    ],
  };

  assert.deepEqual(detectNewsletterEvents(previousDb, nextDb), [
    { type: "single-release", id: "s2" },
  ]);
});

test("does not trigger for editing an existing single", () => {
  const previousDb = {
    members: [],
    singles: [{ id: "s1", title: "1st Single" }],
  };
  const nextDb = {
    members: [],
    singles: [{ id: "s1", title: "1st Single · Updated" }],
  };

  assert.deepEqual(detectNewsletterEvents(previousDb, nextDb), []);
});

test("detects when an active member graduates", () => {
  const previousDb = {
    members: [{ id: "m1", name: "宫岛 阿弥", isActive: true, graduationDate: "" }],
    singles: [],
  };
  const nextDb = {
    members: [{ id: "m1", name: "宫岛 阿弥", isActive: false, graduationDate: "2026-05-06" }],
    singles: [],
  };

  assert.deepEqual(detectNewsletterEvents(previousDb, nextDb), [
    { type: "member-graduation", id: "m1" },
  ]);
});

test("does not retrigger for an already graduated member", () => {
  const previousDb = {
    members: [{ id: "m1", name: "宫岛 阿弥", isActive: false, graduationDate: "2026-05-06" }],
    singles: [],
  };
  const nextDb = {
    members: [{ id: "m1", name: "宫岛 阿弥", isActive: false, graduationDate: "2026-05-06", generation: "2期" }],
    singles: [],
  };

  assert.deepEqual(detectNewsletterEvents(previousDb, nextDb), []);
});

test("does not trigger when inactive member has no graduation date", () => {
  const previousDb = {
    members: [{ id: "m1", name: "宫岛 阿弥", isActive: true, graduationDate: "" }],
    singles: [],
  };
  const nextDb = {
    members: [{ id: "m1", name: "宫岛 阿弥", isActive: false, graduationDate: "" }],
    singles: [],
  };

  assert.deepEqual(detectNewsletterEvents(previousDb, nextDb), []);
});
