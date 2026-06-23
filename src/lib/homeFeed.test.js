import test from "node:test";
import assert from "node:assert/strict";

import {
  getAdminActivityDate,
  pickLatestMemberForNews,
  stampAdminEntity,
} from "./homeFeed.js";

test("stamps new admin entities with createdAt and updatedAt", () => {
  const stamped = stampAdminEntity({ id: "m1", name: "新成员" }, false, "2026-06-23T10:00:00.000Z");

  assert.equal(stamped.createdAt, "2026-06-23T10:00:00.000Z");
  assert.equal(stamped.updatedAt, "2026-06-23T10:00:00.000Z");
});

test("preserves createdAt and refreshes updatedAt when editing", () => {
  const stamped = stampAdminEntity(
    { id: "m1", name: "成员", createdAt: "2026-06-01T10:00:00.000Z" },
    true,
    "2026-06-23T10:00:00.000Z"
  );

  assert.equal(stamped.createdAt, "2026-06-01T10:00:00.000Z");
  assert.equal(stamped.updatedAt, "2026-06-23T10:00:00.000Z");
});

test("picks latest member by admin activity timestamp instead of array order", () => {
  const latest = pickLatestMemberForNews([
    { id: "old", name: "旧成员", createdAt: "2026-06-01T10:00:00.000Z" },
    { id: "new", name: "新成员", createdAt: "2026-06-20T10:00:00.000Z" },
  ]);

  assert.equal(latest.id, "new");
});

test("uses updatedAt as the visible admin activity date", () => {
  assert.equal(
    getAdminActivityDate({
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-23T10:00:00.000Z",
    }),
    "2026-06-23T10:00:00.000Z"
  );
});
