import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../App.jsx", import.meta.url), "utf8");

test("the election page declares the seventh-election subtitle", () => {
  assert.match(source, /"第7届":\s*"一途なる想い"/);
});

test("the election page resolves photos from the edition entry snapshot", () => {
  assert.match(
    source,
    /import\s+\{\s*getElectionPhotoUrl\s*\}\s+from\s+"\.\/lib\/electionPhotos\.js"/,
  );
  assert.match(source, /result\.push\(\{\s*member:\s*m,\s*entry,\s*rank:/);
  assert.match(
    source,
    /getElectionPhotoUrl\(member,\s*entry,\s*getEditionPhotoTier\(activeEdition\)\)/,
  );
});

test("all member-detail entry points use the same dialog width", () => {
  const matchingDialogs = source.match(
    /<ScrollDialogContent className="max-w-6xl">\s*<MemberDetailContent/g,
  );
  assert.equal(matchingDialogs?.length, 3);
});
