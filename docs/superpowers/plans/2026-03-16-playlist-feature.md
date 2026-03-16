# Playlist Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Playlist tab with global persistent audio playback, a floating player bubble, and both admin-permanent and guest-local playlists to the XP Official Website.

**Architecture:** Global audio state (queue, index, isPlaying, currentTime, duration) lives in `XJP56App` root and is passed down as props. `SingleDetail` loses its local `<audio>` element and delegates to the global engine. A `FloatingPlayer` component renders at root when a queue is active. Permanent playlists live in `data.playlists[]` (backend); guest playlists live in `localStorage` via a separate `localPlaylists` state.

**Tech Stack:** React 19, Vite 7, Tailwind CSS v4, Framer Motion, shadcn/ui, Lucide icons — all already in the project. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-03-16-playlist-feature-design.md`

---

## Chunk 1: Data Layer & Global Audio Engine

### Task 1: Update data shape functions for playlists

**Files:**
- Modify: `src/App.jsx:341-426` (normalizeAppDataShape, sanitizeDbPayload, onReset)

- [ ] **Step 1: Update `normalizeAppDataShape` to include playlists**

In `src/App.jsx`, find the `normalizeAppDataShape` function (line 341) and update it:

```js
function normalizeAppDataShape(raw) {
  return {
    members: Array.isArray(raw?.members) ? raw.members : [],
    singles: Array.isArray(raw?.singles) ? raw.singles : [],
    gallery: Array.isArray(raw?.gallery) ? raw.gallery : [],
    playlists: Array.isArray(raw?.playlists) ? raw.playlists : [],
  };
}
```

- [ ] **Step 2: Update `sanitizeDbPayload` to sanitize playlist covers**

In `sanitizeDbPayload` (line 386), after the `gallery` block (around line 424), add:

```js
  if (Array.isArray(out.playlists)) {
    out.playlists = out.playlists.map((pl) =>
      pl && typeof pl === "object" && typeof pl.cover === "string"
        ? { ...pl, cover: toRelativeUploadsUrl(pl.cover) }
        : pl
    );
  }
```

- [ ] **Step 3: Update `onReset` to include `playlists: []`**

In `XJP56App`, find the `onReset` function (search for `const onReset = () => {`). Replace the **entire** object literal passed to `withRecomputedSelections` so it reads:

```js
const onReset = () => {
  const empty = withRecomputedSelections({ members: [], singles: [], gallery: [], playlists: [] });
  setData(empty);
  setPage("home");
  apiSaveData(empty).catch(() => {});
};
```

Also find the `.catch` error fallback nearby (search for `setData(withRecomputedSelections({ members: [], singles: [] }))`) and replace the **entire** object literal:
```js
setData(withRecomputedSelections({ members: [], singles: [], gallery: [], playlists: [] }));
```
Note: replace the full object `{ members: [], singles: [] }` — do not just append `playlists: []`; `gallery: []` must also be present.

- [ ] **Step 4: Verify build compiles**

```bash
cd /Users/jiazheng/idol/xjp56-app && npm run build 2>&1 | tail -20
```
Expected: `✓ built in` with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add playlists field to data shape functions"
```

---

### Task 2: Add new Lucide icons and global audio state to XJP56App

**Files:**
- Modify: `src/App.jsx:37-55` (imports), `src/App.jsx:3785` (XJP56App component)

- [ ] **Step 1: Add new Lucide icon imports**

The existing import block (lines 37–55) currently imports `ChevronDown` as the last icon. Add these icons to the same import:

```js
import {
  // ... existing icons ...
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  ListMusic,
  GripVertical,
  ChevronDown,
} from "lucide-react";
```

- [ ] **Step 2: Add global audio state and engine to XJP56App**

In `XJP56App` (line 3785), after the existing state declarations (after `const [error, setError] = useState("");`), add:

```js
  // ---- Global audio engine ----
  const audioRef = useRef(null);
  const [audioQueue, setAudioQueue] = useState([]);   // { singleId, trackNo, title, singleTitle, coverUrl, audioUrl }[]
  const [audioIndex, setAudioIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Resolve a playlist track ref { singleId, trackNo } into a full QueueItem using current data
  const resolveTrackRef = (ref) => {
    const single = data?.singles?.find((s) => s.id === ref.singleId);
    if (!single) return null;
    const track = single.tracks?.find((t) => t.no === ref.trackNo);
    if (!track?.audio) return null;
    return {
      singleId: single.id,
      trackNo: track.no,
      title: track.title,
      singleTitle: single.title,
      coverUrl: resolveMediaUrl(single.cover),
      audioUrl: resolveMediaUrl(track.audio),
    };
  };

  // Play an array of QueueItems (already resolved) starting at startIndex
  const playQueue = (items, startIndex = 0) => {
    const valid = items.filter(Boolean);
    if (!valid.length) return;
    setAudioQueue(valid);
    setAudioIndex(startIndex);
    setCurrentTime(0);
    setDuration(0);
    // Trigger load+play via effect that watches audioIndex+audioQueue
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setAudioQueue([]);
    setAudioIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const togglePlayPause = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play().catch(() => {});
    }
  };

  const seekToIndex = (idx) => {
    if (idx < 0 || idx >= audioQueue.length) return;
    setAudioIndex(idx);
    setCurrentTime(0);
  };

  const handleTrackEnd = () => {
    if (audioIndex < audioQueue.length - 1) {
      seekToIndex(audioIndex + 1);
    } else {
      // Last track ended — stay in queue but pause
      setIsPlaying(false);
    }
  };

  const handleTrackError = () => {
    // Skip broken track silently
    if (audioIndex < audioQueue.length - 1) {
      seekToIndex(audioIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

  // When audioIndex or audioQueue changes, update audio src and play
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioQueue.length) return;
    const item = audioQueue[audioIndex];
    if (!item?.audioUrl) return;
    el.src = item.audioUrl;
    el.load();
    el.play().catch(() => {});
  }, [audioIndex, audioQueue]);
```

- [ ] **Step 3: Add `<audio>` element to the main return of XJP56App**

`XJP56App` has three early-return branches (loading, error, no-data) before the main `return (…)`. The `<audio>` element only needs to live in the **main** return (where `data` exists and the app is fully rendered). All `audioRef` usages already use optional chaining (`?.`) so null-safety is handled.

Find the main `return (` in `XJP56App` — the one that starts with `<AppShell>` and contains `<TopBar …>` and the `<AnimatePresence>` block. Just before its `</AppShell>` closing tag, add:

```jsx
      {/* Global audio engine */}
      <audio
        ref={audioRef}
        onEnded={handleTrackEnd}
        onError={handleTrackError}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        style={{ display: "none" }}
      />
```

**Important**: Do not add it to the early-return branches (loading/error/no-data AppShells). The `useEffect` that sets `el.src` already guards with `if (!el || !audioQueue.length) return;` so it is safe if the ref is null during those states.

- [ ] **Step 4: Verify build compiles**

```bash
cd /Users/jiazheng/idol/xjp56-app && npm run build 2>&1 | tail -20
```
Expected: `✓ built in` with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add global audio engine state and functions to XJP56App"
```

---

## Chunk 2: SingleDetail Refactor

### Task 3: Remove inline audio from SingleDetail, wire global playQueue

**Files:**
- Modify: `src/App.jsx:3167` (SingleDetail component), `src/App.jsx:2937` (call site in SinglesPage)

- [ ] **Step 1: Update SingleDetail function signature**

Find (search for `function SingleDetail({single, membersById`):
```js
// Before:
function SingleDetail({single, membersById, admin, cumulativeCounts, noFrame}) {

// After (add all audio props at once — do not do this in two passes):
function SingleDetail({single, membersById, admin, cumulativeCounts, noFrame, playQueue, audioQueue, audioIndex, isPlaying, togglePlayPause}) {
```

- [ ] **Step 2: Remove local audio state, refs, effects, and inline player — ATOMIC STEP**

**These three removals must be done in one edit pass** to avoid a build-breaking intermediate state where JSX references `audioRef` after its `useRef` declaration is gone.

In a single edit of `SingleDetail`, remove all of the following:

**2a — Remove these two declarations** (search for `const audioRef = useRef(null)` and `const [currentTrack, setCurrentTrack]`):
```js
  const audioRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null); // { no, title, audio }
```

**2b — Remove the `useEffect` that reset currentTrack** (search for `setCurrentTrack(null)`):
```js
  useEffect(() => {
    setCurrentTrack(null);
  }, [single?.id]);
```

**2c — Remove the `useEffect` that triggered audio load** (search for `el.load()`):
```js
  useEffect(() => {
    if (!currentTrack?.audio) return;
    const el = audioRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      try { el.load(); } catch (e) {}
    }, 0);
    return () => clearTimeout(t);
  }, [currentTrack?.audio]);
```

**2d — Remove the inline audio player block in the JSX** (search for `{currentTrack?.audio ? (`):
```jsx
  {currentTrack?.audio ? (
    <div className="mb-4 bg-[#F7F7F7] px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs text-[#1C1C1C]">
          {currentTrack.no}.&nbsp;&nbsp;{currentTrack.title}
        </div>
        <span className="text-[10px] tracking-wider text-[#6B6B6B]">
          {tracks.find((t) => t.no === currentTrack.no)?.isAside ? "A-side" : "B-side"}
        </span>
      </div>
      <audio
        ref={audioRef}
        src={resolveMediaUrl(currentTrack.audio)}
        controls
        preload="none"
        className="w-full"
      />
    </div>
  ) : null}
```

After all four removals are applied, run a build to confirm no errors before proceeding to Step 3.

- [ ] **Step 4: Update play button in track rows to use global playQueue**

Find the play button inside the track rows (search for `setCurrentTrack({ no: t.no`). Replace the entire `<button>` element (including the `<Music>` icon) with:

```jsx
                  {(() => {
                    const isActiveTrack = audioQueue?.[audioIndex]?.singleId === single.id && audioQueue?.[audioIndex]?.trackNo === t.no;
                    const isThisPlaying = isActiveTrack && isPlaying;
                    return (
                      <button
                        className="w-6 h-6 rounded-full border border-[#1C1C1C] flex items-center justify-center shrink-0 hover:bg-[#1C1C1C] hover:text-white transition-colors text-[#1C1C1C]"
                        onClick={() => {
                          if (isActiveTrack) {
                            togglePlayPause?.();
                          } else {
                            playQueue?.([{
                              singleId: single.id,
                              trackNo: t.no,
                              title: t.title,
                              singleTitle: single.title,
                              coverUrl: resolveMediaUrl(single.cover),
                              audioUrl: resolveMediaUrl(t.audio),
                            }], 0);
                          }
                        }}
                        title={isThisPlaying ? "暂停" : "播放"}
                      >
                        {isThisPlaying ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                      </button>
                    );
                  })()}
```

Note: `togglePlayPause` was already added to the signature in Step 1. Do not reference `audioRef` here — it is not in scope in `SingleDetail`.

- [ ] **Step 5: Update SingleDetail call site in SinglesPage**

`SinglesPage` receives props `{ data, setData, admin }`. It needs to receive and pass through audio props. First update `SinglesPage` signature (line 2680):

```js
// Before:
function SinglesPage({ data, setData, admin }) {

// After:
function SinglesPage({ data, setData, admin, playQueue, audioQueue, audioIndex, isPlaying, togglePlayPause }) {
```

Then update the `SingleDetail` call site (line 2937):
```jsx
              <SingleDetail
                single={selected}
                membersById={membersById}
                admin={admin}
                cumulativeCounts={cumulativeCounts}
                noFrame
                playQueue={playQueue}
                audioQueue={audioQueue}
                audioIndex={audioIndex}
                isPlaying={isPlaying}
                togglePlayPause={togglePlayPause}
              />
```

- [ ] **Step 6: Update `<SinglesPage>` call in `XJP56App` to pass audio props**

Search for `<SinglesPage data={data} setData={setData} admin={admin} />` in `XJP56App`'s JSX and replace it:
```jsx
            <SinglesPage
              data={data}
              setData={setData}
              admin={admin}
              playQueue={playQueue}
              audioQueue={audioQueue}
              audioIndex={audioIndex}
              isPlaying={isPlaying}
              togglePlayPause={togglePlayPause}
            />
```

Note: Line numbers in `XJP56App` shift after the large audio state insertion in Task 2. Always search by code content, not line number, for all changes inside `XJP56App`.

- [ ] **Step 7: Verify build, then manually test**

```bash
cd /Users/jiazheng/idol/xjp56-app && npm run build 2>&1 | tail -20
```
Expected: `✓ built in` with no errors.

Open the dev server (`npm run dev`), go to 单曲 page, click a single, click a play button — the FloatingPlayer isn't built yet so you won't see it, but the browser console should show no errors. The inline audio player in the modal should be gone.

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx
git commit -m "feat: refactor SingleDetail to use global audio engine"
```

---

## Chunk 3: FloatingPlayer Component

### Task 4: Build the FloatingPlayer component

**Files:**
- Modify: `src/App.jsx` (add `FloatingPlayer` component, wire into `XJP56App`)

Add the `FloatingPlayer` function component **before** the `XJP56App` function (around line 3785). Add it after the `GalleryPage` component ends.

- [ ] **Step 1: Write the FloatingPlayer component**

```jsx
function FloatingPlayer({ audioQueue, audioIndex, isPlaying, currentTime, duration, onTogglePlayPause, onSeekToIndex, onStop }) {
  const [expanded, setExpanded] = useState(false);
  const item = audioQueue[audioIndex] ?? null;
  if (!item) return null;

  const progress = duration > 0 ? currentTime / duration : 0;
  // SVG arc constants
  const R = 22; // radius of progress circle
  const C = 2 * Math.PI * R; // circumference

  const canPrev = audioIndex > 0;
  const canNext = audioIndex < audioQueue.length - 1;

  return (
    <div className="fixed bottom-6 right-4 z-50">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white border border-[#E0E0E0] shadow-lg w-[calc(100vw-2rem)] sm:w-72"
          >
            {/* Top row: cover + track info + collapse */}
            <div className="flex items-start gap-3 p-3 border-b border-[#E0E0E0]">
              <div className="w-10 h-10 shrink-0 bg-[#F7F7F7] overflow-hidden">
                {item.coverUrl ? (
                  <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-4 h-4 text-[#AAAAAA]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#1C1C1C] truncate">{item.title}</div>
                <div className="text-[10px] text-[#6B6B6B] tracking-[0.08em] truncate mt-0.5">{item.singleTitle}</div>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="shrink-0 text-[#AAAAAA] hover:text-[#1C1C1C] transition-colors p-0.5"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-[2px] bg-[#E0E0E0] mx-0">
              <div
                className="h-full bg-[#1C1C1C] transition-none"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            {/* Controls */}
            <div className="flex items-center justify-center gap-6 py-3">
              <button
                onClick={() => onSeekToIndex(audioIndex - 1)}
                disabled={!canPrev}
                className={`transition-opacity ${canPrev ? "text-[#1C1C1C] hover:text-[#444]" : "text-[#CCCCCC]"}`}
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={onTogglePlayPause}
                className="w-9 h-9 border border-[#1C1C1C] flex items-center justify-center hover:bg-[#1C1C1C] hover:text-white transition-colors text-[#1C1C1C]"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onSeekToIndex(audioIndex + 1)}
                disabled={!canNext}
                className={`transition-opacity ${canNext ? "text-[#1C1C1C] hover:text-[#444]" : "text-[#CCCCCC]"}`}
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
            {/* Bottom row: counter + stop */}
            <div className="flex items-center justify-between px-3 pb-3">
              <span className="text-[10px] tracking-[0.15em] text-[#AAAAAA]">
                {audioIndex + 1} / {audioQueue.length}
              </span>
              <button
                onClick={onStop}
                className="text-[10px] tracking-[0.15em] text-[#AAAAAA] uppercase hover:text-[#1C1C1C] transition-colors"
              >
                停止
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => setExpanded(true)}
            className="w-12 h-12 rounded-full bg-white border border-[#E0E0E0] hover:shadow-md transition-shadow flex items-center justify-center relative overflow-visible"
          >
            {/* SVG progress arc */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 48 48"
              style={{ pointerEvents: "none" }}
            >
              {/* Background circle */}
              <circle cx="24" cy="24" r={R} fill="none" stroke="#E0E0E0" strokeWidth="2" />
              {/* Progress arc */}
              <circle
                cx="24" cy="24" r={R}
                fill="none"
                stroke="#1C1C1C"
                strokeWidth="2"
                strokeDasharray={C}
                strokeDashoffset={C - progress * C}
                strokeLinecap="butt"
              />
            </svg>
            {/* Cover thumbnail */}
            <div className="w-8 h-8 overflow-hidden bg-[#F7F7F7] z-10">
              {item.coverUrl ? (
                <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-3.5 h-3.5 text-[#AAAAAA]" />
                </div>
              )}
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Wire FloatingPlayer into XJP56App JSX**

Inside the `AppShell` return in `XJP56App`, add `FloatingPlayer` just before `</AppShell>` (after the `<audio>` element added in Task 2):

```jsx
      {/* Floating Player */}
      {audioQueue.length > 0 && (
        <FloatingPlayer
          audioQueue={audioQueue}
          audioIndex={audioIndex}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onTogglePlayPause={togglePlayPause}
          onSeekToIndex={seekToIndex}
          onStop={stopAudio}
        />
      )}
```

- [ ] **Step 3: Verify build and manually test FloatingPlayer**

```bash
cd /Users/jiazheng/idol/xjp56-app && npm run build 2>&1 | tail -20
```

Then `npm run dev`. Go to 单曲, open a single with audio, click the play button. The FloatingPlayer bubble should appear at bottom-right. Click it to expand. Click collapse. Click stop — it disappears. Navigate to a different tab — player stays visible and audio continues.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add FloatingPlayer component with collapsed/expanded states"
```

---

## Chunk 4: PlaylistPage & PlaylistBuilder

### Task 5: Build helper function and PlaylistBuilder modal

**Files:**
- Modify: `src/App.jsx` (add PlaylistBuilder component, add helper `resolvePlaylistTracks`)

Add the following **before** `GalleryPage` component (around line 688).

- [ ] **Step 1: Add `resolvePlaylistTracks` helper**

```js
// Resolve playlist track refs into full QueueItems for playback
function resolvePlaylistTracks(playlist, singles) {
  if (!playlist?.tracks?.length) return [];
  return playlist.tracks
    .map(({ singleId, trackNo }) => {
      const single = singles?.find((s) => s.id === singleId);
      if (!single) return null;
      const track = single.tracks?.find((t) => t.no === trackNo);
      if (!track?.audio) return null;
      return {
        singleId: single.id,
        trackNo: track.no,
        title: track.title,
        singleTitle: single.title,
        coverUrl: resolveMediaUrl(single.cover),
        audioUrl: resolveMediaUrl(track.audio),
      };
    })
    .filter(Boolean);
}
```

- [ ] **Step 2: Build the PlaylistBuilder component**

Add after `resolvePlaylistTracks`:

```jsx
function PlaylistBuilder({ singles, initialPlaylist, onSave, onClose }) {
  // initialPlaylist is null for create mode, or an existing playlist for edit mode
  const [title, setTitle] = useState(initialPlaylist?.title ?? "");
  const [cover, setCover] = useState(initialPlaylist?.cover ?? "");
  const [coverPreview, setCoverPreview] = useState(
    initialPlaylist?.cover ? resolveMediaUrl(initialPlaylist.cover) : null
  );
  const [uploading, setUploading] = useState(false);

  // selectedTracks: array of { singleId, trackNo } — order matters
  const [selectedTracks, setSelectedTracks] = useState(() => {
    if (!initialPlaylist?.tracks) return [];
    return initialPlaylist.tracks;
  });

  // DnD state
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const rowRefs = useRef([]);

  // All tracks with audio, sorted by single release desc then track no
  const allAudioTracks = useMemo(() => {
    const result = [];
    const sorted = [...(singles || [])].sort((a, b) => {
      const ta = Date.parse(a.release || "");
      const tb = Date.parse(b.release || "");
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
    for (const single of sorted) {
      for (const track of (single.tracks || [])) {
        if (track.audio) {
          result.push({ singleId: single.id, trackNo: track.no, single, track });
        }
      }
    }
    return result;
  }, [singles]);

  const isSelected = (singleId, trackNo) =>
    selectedTracks.some((t) => t.singleId === singleId && t.trackNo === trackNo);

  const toggleTrack = (singleId, trackNo) => {
    if (isSelected(singleId, trackNo)) {
      setSelectedTracks((prev) => prev.filter((t) => !(t.singleId === singleId && t.trackNo === trackNo)));
    } else {
      setSelectedTracks((prev) => [...prev, { singleId, trackNo }]);
    }
  };

  const removeTrack = (idx) => {
    setSelectedTracks((prev) => prev.filter((_, i) => i !== idx));
  };

  // Pointer-event drag-and-drop
  const handleDragPointerDown = (e, idx) => {
    e.preventDefault();
    setDragIndex(idx);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDragPointerMove = (e, idx) => {
    if (dragIndex === null) return;
    // Find drop index based on pointer Y vs row midpoints
    let newDrop = selectedTracks.length;
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        newDrop = i;
        break;
      }
    }
    setDropIndex(newDrop);
  };

  const handleDragPointerUp = () => {
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      setSelectedTracks((prev) => {
        const arr = [...prev];
        const [moved] = arr.splice(dragIndex, 1);
        const insertAt = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
        arr.splice(insertAt, 0, moved);
        return arr;
      });
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleCoverFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const compressed = await compressImage(file);
      const url = await uploadImage(compressed);
      setCover(url);
      setCoverPreview(resolveMediaUrl(url));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const canSave = title.trim().length > 0 && selectedTracks.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const playlist = {
      id: initialPlaylist?.id ?? ("pl_" + uid()),
      title: title.trim(),
      cover,
      tracks: selectedTracks,
      createdAt: initialPlaylist?.createdAt ?? new Date().toISOString(),
    };
    onSave(playlist);
  };

  // Get resolved info for a selected track ref
  const getSelectedTrackInfo = (ref) => {
    const entry = allAudioTracks.find((e) => e.singleId === ref.singleId && e.trackNo === ref.trackNo);
    return entry ?? null;
  };

  const singleKindBadgeForTrack = (entry) => {
    if (!entry) return null;
    return singleKindBadge(entry.single.singleKind);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-light text-[#1C1C1C]">
          {initialPlaylist ? "编辑歌单" : "新建歌单"}
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: meta */}
        <div className="md:w-48 shrink-0">
          {/* Cover upload */}
          <label className="block cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
            <div className={`aspect-square w-full flex items-center justify-center border ${uploading ? "border-[#E0E0E0]" : "border-dashed border-[#E0E0E0]"} bg-[#F7F7F7] overflow-hidden relative`}>
              {coverPreview ? (
                <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#AAAAAA]">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-[10px] tracking-[0.15em] uppercase">封面</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <span className="text-[10px] text-[#6B6B6B] tracking-wider">上传中…</span>
                </div>
              )}
            </div>
          </label>
          {/* Title input */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="歌单名称"
            className="mt-3 text-sm border-[#E0E0E0] focus:border-[#1C1C1C] rounded-none"
          />
        </div>

        {/* Right: track selection */}
        <div className="flex-1 min-w-0">
          {/* TRACKS section header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-px bg-[#1C1C1C]" />
            <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">Tracks</div>
          </div>

          {allAudioTracks.length === 0 ? (
            <div className="text-sm text-[#AAAAAA] py-4">暂无有音源的曲目</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {allAudioTracks.map(({ singleId, trackNo, single, track }) => {
                const selected = isSelected(singleId, trackNo);
                const kb = singleKindBadge(single.singleKind);
                return (
                  <div
                    key={`${singleId}-${trackNo}`}
                    onClick={() => toggleTrack(singleId, trackNo)}
                    className={`flex items-center gap-3 py-2.5 border-b border-[#E0E0E0] cursor-pointer ${selected ? "bg-[#F7F7F7]" : "hover:bg-[#FAFAFA]"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {}}
                      className="shrink-0 accent-[#1C1C1C]"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-[#AAAAAA] tracking-[0.08em]">
                        {splitSingleTitle(single.title).prefix}
                      </span>
                      <span className="text-[13px] text-[#1C1C1C] ml-2 tracking-[0.04em]">{track.title}</span>
                    </div>
                    {kb && (
                      <span className={`text-[10px] tracking-wider border px-1.5 py-0.5 shrink-0 ${kb.className}`}>
                        {kb.text}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* SELECTED TRACKS section */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-px bg-[#1C1C1C]" />
              <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">
                已选曲目 ({selectedTracks.length})
              </div>
            </div>

            {selectedTracks.length === 0 ? (
              <div className="text-sm text-[#AAAAAA] py-2">尚未选择曲目</div>
            ) : (
              <div>
                {selectedTracks.map((ref, idx) => {
                  const info = getSelectedTrackInfo(ref);
                  const isDragging = dragIndex === idx;
                  const isDropTarget = dropIndex === idx;
                  return (
                    <div key={`${ref.singleId}-${ref.trackNo}`}>
                      {/* Drop insertion line */}
                      {isDropTarget && (
                        <div className="h-0.5 bg-[#1C1C1C] mx-2 my-0.5" />
                      )}
                      <div
                        ref={(el) => { rowRefs.current[idx] = el; }}
                        className={`flex items-center gap-3 py-2.5 border-b border-[#E0E0E0] select-none ${isDragging ? "opacity-40" : ""}`}
                      >
                        {/* Drag handle — pointer events live here because setPointerCapture is called here */}
                        <div
                          className="shrink-0 cursor-grab text-[#CCCCCC] hover:text-[#888]"
                          style={{ touchAction: "none" }}
                          onPointerDown={(e) => handleDragPointerDown(e, idx)}
                          onPointerMove={(e) => handleDragPointerMove(e, idx)}
                          onPointerUp={handleDragPointerUp}
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        {/* Index */}
                        <span className="text-[10px] text-[#AAAAAA] w-5 shrink-0 text-right">{idx + 1}.</span>
                        {/* Title info */}
                        <div className="flex-1 min-w-0">
                          {info ? (
                            <>
                              <span className="text-[10px] text-[#AAAAAA]">{splitSingleTitle(info.single.title).prefix} · </span>
                              <span className="text-[13px] text-[#1C1C1C]">{info.track.title}</span>
                            </>
                          ) : (
                            <span className="text-[13px] text-[#AAAAAA]">（已删除）</span>
                          )}
                        </div>
                        {/* Remove */}
                        <button
                          onClick={() => removeTrack(idx)}
                          className="shrink-0 text-[#AAAAAA] hover:text-[#1C1C1C] transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {/* Drop line at end */}
                {dropIndex === selectedTracks.length && (
                  <div className="h-0.5 bg-[#1C1C1C] mx-2 my-0.5" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[#E0E0E0]">
        <button
          onClick={onClose}
          className="border border-[#1C1C1C] text-[#1C1C1C] text-xs tracking-widest px-6 py-2.5 hover:bg-[#F0F0F0] transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`text-xs tracking-widest px-6 py-2.5 transition-colors ${canSave ? "bg-[#1C1C1C] text-white hover:bg-[#333]" : "bg-[#E0E0E0] text-[#AAAAAA] cursor-not-allowed"}`}
        >
          保存
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build compiles**

```bash
cd /Users/jiazheng/idol/xjp56-app && npm run build 2>&1 | tail -20
```
Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add PlaylistBuilder component with DnD track ordering"
```

---

### Task 6: Build PlaylistPage component

**Files:**
- Modify: `src/App.jsx` (add PlaylistPage component after PlaylistBuilder)

- [ ] **Step 1: Write PlaylistCard and PlaylistPage components**

Add immediately after `PlaylistBuilder`. **Important**: `PlaylistCard` must be defined at module scope (not inside `PlaylistPage`'s render body) to prevent React from remounting it on every parent re-render.

```jsx
// PlaylistCard is at module scope (not inside PlaylistPage) to avoid React remounting on every render
function PlaylistCard({ pl, isLocal, singles, admin, onPlay, onEdit, onDelete }) {
  const trackCount = pl.tracks?.length ?? 0;
  const hasPlayable = resolvePlaylistTracks(pl, singles).length > 0;
  return (
    <div className="group relative">
      {/* Cover */}
      <div className="relative aspect-square overflow-hidden bg-[#F7F7F7]">
        {pl.cover ? (
          <img
            src={resolveMediaUrl(pl.cover)}
            alt={pl.title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ListMusic className="w-8 h-8 text-[#CCCCCC]" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onPlay(pl)}
            disabled={!hasPlayable}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${hasPlayable ? "bg-[#1C1C1C] text-white hover:bg-[#333]" : "bg-[#E0E0E0] text-[#AAAAAA] cursor-not-allowed"}`}
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Admin/local controls */}
        {(admin || isLocal) && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(pl, isLocal)}
              className="w-6 h-6 bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
            >
              <Pencil className="w-3 h-3 text-[#1C1C1C]" />
            </button>
            <button
              onClick={() => onDelete(pl.id, isLocal)}
              className="w-6 h-6 bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="mt-2">
        <div className="text-sm font-medium text-[#1C1C1C] leading-snug truncate">{pl.title}</div>
        <div className="text-[10px] text-[#AAAAAA] tracking-[0.08em] mt-0.5">{trackCount} 首</div>
      </div>
    </div>
  );
}

function PlaylistPage({ data, setData, admin, playQueue }) {
  const permanentPlaylists = data?.playlists ?? [];

  const [localPlaylists, setLocalPlaylists] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("xjp56_playlists") ?? "[]");
    } catch {
      return [];
    }
  });

  const saveLocalPlaylists = (updated) => {
    setLocalPlaylists(updated);
    try {
      localStorage.setItem("xjp56_playlists", JSON.stringify(updated));
    } catch {}
  };

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [editingIsLocal, setEditingIsLocal] = useState(false);

  const openCreate = () => {
    setEditingPlaylist(null);
    setEditingIsLocal(!admin);
    setBuilderOpen(true);
  };

  const openEdit = (pl, isLocal) => {
    setEditingPlaylist(pl);
    setEditingIsLocal(isLocal);
    setBuilderOpen(true);
  };

  const handleSave = (pl) => {
    if (editingIsLocal) {
      const existing = localPlaylists.findIndex((p) => p.id === pl.id);
      if (existing >= 0) {
        const updated = [...localPlaylists];
        updated[existing] = pl;
        saveLocalPlaylists(updated);
      } else {
        saveLocalPlaylists([...localPlaylists, pl]);
      }
    } else {
      const existing = permanentPlaylists.findIndex((p) => p.id === pl.id);
      if (existing >= 0) {
        const updated = [...permanentPlaylists];
        updated[existing] = pl;
        setData((prev) => ({ ...prev, playlists: updated }));
      } else {
        setData((prev) => ({ ...prev, playlists: [...(prev.playlists ?? []), pl] }));
      }
    }
    setBuilderOpen(false);
  };

  const handleDelete = (id, isLocal) => {
    if (isLocal) {
      saveLocalPlaylists(localPlaylists.filter((p) => p.id !== id));
    } else {
      setData((prev) => ({ ...prev, playlists: prev.playlists.filter((p) => p.id !== id) }));
    }
  };

  const handlePlay = (pl) => {
    const items = resolvePlaylistTracks(pl, data?.singles);
    if (items.length) playQueue(items, 0);
  };

  const hasContent = permanentPlaylists.length > 0 || localPlaylists.length > 0;

  return (
    <div className="px-4 py-8 mx-auto max-w-7xl">
      {/* Page header */}
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light text-[#1C1C1C] tracking-tight">歌单</h1>
          <div className="text-[10px] tracking-[0.25em] text-[#AAAAAA] uppercase mt-1">PLAYLIST</div>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#1C1C1C] text-white text-xs tracking-widest px-6 py-2.5 hover:bg-[#333] transition-colors"
        >
          新建歌单
        </button>
      </div>

      {!hasContent && (
        <div className="text-center py-20 text-sm text-[#AAAAAA]">暂无歌单</div>
      )}

      {/* Permanent playlists */}
      {permanentPlaylists.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8 mb-12">
          {permanentPlaylists.map((pl) => (
            <PlaylistCard key={pl.id} pl={pl} isLocal={false} singles={data?.singles} admin={admin} onPlay={handlePlay} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Local playlists */}
      {localPlaylists.length > 0 && (
        <div>
          {permanentPlaylists.length > 0 && (
            <div className="border-t border-[#E0E0E0] mb-6 pt-6">
              <div className="text-[10px] tracking-[0.25em] text-[#AAAAAA] uppercase mb-4">本地歌单</div>
            </div>
          )}
          {permanentPlaylists.length === 0 && (
            <div className="text-[10px] tracking-[0.25em] text-[#AAAAAA] uppercase mb-4">本地歌单</div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">
            {localPlaylists.map((pl) => (
              <PlaylistCard key={pl.id} pl={pl} isLocal={true} singles={data?.singles} admin={admin} onPlay={handlePlay} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* PlaylistBuilder modal */}
      <Dialog open={builderOpen} onOpenChange={(open) => { if (!open) setBuilderOpen(false); }}>
        <ScrollDialogContent className="max-w-3xl">
          <PlaylistBuilder
            singles={data?.singles ?? []}
            initialPlaylist={editingPlaylist}
            onSave={handleSave}
            onClose={() => setBuilderOpen(false)}
          />
        </ScrollDialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/jiazheng/idol/xjp56-app && npm run build 2>&1 | tail -20
```
Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add PlaylistPage component"
```

---

## Chunk 5: Navigation & Root Wiring

### Task 7: Add playlist tab to TopBar and wire page into XJP56App

**Files:**
- Modify: `src/App.jsx:935-941` (TopBar tabs), `src/App.jsx:3863` (XJP56App return JSX)

- [ ] **Step 1: Add playlist tab to TopBar**

In `TopBar` (line 935), update the `tabs` array:

```js
  const tabs = [
    { key: "home", cn: "主页", en: "HOME" },
    { key: "members", cn: "成员", en: "MEMBER" },
    { key: "singles", cn: "单曲", en: "SINGLES" },
    { key: "election", cn: "总选举", en: "ELECTION" },
    { key: "gallery", cn: "相册", en: "GALLERY" },
    { key: "playlist", cn: "歌单", en: "PLAYLIST" },
  ];
```

- [ ] **Step 2: Add PlaylistPage to XJP56App router**

In `XJP56App` return JSX (around line 3944, after the `gallery` block), add:

```jsx
        {page === "playlist" ? (
          <motion.div
            key="playlist"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
          >
            <PlaylistPage
              data={data}
              setData={setData}
              admin={admin}
              playQueue={playQueue}
            />
          </motion.div>
        ) : null}
```

- [ ] **Step 3: Final build and comprehensive manual test**

```bash
cd /Users/jiazheng/idol/xjp56-app && npm run build 2>&1 | tail -20
```
Expected: `✓ built in` with no errors.

Manual test checklist (run `npm run dev` or serve the build):

1. **Navigation**: 歌单 tab appears in navbar after 相册; clicking it shows PlaylistPage
2. **Create local playlist**:
   - Click 新建歌单 (not admin mode)
   - Upload a cover image
   - Enter a title
   - Check 2–3 tracks
   - Drag-and-drop to reorder selected tracks
   - Save → appears in "本地歌单" section
   - Refresh page → local playlist persists (localStorage)
3. **Create admin playlist**:
   - Enable admin mode (localhost settings menu)
   - Click 新建歌单
   - Save → appears above local section (no "本地歌单" label for it)
   - Refresh page → still there (backend)
4. **Play playlist**: Click play button on a playlist card → FloatingPlayer appears at bottom-right with first track
5. **FloatingPlayer collapsed**: Shows cover thumbnail with SVG progress arc
6. **FloatingPlayer expanded**: Shows track name, single title, progress bar, prev/next/play-pause, counter, 停止 button
7. **Page navigation during playback**: Navigate to 成员, 总选举, 主页 — audio keeps playing, FloatingPlayer stays visible
8. **Single track play**: Go to 单曲, open a single with audio, click play button — FloatingPlayer appears; close modal — audio continues
9. **Track play/pause icon**: Active track shows Pause icon, others show Play icon
10. **Stop**: Click 停止 in FloatingPlayer → player disappears
11. **Edit playlist**: Click pencil on a playlist → builder pre-filled with existing data
12. **Delete playlist**: Click trash → removed immediately
13. **Empty playlist**: Play button disabled
14. **Mobile**: Test on iPhone viewport (toggle devtools device mode) — grid is 2-column, FloatingPlayer expanded is full-width, builder panels stack vertically

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire PlaylistPage into navigation and XJP56App router"
```

- [ ] **Step 5: Final commit summary**

```bash
git log --oneline -8
```

Verify all 7 commits are present in sequence.
