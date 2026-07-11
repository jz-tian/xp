import test from "node:test";
import assert from "node:assert/strict";

import { getLegendarySeven } from "./legendarySeven.js";

const member = (id, electionRanks, options = {}) => ({
  id,
  name: `Member ${id}`,
  romaji: `MEMBER ${id}`,
  avatar: options.avatar ?? `/current-${id}.webp`,
  officialPhotos: options.officialPhotos ?? [],
  electionRanks,
});

test("returns ranks 1-7 from the numerically latest election", () => {
  const members = [
    member("third", [{ edition: "第7届", rank: "第3位" }]),
    member("first", [{ edition: "第6届", rank: "第1位" }, { edition: "第7届", rank: "第1位" }]),
    member("outside", [{ edition: "第7届", rank: "第22位" }]),
    member("second", [{ edition: "第7届", rank: "第2位" }]),
    member("invalid", [{ edition: "第7届", rank: "圈外" }]),
  ];

  const result = getLegendarySeven(members);

  assert.equal(result.edition, "第7届");
  assert.deepEqual(result.members.map(({ member: item, rank }) => [item.id, rank]), [
    ["first", 1],
    ["second", 2],
    ["third", 3],
  ]);
});

test("automatically switches to a newly added later election", () => {
  const result = getLegendarySeven([
    member("old-winner", [{ edition: "第7届", rank: "第1位" }]),
    member("new-winner", [{ edition: "第8届", rank: "第1位" }]),
    member("new-runner-up", [{ edition: "第8届", rank: "第2位" }]),
  ]);

  assert.equal(result.edition, "第8届");
  assert.deepEqual(result.members.map(({ member: item }) => item.id), ["new-winner", "new-runner-up"]);
});

test("uses the member's current avatar instead of the election photo snapshot", () => {
  const result = getLegendarySeven([
    member("winner", [{ edition: "第7届", rank: "第1位", photoVersion: 1 }], {
      avatar: "/latest.webp",
      officialPhotos: [
        { version: 1, url: "/historical.webp" },
        { version: 2, url: "/latest.webp" },
      ],
    }),
  ]);

  assert.equal(result.members[0].photoUrl, "/latest.webp");
});

test("falls back to the highest official photo version when avatar is empty", () => {
  const result = getLegendarySeven([
    member("winner", [{ edition: "第7届", rank: "第1位" }], {
      avatar: "",
      officialPhotos: [
        { version: 3, url: "/v3.webp" },
        { version: 1, url: "/v1.webp" },
      ],
    }),
  ]);

  assert.equal(result.members[0].photoUrl, "/v3.webp");
});

test("returns an empty result when there is no election data", () => {
  assert.deepEqual(getLegendarySeven([member("none", [])]), { edition: "", members: [] });
});
