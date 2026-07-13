const CHINESE_DIGITS = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const selectionValue = (value) =>
  String(value && typeof value === "object" ? (value.value ?? value.label ?? "") : (value ?? ""));

const parseEditionNumber = (edition) => {
  const digits = String(edition ?? "").match(/\d+/);
  if (digits) return Number(digits[0]);
  return parseRankNumber(String(edition ?? "").replace(/[第届]/g, ""));
};

export function parseGeneration(member) {
  const digits = String(member?.generation ?? "").match(/\d+/);
  return digits ? Number(digits[0]) : Infinity;
}

export function parseRankNumber(raw) {
  const value = String(raw ?? "")
    .replace(/^第/, "")
    .replace(/位$/, "")
    .trim();

  if (!value || ["圈外", "加入前", "未参选"].includes(value)) return Infinity;
  if (/^\d+$/.test(value)) return Number(value);
  if (value === "十") return 10;

  const tenIndex = value.indexOf("十");
  if (tenIndex < 0) return CHINESE_DIGITS[value] ?? Infinity;

  const left = value.slice(0, tenIndex);
  const right = value.slice(tenIndex + 1);
  const tens = left ? CHINESE_DIGITS[left] : 1;
  const ones = right ? CHINESE_DIGITS[right] : 0;
  return Number.isFinite(tens) && Number.isFinite(ones)
    ? tens * 10 + ones
    : Infinity;
}

export function getSingleDate(single) {
  const raw = String(single?.release ?? single?.releaseDate ?? "").trim();
  const datePrefix = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (datePrefix) return datePrefix;
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : "";
}

export function getJoinDate(member, singles = []) {
  const singlesById = new Map(singles.map((single) => [single.id, single]));
  return Object.entries(member?.selectionHistory ?? {})
    .filter(([, value]) => !selectionValue(value).includes("加入前"))
    .map(([singleId]) => getSingleDate(singlesById.get(singleId)))
    .filter(Boolean)
    .sort()[0] ?? "";
}

export function getElectionDates(singles = []) {
  return new Map(
    singles
      .filter((single) => single?.singleKind === "总选单曲")
      .map(getSingleDate)
      .filter(Boolean)
      .sort()
      .map((date, index) => [index + 1, date]),
  );
}

export function getEligibilityAt(member, singles = [], atDate = "") {
  const electionDates = getElectionDates(singles);
  const ranks = (member?.electionRanks ?? [])
    .filter((entry) => {
      const resultDate = electionDates.get(parseEditionNumber(entry?.edition));
      return resultDate && resultDate <= atDate;
    })
    .map((entry) => parseRankNumber(entry?.rank));

  const singlesById = new Map(singles.map((single) => [single.id, single]));
  const selectionCount = Object.entries(member?.selectionHistory ?? {})
    .filter(([singleId, value]) => {
      const singleDate = getSingleDate(singlesById.get(singleId));
      return singleDate
        && singleDate <= atDate
        && selectionValue(value).includes("A面选拔");
    })
    .length;

  const topThreeCount = ranks.filter((rank) => rank <= 3).length;
  const topSevenCount = ranks.filter((rank) => rank <= 7).length;

  return {
    eligible: topThreeCount >= 1 || topSevenCount >= 2 || selectionCount >= 3,
    topThreeCount,
    topSevenCount,
    selectionCount,
  };
}

export function findInheritancePredecessor(memberId, members = []) {
  return members.find((member) => member?.inheritanceSuccessorId === memberId) ?? null;
}

export function buildInheritanceChain(memberId, members = []) {
  const membersById = new Map(members.map((member) => [member.id, member]));
  let root = membersById.get(memberId) ?? null;
  const reverseSeen = new Set();

  while (root && !reverseSeen.has(root.id)) {
    reverseSeen.add(root.id);
    const predecessor = findInheritancePredecessor(root.id, members);
    if (!predecessor || reverseSeen.has(predecessor.id)) break;
    root = predecessor;
  }

  const chain = [];
  const forwardSeen = new Set();
  let current = root;

  while (current && !forwardSeen.has(current.id)) {
    chain.push(current);
    forwardSeen.add(current.id);
    current = membersById.get(current.inheritanceSuccessorId) ?? null;
  }

  return chain;
}

const isActiveOn = (member, date) => {
  if (member?.isActive) return true;
  const graduationDate = String(member?.graduationDate ?? "").slice(0, 10);
  return Boolean(graduationDate && graduationDate > date);
};

export function validateInheritanceLink(sourceId, targetId, members = [], singles = []) {
  if (!targetId) return null;

  const source = members.find((member) => member?.id === sourceId);
  const target = members.find((member) => member?.id === targetId);
  if (!source || !target) return "传承成员不存在";
  if (source.id === target.id) return "成员不能继承自己";
  if (parseGeneration(target) <= parseGeneration(source)) {
    return "继承人的期数必须比前任更晚";
  }

  const sourceDate = String(source.graduationDate ?? "").slice(0, 10);
  if (!sourceDate) return "前任必须先填写毕业日期";

  const targetJoinDate = getJoinDate(target, singles);
  if (!targetJoinDate || targetJoinDate > sourceDate) {
    return "继承人在前任毕业时尚未入团";
  }
  if (!isActiveOn(target, sourceDate)) {
    return "继承人在前任毕业时已不在籍";
  }

  const conflictingPredecessor = members.find(
    (member) => member?.inheritanceSuccessorId === target.id && member.id !== source.id,
  );
  if (conflictingPredecessor) {
    return "该成员已经继承其他人";
  }

  const predecessor = findInheritancePredecessor(target.id, members);
  const targetChain = buildInheritanceChain(target.id, members);
  if (targetChain.some((member) => member.id === source.id && predecessor?.id !== source.id)) {
    return "该选择会形成传承循环";
  }

  return null;
}

export function getSuccessorPools(source, members = [], singles = [], atDate = source?.graduationDate ?? "") {
  const candidates = members.filter((candidate) => {
    if (!candidate?.id || candidate.id === source?.id) return false;
    if (parseGeneration(candidate) <= parseGeneration(source)) return false;

    const joinDate = getJoinDate(candidate, singles);
    if (!joinDate || joinDate > atDate) return false;
    if (!isActiveOn(candidate, atDate)) return false;
    if (findInheritancePredecessor(candidate.id, members)) return false;

    return validateInheritanceLink(source.id, candidate.id, members, singles) === null;
  });

  return {
    preferred: candidates.filter(
      (candidate) => !getEligibilityAt(candidate, singles, atDate).eligible,
    ),
    fallback: candidates.filter(
      (candidate) => getEligibilityAt(candidate, singles, atDate).eligible,
    ),
  };
}

export function validateInheritanceState(
  previousMember,
  nextMember,
  members = [],
  singles = [],
) {
  if (!nextMember) return "成员不存在";

  if (previousMember?.inheritanceSuccessorId && !nextMember.inheritanceSuccessorId) {
    return "已有传承关系不能清空，请直接选择新的继承人";
  }

  if (nextMember.inheritanceSuccessorId) {
    const linkError = validateInheritanceLink(
      nextMember.id,
      nextMember.inheritanceSuccessorId,
      members,
      singles,
    );
    if (linkError) return linkError;
  }

  const graduationDate = String(nextMember.graduationDate ?? "").slice(0, 10);
  if (nextMember.isActive || !graduationDate) return null;

  const inherited = Boolean(findInheritancePredecessor(nextMember.id, members));
  const required = inherited || getEligibilityAt(nextMember, singles, graduationDate).eligible;
  if (!required || nextMember.inheritanceSuccessorId) return null;

  const isGraduationTransition = previousMember?.isActive === true && nextMember.isActive === false;
  if (isGraduationTransition) return null;

  if (!nextMember.inheritancePending) {
    return "该成员必须保留继承人；没有合法候选时应保持传承待定";
  }

  const pools = getSuccessorPools(nextMember, members, singles, graduationDate);
  if (pools.preferred.length || pools.fallback.length) {
    return "仍有符合条件的继承人，不能保持传承待定";
  }

  return null;
}

export function getInheritanceDeletionError(memberId, members = []) {
  const member = members.find((candidate) => candidate?.id === memberId);
  if (!member) return null;
  if (member.inheritanceSuccessorId || findInheritancePredecessor(memberId, members)) {
    return "该成员位于传承路线中，请先在成员编辑器中处理相关传承关系";
  }
  return null;
}

export function pickInheritanceSuccessor(source, members = [], singles = [], rng = Math.random) {
  const { preferred, fallback } = getSuccessorPools(
    source,
    members,
    singles,
    source?.graduationDate ?? "",
  );
  const pool = preferred.length ? preferred : fallback;
  if (!pool.length) return null;

  const rawIndex = Math.floor(Number(rng()) * pool.length);
  const index = Math.max(0, Math.min(pool.length - 1, rawIndex));
  return pool[index];
}

export function applyGraduationInheritance({
  members = [],
  singles = [],
  previousMember,
  nextMember,
  rng = Math.random,
}) {
  let nextMembers = members.map((member) =>
    member.id === nextMember.id
      ? { ...nextMember, inheritanceSuccessorId: nextMember.inheritanceSuccessorId ?? "" }
      : { ...member },
  );

  if (!previousMember) {
    if (!nextMembers.some((member) => member.id === nextMember.id)) {
      nextMembers.push({
        ...nextMember,
        inheritanceSuccessorId: nextMember.inheritanceSuccessorId ?? "",
      });
    }
    return { members: nextMembers, successor: null };
  }

  const isGraduationTransition = previousMember.isActive === true && nextMember.isActive === false;
  if (!isGraduationTransition) return { members: nextMembers, successor: null };

  const source = nextMembers.find((member) => member.id === nextMember.id);
  const inherited = Boolean(findInheritancePredecessor(source.id, nextMembers));
  const required = inherited
    || getEligibilityAt(source, singles, String(source.graduationDate ?? "").slice(0, 10)).eligible;

  if (!required || source.inheritanceSuccessorId) {
    return { members: nextMembers, successor: null };
  }

  const successor = pickInheritanceSuccessor(source, nextMembers, singles, rng);
  const updatedSource = {
    ...source,
    inheritanceSuccessorId: successor?.id ?? "",
    inheritancePending: !successor,
  };
  nextMembers = nextMembers.map((member) =>
    member.id === updatedSource.id ? updatedSource : member,
  );

  return { members: nextMembers, successor };
}

const hashSeed = (seed) => {
  let hash = 2166136261;
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export function createSeededRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const seededCandidateOrder = (candidates, seed, sourceId) =>
  [...candidates].sort((left, right) => {
    const leftHash = hashSeed(`${seed}:${sourceId}:${left.id}`);
    const rightHash = hashSeed(`${seed}:${sourceId}:${right.id}`);
    return leftHash - rightHash || left.id.localeCompare(right.id);
  });

const requiresInheritance = (member, members, singles) =>
  getEligibilityAt(member, singles, member.graduationDate).eligible
  || Boolean(findInheritancePredecessor(member.id, members));

const assignEdge = (members, sourceId, successorId, pending = false) =>
  members.map((member) => {
    if (member.id !== sourceId) return member;
    const updated = {
      ...member,
      inheritanceSuccessorId: successorId,
    };
    if (pending) updated.inheritancePending = true;
    else delete updated.inheritancePending;
    return updated;
  });

export function backfillInheritance(
  members = [],
  singles = [],
  { seed = "xp-legacy-2026-07-13" } = {},
) {
  const initial = members.map((member) => {
    const copy = {
      ...member,
      inheritanceSuccessorId: member?.inheritanceSuccessorId || "",
    };
    if (copy.inheritancePending !== true) delete copy.inheritancePending;
    return copy;
  });
  const graduates = initial
    .filter((member) => !member.isActive && member.graduationDate)
    .sort((left, right) =>
      left.graduationDate.localeCompare(right.graduationDate)
      || left.id.localeCompare(right.id),
    );
  const unavoidablePendingIds = new Set(
    graduates
      .filter((graduate) => {
        const source = initial.find((member) => member.id === graduate.id);
        if (!requiresInheritance(source, initial, singles) || source.inheritanceSuccessorId) {
          return false;
        }
        const pools = getSuccessorPools(source, initial, singles, source.graduationDate);
        return !pools.preferred.length && !pools.fallback.length;
      })
      .map((graduate) => graduate.id),
  );
  const minimumPendingIds = new Set([
    ...unavoidablePendingIds,
    ...initial.filter((member) => member.inheritancePending).map((member) => member.id),
  ]);
  const minimumPendingCount = minimumPendingIds.size;
  const countPending = (state) => state.filter((member) => member.inheritancePending).length;

  const search = (graduateIndex, state) => {
    if (graduateIndex >= graduates.length) {
      return { state, pendingCount: countPending(state) };
    }

    const sourceId = graduates[graduateIndex].id;
    const source = state.find((member) => member.id === sourceId);
    if (!requiresInheritance(source, state, singles) || source.inheritanceSuccessorId) {
      return search(graduateIndex + 1, state);
    }

    const pools = getSuccessorPools(source, state, singles, source.graduationDate);
    const activePool = pools.preferred.length ? pools.preferred : pools.fallback;
    const candidates = seededCandidateOrder(activePool, seed, source.id);
    if (!candidates.length) {
      return search(
        graduateIndex + 1,
        assignEdge(state, source.id, "", true),
      );
    }

    let best = null;
    for (const candidate of candidates) {
      const nextState = assignEdge(state, source.id, candidate.id);
      const result = search(graduateIndex + 1, nextState);
      if (!best || result.pendingCount < best.pendingCount) best = result;
      if (best.pendingCount === minimumPendingCount) break;
    }
    return best;
  };

  const complete = search(0, initial);
  return complete?.state ?? initial;
}
