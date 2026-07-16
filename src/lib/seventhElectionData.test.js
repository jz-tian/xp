import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const expectedMemberIdsByRank = [
  "m_7gen_2_4421",
  "m_5gen_7_2141",
  "m_9gen_3",
  "m_rjli97s6",
  "m_hina",
  "m_6gen_1_4821",
  "m_7gen_6_7205",
  "m_7j6tcyhr",
  "m_9gen_4",
  "m_7gen_3_5910",
  "m_blncyp2k",
  "m_10gen_4",
  "m_7gen_7_9921",
  "m_bm7qiehk",
  "m_5gen_4_8493",
  "m_7gen_4_8843",
  "m_9gen_5",
  "m_8gen_1_4186",
  "m_10gen_6",
  "m_6gen_3_1550",
  "m_9gen_1",
  "m_9gen_2",
  "m_10gen_3",
  "m_6gen_2_9374",
  "m_10gen_2",
  "m_10gen_5",
  "m_9gen_6",
  "m_10gen_1",
  "m_5gen_3_7488",
];

const db = JSON.parse(
  await readFile(new URL("../../server/data/db.json", import.meta.url), "utf8"),
);

const seventhEntry = (member) =>
  member.electionRanks?.filter((entry) => entry.edition === "第7届") ?? [];

test("the seventh election includes exactly the 29 active members", () => {
  const activeMembers = db.members.filter((member) => member.isActive);
  assert.equal(activeMembers.length, 29);
  assert.deepEqual(
    new Set(activeMembers.map((member) => member.id)),
    new Set(expectedMemberIdsByRank),
  );

  for (const member of activeMembers) assert.equal(seventhEntry(member).length, 1, member.name);
  for (const member of db.members.filter((member) => !member.isActive)) {
    assert.equal(seventhEntry(member).length, 0, member.name);
  }
});

test("the seventh election ranks match the supplied order without gaps", () => {
  const actualIdsByRank = db.members
    .flatMap((member) =>
      seventhEntry(member).map((entry) => ({
        id: member.id,
        rank: Number(String(entry.rank).match(/\d+/)?.[0]),
      })),
    )
    .sort((a, b) => a.rank - b.rank)
    .map(({ id }) => id);

  assert.deepEqual(actualIdsByRank, expectedMemberIdsByRank);
});

test("every seventh-election entry locks the member's current latest photo version", () => {
  for (const member of db.members.filter((candidate) => candidate.isActive)) {
    const [entry] = seventhEntry(member);
    const latestVersion = Math.max(
      ...member.officialPhotos.map((photo) => Number(photo.version)),
    );
    assert.equal(entry.photoVersion, latestVersion, member.name);
  }
});

test("the fourth-edition-onward boundary keeps ranks 1-21 in the election page", () => {
  const visibleRanks = expectedMemberIdsByRank.map((_, index) => index + 1).filter((rank) => rank < 22);
  assert.deepEqual(visibleRanks, Array.from({ length: 21 }, (_, index) => index + 1));
});
