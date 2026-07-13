import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  backfillInheritance,
  buildInheritanceChain,
  findInheritancePredecessor,
  getEligibilityAt,
  validateInheritanceLink,
} from "./memberInheritance.js";

const db = JSON.parse(fs.readFileSync(new URL("../../server/data/db.json", import.meta.url), "utf8"));
const SEED = "xp-legacy-2026-07-13";

const clearInheritance = (members) => members.map((member) => {
  const copy = { ...member };
  delete copy.inheritanceSuccessorId;
  delete copy.inheritancePending;
  return copy;
});

const projectInheritance = (members) => members.map((member) => ({
  id: member.id,
  inheritanceSuccessorId: member.inheritanceSuccessorId,
  inheritancePending: member.inheritancePending === true,
}));

test("all members have stable inheritance fields matching the seeded backfill", () => {
  const expected = backfillInheritance(clearInheritance(db.members), db.singles, { seed: SEED });

  assert.deepEqual(projectInheritance(db.members), projectInheritance(expected));
  assert.equal(
    db.members.every((member) => Object.hasOwn(member, "inheritanceSuccessorId")),
    true,
  );
});

test("the committed inheritance graph is unique, acyclic, and historically valid", () => {
  const successorIds = db.members
    .map((member) => member.inheritanceSuccessorId)
    .filter(Boolean);
  assert.equal(new Set(successorIds).size, successorIds.length);

  for (const member of db.members) {
    if (member.inheritanceSuccessorId) {
      assert.equal(
        validateInheritanceLink(
          member.id,
          member.inheritanceSuccessorId,
          db.members,
          db.singles,
        ),
        null,
        member.name,
      );
    }
    const chain = buildInheritanceChain(member.id, db.members);
    assert.equal(new Set(chain.map((candidate) => candidate.id)).size, chain.length, member.name);
  }
});

test("every eligible or inherited graduate has a successor or explicit pending marker", () => {
  for (const member of db.members.filter(
    (candidate) => !candidate.isActive && candidate.graduationDate,
  )) {
    const required = getEligibilityAt(member, db.singles, member.graduationDate).eligible
      || Boolean(findInheritancePredecessor(member.id, db.members));
    if (required) {
      assert.ok(
        member.inheritanceSuccessorId || member.inheritancePending,
        member.name,
      );
    }
  }
});
