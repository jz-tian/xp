import test from "node:test";
import assert from "node:assert/strict";

import {
  applyGraduationInheritance,
  backfillInheritance,
  buildInheritanceChain,
  createSeededRandom,
  findInheritancePredecessor,
  getElectionDates,
  getEligibilityAt,
  getInheritanceDeletionError,
  getJoinDate,
  getSuccessorPools,
  parseGeneration,
  parseRankNumber,
  validateInheritanceLink,
  validateInheritanceState,
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

const threeTopTwelveRanks = [
  { edition: "第1届", rank: "第十二位" },
  { edition: "第2届", rank: "第十一位" },
  { edition: "第3届", rank: "第十位" },
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
  const eligibilitySingles = [
    { id: "ge1", release: "2026-01-10", singleKind: "总选单曲" },
    { id: "ge2", release: "2026-02-10", singleKind: "总选单曲" },
    { id: "ge3", release: "2026-03-10", singleKind: "总选单曲" },
    { id: "regular1", release: "2026-01-01", singleKind: "常规单曲" },
    { id: "regular2", release: "2026-02-01", singleKind: "常规单曲" },
    { id: "regular3", release: "2026-03-01", singleKind: "常规单曲" },
  ];
  const rankedMember = {
    electionRanks: [
      { edition: "第1届", rank: "第十二位" },
      { edition: "第2届", rank: "第八位" },
      { edition: "第3届", rank: "第十一位" },
    ],
    selectionHistory: {
      regular1: "落选",
      regular2: "落选",
      regular3: "落选",
    },
  };

  assert.equal(
    getEligibilityAt(rankedMember, eligibilitySingles, "2026-03-09").eligible,
    false,
  );
  assert.deepEqual(getEligibilityAt(rankedMember, eligibilitySingles, "2026-03-10"), {
    eligible: true,
    topThreeCount: 0,
    topSevenCount: 0,
    topTwelveCount: 3,
  });
});

test("one top-three result qualifies only from its mapped election date", () => {
  const topThreeMember = {
    electionRanks: [{ edition: "第1届", rank: "第三位" }],
  };

  assert.deepEqual(getEligibilityAt(topThreeMember, singles, "2026-01-09"), {
    eligible: false,
    topThreeCount: 0,
    topSevenCount: 0,
    topTwelveCount: 0,
  });
  assert.deepEqual(getEligibilityAt(topThreeMember, singles, "2026-01-10"), {
    eligible: true,
    topThreeCount: 1,
    topSevenCount: 1,
    topTwelveCount: 1,
  });
});

test("two top-seven results qualify only from the second mapped election date", () => {
  const topSevenMember = {
    electionRanks: [
      { edition: "第1届", rank: "第七位" },
      { edition: "第2届", rank: "第六位" },
    ],
  };

  assert.deepEqual(getEligibilityAt(topSevenMember, singles, "2026-02-09"), {
    eligible: false,
    topThreeCount: 0,
    topSevenCount: 1,
    topTwelveCount: 1,
  });
  assert.deepEqual(getEligibilityAt(topSevenMember, singles, "2026-02-10"), {
    eligible: true,
    topThreeCount: 0,
    topSevenCount: 2,
    topTwelveCount: 2,
  });
});

test("ordinary A-side selections do not qualify for inheritance", () => {
  const eligibilitySingles = [
    { id: "ge1", release: "2026-01-10", singleKind: "总选单曲" },
    { id: "ge2", release: "2026-02-10", singleKind: "总选单曲" },
    { id: "ge3", release: "2026-03-10", singleKind: "总选单曲" },
    { id: "regular1", release: "2026-01-01", singleKind: "常规单曲" },
    { id: "regular2", release: "2026-02-01", singleKind: "常规单曲" },
    { id: "regular3", release: "2026-03-01", singleKind: "常规单曲" },
  ];
  const ordinaryAsideMember = {
    electionRanks: [],
    selectionHistory: {
      regular1: "A面选拔（第3排）",
      regular2: "A面选拔（第3排）",
      regular3: "A面选拔（第3排）",
    },
  };

  assert.equal(
    getEligibilityAt(ordinaryAsideMember, eligibilitySingles, "2026-03-10").eligible,
    false,
  );
});

test("prioritizes candidates who were not independently eligible on graduation day", () => {
  const prioritySingles = [
    ...singles,
    { id: "ge3", release: "2026-03-10", singleKind: "总选单曲" },
  ];
  const source = member("source", "1期", {
    isActive: false,
    graduationDate: "2026-03-15",
  });
  const alreadyEligible = member("eligible", "2期", {
    electionRanks: [
      { edition: "第1届", rank: "第十二位" },
      { edition: "第2届", rank: "第八位" },
      { edition: "第3届", rank: "第十一位" },
    ],
  });
  const notYetEligible = member("preferred", "3期");

  const pools = getSuccessorPools(
    source,
    [source, alreadyEligible, notYetEligible],
    prioritySingles,
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

test("manual validation rejects duplicate incoming links regardless of member order", () => {
  const source = member("source", "2期", {
    isActive: false,
    graduationDate: "2026-02-15",
    inheritanceSuccessorId: "target",
  });
  const target = member("target", "3期");
  const existingPredecessor = member("existing", "1期", {
    isActive: false,
    graduationDate: "2026-02-01",
    inheritanceSuccessorId: "target",
  });

  assert.match(
    validateInheritanceLink("source", "target", [source, target, existingPredecessor], singles),
    /已经继承/,
  );
});

test("manual state validation preserves required historical edges and pending states", () => {
  const previous = member("source", "1期", {
    isActive: false,
    graduationDate: "2026-03-01",
    electionRanks: [{ edition: "第1届", rank: "第一位" }],
    inheritanceSuccessorId: "target",
  });
  const target = member("target", "2期");
  const cleared = { ...previous, inheritanceSuccessorId: "", inheritancePending: false };

  assert.match(
    validateInheritanceState(previous, cleared, [cleared, target], singles),
    /不能清空/,
  );

  const pending = member("pending", "9期", {
    isActive: false,
    graduationDate: "2026-03-01",
    electionRanks: [{ edition: "第1届", rank: "第一位" }],
    inheritancePending: true,
  });
  assert.equal(validateInheritanceState(pending, pending, [pending], singles), null);
});

test("member deletion is blocked while either side participates in a lineage", () => {
  const source = member("source", "1期", { inheritanceSuccessorId: "target" });
  const target = member("target", "2期");

  assert.match(getInheritanceDeletionError("source", [source, target]), /传承路线/);
  assert.match(getInheritanceDeletionError("target", [source, target]), /传承路线/);
  assert.equal(getInheritanceDeletionError("other", [...[source, target], member("other", "3期")]), null);
});

test("seeded backfill is stable and extends through inherited graduates", () => {
  const historySingles = [
    { id: "h1", release: "2026-01-01", singleKind: "总选单曲" },
    { id: "h2", release: "2026-02-01", singleKind: "总选单曲" },
    { id: "h3", release: "2026-03-01", singleKind: "总选单曲" },
    { id: "h4", release: "2026-03-15", singleKind: "常规单曲" },
  ];
  const historyMembers = [
    member("root", "1期", {
      isActive: false,
      graduationDate: "2026-03-02",
      electionRanks: threeTopTwelveRanks,
      selectionHistory: {
        h1: "落选",
        h2: "落选",
        h3: "落选",
        h4: "落选",
      },
    }),
    member("middle", "2期", {
      isActive: false,
      graduationDate: "2026-04-01",
      selectionHistory: { h1: "落选", h2: "落选", h3: "落选", h4: "落选" },
    }),
    member("tail", "3期", {
      selectionHistory: { h1: "加入前", h2: "加入前", h3: "加入前", h4: "落选" },
    }),
  ];

  const first = backfillInheritance(historyMembers, historySingles, { seed: "test-seed" });
  const second = backfillInheritance(historyMembers, historySingles, { seed: "test-seed" });

  assert.deepEqual(first, second);
  assert.equal(first.find((candidate) => candidate.id === "root").inheritanceSuccessorId, "middle");
  assert.equal(first.find((candidate) => candidate.id === "middle").inheritanceSuccessorId, "tail");
  const random = createSeededRandom("test-seed");
  assert.equal(typeof random(), "number");
});

test("an unavoidable pending member does not disable backtracking for other lineages", () => {
  const historySingles = [
    { id: "h1", release: "2026-01-01", singleKind: "总选单曲" },
    { id: "h2", release: "2026-02-01", singleKind: "总选单曲" },
    { id: "h3", release: "2026-03-01", singleKind: "总选单曲" },
  ];
  const joinedHistory = {
    h1: "落选",
    h2: "落选",
    h3: "落选",
  };
  const historyMembers = [
    member("existing-root", "1期", { inheritanceSuccessorId: "middle" }),
    member("forced-root", "1期", { inheritanceSuccessorId: "forced-pending" }),
    member("source", "1期", {
      isActive: false,
      graduationDate: "2026-04-01",
      electionRanks: threeTopTwelveRanks,
      selectionHistory: joinedHistory,
    }),
    member("middle", "2期", {
      isActive: false,
      graduationDate: "2026-04-02",
      selectionHistory: { h1: "落选" },
    }),
    member("alternate", "2期", { selectionHistory: { h1: "落选" } }),
    member("tail", "3期", { selectionHistory: { h1: "落选" } }),
    member("forced-pending", "4期", {
      isActive: false,
      graduationDate: "2026-04-03",
      selectionHistory: { h1: "落选" },
    }),
  ];

  const result = backfillInheritance(historyMembers, historySingles, { seed: "backtrack-with-pending" });

  assert.equal(result.find((candidate) => candidate.id === "source").inheritanceSuccessorId, "alternate");
  assert.equal(result.find((candidate) => candidate.id === "middle").inheritanceSuccessorId, "tail");
  assert.equal(result.find((candidate) => candidate.id === "forced-pending").inheritancePending, true);
});

test("backfill avoids dynamically creating a terminal inherited member when a complete chain exists", () => {
  const historySingles = [
    { id: "h1", release: "2026-01-01", singleKind: "总选单曲" },
    { id: "h2", release: "2026-02-01", singleKind: "总选单曲" },
    { id: "h3", release: "2026-03-01", singleKind: "总选单曲" },
    { id: "h4", release: "2026-04-03", singleKind: "常规单曲" },
  ];
  const result = backfillInheritance([
    member("source", "1期", {
      isActive: false,
      graduationDate: "2026-04-01",
      electionRanks: threeTopTwelveRanks,
      selectionHistory: {
        h1: "落选",
        h2: "落选",
        h3: "落选",
        h4: "落选",
      },
    }),
    member("dead-end", "2期", {
      isActive: false,
      graduationDate: "2026-04-02",
      selectionHistory: { h1: "落选", h2: "落选", h3: "落选", h4: "加入前" },
    }),
    member("safe", "2期", {
      isActive: false,
      graduationDate: "2026-04-04",
      selectionHistory: { h1: "落选", h2: "落选", h3: "落选", h4: "落选" },
    }),
    member("tail", "3期", {
      selectionHistory: { h1: "加入前", h2: "加入前", h3: "加入前", h4: "落选" },
    }),
  ], historySingles, { seed: "dynamic-terminal" });

  assert.equal(result.find((candidate) => candidate.id === "source").inheritanceSuccessorId, "safe");
  assert.equal(result.find((candidate) => candidate.id === "safe").inheritanceSuccessorId, "tail");
  assert.equal(result.some((candidate) => candidate.inheritancePending), false);
});

test("backfill minimizes pending lines when one dynamically terminal line is unavoidable", () => {
  const historySingles = [
    { id: "h1", release: "2026-01-01", singleKind: "总选单曲" },
    { id: "h2", release: "2026-01-02", singleKind: "总选单曲" },
    { id: "h3", release: "2026-01-03", singleKind: "总选单曲" },
    { id: "h4", release: "2026-02-15", singleKind: "总选单曲" },
  ];
  const joinedHistory = {
    h1: "落选",
    h2: "落选",
    h3: "落选",
  };
  const historyMembers = [
    member("dynamic-root", "4期", {
      isActive: false,
      graduationDate: "2026-01-10",
      electionRanks: threeTopTwelveRanks,
      selectionHistory: joinedHistory,
    }),
    member("dynamic-terminal", "5期", {
      isActive: false,
      graduationDate: "2026-01-20",
      selectionHistory: { h1: "落选" },
    }),
    member("source", "1期", {
      isActive: false,
      graduationDate: "2026-02-01",
      electionRanks: threeTopTwelveRanks,
      selectionHistory: joinedHistory,
    }),
    member("future", "2期", {
      isActive: false,
      graduationDate: "2026-03-01",
      electionRanks: [
        { edition: "第1届", rank: "第十二位" },
        { edition: "第2届", rank: "第十一位" },
        { edition: "第4届", rank: "第十位" },
      ],
      selectionHistory: {
        h1: "落选",
        h2: "落选",
        h3: "落选",
        h4: "落选",
      },
    }),
    member("alternate", "3期", { selectionHistory: { h1: "落选" } }),
  ];

  const result = backfillInheritance(historyMembers, historySingles, { seed: "test" });

  assert.equal(result.find((candidate) => candidate.id === "dynamic-root").inheritanceSuccessorId, "dynamic-terminal");
  assert.equal(result.find((candidate) => candidate.id === "dynamic-terminal").inheritancePending, true);
  assert.equal(result.find((candidate) => candidate.id === "source").inheritanceSuccessorId, "future");
  assert.equal(result.find((candidate) => candidate.id === "future").inheritanceSuccessorId, "alternate");
  assert.equal(result.filter((candidate) => candidate.inheritancePending).length, 1);
});
