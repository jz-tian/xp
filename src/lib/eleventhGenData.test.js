import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const db = JSON.parse(
  await readFile(new URL("../../server/data/db.json", import.meta.url), "utf8"),
);
const source = await readFile(new URL("../App.jsx", import.meta.url), "utf8");

const expectedIds = [
  "m_11gen_1",
  "m_11gen_2",
  "m_11gen_3",
  "m_11gen_4",
];
const expectedNames = ["大堀 日奈子", "水野 絵里奈", "新槙 未来", "宇治 聖"];
const singleIds = db.singles.map((single) => single.id);
const trackTitles = new Set(db.singles.flatMap((single) => single.tracks.map((track) => track.title)));
const priorGenerationIds = new Set(
  db.members
    .filter((member) => {
      const generation = Number(String(member.generation).match(/\d+/)?.[0]);
      return generation >= 1 && generation <= 10;
    })
    .map((member) => member.id),
);

test("eleventh generation members are present at the front with generated profile data", () => {
  const eleventhGen = db.members.filter((member) => member.generation === "11期");

  assert.deepEqual(db.members.slice(0, 4).map((member) => member.id), expectedIds);
  assert.deepEqual(eleventhGen.map((member) => member.id), expectedIds);
  assert.deepEqual(eleventhGen.map((member) => member.name), expectedNames);

  for (const member of eleventhGen) {
    assert.equal(member.isActive, true, member.name);
    assert.equal(typeof member.avatar, "string", member.name);
    assert.ok(Array.isArray(member.officialPhotos), member.name);
    assert.match(member.romaji, /^[A-Z ]+$/, member.name);
    assert.ok(Number(member.favoritePokemon) >= 1 && Number(member.favoritePokemon) <= 151, member.name);
    assert.equal(member.favoriteSong, member.favoriteSongs[0], member.name);
    assert.equal(member.favoriteSongs.length, 3, member.name);
    for (const title of member.favoriteSongs) assert.ok(trackTitles.has(title), `${member.name}: ${title}`);
    assert.deepEqual(Object.keys(member.selectionHistory), singleIds, member.name);
    assert.deepEqual(
      Object.values(member.selectionHistory),
      Array.from({ length: singleIds.length }, () => "加入前"),
      member.name,
    );
    assert.ok(member.admireSenior.length >= 1 && member.admireSenior.length <= 3, member.name);
    assert.ok(member.friends.length >= 1 && member.friends.length <= 3, member.name);
    for (const id of member.admireSenior) assert.ok(priorGenerationIds.has(id), `${member.name}: ${id}`);
  }
});

test("eleventh generation badges use the requested gray theme with black text", () => {
  assert.match(
    source,
    /"11":\s*\{\s*backgroundColor:\s*"#E7E6E6",\s*color:\s*"#000000",\s*borderColor:\s*"#E7E6E6"/,
  );
});
