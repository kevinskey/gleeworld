/**
 * Detects a reply that narrates WHERE the assistant looked.
 *
 * The prompt forbids this, and the prompt alone does not hold. The model
 * reproduces prescribed sentences reliably but routes around prohibitions by
 * inventing new phrasings — live testing on 2026-08-06 produced "Neither the
 * choral reference library nor a web search turned up anything" after the ban
 * list already covered four earlier variants. So the rule is enforced here,
 * deterministically, the way the empty-reply guard already is.
 *
 * THE HARD PART IS NOT THE LEAK, IT IS THE FALSE POSITIVE. The assistant
 * legitimately discusses the tenant's own collections:
 *
 *   "It doesn't look like the Verdi Requiem is in your music library right now."
 *   "I added it to the media library."
 *
 * Those are real app features and must never be flagged. So this matches the
 * RETRIEVAL CORPUS by name, and phrases about consulting sources — never the
 * bare word "library".
 */

/**
 * Corpus names that are not "<something> library" — handled separately below
 * by namesACorpusLibrary(), which allow-lists our own collections instead of
 * trying to enumerate theirs.
 */
const CORPUS_NAMES = [
  /\bknowledge base\b/i,
  /\bchoral records\b/i,
];

/**
 * Collections the assistant SHOULD talk about — real features of the app.
 * Everything else modifying "library" is a retrieval corpus and a leak.
 *
 * This is an allow-list of the legitimate ones, NOT a block-list of corpus
 * names. The block-list lost: it named reference/academy/choral, and then
 * search_music_facts shipped and the model said "the instrument facts
 * library". Every new corpus invents a new name; the set of user-facing
 * collections is small and changes only when we add a feature.
 */
const APP_COLLECTIONS = new Set([
  'music', 'media', 'sheet', 'personal', 'score', 'scores', 'video', 'audio',
  'digital', 'glee', 'your', 'their', 'our', 'the', 'this', 'that', 'a', 'my',
]);

/** "<word> library" where <word> is not one of ours. */
function namesACorpusLibrary(text: string): boolean {
  for (const m of text.matchAll(/\b(\w+)\s+librar(?:y|ies)\b/gi)) {
    if (!APP_COLLECTIONS.has(m[1].toLowerCase())) return true;
  }
  return false;
}

/**
 * "the choral reference", "our reference", "the reference doesn't cover" —
 * "reference" used as a NOUN for a source. Excluded: its legitimate adjectival
 * uses, "reference pitch" and "reference recording".
 */
const REFERENCE_AS_SOURCE =
  /\b(?:our|the|my|its)\s+(?:\w+\s+)?references?\b(?!\s+(?:pitch|recording|track|tone|point))/i;

/**
 * Narrating consultation or possession of sources, independent of what the
 * corpus is called. This is what catches a wording the adjective list misses.
 */
const CONSULTATION = [
  /\bweb (?:search|sources?)\b/i,
  /\b(?:I have|I've had) access to\b/i,
  /\b(?:available|accessible) to me\b/i,
  /\bat my disposal\b/i,
  /\bmy sources\b/i,
  /\bnothing came back\b/i,
  /\b(?:searched|checked|looked) (?:the |through |in )?(?:web|internet|librar(?:y|ies)|records|sources|materials)\b/i,
  /\bin the (?:material|passages|documents) (?:I|available)\b/i,
];

/**
 * Liturgical law is the ONE place naming a source is correct — the citation is
 * the answer. Callers pass `liturgyTurn` when search_liturgy ran this turn, but
 * this phrase is also allowed outright: it is the prescribed miss-message and
 * would otherwise trip CONSULTATION.
 */
const LITURGY_ALLOWED = /\bofficial Church documents\b/i;

export function namesItsSources(reply: string): boolean {
  if (!reply.trim()) return false;
  // Strip the sanctioned liturgy phrasing before testing, so a liturgy answer
  // that ALSO leaks the choral corpus is still caught.
  const text = reply.replace(LITURGY_ALLOWED, ' ');
  if (namesACorpusLibrary(text)) return true;
  if (REFERENCE_AS_SOURCE.test(text)) return true;
  return [...CORPUS_NAMES, ...CONSULTATION].some((re) => re.test(text));
}

/** The corrective nudge, kept next to the detector so they stay in sync. */
export const SOURCE_LEAK_NUDGE =
  'Your last message told the user where you looked. Never do that: not "the reference library", not "the academy library", not "a web search", not "the records available to me". The user asked a question, not for your research process. Rewrite that answer now with every mention of what you consulted removed. If you could not find the answer, the whole sentence is "I could not verify that." — followed only by an offer to try a different spelling or a narrower question. Keep everything else about the answer the same.';
