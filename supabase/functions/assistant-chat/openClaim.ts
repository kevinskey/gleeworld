// Phantom-open guard — the viewer/page twin of playbackClaim.ts.
//
// On long threads the model imitates its own earlier "Opened X in the
// Viewer." turns from history instead of calling open_song/open_page —
// the reply claims the surface opened while the client received no action
// and nothing happens on screen (Kevin, 2026-08-12 19:29-19:54: four
// "Opened … in the viewer" replies in a row, no navigation). Same
// enforcement shape: prompt rules don't hold (2026-08-06 lesson — the
// model reproduces prescribed sentences but paraphrases around
// prohibitions), so index.ts gives one corrective re-ask, then accepts.

// Honest denials, offers ("want me to open it?"), and instructions telling
// the USER to open something must never trip the guard.
const DENIAL = /\b(?:can'?t|cannot|couldn'?t|won'?t|unable|not able|isn'?t able)\b[^.!?\n]{0,40}\bopen/i;
const OFFER = /\b(?:want|would you like|should|shall)\b[^.!?\n]{0,60}\bopen\b/i;

const CLAIMS = [
  // "Opened X …" / "I've opened X …" — the claim-shaped opener the
  // failing thread used four times.
  /\b(?:I(?:'ve| have)?\s+)?opened\b[^.!?\n]{0,100}/i,
  // "It's opening in the Viewer now" / "The Part Tracks page is opening now"
  /\bis opening\b|\b(?:it|that)'?s opening\b/i,
  // "I'll pull up X in the viewer now" / "Pulling up X for you"
  /\b(?:pull(?:ing)? up|pulled up)\b[^.!?\n]{0,100}\b(?:viewer|library|page|screen|now|for you)\b/i,
  // "The score is open in the Viewer."
  /\b(?:is|are) (?:now )?open\b[^.!?\n]{0,40}\b(?:viewer|library|page)\b/i,
];

export function claimsOpen(reply: string): boolean {
  if (DENIAL.test(reply) || OFFER.test(reply)) return false;
  // "Opened" must be the assistant's own past/progressive act — an
  // imperative "Open the score in the Music Library, …" instructs the user.
  return CLAIMS.some((re) => re.test(reply));
}

// Open-intent detector — the other half of making score-opens rock solid
// (Kevin, 2026-08-12: "one of if not the most important thing"). When the
// user's message matches an open-a-score shape and the turn is about to end
// with NO open action, index.ts forces one corrective re-ask. The prompt
// carries the same phrasing catalog; this is the code floor under it.
const OPEN_VERB = String.raw`(?:open|show(?:\s+me)?|pull\s+up|bring\s+up|put(?:\s+up)?|display|view|let\s+me\s+see|see)`;
const OPEN_TARGET = String.raw`(?:viewer|score|sheet\s+music|music\s+library|pdf|version|on\s+(?:the\s+)?screen)`;
const OPEN_INTENT = new RegExp(String.raw`\b${OPEN_VERB}\b[\s\S]{0,90}?\b${OPEN_TARGET}\b`, 'i');

export function isOpenScoreIntent(userMessage: string): boolean {
  return OPEN_INTENT.test(userMessage);
}

export const OPEN_INTENT_NUDGE =
  'The user asked you to OPEN a score and you have not called an open tool this turn. Do it NOW: call search_music for the piece if you need the id (retry with composer or original-language title on a miss), then call open_song with the best match. Only ask which one when the results are genuinely different works — different arrangements of the same piece are not a reason to stop. If the library truly does not have it, say so plainly.';

export const OPEN_CLAIM_NUDGE =
  'You told the user something opened, but you called no open tool this turn — nothing opened on their screen, no matter what earlier turns in this conversation say. Either call open_song (for a score; search_music first if you need the id), open_page, or open_note RIGHT NOW for what they asked, or answer honestly without claiming anything opened.';
