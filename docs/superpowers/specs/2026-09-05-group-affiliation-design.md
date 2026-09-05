# Group Affiliation (XP / QINGNIAN) — Design

## Goal

Introduce a second idol group, QINGNIAN, alongside the existing XP group. Members
belong to exactly one group. The Members page gains a top-level XP/QINGNIAN tab
(default XP). QINGNIAN members show a fixed "QINGNIAN" badge (bg `#cffaf2`, white
text) everywhere a generation badge currently appears, instead of a generation
badge. QINGNIAN members can be selected into single lineups like any other member,
and the lineup member-picker gets a group filter. Seed one new QINGNIAN member,
佐伯　奈緒実 (Naomi Saeki).

## Data Model Change

Add `group: "XP" | "QINGNIAN"` to every member record in `server/data/db.json`.

- Migration: set `group: "XP"` on all 73 existing members.
- New members default to `group: "XP"` in the admin editor; admin can switch to
  QINGNIAN.
- No other schema changes. `generation` remains a free-text string field on all
  members (including QINGNIAN ones) — it is simply not rendered for QINGNIAN
  members (see badge logic below). Existing per-member fields
  (`electionRanks`, `selectionHistory`, `admireSenior`, `friends`,
  `favoriteSong(s)`, `profile`, etc.) are unchanged in shape and apply to
  QINGNIAN members exactly as they do to XP members.

## Badge Logic

`generationBadgeClass` / `generationBadgeStyle` (and any inline duplicate badge
rendering) are changed to take the member (or at minimum a `group` flag) rather
than only the generation string:

- If `member.group === "QINGNIAN"`: always render text `"QINGNIAN"`,
  `style={{ background: '#cffaf2', color: '#FFFFFF', padding: '2px 8px',
  fontWeight: 500, fontSize: '10px', letterSpacing: '0.04em' }}`, regardless of
  what `generation` holds.
- Otherwise: existing generation-badge behavior, unchanged.

This is applied at every current call site of `generationBadgeClass`/
`generationBadgeStyle` (member grid cards, member detail modal header/discography
rows, election page rows, discography summary in `MemberDetailContent`, lineage
modal). Each call site is updated to pass the member object so the group check
is available.

## Members Page

- New top-level tab row, styled like the provided screenshot (rounded-full,
  light-blue outline inactive / dark filled active — reusing the existing status
  pill visual pattern), with exactly two tabs: **XP** and **QINGNIAN**. Default
  selection: XP.
- Existing 全部/在籍/毕业 status pills and 期数 generation pills remain below,
  operating only on the members within the currently selected group.
- Generation pills list is (re)computed from members in the selected group only.
  For the QINGNIAN tab, since `generation` isn't meaningfully displayed (badge
  always shows QINGNIAN), the generation-pill row is hidden entirely when the
  QINGNIAN tab is active.
- Switching the group tab resets `genFilter` to `"all"`.

## Admin Member Editor (add/edit)

- Add a "所属团体" two-option toggle (XP / QINGNIAN) next to the existing 期数
  field, using the same visual style as other toggle-like controls in the form
  (e.g. similar to the 在籍 checkbox row, but rendered as two pill buttons since
  it's a fixed enum).
- New member defaults to XP (matches current implicit behavior).
- 期数 text input remains present and editable regardless of group (kept for
  data flexibility / future use), but is visually de-emphasized with a hint
  "QINGNIAN 成员的期数不会展示，将统一显示 QINGNIAN 徽章" when QINGNIAN is
  selected.

## Single Lineup Member-Picker Dialog

In the "选择成员" dialog (`SingleLineupEditor`'s picker), add a group filter row
(XP / QINGNIAN pills, default XP... but actually shows whichever members are
relevant — see below) above the existing 在籍/OG split:

- Add state `pickerGroupFilter` (default `"XP"`).
- `activeList`/`ogList` are additionally filtered by
  `m.group === pickerGroupFilter`.
- Filter pills use the same small pill style as the existing 位置类型 (普通 /
  center / 护法) row directly above it, for visual consistency within the
  dialog.

This lets admins narrow the picker to QINGNIAN when assigning a QINGNIAN member
into a single's lineup, and back to XP otherwise. QINGNIAN members that get
selected into a lineup behave identically to XP members in all downstream
selection-history / election / discography computations — no special-casing
needed there since those all key off member id, not group.

## New Member Seed Data — 佐伯　奈緒実 (Naomi Saeki)

Added to `server/data/db.json` `members` array (position: front of array per
existing convention — new members go first):

```json
{
  "id": "m_qingnian_1",
  "name": "佐伯　奈緒実",
  "romaji": "NAOMI SAEKI",
  "origin": "神奈川県・横浜市",
  "group": "QINGNIAN",
  "generation": "",
  "avatar": "",
  "officialPhotos": [],
  "isActive": true,
  "graduationDate": "",
  "graduationSongTitle": "",
  "inheritanceSuccessorId": "",
  "inheritancePending": false,
  "electionRanks": [ { "edition": "第1届", "rank": "加入前" }, ... all 7 editions ... ],
  "admireSenior": [ /* 1-3 ids picked from existing XP members */ ],
  "friends": [ /* 1-3 ids picked from any existing members */ ],
  "favoriteSong": "<favoriteSongs[0]>",
  "favoriteSongs": [ /* 3 real track titles from db.singles[].tracks[].title */ ],
  "favoritePokemon": <int>,
  "profile": {
    "height": "<realistic cm>",
    "birthday": "2004-xx-xx",
    "blood": "<A/B/O/AB>",
    "hobby": "<original text, matches style of other members>",
    "skill": "<original text>",
    "catchphrase": "<original text>"
  },
  "selectionHistory": { /* every existing single id -> "加入前" */ }
}
```

All 55 existing single ids get `"加入前"` in `selectionHistory`; all 7 existing
election editions get `"加入前"` in `electionRanks`. Birthday chosen in the
2003–2005 range to match 10期's age range (per CLAUDE.md rule #7 for
admireSenior/friends, applied here too). Avatar left `""` pending photo upload,
per your note.

## Out of Scope / Unaffected

- Election page ranking logic, `圈外` thresholds, `parseRankNum`,
  `computeMemberLineupHistory`, discography tag computation — all operate on
  member id and are group-agnostic; no changes needed beyond the badge
  rendering swap.
- Singles page / SingleDetail — unaffected other than the badge rendering swap
  wherever a lineup member's generation badge is shown.
