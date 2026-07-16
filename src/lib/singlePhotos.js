function parseSingleNumber(single) {
  const text = typeof single?.title === "string" ? single.title : "";
  const match = text.match(/\b(\d+)(?:st|nd|rd|th)?\s*Single\b/i) ?? text.match(/\d+/);
  const value = Number(match?.[1] ?? match?.[0]);
  return Number.isFinite(value) ? value : 0;
}

function parseGenerationNumber(member) {
  const value = Number(String(member?.generation ?? "").match(/\d+/)?.[0]);
  return Number.isFinite(value) ? value : 0;
}

function getPhotoVersion(photo, index) {
  const version = Number(photo?.version);
  return Number.isFinite(version) && version > 0 ? version : index + 1;
}

function getLatestPhoto(photos) {
  return photos.reduce((latest, photo, index) => {
    if (!photo?.url) return latest;
    if (!latest) return { photo, version: getPhotoVersion(photo, index), index };

    const version = getPhotoVersion(photo, index);
    if (version > latest.version || (version === latest.version && index > latest.index)) {
      return { photo, version, index };
    }
    return latest;
  }, null)?.photo;
}

function getFixedVersionPhoto(photos, targetVersion) {
  const candidates = photos
    .map((photo, index) => ({ photo, version: getPhotoVersion(photo, index), index }))
    .filter(({ photo }) => Boolean(photo?.url));

  const exact = candidates.find(({ version }) => version === targetVersion);
  if (exact) return exact.photo;

  const fallback = candidates
    .filter(({ version }) => version <= targetVersion)
    .sort((a, b) => b.version - a.version || b.index - a.index)[0];
  return fallback?.photo ?? candidates[0]?.photo;
}

export function getSinglePhotoVersionTarget(single, member) {
  const singleNumber = parseSingleNumber(single);
  if (singleNumber >= 50) return "latest";

  const generationNumber = parseGenerationNumber(member);
  if (singleNumber >= 37) {
    if (generationNumber >= 9) return 1;
    if (generationNumber >= 8) return 2;
    return 3;
  }

  if (singleNumber >= 27) {
    if (generationNumber >= 8) return 1;
    return 2;
  }

  return 1;
}

export function getSingleOfficialPhotoUrl(member, single) {
  const photos = Array.isArray(member?.officialPhotos) ? member.officialPhotos : [];
  if (photos.length === 0) return member?.avatar ?? "";

  const target = getSinglePhotoVersionTarget(single, member);
  const photo = target === "latest"
    ? getLatestPhoto(photos)
    : getFixedVersionPhoto(photos, target);
  return photo?.url ?? member?.avatar ?? "";
}
