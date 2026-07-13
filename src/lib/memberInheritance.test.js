import test from "node:test";
import assert from "node:assert/strict";

import {
  getElectionDates,
  getEligibilityAt,
  getJoinDate,
  parseGeneration,
  parseRankNumber,
} from "./memberInheritance.js";

const singles = [
  { id: "s1", release: "2026-01-01", singleKind: "常规单曲" },
  { id: "ge1", release: "2026-01-10", singleKind: "总选单曲" },
  { id: "s2", release: "2026-02-01", singleKind: "常规单曲" },
  { id: "ge2", release: "2026-02-10", singleKind: "总选单曲" },
  { id: "s3", release: "2026-03-01", singleKind: "常规单曲" },
];

test("parses generations and Chinese or Arabic election ranks", () => {
  assert.equal(parseGeneration({ generation: "10期" }), 10);
  assert.equal(parseGeneration({ generation: "未设" }), Infinity);
  assert.equal(parseRankNumber("十一位"), 11);
  assert.equal(parseRankNumber("第3位"), 3);
  assert.equal(parseRankNumber("圈外"), Infinity);
});

test("infers join date from the first dated non-prejoin single", () => {
  const member = {
    selectionHistory: {
      s1: "加入前",
      s2: "落选",
      s3: "A面选拔（第3排）",
    },
  };

  assert.equal(getJoinDate(member, singles), "2026-02-01");
});

test("maps the nth general-election single to the nth edition", () => {
  assert.deepEqual(
    [...getElectionDates(singles)],
    [[1, "2026-01-10"], [2, "2026-02-10"]],
  );
});

test("computes eligibility only from results available at the requested date", () => {
  const member = {
    electionRanks: [
      { edition: "第1届", rank: "三位" },
      { edition: "第2届", rank: "第六位" },
    ],
    selectionHistory: {
      s1: "A面选拔（第3排）",
      s2: "A面选拔（第3排）",
      s3: "A面选拔（第3排）",
    },
  };

  assert.deepEqual(getEligibilityAt(member, singles, "2026-01-05"), {
    eligible: false,
    topThreeCount: 0,
    topSevenCount: 0,
    selectionCount: 1,
  });
  assert.deepEqual(getEligibilityAt(member, singles, "2026-01-10"), {
    eligible: true,
    topThreeCount: 1,
    topSevenCount: 1,
    selectionCount: 1,
  });
  assert.equal(
    getEligibilityAt({ ...member, electionRanks: [] }, singles, "2026-03-01").eligible,
    true,
  );
});
