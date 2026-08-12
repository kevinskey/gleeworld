// Phantom-playback guard.
//
// On long threads the model imitates its own earlier "Playing X on YouTube
// now." turns from history instead of calling the play tool — the reply
// claims playback while no player ever opens (Kevin, 2026-08-12: fresh
// thread played fine, his standing thread answered "Playing … now" with no
// resultsPanel, turn after turn). Prompt-only rules don't hold for this
// model (the 2026-08-06 source-leak lesson: it reproduces prescribed
// sentences but paraphrases around prohibitions), so index.ts enforces it:
// a reply that claims playback on a turn with no playback action gets ONE
// corrective re-ask, then we accept what comes back.

// Honest denials ("nothing is playing right now", "I stopped the music")
// must never trip the guard.
const DENIAL = /\b(?:nothing|not|isn'?t|no longer|stopped|can'?t|cannot|couldn'?t|unable)\b[^.!?\n]{0,40}\bplay/i;

const CLAIMS = [
  /\bnow playing\b/i,
  // "Playing X … now / for you / on YouTube / on Apple Music"
  /\b(?:playing|queuing(?:\s+up)?|starting|pulling up)\b[^.!?\n]{0,80}\b(?:now|for you|on youtube|on apple music)\b/i,
  // 'Playing "Title"' — the claim-shaped opener the failing thread used.
  /^\s*playing\s+["“']/i,
];

export function claimsPlayback(reply: string): boolean {
  if (DENIAL.test(reply)) return false;
  return CLAIMS.some((re) => re.test(reply));
}

export const PLAYBACK_CLAIM_NUDGE =
  'You told the user something is playing, but you started no player this turn — nothing is actually playing, no matter what earlier turns in this conversation say. Either call play_video (or play_apple_music / play_my_playlist) RIGHT NOW with the piece they asked for, or answer honestly without claiming playback.';
