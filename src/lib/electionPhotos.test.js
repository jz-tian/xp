import test from "node:test";
import assert from "node:assert/strict";

import { getElectionPhotoUrl } from "./electionPhotos.js";

const member = {
  avatar: "/avatar.webp",
  officialPhotos: [
    { version: 1, url: "/v1.webp" },
    { version: 2, url: "/v2.webp" },
    { version: 3, url: "/v3.webp" },
  ],
};

test("locks an election photo to the recorded version", () => {
  assert.equal(getElectionPhotoUrl(member, { photoVersion: 2 }, 2), "/v2.webp");

  const withFuturePhoto = {
    ...member,
    officialPhotos: [...member.officialPhotos, { version: 4, url: "/v4.webp" }],
  };
  assert.equal(getElectionPhotoUrl(withFuturePhoto, { photoVersion: 2 }, 2), "/v2.webp");
});

test("supports numeric photo versions stored as strings", () => {
  assert.equal(getElectionPhotoUrl(member, { photoVersion: "3" }, 0), "/v3.webp");
});

test("falls back to the legacy tier when the locked version is unavailable", () => {
  assert.equal(getElectionPhotoUrl(member, { photoVersion: 99 }, 1), "/v2.webp");
  assert.equal(getElectionPhotoUrl(member, {}, 2), "/v3.webp");
});

test("falls back to avatar when no official photos exist", () => {
  assert.equal(
    getElectionPhotoUrl({ avatar: "/avatar.webp", officialPhotos: [] }, { photoVersion: 1 }, 2),
    "/avatar.webp",
  );
});
