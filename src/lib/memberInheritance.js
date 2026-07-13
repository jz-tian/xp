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
