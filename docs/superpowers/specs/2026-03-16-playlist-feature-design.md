# Playlist Feature Design

**Date**: 2026-03-16
**Project**: XP Official Website (xjp56-app)
**Status**: Approved

---

## Overview

Add a Playlist tab to the website (after 相册/Gallery), with global persistent audio playback. Key goals:

1. Browse all tracks with audio sources, build playlists with drag-and-drop ordering
2. Admins create permanent playlists (stored in backend); guests create temporary playlists (localStorage only)
3. Audio plays continuously across page navigation via a global floating player
4. Single-track playback (from SingleDetail) also persists across page navigation
5. Design matches site's cold silver minimalist aesthetic — restrained, typographic, no decorative elements

---

## Data Design

### Playlist Object

```js
{
  id: string,          // "pl_" + uid()
  title: string,
  cover: string,       // /uploads/... relative path (uploaded image)
  tracks: [
    { singleId: string, trackNo: number }
    // References existing track audio — no re-upload
  ],
  createdAt: ISO8601,
}
```

Audio URLs are **resolved at render time** from `data.singles` using `singleId` + `trackNo`. They are never duplicated in the playlist object.

### Storage

- **Permanent playlists** (admin-created): stored in `data.playlists[]` on the backend, included in `GET/POST /data`
- **Temporary playlists** (guest-created): stored in `localStorage` under key `xjp56_playlists` as a JSON array with the same shape
- `normalizeAppDataShape` gains: `playlists: Array.isArray(raw?.playlists) ? raw.playlists : []`
- `sanitizeDbPayload` sanitizes `playlists[].cover` the same way as other media URLs

### Resolved Queue Item

When a playlist or single track begins playing, tracks are resolved into a flat queue:

```js
{
  singleId: string,
  trackNo: number,
  title: string,        // track.title
  singleTitle: string,  // single.title (e.g. "27th Single · Song Name")
  coverUrl: string,     // resolved single cover URL (for FloatingPlayer display)
  audioUrl: string,     // resolved audio URL
}
```

---

## Architecture: Global Audio Engine

### State Lifted to XJP56App Root

The `<audio>` element and playback state move from `SingleDetail` to the root `XJP56App` component, following the existing props-down architecture.

```js
// New state in XJP56App
const audioRef = useRef(null);
const [audioQueue, setAudioQueue] = useState([]);   // resolved QueueItem[]
const [audioIndex, setAudioIndex] = useState(0);
const [isPlaying, setIsPlaying] = useState(false);
```

### Key Functions (passed as props)

```js
playQueue(tracks, startIndex = 0)
// Resolves tracks → audioQueue, sets audioIndex, plays

stopAudio()
// Clears queue, pauses audio

togglePlayPause()

seekToIndex(index)
```

`onEnded` handler on the `<audio>` element auto-advances `audioIndex`. After the last track, playback stops.

### SingleDetail Change

`SingleDetail` no longer owns an `<audio>` element. It receives `playQueue` as a prop and calls it when the user clicks a track's play button. Audio continues after the modal closes.

---

## Components

### 1. Navigation

Add to `tabs` array in `TopBar`:
```js
{ key: "playlist", cn: "歌单", en: "PLAYLIST" }
```
Positioned after `{ key: "gallery", ... }`.

---

### 2. PlaylistPage

**Layout**: `px-4 py-8 mx-auto max-w-7xl` (matches all other pages)

**Header row**:
- Left: section title in standard style (`text-2xl font-light`)
- Right: "新建歌单" button (primary style: `bg-[#1C1C1C] text-white text-xs tracking-widest px-6 py-2.5`)
  - Available to all users; admin saves to backend, guest saves to localStorage

**Playlist grid**: same column pattern as Singles (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8`)

**Playlist card**:
- Square cover image (`aspect-square object-cover`, no border-radius, `group-hover:scale-[1.04]`)
- Title (`text-sm font-medium mt-2`)
- Track count (`text-[10px] text-[#AAAAAA] tracking-[0.08em]`)
- Hover: play button overlay (circle, `w-8 h-8`, bottom-right of cover)
- Admin: edit (pencil) + delete (trash) icon buttons visible on hover

**Sections**:
- Permanent playlists shown first (no label if no temporary ones exist)
- If temporary playlists exist, they appear below a thin `border-t border-[#E0E0E0]` separator with label: `text-[10px] tracking-[0.25em] text-[#AAAAAA] uppercase mb-4` → "本地歌单"

**Empty state**: centered `text-sm text-[#AAAAAA]` — "暂无歌单" + hint for admin

---

### 3. PlaylistBuilder (ScrollDialogContent modal)

**Trigger**: "新建歌单" button, or admin clicking edit on existing playlist

**Modal**: `max-w-3xl`, same `ScrollDialogContent` wrapper pattern

**Layout — two sections stacked (mobile) / side-by-side (desktop `md:flex gap-8`)**:

**Left panel (meta)**:
- Cover upload: square `w-full aspect-square` click-to-upload zone, shows preview when set; border `border border-dashed border-[#E0E0E0]` before upload
- Title input: standard `Input` component, `placeholder="歌单名称"`

**Right panel (track selection)**:

Header: `— TRACKS` section header pattern

Track list (all tracks with non-empty `audio` field across all singles):
- Sorted by single release date descending, then by track number
- Each row: `flex items-center gap-3 py-2.5 border-b border-[#E0E0E0]`
  - Left: checkbox
  - Middle: `text-[10px] text-[#AAAAAA] w-24 shrink-0` single prefix + `text-[13px] text-[#1C1C1C]` track title
  - Right: singleKind tag (if not 常规单曲)
- Checked rows highlighted: `bg-[#F7F7F7]`

**Selected Tracks section** (below or in right panel):

Header: `— 已选曲目 (N)` section header pattern
Drag-and-drop list:
- Each row: drag handle (`⠿` icon, `cursor-grab`) + index number + title + remove (×) button
- Uses HTML5 drag-and-drop or a minimal implementation (no external DnD library)
- `touch-action: none` for mobile touch support

**Footer**: Cancel + Save buttons (`w-full sm:w-auto`)

---

### 4. FloatingPlayer

**Position**: `fixed bottom-6 right-4 z-50`

**Collapsed state** (default when playing):
- `w-12 h-12` circle
- Background: `bg-white border border-[#E0E0E0]` — clean white with thin border
- Inside: square cover thumbnail `w-8 h-8 object-cover` centered
- Outer ring: SVG progress arc in `#1C1C1C` (animates as track plays)
- On hover: subtle `shadow-md` lift
- Click → expand

**Expanded state**:
- `w-72` card, `bg-white border border-[#E0E0E0] shadow-lg rounded-none`
- **Top row**: cover thumbnail `w-10 h-10` + track info (title `text-[13px] font-medium`, single title `text-[10px] text-[#6B6B6B] tracking-[0.08em]`) + collapse button (×, top-right, `text-[#AAAAAA]`)
- **Progress bar**: thin `h-[2px] bg-[#E0E0E0]` track, `bg-[#1C1C1C]` fill, no thumb nub — matches minimalist style
- **Controls row** (centered): `⏮ ▶/⏸ ⏭` — simple `w-5 h-5` SVG icons, `text-[#1C1C1C]`, spacing `gap-6`
- **Stop button**: `text-[10px] tracking-[0.15em] text-[#AAAAAA] uppercase` → "停止" — far right, plain text button
- Mobile: when expanded, width `w-[calc(100vw-2rem)]` to avoid overflow

**Animation** (Framer Motion):
- Expand: `initial={{ opacity: 0, scale: 0.9, y: 8 }}` → `animate={{ opacity: 1, scale: 1, y: 0 }}`
- Smooth `transition={{ type: "spring", stiffness: 300, damping: 25 }}`

**Rendering**: Only mounts when `audioQueue.length > 0`

---

## Behavior & Edge Cases

| Scenario | Behavior |
|---|---|
| Click play on single track | `playQueue([track], 0)` — replaces current queue |
| Click play on playlist | `playQueue(allTracks, 0)` — replaces current queue |
| Last track ends | Playback stops; FloatingPlayer shows paused state |
| Track audio URL missing/broken | Skip to next track silently (`onError` → `seekToIndex(index+1)`) |
| Guest edits temporary playlist | Saves to localStorage, not backend |
| Admin deletes a permanent playlist | Removes from `data.playlists`, triggers auto-save |
| Guest deletes a temporary playlist | Removes from localStorage |
| localStorage parse error | Silent catch, start with empty temporary playlists |
| Empty playlist | Play button disabled; builder Save button disabled |

---

## Mobile Responsiveness

- PlaylistBuilder: left panel (meta) stacks above right panel (tracks) on mobile
- Selected tracks drag-and-drop: touch-native drag via `onTouchStart/Move/End` handlers
- FloatingPlayer expanded: full-width minus 2rem margin
- All touch targets ≥ 44px height
- Playlist grid: `grid-cols-2` on mobile (same as Singles/Members)

---

## Files Modified

Only `src/App.jsx` and `src/index.css` (if new keyframe needed for progress arc).

No new files, no new dependencies. DnD implemented with native HTML5 events.
