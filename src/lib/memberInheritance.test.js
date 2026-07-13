import test from "node:test";
import assert from "node:assert/strict";

import {
  applyGraduationInheritance,
  buildInheritanceChain,
  findInheritancePredecessor,
  getElectionDates,
  getEligibilityAt,
  getJoinDate,
  getSuccessorPools,
  parseGeneration,
  parseRankNumber,
  validateInheritanceLink,
} from "./memberInheritance.js";

const singles = [
  { id: "s1", release: "2026-01-01", singleKind: "常规单曲" },
  { id: "ge1", release: "2026-01-10", singleKind: "总选单曲" },
  { id: "s2", release: "2026-02-01", singleKind: "常规单曲" },
  { id: "ge2", release: "2026-02-10", singleKind: "总选单曲" },
  { id: "s3", release: "2026-03-01", singleKind: "常规单曲" },
];

const member = (id, generation, overrides = {}) => ({
  id,
  name: id,
  generation,
  isActive: true,
  graduationDate: "",
  electionRanks: [],
  selectionHistory: { s1: "落选" },
  inheritanceSuccessorId: "",
  ...overrides,
});

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

test("prioritizes candidates who were not independently eligible on graduation day", () => {
  const source = member("source", "1期", {
    isActive: false,
    graduationDate: "2026-02-15",
  });
  const alreadyEligible = member("eligible", "2期", {
    electionRanks: [{ edition: "第1届", rank: "第一位" }],
  });
  const notYetEligible = member("preferred", "3期");

  const pools = getSuccessorPools(
    source,
    [source, alreadyEligible, notYetEligible],
    singles,
    source.graduationDate,
  );

  assert.deepEqual(pools.preferred.map((candidate) => candidate.id), ["preferred"]);
  assert.deepEqual(pools.fallback.map((candidate) => candidate.id), ["eligible"]);
});

test("excludes same-generation, not-yet-joined, same-day graduates, and inherited members", () => {
  const source = member("source", "2期", {
    isActive: false,
    graduationDate: "2026-02-15",
  });
  const members = [
    source,
    member("same", "2期"),
    member("future", "3期", { selectionHistory: { s3: "落选" } }),
    member("sameDay", "3期", {
      isActive: false,
      graduationDate: "2026-02-15",
    }),
    member("taken", "3期"),
    member("previous", "1期", { inheritanceSuccessorId: "taken" }),
  ];

  const pools = getSuccessorPools(source, members, singles, source.graduationDate);

  assert.deepEqual([...pools.preferred, ...pools.fallback], []);
});

test("an inherited graduate continues one chain without independent eligibility", () => {
  const previous = member("previous", "1期", { inheritanceSuccessorId: "source" });
  const sourceBefore = member("source", "2期", { isActive: true });
  const sourceAfter = member("source", "2期", {
    isActive: false,
    graduationDate: "2026-02-15",
  });
  const target = member("target", "3期");

  const result = applyGraduationInheritance({
    members: [previous, sourceBefore, target],
    singles,
    previousMember: sourceBefore,
    nextMember: sourceAfter,
    rng: () => 0,
  });

  assert.equal(
    result.members.find((candidate) => candidate.id === "source").inheritanceSuccessorId,
    "target",
  );
});

test("does not redraw an existing result on later edits", () => {
  const source = member("source", "1期", {
    isActive: false,
    graduationDate: "2026-02-15",
    inheritanceSuccessorId: "fixed",
  });

  const result = applyGraduationInheritance({
    members: [source, member("fixed", "2期"), member("other", "3期")],
    singles,
    previousMember: source,
    nextMember: { ...source, name: "edited" },
    rng: () => 0.99,
  });

  assert.equal(
    result.members.find((candidate) => candidate.id === "source").inheritanceSuccessorId,
    "fixed",
  );
});

test("resolves the complete chain and stops safely on cycles", () => {
  const members = [
    member("a", "1期", { inheritanceSuccessorId: "b" }),
    member("b", "2期", { inheritanceSuccessorId: "c" }),
    member("c", "3期"),
  ];

  assert.equal(findInheritancePredecessor("b", members).id, "a");
  assert.deepEqual(buildInheritanceChain("b", members).map((candidate) => candidate.id), ["a", "b", "c"]);

  members[2].inheritanceSuccessorId = "a";
  const cycle = buildInheritanceChain("b", members);
  assert.equal(new Set(cycle.map((candidate) => candidate.id)).size, cycle.length);
  assert.ok(cycle.length <= members.length);
});

test("manual validation rejects duplicate incoming links and invalid generations", () => {
  const members = [
    member("source", "2期", {
      isActive: false,
      graduationDate: "2026-02-15",
    }),
    member("older", "1期"),
    member("target", "3期"),
    member("other", "1期", { inheritanceSuccessorId: "target" }),
  ];

  assert.match(validateInheritanceLink("source", "older", members, singles), /期数/);
  assert.match(validateInheritanceLink("source", "target", members, singles), /已经继承/);
});
