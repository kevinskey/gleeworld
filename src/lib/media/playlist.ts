/**
 * Track selection for the SoundCloud player page.
 *
 * Kept apart from the page so the stepping rules are testable without a DOM
 * or a Supabase round trip. Every function is total: an index left over from
 * a longer list (a track was deleted while the page was open) resolves to a
 * real position rather than throwing or playing nothing.
 */

export interface PlaybackState {
  /** Position in the track list, or null when nothing is selected yet. */
  index: number | null;
  playing: boolean;
}

/** True when `index` addresses a track in a list of `count` tracks. */
const inRange = (index: number | null, count: number): index is number =>
  index !== null && index >= 0 && index < count;

/**
 * The track after `index`, wrapping at the end. Null only when there is
 * nothing to play. A stale index restarts the list rather than dead-ending.
 */
export function nextIndex(index: number | null, count: number): number | null {
  if (count <= 0) return null;
  if (!inRange(index, count)) return 0;
  return (index + 1) % count;
}

/**
 * The track before `index`, wrapping at the start. With nothing selected
 * this reaches the last track, so "previous" from a cold player behaves the
 * way it does in every other player.
 */
export function prevIndex(index: number | null, count: number): number | null {
  if (count <= 0) return null;
  if (!inRange(index, count)) return count - 1;
  return (index - 1 + count) % count;
}

/**
 * What tapping track `target` should do. Tapping the playing track pauses it
 * and keeps it selected — the strip needs a current track to render its
 * title and position.
 */
export function toggleFor(state: PlaybackState, target: number): PlaybackState {
  if (state.index === target) return { index: target, playing: !state.playing };
  return { index: target, playing: true };
}
