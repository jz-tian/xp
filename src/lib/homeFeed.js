const timeValue = (value) => {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
};

export function stampAdminEntity(entity, exists, nowIso = new Date().toISOString()) {
  const current = entity && typeof entity === "object" ? entity : {};
  return {
    ...current,
    createdAt: exists ? (current.createdAt || nowIso) : (current.createdAt || nowIso),
    updatedAt: nowIso,
  };
}

export function getAdminActivityDate(entity) {
  return entity?.updatedAt || entity?.createdAt || "";
}

export function pickLatestMemberForNews(members = []) {
  const candidates = Array.isArray(members) ? members.filter(Boolean) : [];
  if (!candidates.length) return null;

  return candidates
    .map((member, index) => ({ member, index }))
    .sort((a, b) => {
      const diff = timeValue(getAdminActivityDate(b.member)) - timeValue(getAdminActivityDate(a.member));
      return diff !== 0 ? diff : a.index - b.index;
    })[0].member;
}
