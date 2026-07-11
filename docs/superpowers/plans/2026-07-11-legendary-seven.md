# Legendary Seven Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use $superpower-subagents (recommended) or $superpower-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking via update_plan.

**Goal:** Replace the homepage newest-generation member strip with a polished, automatically updating Legendary Seven podium derived from the latest election.

**Architecture:** Add a pure selector that discovers the numerically latest election and returns ranks 1–7 with each member's current photo. Render those results in the existing Hero using rank-specific CSS grid areas and tiered frame styles; keep election snapshot behavior isolated to the election page.

**Tech Stack:** React 19, Tailwind CSS 4, plain CSS, Lucide React, Node `node:test`, Vite.

---

### Task 1: Latest-election Legendary Seven selector

**Files:**
- Create: `src/lib/legendarySeven.js`
- Create: `src/lib/legendarySeven.test.js`

- [ ] Write failing tests for latest-edition discovery, rank sorting/filtering, automatic replacement by a future edition, and current-photo resolution.
- [ ] Run `node --test src/lib/legendarySeven.test.js` and verify RED because the module is absent.
- [ ] Implement `getLegendarySeven(members)` returning `{ edition, members: [{ member, rank, photoUrl }] }`; use current `avatar`, then highest-version official photo fallback.
- [ ] Re-run the focused test and verify GREEN.

### Task 2: Homepage Legendary Seven markup

**Files:**
- Modify: `src/App.jsx`
- Create: `src/lib/legendarySevenSource.test.js`

- [ ] Write a failing source regression test for the `LEGENDARY SEVEN` title, rank classes, Crown usage, names/romaji, and removal of the `NEW GENERATION` block.
- [ ] Run the source test and verify RED.
- [ ] Import `Crown` and `getLegendarySeven`; replace `getLatestGenerationMembers` usage in Hero with memoized latest-election results.
- [ ] Render rank-aware cards with `xp-legendary-rank-N`, current `photoUrl`, `NO.N`, name, and romaji.
- [ ] Hide the section when no election has valid top-seven records.
- [ ] Run selector and source tests and verify GREEN.

### Task 3: Responsive jewelry-podium styling

**Files:**
- Modify: `src/index.css`
- Modify: `src/lib/legendarySevenSource.test.js`

- [ ] Extend the failing source regression to require the mobile and desktop grid-area declarations.
- [ ] Implement mobile areas `. one one . / two two three three / four five six seven` and desktop order `six four two one three five seven`.
- [ ] Add a double gold frame, crown, corner ornaments, and glow for rank 1; restrained gold frames for ranks 2–3; no ornamental frame for ranks 4–7.
- [ ] Add subtle hover motion and responsive typography without horizontal overflow.
- [ ] Run focused tests and verify GREEN.

### Task 4: Verification

**Files:**
- Verify only

- [ ] Run `node --test src/lib/*.test.js`.
- [ ] Run focused ESLint on new helper/test files and review repository lint output for new errors.
- [ ] Run `npm run build` and `git diff --check`.
- [ ] Start the local app and inspect the homepage at desktop, 393px, and 430px widths; confirm order, hierarchy, current photos, names, romaji, and no horizontal overflow.
