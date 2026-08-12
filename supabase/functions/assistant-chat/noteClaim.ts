// Phantom-note guard + save-intent floor — the notes strain of the
// playback/open disease, and the third of Kevin's top-importance actions
// (2026-08-12: score-opens, playback, saving chats to a note).
//
// The live failure that motivated it (same day, 17:32-17:33 UTC): "Can you
// put what you have about the German Requiem in the notes?" → "I've saved a
// note … It's in your Planner notes now." — no create_note action attached.
// When the user said the note was missing she doubled down: "It's being
// saved now — I've added it …". Same enforcement shape as the other
// guards: one corrective re-ask per strain, then accept.

// Honest denials and offers must never trip the claim guard.
const DENIAL = /\b(?:can'?t|cannot|couldn'?t|won'?t|unable|not able)\b[^.!?\n]{0,50}\b(?:note|save|planner)/i;
const OFFER = /\b(?:want|would you like|should|shall)\b[^.!?\n]{0,60}\b(?:save|note)\b/i;

const CLAIMS = [
  // "I've saved a note …" / "Saved it to your Planner"
  /\b(?:I(?:'ve| have)?\s+)?(?:saved|added|created|put)\b[^.!?\n]{0,80}\b(?:notes?|planner)\b/i,
  // "It's being saved now" / "It's saving now" — the double-down shape.
  /\b(?:is being|it'?s being)\s+saved\b|\bbeing saved now\b/i,
  // "It's in your Planner notes now."
  /\b(?:in your|to your)\s+(?:planner\s+)?notes?\b[^.!?\n]{0,20}\bnow\b/i,
];

export function claimsNoteSaved(reply: string): boolean {
  if (DENIAL.test(reply) || OFFER.test(reply)) return false;
  return CLAIMS.some((re) => re.test(reply));
}

// "save this as a note", "put our research in my notes", "add that to my
// planner", "write that down", "capture this conversation".
const SAVE_VERB = String.raw`(?:save|put|add|write|capture|store)`;
const SAVE_TARGET = String.raw`(?:notes?|planner)`;
const SAVE_INTENT = new RegExp(String.raw`\b${SAVE_VERB}\b[\s\S]{0,80}?\b${SAVE_TARGET}\b`, 'i');
const WRITE_DOWN = /\bwrite\s+(?:that|this|it)\s+down\b/i;

export function isSaveNoteIntent(userMessage: string): boolean {
  return SAVE_INTENT.test(userMessage) || WRITE_DOWN.test(userMessage);
}

export const NOTE_CLAIM_NUDGE =
  'You told the user a note was saved, but you called create_note on nothing this turn — no note exists, no matter what earlier turns say. Either call create_note RIGHT NOW with a distilled title and body of what they asked to keep, or answer honestly without claiming anything was saved.';

export const NOTE_INTENT_NUDGE =
  'The user asked you to SAVE something to their notes and you have not called create_note this turn. Call create_note NOW with a clear title and a distilled body of what they asked to keep. Do not claim it is saved without the call.';
