# Member Inheritance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use $superpower-subagents (recommended) or $superpower-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking via update_plan.

**Goal:** Add persistent, historically accurate member inheritance chains, backfill all eligible graduates, and expose adjacent links plus the complete lineage in member details.

**Architecture:** A pure `src/lib/memberInheritance.js` module owns historical-date calculations, eligibility, candidate priority, validation, seeded backfill, and chain traversal. `src/App.jsx` calls that module only when an admin changes a member from active to graduated and renders the LEGACY UI; `server/data/db.json` stores only each member's `inheritanceSuccessorId` plus the rare pending flag.

**Tech Stack:** React 19, Vite 7, Node.js ESM and `node:test`, Tailwind CSS, Radix Dialog, lucide-react.

---

## File map

- Create `src/lib/memberInheritance.js` — all pure inheritance and historical-time rules.
- Create `src/lib/memberInheritance.test.js` — focused unit tests for eligibility, priority, assignment, validation, and chains.
- Create `src/lib/memberInheritanceData.test.js` — checks the committed database against the deterministic backfill and graph invariants.
- Create `src/lib/memberInheritanceSource.test.js` — checks the member detail and admin integration in `App.jsx`.
- Create `scripts/backfill-member-inheritance.mjs` — reproducible fixed-seed database backfill command.
- Modify `src/App.jsx` — graduation assignment, admin correction UI, LEGACY section, and full lineage dialog.
- Modify `server/data/db.json` — add the persistent successor field to all 69 members and commit historical assignments.

### Task 1: Historical eligibility calculations

**Files:**
- Create: `src/lib/memberInheritance.test.js`
- Create: `src/lib/memberInheritance.js`

- [ ] **Step 1: Write failing tests for rank, join date, election date, and eligibility**

Create fixtures with Chinese and Arabic ranks, three singles with release dates, and election-result singles. Assert that future results do not count:

```js
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
  assert.equal(parseRankNumber("十一位"), 11);
  assert.equal(parseRankNumber("第3位"), 3);
  assert.equal(parseRankNumber("圈外"), Infinity);
});

test("infers join date from the first non-prejoin single", () => {
  const member = { selectionHistory: { s1: "加入前", s2: "落选", s3: "A面选拔（第3排）" } };
  assert.equal(getJoinDate(member, singles), "2026-02-01");
});

test("maps the nth general-election single to the nth edition", () => {
  assert.deepEqual(getElectionDates(singles), new Map([[1, "2026-01-10"], [2, "2026-02-10"]]));
});

test("computes eligibility only from results available at the requested date", () => {
  const member = {
    electionRanks: [
      { edition: "第1届", rank: "第三位" },
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
  assert.equal(getEligibilityAt(member, singles, "2026-01-10").eligible, true);
  assert.equal(getEligibilityAt({ ...member, electionRanks: [] }, singles, "2026-03-01").eligible, true);
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `node --test src/lib/memberInheritance.test.js`

Expected: FAIL because `memberInheritance.js` or its exports do not exist.

- [ ] **Step 3: Implement the minimum historical helpers**

Implement these exact public functions in `src/lib/memberInheritance.js`:

```js
const CN_DIGIT = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

export function parseGeneration(member) {
  const value = Number(String(member?.generation || "").match(/\d+/)?.[0]);
  return Number.isFinite(value) ? value : Infinity;
}

export function parseRankNumber(raw) {
  const value = String(raw || "").replace(/^第/, "").replace(/位$/, "").trim();
  if (!value || ["圈外", "加入前", "未参选"].includes(value)) return Infinity;
  if (/^\d+$/.test(value)) return Number(value);
  if (value === "十") return 10;
  const ten = value.indexOf("十");
  if (ten < 0) return CN_DIGIT[value] ?? Infinity;
  const left = value.slice(0, ten);
  const right = value.slice(ten + 1);
  const tens = left ? CN_DIGIT[left] : 1;
  const ones = right ? CN_DIGIT[right] : 0;
  return Number.isFinite(tens) && Number.isFinite(ones) ? tens * 10 + ones : Infinity;
}

export function getSingleDate(single) {
  const raw = String(single?.release || single?.releaseDate || "").trim();
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : "";
}

export function getJoinDate(member, singles) {
  const byId = new Map(singles.map((single) => [single.id, single]));
  return Object.entries(member?.selectionHistory || {})
    .filter(([, value]) => !String(value?.value ?? value ?? "").includes("加入前"))
    .map(([id]) => getSingleDate(byId.get(id)))
    .filter(Boolean)
    .sort()[0] || "";
}

export function getElectionDates(singles) {
  return new Map(singles
    .filter((single) => single?.singleKind === "总选单曲")
    .map(getSingleDate)
    .filter(Boolean)
    .sort()
    .map((date, index) => [index + 1, date]));
}

export function getEligibilityAt(member, singles, atDate) {
  const electionDates = getElectionDates(singles);
  const ranks = (member?.electionRanks || [])
    .filter((entry) => {
      const edition = Number(String(entry?.edition || "").match(/\d+/)?.[0]);
      const date = electionDates.get(edition);
      return date && date <= atDate;
    })
    .map((entry) => parseRankNumber(entry.rank));
  const byId = new Map(singles.map((single) => [single.id, single]));
  const selectionCount = Object.entries(member?.selectionHistory || {}).filter(([id, value]) => {
    const date = getSingleDate(byId.get(id));
    return date && date <= atDate && String(value?.value ?? value ?? "").includes("A面选拔");
  }).length;
  const topThreeCount = ranks.filter((rank) => rank <= 3).length;
  const topSevenCount = ranks.filter((rank) => rank <= 7).length;
  return {
    eligible: topThreeCount >= 1 || topSevenCount >= 2 || selectionCount >= 3,
    topThreeCount,
    topSevenCount,
    selectionCount,
  };
}
```

Use single IDs rather than object insertion order for date lookup, ignore undated/unknown entries, and count A-side selections only when `getSingleDate(single) <= atDate`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test src/lib/memberInheritance.test.js`

Expected: all Task 1 tests PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/memberInheritance.js src/lib/memberInheritance.test.js
git commit -m "feat: add historical inheritance eligibility rules"
```

### Task 2: Graph, candidate priority, validation, and graduation assignment

**Files:**
- Modify: `src/lib/memberInheritance.js`
- Modify: `src/lib/memberInheritance.test.js`

- [ ] **Step 1: Add failing tests for graph and assignment behavior**

Append tests using a helper `member(id, generation, overrides)` and assert:

```js
import {
  applyGraduationInheritance,
  buildInheritanceChain,
  findInheritancePredecessor,
  getSuccessorPools,
  validateInheritanceLink,
} from "./memberInheritance.js";

test("prioritizes candidates who were not independently eligible on graduation day", () => {
  const source = member("source", "1期", { isActive: false, graduationDate: "2026-02-15" });
  const alreadyEligible = member("eligible", "2期", {
    electionRanks: [{ edition: "第1届", rank: "第一位" }],
  });
  const notYetEligible = member("preferred", "3期");
  const pools = getSuccessorPools(source, [source, alreadyEligible, notYetEligible], singles, "2026-02-15");
  assert.deepEqual(pools.preferred.map((x) => x.id), ["preferred"]);
  assert.deepEqual(pools.fallback.map((x) => x.id), ["eligible"]);
});

test("excludes same-generation, not-yet-joined, same-day graduate, and already inherited members", () => {
  const source = member("source", "2期", { isActive: false, graduationDate: "2026-02-15" });
  const members = [
    source,
    member("same", "2期"),
    member("future", "3期", { selectionHistory: { s3: "落选" } }),
    member("sameDay", "3期", { isActive: false, graduationDate: "2026-02-15" }),
    member("taken", "3期"),
    member("previous", "1期", { inheritanceSuccessorId: "taken" }),
  ];
  const pools = getSuccessorPools(source, members, singles, source.graduationDate);
  assert.deepEqual([...pools.preferred, ...pools.fallback], []);
});

test("an inherited graduate continues one chain even without independent eligibility", () => {
  const previous = member("previous", "1期", { inheritanceSuccessorId: "source" });
  const sourceBefore = member("source", "2期", { isActive: true });
  const sourceAfter = member("source", "2期", { isActive: false, graduationDate: "2026-02-15" });
  const target = member("target", "3期");
  const result = applyGraduationInheritance({
    members: [previous, sourceBefore, target],
    singles,
    previousMember: sourceBefore,
    nextMember: sourceAfter,
    rng: () => 0,
  });
  assert.equal(result.members.find((x) => x.id === "source").inheritanceSuccessorId, "target");
});

test("does not redraw an existing result on later edits", () => {
  const previous = member("source", "1期", { isActive: false, graduationDate: "2026-02-15", inheritanceSuccessorId: "fixed" });
  const result = applyGraduationInheritance({
    members: [previous, member("fixed", "2期"), member("other", "3期")],
    singles,
    previousMember: previous,
    nextMember: { ...previous, name: "edited" },
    rng: () => 0.99,
  });
  assert.equal(result.members.find((x) => x.id === "source").inheritanceSuccessorId, "fixed");
});

test("resolves the complete chain and stops safely on cycles", () => {
  const members = [
    member("a", "1期", { inheritanceSuccessorId: "b" }),
    member("b", "2期", { inheritanceSuccessorId: "c" }),
    member("c", "3期"),
  ];
  assert.equal(findInheritancePredecessor("b", members).id, "a");
  assert.deepEqual(buildInheritanceChain("b", members).map((x) => x.id), ["a", "b", "c"]);
  members[2].inheritanceSuccessorId = "a";
  const cycle = buildInheritanceChain("b", members);
  assert.equal(new Set(cycle.map((x) => x.id)).size, cycle.length);
  assert.ok(cycle.length <= members.length);
});

test("manual validation rejects duplicate incoming links and invalid generations", () => {
  const members = [
    member("source", "2期", { isActive: false, graduationDate: "2026-02-15" }),
    member("older", "1期"),
    member("target", "3期"),
    member("other", "1期", { inheritanceSuccessorId: "target" }),
  ];
  assert.match(validateInheritanceLink("source", "older", members, singles), /期数/);
  assert.match(validateInheritanceLink("source", "target", members, singles), /已经继承/);
});
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `node --test src/lib/memberInheritance.test.js`

Expected: FAIL on the newly imported graph functions.

- [ ] **Step 3: Implement graph and assignment APIs**

Add these exports with no React dependencies:

```js
export function findInheritancePredecessor(memberId, members) {
  return members.find((member) => member?.inheritanceSuccessorId === memberId) || null;
}

export function buildInheritanceChain(memberId, members) {
  const byId = new Map(members.map((member) => [member.id, member]));
  let root = byId.get(memberId);
  const reverseSeen = new Set();
  while (root && !reverseSeen.has(root.id)) {
    reverseSeen.add(root.id);
    const predecessor = findInheritancePredecessor(root.id, members);
    if (!predecessor || reverseSeen.has(predecessor.id)) break;
    root = predecessor;
  }
  const chain = [];
  const forwardSeen = new Set();
  let current = root;
  while (current && !forwardSeen.has(current.id)) {
    chain.push(current);
    forwardSeen.add(current.id);
    current = byId.get(current.inheritanceSuccessorId);
  }
  return chain;
}

export function validateInheritanceLink(sourceId, targetId, members, singles) {
  if (!targetId) return null;
  const source = members.find((member) => member.id === sourceId);
  const target = members.find((member) => member.id === targetId);
  if (!source || !target) return "传承成员不存在";
  if (parseGeneration(target) <= parseGeneration(source)) return "继承人的期数必须更晚";
  const joinDate = getJoinDate(target, singles);
  if (!joinDate || joinDate > source.graduationDate) return "继承人在前任毕业时尚未入团";
  if (!target.isActive && (!target.graduationDate || target.graduationDate <= source.graduationDate)) {
    return "继承人在前任毕业时已不在籍";
  }
  const incoming = findInheritancePredecessor(targetId, members);
  if (incoming && incoming.id !== sourceId) return "该成员已经继承其他人";
  const targetChain = buildInheritanceChain(targetId, members);
  if (targetChain.some((member) => member.id === sourceId)) return "该选择会形成传承循环";
  return null;
}

export function getSuccessorPools(source, members, singles, atDate = source.graduationDate) {
  const candidates = members.filter((candidate) => {
    if (candidate.id === source.id) return false;
    if (parseGeneration(candidate) <= parseGeneration(source)) return false;
    const joinDate = getJoinDate(candidate, singles);
    if (!joinDate || joinDate > atDate) return false;
    if (!candidate.isActive && (!candidate.graduationDate || candidate.graduationDate <= atDate)) return false;
    if (findInheritancePredecessor(candidate.id, members)) return false;
    return validateInheritanceLink(source.id, candidate.id, members, singles) === null;
  });
  return {
    preferred: candidates.filter((candidate) => !getEligibilityAt(candidate, singles, atDate).eligible),
    fallback: candidates.filter((candidate) => getEligibilityAt(candidate, singles, atDate).eligible),
  };
}

export function pickInheritanceSuccessor(source, members, singles, rng = Math.random) {
  const pools = getSuccessorPools(source, members, singles, source.graduationDate);
  const pool = pools.preferred.length ? pools.preferred : pools.fallback;
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

export function applyGraduationInheritance({ members, singles, previousMember, nextMember, rng = Math.random }) {
  let nextMembers = members.map((member) => member.id === nextMember.id ? { ...nextMember } : { ...member });
  if (!previousMember || previousMember.isActive !== true || nextMember.isActive !== false) return { members: nextMembers, successor: null };
  const saved = nextMembers.find((member) => member.id === nextMember.id);
  const inherited = Boolean(findInheritancePredecessor(saved.id, nextMembers));
  const required = inherited || getEligibilityAt(saved, singles, saved.graduationDate).eligible;
  if (!required || saved.inheritanceSuccessorId) return { members: nextMembers, successor: null };
  const successor = pickInheritanceSuccessor(saved, nextMembers, singles, rng);
  saved.inheritanceSuccessorId = successor?.id || "";
  saved.inheritancePending = !successor;
  nextMembers = nextMembers.map((member) => member.id === saved.id ? saved : member);
  return { members: nextMembers, successor };
}
```

When evaluating candidates, treat a current active member as active at any past date after her join date; treat an inactive member as active only when `candidate.graduationDate > atDate`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test src/lib/memberInheritance.test.js`

Expected: all Task 1 and Task 2 tests PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/memberInheritance.js src/lib/memberInheritance.test.js
git commit -m "feat: add inheritance assignment and chain rules"
```

### Task 3: Deterministic historical backfill

**Files:**
- Modify: `src/lib/memberInheritance.js`
- Modify: `src/lib/memberInheritance.test.js`
- Create: `scripts/backfill-member-inheritance.mjs`
- Create: `src/lib/memberInheritanceData.test.js`
- Modify: `server/data/db.json`

- [ ] **Step 1: Write failing deterministic-backfill tests**

Add a synthetic chain test and a database test:

```js
import { backfillInheritance, createSeededRandom } from "./memberInheritance.js";

test("seeded backfill is stable and extends through inherited graduates", () => {
  const first = backfillInheritance(historyMembers, singles, { seed: "test-seed" });
  const second = backfillInheritance(historyMembers, singles, { seed: "test-seed" });
  assert.deepEqual(first, second);
  const inheritedGraduate = first.find((x) => x.id === "middle");
  assert.ok(inheritedGraduate.inheritanceSuccessorId);
  assert.equal(typeof createSeededRandom("test-seed")(), "number");
});
```

Create `src/lib/memberInheritanceData.test.js` to load `server/data/db.json`, recompute with seed `xp-legacy-2026-07-13`, and assert:

```js
test("all members have stable inheritance fields matching the seeded backfill", () => {
  const expected = backfillInheritance(clearInheritance(db.members), db.singles, { seed: SEED });
  assert.deepEqual(projectInheritance(db.members), projectInheritance(expected));
  assert.equal(db.members.every((member) => Object.hasOwn(member, "inheritanceSuccessorId")), true);
});

test("the committed inheritance graph is unique, acyclic, and historically valid", () => {
  const successors = db.members.map((member) => member.inheritanceSuccessorId).filter(Boolean);
  assert.equal(new Set(successors).size, successors.length);
  for (const member of db.members) {
    if (member.inheritanceSuccessorId) {
      assert.equal(validateInheritanceLink(member.id, member.inheritanceSuccessorId, db.members, db.singles), null);
    }
    const chain = buildInheritanceChain(member.id, db.members);
    assert.equal(new Set(chain.map((item) => item.id)).size, chain.length);
  }
});

test("every eligible or inherited graduate has a successor or an explicit pending marker", () => {
  for (const member of db.members.filter((item) => !item.isActive && item.graduationDate)) {
    const required = getEligibilityAt(member, db.singles, member.graduationDate).eligible
      || Boolean(findInheritancePredecessor(member.id, db.members));
    if (required) assert.ok(member.inheritanceSuccessorId || member.inheritancePending, member.name);
  }
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test src/lib/memberInheritance.test.js src/lib/memberInheritanceData.test.js`

Expected: FAIL because seeded backfill exports and committed fields do not exist.

- [ ] **Step 3: Implement seeded backfill**

Add:

```js
export function createSeededRandom(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6D2B79F5;
    let value = hash;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function backfillInheritance(members, singles, { seed = "xp-legacy-2026-07-13" } = {}) {
  const rng = createSeededRandom(seed);
  const ordered = members
    .filter((member) => !member.isActive && member.graduationDate)
    .sort((a, b) => a.graduationDate.localeCompare(b.graduationDate) || a.id.localeCompare(b.id));
  const initial = members.map((member) => ({ ...member, inheritanceSuccessorId: member.inheritanceSuccessorId || "", inheritancePending: false }));
  const shuffle = (items) => items
    .map((item) => ({ item, order: rng() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);
  const visit = (index, state) => {
    if (index >= ordered.length) return state;
    const source = state.find((member) => member.id === ordered[index].id);
    const required = getEligibilityAt(source, singles, source.graduationDate).eligible
      || Boolean(findInheritancePredecessor(source.id, state));
    if (!required || source.inheritanceSuccessorId) return visit(index + 1, state);
    const pools = getSuccessorPools(source, state, singles, source.graduationDate);
    const candidates = shuffle(pools.preferred.length ? pools.preferred : pools.fallback);
    for (const candidate of candidates) {
      const next = state.map((member) => member.id === source.id
        ? { ...member, inheritanceSuccessorId: candidate.id, inheritancePending: false }
        : member);
      const result = visit(index + 1, next);
      if (result) return result;
    }
    return null;
  };
  const complete = visit(0, initial);
  if (complete) return complete;
  return ordered.reduce((state, graduate) => {
    const source = state.find((member) => member.id === graduate.id);
    const required = getEligibilityAt(source, singles, source.graduationDate).eligible
      || Boolean(findInheritancePredecessor(source.id, state));
    if (!required || source.inheritanceSuccessorId) return state;
    const successor = pickInheritanceSuccessor(source, state, singles, rng);
    return state.map((member) => member.id === source.id
      ? { ...member, inheritanceSuccessorId: successor?.id || "", inheritancePending: !successor }
      : member);
  }, initial);
}
```

Use cloned member objects, never mutate the input array, and add `inheritanceSuccessorId: ""` to every member before processing.

- [ ] **Step 4: Add the reproducible CLI**

Create `scripts/backfill-member-inheritance.mjs` with `--check` and `--write` modes. It must import `backfillInheritance`, read `server/data/db.json`, clear existing inheritance fields, compute seed `xp-legacy-2026-07-13`, print every nonempty `前任 -> 继承人` line, and only rewrite JSON with two-space indentation plus trailing newline when `--write` is present.

- [ ] **Step 5: Generate and inspect the historical mapping**

Run: `node scripts/backfill-member-inheritance.mjs --check`

Expected: a stable mapping, no duplicate successor IDs, and no pending line when the current dataset has a legal candidate for every required graduate.

Run: `node scripts/backfill-member-inheritance.mjs --write`

Expected: all 69 members receive `inheritanceSuccessorId`; only required historical predecessors receive nonempty values.

- [ ] **Step 6: Verify data GREEN**

Run: `node --test src/lib/memberInheritance.test.js src/lib/memberInheritanceData.test.js`

Expected: all inheritance unit and database tests PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/lib/memberInheritance.js src/lib/memberInheritance.test.js src/lib/memberInheritanceData.test.js scripts/backfill-member-inheritance.mjs server/data/db.json
git commit -m "data: backfill member inheritance chains"
```

### Task 4: Member detail LEGACY section and lineage dialog

**Files:**
- Create: `src/lib/memberInheritanceSource.test.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write the failing source integration test**

Assert `App.jsx` imports `buildInheritanceChain` and `findInheritancePredecessor`, declares `LegacyLineageDialog`, renders the labels `Legacy`, `传承自`, `传承至`, and only creates the public section when predecessor or successor exists.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test src/lib/memberInheritanceSource.test.js`

Expected: FAIL because the import and UI do not exist.

- [ ] **Step 3: Implement the refined LEGACY UI**

In `MemberDetailContent`:

```jsx
const inheritancePredecessor = findInheritancePredecessor(member.id, data.members || []);
const inheritanceSuccessor = (data.members || []).find((item) => item.id === member.inheritanceSuccessorId) || null;
const inheritanceChain = buildInheritanceChain(member.id, data.members || []);
const [lineageOpen, setLineageOpen] = useState(false);
```

Between DETAILS and ELECTION render a section only when either adjacent member exists. Use existing `xp-detail-row` and gold/ink tokens, make each visible name a button, and open `LegacyLineageDialog` on click.

Implement `LegacyLineageDialog` with `ScrollDialogContent className="max-w-3xl"`. On mobile use a vertical rail with numbered nodes and downward connectors; at `md` use a wrapping horizontal sequence with slim arrow connectors. Highlight the current member using the existing warm gold `#b99438`, show each node's generation, and keep names readable without adding new fonts or an unrelated visual language.

- [ ] **Step 4: Verify source test and build**

Run: `node --test src/lib/memberInheritanceSource.test.js && npm run build`

Expected: source test PASS and Vite build exits 0.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/App.jsx src/lib/memberInheritanceSource.test.js
git commit -m "feat: show member inheritance lineages"
```

### Task 5: Admin correction and automatic graduation assignment

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/lib/memberInheritanceSource.test.js`

- [ ] **Step 1: Add failing tests for admin wiring**

Assert `normalizeMemberDraft` includes `inheritanceSuccessorId`, `saveMember` calls `applyGraduationInheritance`, invalid manual links call `validateInheritanceLink`, and the editor contains “传承自”, “传承至”, and “传承待定”.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test src/lib/memberInheritanceSource.test.js`

Expected: FAIL on admin integration assertions.

- [ ] **Step 3: Add draft normalization and editor controls**

Import `applyGraduationInheritance` and `validateInheritanceLink`. Add:

```js
inheritanceSuccessorId: member?.inheritanceSuccessorId || "",
inheritancePending: member?.inheritancePending === true,
```

to `normalizeMemberDraft`.

Add an admin “传承” panel. Show the derived predecessor read-only. Render a successor `<select>` with an empty option and all other members; show `传承待定` when pending. Changing the selector clears `inheritancePending`.

- [ ] **Step 4: Wire validation and one-time assignment into saveMember**

Before updating state, validate a nonempty manually selected successor against a member list where the edited member replaces its saved version. Alert the returned Chinese message and abort on error.

Inside `setData`, call:

```js
const previousMember = prev.members.find((item) => item.id === nextDraft.id) || null;
const assigned = applyGraduationInheritance({
  members: prev.members,
  singles: prev.singles,
  previousMember,
  nextMember: nextDraft,
});
return withRecomputedSelections({ ...prev, members: assigned.members });
```

For new active members, ensure the saved record still has `inheritanceSuccessorId: ""`. Do not invoke assignment on load, on single saves, or on ordinary member edits.

- [ ] **Step 5: Verify admin integration**

Run: `node --test src/lib/memberInheritanceSource.test.js src/lib/memberInheritance.test.js && npm run build`

Expected: all tests PASS and build exits 0.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/App.jsx src/lib/memberInheritanceSource.test.js
git commit -m "feat: assign inheritance on member graduation"
```

### Task 6: Full verification and responsive visual QA

**Files:**
- Verify only

- [ ] **Step 1: Run all frontend Node tests**

Run: `node --test src/lib/*.test.js`

Expected: zero failures.

- [ ] **Step 2: Run server tests**

Run: `node --test server/lib/*.test.js`

Expected: zero failures.

- [ ] **Step 3: Run lint and production build**

Run: `npm run lint`

Expected: zero new lint errors; any pre-existing baseline is recorded precisely.

Run: `npm run build`

Expected: Vite build succeeds with exit code 0.

- [ ] **Step 4: Validate data and diff hygiene**

Run: `node scripts/backfill-member-inheritance.mjs --check && git diff --check`

Expected: the printed fixed-seed mapping matches the committed data and there are no whitespace errors.

- [ ] **Step 5: Perform browser QA**

Start the existing backend and Vite dev server, then inspect a member with both adjacent links, a chain root, a chain tail, and a member without inheritance at 1440×1000 and 393×852. Verify conditional rows, full-chain order, current-member highlight, no mobile horizontal overflow, nested dialog close behavior, and no console errors.

- [ ] **Step 6: Review requirements against the specification**

Re-read `docs/superpowers/specs/2026-07-13-member-inheritance-design.md` and confirm every rule has a matching passing test or visual check. Record the exact generated chain mapping in the handoff summary.

## Verification summary

- Pure rules: `node --test src/lib/memberInheritance.test.js`
- Historical data: `node --test src/lib/memberInheritanceData.test.js`
- UI wiring: `node --test src/lib/memberInheritanceSource.test.js`
- Full regression: `node --test src/lib/*.test.js && node --test server/lib/*.test.js`
- Quality gates: `npm run lint && npm run build && git diff --check`
- Visual: desktop 1440×1000 and iPhone 393×852 member-detail and lineage-dialog checks.

**Next skill:** `$superpower-executing-plans` for inline execution in an isolated worktree.
