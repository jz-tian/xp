const splitSingleTitle = (fullTitle) => {
  const t = (fullTitle ?? "").toString().trim();
  if (!t) return { prefix: "", name: "" };
  const parts = t.split("·").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return { prefix: "", name: t };
  return { prefix: parts[0], name: parts.slice(1).join(" · ") };
};

const parseSingleNumber = (single) => {
  const prefix = splitSingleTitle(single?.title ?? "").prefix;
  const m = prefix.match(/\d+/);
  return m ? Number(m[0]) : Infinity;
};

const compareSinglesByRelease = (a, b) => {
  const ta = Date.parse(a?.release || a?.releaseDate || "");
  const tb = Date.parse(b?.release || b?.releaseDate || "");
  const aHasDate = Number.isFinite(ta);
  const bHasDate = Number.isFinite(tb);

  if (!aHasDate && !bHasDate) {
    return parseSingleNumber(a) - parseSingleNumber(b);
  }
  if (!aHasDate) return 1;
  if (!bHasDate) return -1;
  if (ta !== tb) return ta - tb;

  const numDiff = parseSingleNumber(a) - parseSingleNumber(b);
  if (numDiff !== 0) return numDiff;
  return String(a?.title || "").localeCompare(String(b?.title || ""));
};

export function getSingleCenterMemberIds(single) {
  const slots = Array.isArray(single?.asideLineup?.slots) ? single.asideLineup.slots : [];
  const slotRoles = single?.asideLineup?.slotRoles || {};
  const seen = new Set();
  const centers = [];

  slots.forEach((memberId, slotIndex) => {
    if (!memberId || slotRoles?.[slotIndex] !== "center" || seen.has(memberId)) return;
    seen.add(memberId);
    centers.push(memberId);
  });

  return centers;
}

export function buildCumulativeCenterCountsBySingle(singles = []) {
  const withIndex = (Array.isArray(singles) ? singles : []).map((single, index) => ({ single, index }));
  const ordered = [...withIndex].sort((a, b) => {
    const diff = compareSinglesByRelease(a.single, b.single);
    return diff !== 0 ? diff : a.index - b.index;
  });
  const counts = new Map();
  const bySingleId = new Map();

  for (const { single } of ordered) {
    for (const memberId of getSingleCenterMemberIds(single)) {
      counts.set(memberId, (counts.get(memberId) || 0) + 1);
    }
    if (single?.id) bySingleId.set(single.id, new Map(counts));
  }

  return bySingleId;
}

export function buildMemberCenterWeightBreakdown(memberId, singles = []) {
  const targetId = String(memberId || "").trim();
  if (!targetId) return [];

  const byCenterSize = new Map();

  for (const single of Array.isArray(singles) ? singles : []) {
    const centerIds = getSingleCenterMemberIds(single);
    const centerSize = centerIds.length;
    if (!centerSize || !centerIds.includes(targetId)) continue;

    const current = byCenterSize.get(centerSize) || {
      weight: 1 / centerSize,
      count: 0,
      centerSize,
    };
    current.count += 1;
    byCenterSize.set(centerSize, current);
  }

  return [...byCenterSize.values()].sort((a, b) => b.weight - a.weight);
}

const getMemberName = (membersById, memberId) => {
  if (membersById instanceof Map) return membersById.get(memberId)?.name || memberId;
  return membersById?.[memberId]?.name || memberId;
};

export function formatSingleCenterSummary(single, singles = [], membersById = new Map()) {
  const centerIds = getSingleCenterMemberIds(single);
  if (!centerIds.length) return "—";

  const sourceSingles = Array.isArray(singles) && singles.some((item) => item?.id === single?.id)
    ? singles
    : [...(Array.isArray(singles) ? singles : []), single].filter(Boolean);
  const counts = buildCumulativeCenterCountsBySingle(sourceSingles).get(single?.id) || new Map();

  return centerIds
    .map((memberId) => {
      const count = counts.get(memberId) || 1;
      return `${getMemberName(membersById, memberId)}(${count === 1 ? "初" : count})`;
    })
    .join("、");
}
