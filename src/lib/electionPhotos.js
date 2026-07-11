export function getElectionPhotoUrl(member, electionEntry, fallbackTier = 0) {
  const photos = Array.isArray(member?.officialPhotos) ? member.officialPhotos : [];
  const lockedVersion = Number(electionEntry?.photoVersion);

  if (Number.isFinite(lockedVersion)) {
    const lockedPhoto = photos.find(
      (photo) => Number(photo?.version) === lockedVersion,
    );
    if (lockedPhoto?.url) return lockedPhoto.url;
  }

  if (photos.length === 0) return member?.avatar ?? "";
  if (fallbackTier >= 2 && photos.length >= 2) return photos[photos.length - 1].url;
  if (fallbackTier >= 1 && photos.length >= 2) return photos[1].url;
  return photos[0].url;
}
