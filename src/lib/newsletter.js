import { formatSingleCenterSummary } from "./centerStats.js";

export const splitSingleTitleForNewsletter = (fullTitle) => {
  const t = (fullTitle ?? "").toString().trim();
  if (!t) return { prefix: "", name: "" };
  const parts = t.split("·").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return { prefix: "", name: t };
  return { prefix: parts[0], name: parts.slice(1).join(" · ") };
};

export function formatNewsletterDate(value) {
  const date = value ? String(value).slice(0, 10) : "";
  return date ? date.replace(/-/g, ".") : "DATE TBA";
}

const byId = (members = []) => new Map(
  (Array.isArray(members) ? members : [])
    .filter((member) => member?.id)
    .map((member) => [member.id, member])
);

const memberName = (membersById, memberId) => membersById.get(memberId)?.name || memberId;

export function buildSingleNewsletterSubject(single) {
  const title = (single?.title || "").trim() || "Untitled Single";
  return `【XP News】XP New Single ${title} Release`;
}

export function buildGraduationNewsletterSubject(member) {
  return `【XP News】${member?.name || "成员"} 卒业`;
}

export function buildFormationRows(single, members = []) {
  const membersById = byId(members);
  const rows = Array.isArray(single?.asideLineup?.rows) ? single.asideLineup.rows : [];
  const slots = Array.isArray(single?.asideLineup?.slots) ? single.asideLineup.slots : [];
  const slotRoles = single?.asideLineup?.slotRoles || {};
  let start = 0;

  return rows.map((rowSize, rowIndex) => {
    const count = Number(rowSize) || 0;
    const rowSlots = slots.slice(start, start + count);
    const rowStart = start;
    start += count;

    return {
      label: `第${rows.length - rowIndex}排`,
      members: rowSlots.map((memberId, offset) => {
        const slotIndex = rowStart + offset;
        return {
          id: memberId,
          member: membersById.get(memberId) || null,
          name: memberId ? memberName(membersById, memberId) : "空位",
          role: slotRoles?.[slotIndex] || "",
          slotIndex,
        };
      }),
    };
  });
}

export function buildSingleNewsletterSummary(single, members = [], singles = []) {
  const membersById = byId(members);
  const { prefix, name } = splitSingleTitleForNewsletter(single?.title);
  const slots = Array.isArray(single?.asideLineup?.slots) ? single.asideLineup.slots : [];
  const selectionNames = slots.filter(Boolean).map((memberId) => memberName(membersById, memberId));

  return {
    id: single?.id || "",
    title: single?.title || "",
    prefix,
    name,
    releaseLabel: formatNewsletterDate(single?.release || single?.releaseDate),
    kind: single?.singleKind || "常规单曲",
    notes: single?.notes || "",
    cover: single?.cover || "",
    tracks: Array.isArray(single?.tracks) ? single.tracks : [],
    selectionCount: single?.asideLineup?.selectionCount || selectionNames.length,
    selectionNames,
    centerSummary: formatSingleCenterSummary(single, singles, membersById),
    formationRows: buildFormationRows(single, members),
  };
}

const isSelectionValue = (value) => String(value || "").startsWith("A面选拔");
const isCenterValue = (value) => /center/i.test(String(value || ""));
const isSkippedRank = (rank) => /加入前|圈外|辞退|未参加|不参加|-|^$/.test(String(rank || "").trim());

const cnDigits = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const chineseToInt = (value) => {
  let s = String(value || "").replace(/[第届名位]/g, "").trim();
  if (!s) return NaN;
  if (/^\d+$/.test(s)) return Number(s);
  if (s === "十") return 10;
  const tenIndex = s.indexOf("十");
  if (tenIndex === -1) return cnDigits[s] ?? NaN;

  const left = s.slice(0, tenIndex);
  const right = s.slice(tenIndex + 1);
  const tens = left ? cnDigits[left] : 1;
  const ones = right ? cnDigits[right] : 0;
  if (!Number.isFinite(tens) || !Number.isFinite(ones)) return NaN;
  return tens * 10 + ones;
};

const rankNumber = (rank) => {
  const match = String(rank || "").match(/\d+/);
  if (match) return Number(match[0]);
  const parsed = chineseToInt(rank);
  return Number.isFinite(parsed) ? parsed : Infinity;
};

const editionNumber = (edition) => {
  const match = String(edition || "").match(/\d+/);
  if (match) return Number(match[0]);
  return chineseToInt(edition);
};

export function formatElectionBadgeForNewsletter(raw, edition) {
  const value = String(raw || "").trim();
  if (!value) return { text: "—", tone: "muted" };
  if (value === "加入前" || value === "圈外") return { text: value, tone: "muted" };
  if (value === "未参选") return { text: value, tone: "soft" };

  const n = rankNumber(value);
  if (!Number.isFinite(n)) return { text: value, tone: "neutral" };

  const currentEdition = editionNumber(edition);
  const outerThreshold = Number.isFinite(currentEdition) && currentEdition >= 4 ? 22 : 20;
  if (n >= outerThreshold) return { text: "圈外", tone: "muted" };

  const group = n >= 13 ? "UG" : "选拔";
  const text = `${n}位（${group}）`;
  if (n === 1) return { text, tone: "gold" };
  if (n === 2) return { text, tone: "silver" };
  if (n >= 3 && n <= 7) return { text, tone: "rose" };
  if (n <= 12) return { text, tone: "sky" };
  return { text, tone: "violet" };
};

function findBestElectionRank(electionRanks = []) {
  const ranked = (Array.isArray(electionRanks) ? electionRanks : [])
    .filter((entry) => entry && !isSkippedRank(entry.rank) && formatElectionBadgeForNewsletter(entry.rank, entry.edition).text !== "圈外")
    .sort((a, b) => rankNumber(a.rank) - rankNumber(b.rank));
  const best = ranked[0];
  return best ? `${best.edition} ${best.rank}` : "—";
}

export function buildGraduationNewsletterSummary(member, singles = []) {
  const historyEntries = Object.entries(member?.selectionHistory || {});
  const singlesById = new Map((Array.isArray(singles) ? singles : []).map((single) => [single.id, single]));
  const selectedEntries = historyEntries.filter(([, value]) => isSelectionValue(value));
  const centerEntries = selectedEntries.filter(([, value]) => isCenterValue(value));
  const officialPhotoUrls = Array.isArray(member?.officialPhotos)
    ? member.officialPhotos.map((photo) => photo?.url).filter(Boolean)
    : [];

  return {
    name: member?.name || "",
    generation: member?.generation || "",
    graduationDateLabel: formatNewsletterDate(member?.graduationDate),
    graduationSongTitle: member?.graduationSongTitle || "无",
    officialPhotoUrls: officialPhotoUrls.length ? officialPhotoUrls : [member?.avatar].filter(Boolean),
    selectionCount: selectedEntries.length,
    centerCount: centerEntries.length,
    bestElectionRank: findBestElectionRank(member?.electionRanks),
    electionRanks: (Array.isArray(member?.electionRanks) ? member.electionRanks : []).map((entry) => ({
      ...entry,
      badge: formatElectionBadgeForNewsletter(entry?.rank, entry?.edition),
    })),
    selectedSingles: selectedEntries.map(([singleId]) => singlesById.get(singleId)?.title || singleId),
    centerSingles: centerEntries.map(([singleId]) => singlesById.get(singleId)?.title || singleId),
  };
}

export const GRADUATION_BLESSINGS = [
  "愿{name}带着在 XP 舞台上积攒的光，继续走向更辽阔的未来。前程似锦，也请一直被热爱环绕。",
  "谢谢{name}把每一次站上舞台的认真都留给了 XP。新的道路一定会有新的掌声，愿未来明亮、自由、丰盛。",
  "那些被歌声、汗水和笑容点亮的时刻，会继续陪着我们。祝{name}下一段旅程顺风顺水，抵达所有想去的地方。",
  "感谢{name}为 XP 写下的这一页偶像故事。愿毕业不是告别，而是把勇气交还给明天，前方一路有光。",
  "愿{name}在新的季节里继续被好运温柔相待，把曾经照亮舞台的笑容带去更远的地方。",
  "XP 会记得{name}每一次抬头看向观众席的坚定。愿她此后自由生长，奔赴属于自己的晴朗人生。",
  "愿{name}把掌声收进背包，把勇气别在胸前。谢谢她为 XP 付出的时间、汗水和真心。",
  "新的门打开了，旧的歌也不会褪色。愿{name}未来万事胜意，永远拥有再次出发的底气。",
  "谢谢{name}陪 XP 走过这段不可复制的路。愿她往后的每一天，都比聚光灯下更宽阔、更自在。",
  "祝{name}在下一个舞台继续漂亮地发光。XP 的故事里永远会有她认真、骄傲、温柔的一页。",
  "{name}，毕业快乐。愿前路有风、有花、有新的梦想，也有足够多的温柔回应她一路以来的努力。",
  "感谢{name}把少女时代最闪亮的一段交给 XP。愿她此后所遇皆温柔，所行皆坦途，心里的火永远不熄。",
  "{name}的名字会和那些舞台、应援、泪光一起留下。祝她离开剧场后也能被世界好好拥抱，继续自在发光。",
  "愿{name}从今天起把偶像生涯的勋章收好，带着大家的爱去迎接新的清晨。谢谢她一路以来的真诚与勇敢。",
  "XP 的歌声里有{name}的位置，粉丝的记忆里也会一直有她。愿她未来一路从容，去完成更大的梦想。",
  "祝{name}毕业快乐。愿她在人生的新章节里继续被幸运眷顾，每一次选择都坚定，每一个明天都晴朗。",
  "谢谢{name}用努力证明热爱可以被看见。愿她带着 XP 的祝福继续向前，前程辽阔，心事皆有回响。",
  "愿{name}把粉丝的掌声化作行囊，把舞台的光化作指南。新的旅程开始了，请继续骄傲地走下去。",
  "感谢{name}为 XP 写下温柔又坚定的一章。愿她此后自由、健康、快乐，拥有属于自己的灿烂日子。",
  "{name}的努力从来不是只属于排名和记录的数字。它也在每一个被打动的人心里，成为长久发亮的记忆。",
  "愿{name}离开偶像舞台后，依然拥有追梦的勇气和被爱照亮的日常。谢谢她把青春的一部分留给 XP。",
  "祝{name}未来有新的花束、新的掌声，也有安静而踏实的幸福。XP 会记得她所有认真奔跑的样子。",
  "{name}，谢谢你让 XP 的故事多了一种颜色。愿未来的路繁花相送，愿每一步都走向更好的自己。",
  "愿{name}把今天的眼泪留作纪念，把明天的笑容留给远方。毕业快乐，也祝她此后一路被好运偏爱。",
  "谢谢{name}在无数次排练和公演里交出的真心。愿新的生活回应她所有坚持，前方有光，也有自由。",
  "XP 的舞台会暂时少一个熟悉的身影，但{name}留下的光不会散场。愿她往后万事顺遂，心愿皆成。",
  "愿{name}拥有重新出发的轻盈，也拥有回望过去时的骄傲。感谢她为 XP 做出的贡献与陪伴。",
  "祝{name}在下一段人生里继续漂亮地赢得掌声。愿她不必回头也知道，XP 永远珍惜她来过的证明。",
  "感谢{name}把每一次亮相都当作约定认真完成。愿她毕业后的世界更宽、更亮，也更适合她的梦想。",
  "{name}，愿你带着 XP 的祝福奔赴新生活。愿星光不只在舞台上，也落在你往后每一个平凡又珍贵的日子。",
  "谢谢{name}让大家看见坚持的形状。愿未来的她继续被温柔托住，被机会看见，被梦想带到更远处。",
  "愿{name}在新的旅途里继续拥有清澈的热爱。XP 会记得她的笑容、努力，以及每一次站上舞台的光。",
  "毕业不是{name}故事的句点，而是新篇章的抬头。愿她前程似锦，也愿她永远保有选择自己的勇气。",
  "感谢{name}陪 XP 走过热烈又珍贵的时间。愿此后的她生活有花，事业有路，心里永远有明亮的方向。",
  "祝{name}把过去的掌声变成底气，把未来的未知变成惊喜。谢谢她为 XP 带来的所有美好时刻。",
  "愿{name}被世界温柔以待，也被自己的努力稳稳接住。新的舞台很大，请继续带着笑容向前。",
  "XP 会记得{name}认真练习的背影，也会记得她闪闪发亮的登场。愿她未来无惧风雨，常有好消息。",
  "谢谢{name}让这段偶像生涯成为许多人心里的宝物。愿她此后一路顺风，所爱皆有回应，所行皆有收获。",
  "愿{name}未来的每一次登场都更接近真正想成为的自己。谢谢她为 XP 留下的歌声、汗水与温度。",
  "祝{name}毕业快乐。愿她从此拥有更大的地图、更自由的风，也拥有永远支持她的人们。",
  "感谢{name}用青春和热爱装点 XP 的时间线。愿她人生下一页写满顺利、健康、喜悦和闪光。",
  "愿{name}在告别偶像身份之后，依旧能听见来自过去的掌声。那是 XP 对她的感谢，也是未来的祝福。",
  "谢谢{name}把重要的岁月托付给 XP。愿她以后无论走到哪里，都能被理解、被珍惜、被明亮的机会迎接。",
  "{name}，请带着这份骄傲继续向前。愿毕业后的每一天，都比舞台灯光更温暖，比想象中的未来更精彩。",
  "愿{name}的下一站有新的相遇、新的作品、新的欢呼。XP 感谢她曾经站在这里，认真发过光。",
  "感谢{name}一路以来的坚持、成长和付出。愿她前方道路开阔，心中热爱长明，生活处处有好风景。",
  "祝{name}把今天收到的感谢，变成明天继续前进的力量。愿她未来闪耀而自在，勇敢也从容。",
  "愿{name}在新生活里拥有很多值得庆祝的小事，也拥有足够大的梦想。谢谢她把 XP 的舞台变得更完整。",
  "XP 的故事因为{name}而更丰盛。愿她毕业后继续被爱包围，前程似锦，所有努力都开花结果。",
  "{name}，谢谢你走到今天。愿你往后的路有清风、有灯火、有自由，也有源源不断的好运与掌声。",
];

export function pickGraduationBlessing(memberName = "她", options = {}) {
  const name = String(memberName || "她").trim() || "她";
  const index = options.seed
    ? [...String(options.seed)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % GRADUATION_BLESSINGS.length
    : Math.floor((options.random ?? Math.random)() * GRADUATION_BLESSINGS.length);

  return {
    text: GRADUATION_BLESSINGS[index].replaceAll("{name}", name),
    signature: "宫脇奈&月琴音",
  };
}
