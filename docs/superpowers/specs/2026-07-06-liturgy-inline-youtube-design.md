# Liturgy Planner — Inline YouTube Playback per Song Slot

**Date:** 2026-07-06
**Status:** Approved (approach A, brainstorm with Kevin)
**Surface:** `src/pages/dashboard/LiturgyPlannerPage.tsx` only (SongSlot component, line ~812, + its parent Order of Mass card)

## Goal

When a song slot in the Order of Mass has a YouTube URL, the director can play the video inline — the player expands directly under that slot, above the next selection — instead of being bounced to a new tab and losing form state.

## Behavior

1. **Button states (per slot):**
   - No title and no URL → "Search" disabled (unchanged).
   - Title, no URL → "Search" opens the existing YouTubeSearchModal (unchanged).
   - Parseable YouTube URL → button reads **"Play"**; clicking toggles the inline player for this slot.
   - URL present but not parseable as a YouTube video ID → button falls back to today's behavior: "Open" in a new tab.
2. **Inline player:** mounts directly below the slot's YouTube URL input (inside the slot's column, above the next slot). 16:9 aspect, full column width, `rounded-xl overflow-hidden` per the iOS design system, `border border-border`.
   - `https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0` iframe, `allow="autoplay; encrypted-media; picture-in-picture; fullscreen"`, `title` set to the slot's song title (or label) for a11y. CSP `frame-src` already permits this host.
   - Header row above the iframe: truncated video/slot title, an "open in YouTube ↗" external link (new tab, `noopener`), and an ✕ close button (`data-compact`, but ≥44px hit area on touch via padding).
3. **One player at a time:** the Order of Mass parent owns `playingSlot: string | null` (slot key). Playing slot B unmounts slot A's iframe (audio stops because the iframe unmounts — no postMessage needed). ✕ or toggling the same slot's Play sets it to null.
4. **Unmount = stop.** The iframe renders only while `playingSlot === slotKey`. No YouTube IFrame API, no postMessage state reading (the known onStateChange/postMessage gotchas apply only to reading player state, which this feature never does).
5. **Editing while playing:** changing the slot's URL while its player is open closes the player (stale video). Editing the title does not.

## Implementation notes

- `getYouTubeId(url: string): string | null` — handles `watch?v=`, `youtu.be/<id>`, `shorts/<id>`, `embed/<id>`, ignores extra query params, validates 11-char ID charset `[A-Za-z0-9_-]{11}`. Lives in the same file (only consumer); move to a util if a second consumer appears later.
- `SongSlot` gains props: `slotKey: string`, `playing: boolean`, `onPlayToggle: (slotKey: string | null) => void`. Parent renders all slots and passes `playing={playingSlot === key}`.
- No DB/schema changes. No new dependencies. Works for all 9 slots including Mass Setting.

## Error handling

- Invalid/unparseable URL → new-tab fallback (never a broken embed).
- Embed-restricted videos (owner disabled embedding) show YouTube's own "Watch on YouTube" error card inside the iframe — the header's external link is the escape hatch; no custom detection.

## Testing

- Unit: `getYouTubeId` against watch/short/shorts/embed/invalid URL shapes (vitest, co-located test file).
- Manual on preview: play → player appears under slot; play another slot → first closes; ✕ closes; URL edit closes; unparseable URL opens new tab; phone width (390px) player fits column.
