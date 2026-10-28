import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { getElectionPhotoUrl } from "./electionPhotos.js";

// Member ID, corrected sixth-edition version (null = no ranked entry),
// corrected seventh-edition version. These are fixed historical snapshots.
const expectedVersions = [
  ["m_10gen_1", null, 2],
  ["m_10gen_2", null, 2],
  ["m_10gen_3", null, 2],
  ["m_10gen_4", null, 2],
  ["m_10gen_5", null, 2],
  ["m_10gen_6", null, 2],
  ["m_9gen_1", 1, 2],
  ["m_9gen_2", 1, 2],
  ["m_9gen_3", 1, 3],
  ["m_9gen_4", 1, 2],
  ["m_9gen_5", 1, 2],
  ["m_9gen_6", 1, 2],
  ["m_8gen_1_4186", 2, 3],
  ["m_7gen_2_4421", 3, 4],
  ["m_7gen_3_5910", 3, 4],
  ["m_7gen_4_8843", 3, 4],
  ["m_7gen_6_7205", 3, 4],
  ["m_7gen_7_9921", 3, 4],
  ["m_6gen_1_4821", 3, 4],
  ["m_6gen_2_9374", 3, 4],
  ["m_6gen_3_1550", 3, 4],
  ["m_5gen_3_7488", 3, 4],
  ["m_5gen_4_8493", 3, 4],
  ["m_5gen_7_2141", 3, 4],
  ["m_rjli97s6", 3, 4],
  ["m_blncyp2k", 3, 4],
  ["m_bm7qiehk", null, 4],
  ["m_7j6tcyhr", 3, 4],
  ["m_hina", 3, 4],
];

const db = JSON.parse(
  await readFile(new URL("../../server/data/db.json", import.meta.url), "utf8"),
);

test("sixth- and seventh-election photos use the exchanged fixed versions", () => {
  for (const [id, sixthVersion, seventhVersion] of expectedVersions) {
    const member = db.members.find((candidate) => candidate.id === id);
    for (const [edition, version] of [["第6届", sixthVersion], ["第7届", seventhVersion]]) {
      if (version === null) continue;
      const entry = member.electionRanks.find((candidate) => candidate.edition === edition);
      assert.equal(entry.photoVersion, version, `${member.name} ${edition}`);
      const photo = member.officialPhotos.find((candidate) => Number(candidate.version) === version);
      assert.ok(photo?.url, `${member.name} ${edition}`);
      assert.equal(getElectionPhotoUrl(member, entry, 2), photo.url);
      assert.equal(getElectionPhotoUrl({
        ...member,
        officialPhotos: [...member.officialPhotos, { version: 999, url: "/future.webp" }],
      }, entry, 2), photo.url);
    }
  }
});
