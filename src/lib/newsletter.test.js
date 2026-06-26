import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraduationNewsletterSubject,
  buildGraduationNewsletterSummary,
  buildSingleNewsletterSubject,
  buildSingleNewsletterSummary,
  formatElectionBadgeForNewsletter,
  GRADUATION_BLESSINGS,
  pickGraduationBlessing,
} from "./newsletter.js";

const members = [
  { id: "na", name: "宫脇奈" },
  { id: "yue", name: "月琴音" },
  { id: "juri", name: "松村珠理奈" },
];

test("builds the requested single release subject", () => {
  assert.equal(
    buildSingleNewsletterSubject({ title: "44th Single · A Perfect Song" }),
    "【XP News】XP New Single 44th Single · A Perfect Song Release"
  );
});

test("summarizes single release metadata and stage rows", () => {
  const single = {
    id: "s44",
    title: "44th Single · A Perfect Song",
    release: "2026-06-22",
    singleKind: "常规单曲",
    notes: "一首关于离别与重新出发的单曲。",
    tracks: [
      { no: 1, title: "A Perfect Song (A-side)", isAside: true },
      { no: 2, title: "Journey", isAside: false },
    ],
    asideLineup: {
      rows: [2, 1],
      slots: ["na", "yue", "juri"],
      slotRoles: { 1: "guardian", 2: "center" },
    },
  };

  const summary = buildSingleNewsletterSummary(single, members, [single]);

  assert.equal(summary.prefix, "44th Single");
  assert.equal(summary.name, "A Perfect Song");
  assert.equal(summary.releaseLabel, "2026.06.22");
  assert.deepEqual(summary.selectionNames, ["宫脇奈", "月琴音", "松村珠理奈"]);
  assert.equal(summary.centerSummary, "松村珠理奈(初)");
  assert.equal(summary.formationRows[0].label, "第2排");
  assert.equal(summary.formationRows[1].label, "第1排");
  assert.equal(summary.formationRows[1].members[0].role, "center");
});

test("builds graduation subject and career summary", () => {
  const member = {
    id: "juri",
    name: "松村珠理奈",
    generation: "5期",
    graduationDate: "2026-05-06",
    graduationSongTitle: "Life Is a MI",
    officialPhotos: [
      { url: "/uploads/juri-1.webp", version: 1 },
      { url: "/uploads/juri-2.webp", version: 2 },
    ],
    electionRanks: [
      { edition: "第1届", rank: "圈外" },
      { edition: "第2届", rank: "3位" },
    ],
    selectionHistory: {
      s43: "A面选拔（第2排）",
      s44: "A面选拔（第1排 center）",
      s45: "落选",
    },
  };
  const singles = [
    { id: "s43", title: "43rd Single · Before Dawn", release: "2026-04-01" },
    { id: "s44", title: "44th Single · A Perfect Song", release: "2026-06-22" },
  ];

  const summary = buildGraduationNewsletterSummary(member, singles);

  assert.equal(buildGraduationNewsletterSubject(member), "【XP News】松村珠理奈 卒业");
  assert.equal(summary.selectionCount, 2);
  assert.equal(summary.centerCount, 1);
  assert.equal(summary.bestElectionRank, "第2届 3位");
  assert.deepEqual(summary.officialPhotoUrls, ["/uploads/juri-1.webp", "/uploads/juri-2.webp"]);
  assert.equal(summary.centerSingles[0], "44th Single · A Perfect Song");
  assert.deepEqual(summary.electionRanks[1].badge, { text: "3位（选拔）", tone: "rose" });
});

test("picks varied graduation blessings with fixed signature", () => {
  const blessing = pickGraduationBlessing("松村珠理奈", { random: () => 0 });

  assert.match(blessing.text, /松村珠理奈/);
  assert.match(blessing.text, /前程|未来|舞台|道路|旅程|掌声|梦想|晴朗/);
  assert.equal(blessing.signature, "宫脇奈&月琴音");
});

test("keeps 50 personalized graduation blessing variants", () => {
  assert.equal(GRADUATION_BLESSINGS.length, 50);
  assert.ok(GRADUATION_BLESSINGS.every((line) => line.includes("{name}")));

  const generated = new Set(
    GRADUATION_BLESSINGS.map((_, index) =>
      pickGraduationBlessing("宫岛阿弥", { random: () => (index + 0.5) / GRADUATION_BLESSINGS.length }).text
    )
  );

  assert.equal(generated.size, 50);
  assert.ok([...generated].every((line) => line.includes("宫岛阿弥")));
});

test("formats election memory as official member info style badges", () => {
  assert.deepEqual(
    formatElectionBadgeForNewsletter("1位", "第5届"),
    { text: "1位（选拔）", tone: "gold" }
  );
  assert.deepEqual(
    formatElectionBadgeForNewsletter("14位", "第3届"),
    { text: "14位（UG）", tone: "violet" }
  );
  assert.deepEqual(
    formatElectionBadgeForNewsletter("22位", "第4届"),
    { text: "圈外", tone: "muted" }
  );
  assert.deepEqual(
    formatElectionBadgeForNewsletter("未参选", "第2届"),
    { text: "未参选", tone: "soft" }
  );
});
