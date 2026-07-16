import test from "node:test";
import assert from "node:assert/strict";

import {
  getSingleOfficialPhotoUrl,
  getSinglePhotoVersionTarget,
} from "./singlePhotos.js";

const member = (generation, photos) => ({
  generation,
  avatar: "/avatar.webp",
  officialPhotos: photos.map((version) => ({
    version,
    url: `/v${version}.webp`,
  })),
});

test("locks 37th through 49th singles to the current fixed official-photo generation", () => {
  const single = { title: "49th Single - Subconscious" };

  assert.equal(getSinglePhotoVersionTarget(single, member("1期", [1, 2, 3, 4])), 3);
  assert.equal(getSingleOfficialPhotoUrl(member("1期", [1, 2, 3, 4]), single), "/v3.webp");

  assert.equal(getSinglePhotoVersionTarget(single, member("8期", [1, 2, 3])), 2);
  assert.equal(getSingleOfficialPhotoUrl(member("8期", [1, 2, 3]), single), "/v2.webp");

  assert.equal(getSinglePhotoVersionTarget(single, member("9期", [1, 2])), 1);
  assert.equal(getSingleOfficialPhotoUrl(member("9期", [1, 2]), single), "/v1.webp");
});

test("uses the latest official photo from the 50th single onward", () => {
  const single = { title: "50th Single" };

  assert.equal(getSinglePhotoVersionTarget(single, member("1期", [1, 2, 3, 4])), "latest");
  assert.equal(getSingleOfficialPhotoUrl(member("1期", [1, 2, 3, 4]), single), "/v4.webp");
});

test("keeps the existing pre-37th single tiers", () => {
  assert.equal(getSingleOfficialPhotoUrl(member("1期", [1, 2, 3]), { title: "36th Single" }), "/v2.webp");
  assert.equal(getSingleOfficialPhotoUrl(member("8期", [1, 2, 3]), { title: "36th Single" }), "/v1.webp");
  assert.equal(getSingleOfficialPhotoUrl(member("1期", [1, 2, 3]), { title: "26th Single" }), "/v1.webp");
});

test("falls back gracefully when the fixed version is unavailable", () => {
  assert.equal(getSingleOfficialPhotoUrl(member("1期", [1, 2]), { title: "49th Single" }), "/v2.webp");
  assert.equal(getSingleOfficialPhotoUrl(member("8期", [1]), { title: "49th Single" }), "/v1.webp");
  assert.equal(getSingleOfficialPhotoUrl({ avatar: "/avatar.webp", officialPhotos: [] }, { title: "49th Single" }), "/avatar.webp");
});
