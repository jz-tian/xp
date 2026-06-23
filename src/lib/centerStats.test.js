import test from "node:test";
import assert from "node:assert/strict";

import {
  formatSingleCenterSummary,
} from "./centerStats.js";

const membersById = new Map([
  ["li", { name: "李红" }],
  ["zhao", { name: "赵美" }],
  ["wang", { name: "王蓝" }],
]);

test("formats center counts as of the selected single", () => {
  const singles = [
    {
      id: "s2",
      title: "2nd Single · Moon",
      release: "2026-02-01",
      asideLineup: {
        slots: ["li", "zhao", "wang"],
        slotRoles: { 0: "center", 1: "center" },
      },
    },
    {
      id: "s1",
      title: "1st Single · Sun",
      release: "2026-01-01",
      asideLineup: {
        slots: ["li", "zhao"],
        slotRoles: { 0: "center" },
      },
    },
  ];

  assert.equal(formatSingleCenterSummary(singles[0], singles, membersById), "李红(2)、赵美(初)");
});

test("counts one center credit per member per single", () => {
  const singles = [
    {
      id: "s1",
      title: "1st Single · Sun",
      release: "2026-01-01",
      asideLineup: {
        slots: ["li", "li", "zhao"],
        slotRoles: { 0: "center", 1: "center", 2: "center" },
      },
    },
  ];

  assert.equal(formatSingleCenterSummary(singles[0], singles, membersById), "李红(初)、赵美(初)");
});
