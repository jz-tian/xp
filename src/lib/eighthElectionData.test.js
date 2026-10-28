import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { getElectionPhotoUrl } from "./electionPhotos.js";

// The supplied order after removing the five members absent from the database.
// Versions capture the official photos available when this edition was added.
const expectedByRank = [
  ["m_rjli97s6", 4],
  ["m_9gen_3", 3],
  ["m_7gen_2_4421", 4],
  ["m_9gen_6", 2],
  ["m_6gen_1_4821", 4],
  ["m_7gen_6_7205", 4],
  ["m_7j6tcyhr", 4],
  ["m_10gen_4", 2],
  ["m_9gen_4", 2],
  ["m_7gen_3_5910", 4],
  ["m_7gen_7_9921", 4],
  ["m_7gen_4_8843", 4],
  ["m_qingnian_1", 1],
  ["m_9gen_5", 2],
  ["m_bm7qiehk", 4],
  ["m_10gen_3", 2],
  ["m_12gen_3", 1],
  ["m_5gen_4_8493", 4],
  ["m_10gen_6", 2],
  ["m_10gen_5", 2],
  ["m_11gen_4", 1],
  ["m_11gen_3", 1],
  ["m_10gen_2", 2],
  ["m_11gen_2", 1],
  ["m_5gen_3_7488", 4],
  ["m_6gen_2_9374", 4],
];

const outsidePhotos = [
  ["m_12gen_1", 1],
  ["m_12gen_2", 1],
  ["m_12gen_4", 1],
  ["m_12gen_5", 1],
  ["m_11gen_1", 1],
  ["m_10gen_1", 2],
  ["m_9gen_1", 2],
  ["m_8gen_1_4186", 3],
];
const outsideIds = outsidePhotos.map(([id]) => id);

const db = JSON.parse(
  await readFile(new URL("../../server/data/db.json", import.meta.url), "utf8"),
);
const entryFor = (member, edition = "第8届") =>
  member.electionRanks?.find((entry) => entry.edition === edition);

test("the eighth election stores all 26 supplied existing members in continuous rank order", () => {
  const actual = db.members.flatMap((member) => {
    const entry = entryFor(member);
    const rank = entry?.rank.match(/^第(\d+)位$/);
    return rank ? [{ id: member.id, rank: Number(rank[1]) }] : [];
  }).sort((a, b) => a.rank - b.rank);

  assert.deepEqual(actual, expectedByRank.map(([id], index) => ({ id, rank: index + 1 })));
});

test("the eight omitted active members are outside and graduates receive no eighth-election entry", () => {
  const expectedIds = new Set([...expectedByRank.map(([id]) => id), ...outsideIds]);
  for (const member of db.members) {
    const entries = member.electionRanks?.filter((entry) => entry.edition === "第8届") ?? [];
    assert.equal(entries.length, expectedIds.has(member.id) ? 1 : 0, member.name);
    if (!member.isActive) assert.equal(entries.length, 0, member.name);
  }
  assert.deepEqual(
    db.members.filter((member) => entryFor(member)?.rank === "圈外").map((member) => member.id).sort(),
    [...outsideIds].sort(),
  );
});

test("eighth-election photos stay at the captured versions after future uploads and avatar changes", () => {
  for (const [id, version] of [...expectedByRank, ...outsidePhotos]) {
    const member = db.members.find((candidate) => candidate.id === id);
    const entry = entryFor(member);
    assert.equal(entry?.photoVersion, version, member.name);
    const photo = member.officialPhotos.find((candidate) => Number(candidate.version) === version);
    assert.ok(photo?.url, member.name);
    const futureMember = {
      ...member,
      avatar: "/future.webp",
      officialPhotos: [...member.officialPhotos, { version: 999, url: "/future.webp" }],
    };
    assert.equal(getElectionPhotoUrl(member, entry, 2), photo.url, member.name);
    assert.equal(getElectionPhotoUrl(futureMember, entry, 2), photo.url, member.name);
  }
});

test("the compressed order places Uji at the visible rank-21 boundary and Shinmaki at rank 22", () => {
  const visibleIds = db.members.filter((member) => {
    const rank = entryFor(member)?.rank.match(/^第(\d+)位$/);
    return rank && Number(rank[1]) < 22;
  }).map((member) => member.id);
  assert.equal(visibleIds.length, 21);
  assert.ok(visibleIds.includes("m_11gen_4"));
  assert.ok(!visibleIds.includes("m_11gen_3"));
});
