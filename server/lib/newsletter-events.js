const asArray = (value) => Array.isArray(value) ? value : [];

const hasGraduated = (member) => {
  return member?.isActive === false && Boolean(String(member?.graduationDate || "").trim());
};

export function detectNewsletterEvents(previousDb = {}, nextDb = {}) {
  const previousSingles = new Set(asArray(previousDb.singles).map((single) => single?.id).filter(Boolean));
  const previousMembersById = new Map(
    asArray(previousDb.members)
      .filter((member) => member?.id)
      .map((member) => [member.id, member])
  );

  const singleEvents = asArray(nextDb.singles)
    .filter((single) => single?.id && !previousSingles.has(single.id))
    .map((single) => ({ type: "single-release", id: single.id }));

  const graduationEvents = asArray(nextDb.members)
    .filter((member) => {
      if (!member?.id || !hasGraduated(member)) return false;
      return !hasGraduated(previousMembersById.get(member.id));
    })
    .map((member) => ({ type: "member-graduation", id: member.id }));

  return [...singleEvents, ...graduationEvents];
}
