import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const db = JSON.parse(
  await readFile(new URL("../../server/data/db.json", import.meta.url), "utf8"),
);

const targetAverageYearByGeneration = new Map(
  Array.from({ length: 11 }, (_, index) => [index + 1, 1995 + index]),
);

const generationNumber = (member) => Number(String(member.generation).match(/\d+/)?.[0]);
const birthYear = (member) => Number(String(member.profile?.birthday).slice(0, 4));

test("member birthday years form a steady generation age gradient", () => {
  const membersByGeneration = Map.groupBy(db.members, generationNumber);

  assert.deepEqual(
    [...membersByGeneration.keys()].sort((a, b) => a - b),
    [...targetAverageYearByGeneration.keys()],
  );

  for (const [generation, targetYear] of targetAverageYearByGeneration) {
    const members = membersByGeneration.get(generation) ?? [];
    const years = members.map(birthYear);
    const average = years.reduce((sum, year) => sum + year, 0) / years.length;

    assert.equal(average, targetYear, `${generation}期 average`);
    for (const year of years) {
      assert.ok(
        Math.abs(year - targetYear) <= 1,
        `${generation}期 has ${year}, expected near ${targetYear}`,
      );
    }
  }
});
