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

  const predecessor = findInheritancePredecessor(target.id, members);
  if (predecessor && predecessor.id !== source.id) {
    return "该成员已经继承其他人";
  }

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
