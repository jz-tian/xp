import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../App.jsx", import.meta.url), "utf8");

test("member details import inheritance graph helpers", () => {
  assert.match(
    source,
    /import\s+\{[^}]*buildInheritanceChain[^}]*findInheritancePredecessor[^}]*\}\s+from\s+"\.\/lib\/memberInheritance\.js"/s,
  );
});

test("member details render adjacent legacy links only when they exist", () => {
  assert.match(source, /function LegacyLineageDialog\s*\(/);
  assert.match(source, /inheritancePredecessor\s*\|\|\s*inheritanceSuccessor/);
  assert.match(source, />Legacy\s*\/\s*传承</);
  assert.match(source, />传承自</);
  assert.match(source, />传承至</);
});

test("the lineage dialog includes responsive vertical and horizontal layouts", () => {
  assert.match(source, /传承谱系/);
  assert.match(source, /flex-col[^"\n]*md:flex-row/);
  assert.match(source, /currentMemberId/);
});

test("member drafts preserve inheritance state for admin editing", () => {
  assert.match(
    source,
    /inheritanceSuccessorId:\s*member\?\.inheritanceSuccessorId\s*\|\|\s*""/,
  );
  assert.match(
    source,
    /inheritancePending:\s*member\?\.inheritancePending\s*===\s*true/,
  );
});

test("member save validates manual links and assigns once on graduation", () => {
  assert.match(source, /validateInheritanceLink\s*\(/);
  assert.match(source, /applyGraduationInheritance\s*\(\s*\{/);
  assert.match(source, /previousMember/);
  assert.match(source, /nextMember:\s*nextDraft/);
});

test("the admin editor exposes predecessor, successor, and pending state", () => {
  assert.match(source, /成员传承/);
  assert.match(source, /传承自（只读）/);
  assert.match(source, /传承至/);
  assert.match(source, /传承待定/);
});
