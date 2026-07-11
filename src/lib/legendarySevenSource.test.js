import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../App.jsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../index.css", import.meta.url), "utf8");

test("the homepage renders a rank-aware Legendary Seven section", () => {
  assert.match(appSource, /title="LEGENDARY SEVEN"/);
  assert.doesNotMatch(appSource, /title="NEW GENERATION"/);
  assert.match(appSource, /getLegendarySeven\(members \|\| \[\]\)/);
  assert.match(appSource, /xp-legendary-rank-\$\{rank\}/);
  assert.match(appSource, /<Crown\b/);
  assert.match(appSource, /member\.name/);
  assert.match(appSource, /member\.romaji/);
});

test("the podium stays compact and omits corner brackets", () => {
  assert.match(appSource, /max-w-7xl[^>]*overflow-hidden[^>]*>\s*<HomeSectionTitle/);
  assert.doesNotMatch(appSource, /xp-legendary-corner/);
  assert.doesNotMatch(cssSource, /\.xp-legendary-corner/);
});

test("clicking a Legendary Seven card opens the member detail dialog in place", () => {
  assert.match(appSource, /setSelectedLegendaryMember\(member\)/);
  assert.match(appSource, /open=\{!!selectedLegendaryMember\}/);
  assert.match(appSource, /<MemberDetailContent member=\{selectedLegendaryMember\} data=\{data\}/);
  assert.doesNotMatch(appSource, /xp-legendary-card[\s\S]{0,400}onClick=\{\(\) => onGo\("members"\)\}/);
});

test("the Legendary Seven CSS defines mobile and desktop podium order", () => {
  assert.match(cssSource, /grid-template-areas:\s*"\. one one \."\s*"two two three three"\s*"four five six seven"/);
  assert.match(cssSource, /grid-template-areas:\s*"six four two one three five seven"/);
  assert.match(cssSource, /\.xp-legendary-rank-1\s+\.xp-legendary-frame/);
  assert.match(cssSource, /\.xp-legendary-rank-2\s+\.xp-legendary-frame/);
  assert.match(cssSource, /\.xp-legendary-rank-3\s+\.xp-legendary-frame/);
});
