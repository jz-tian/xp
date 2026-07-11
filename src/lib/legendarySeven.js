const numberIn = (value) => {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : NaN;
};

const currentPhotoUrl = (member) => {
  if (member?.avatar) return member.avatar;
  const photos = Array.isArray(member?.officialPhotos) ? member.officialPhotos : [];
  return [...photos]
    .sort((a, b) => Number(b?.version) - Number(a?.version))
    .find((photo) => photo?.url)?.url ?? "";
};

export function getLegendarySeven(members = []) {
  const editions = (Array.isArray(members) ? members : []).flatMap((member) =>
    (Array.isArray(member?.electionRanks) ? member.electionRanks : [])
      .map((entry) => ({ edition: entry?.edition, number: numberIn(entry?.edition) }))
      .filter(({ edition, number }) => edition && Number.isFinite(number)),
  );
  const latest = editions.sort((a, b) => b.number - a.number)[0];
  if (!latest) return { edition: "", members: [] };

  const rankedMembers = members
    .flatMap((member) => {
      const entry = member?.electionRanks?.find((item) => item?.edition === latest.edition);
      const rank = numberIn(entry?.rank);
      if (!Number.isFinite(rank) || rank < 1 || rank > 7) return [];
      return [{ member, rank, photoUrl: currentPhotoUrl(member) }];
    })
    .sort((a, b) => a.rank - b.rank);

  return { edition: latest.edition, members: rankedMembers };
}
