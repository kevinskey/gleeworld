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
 * Naming the retrieval corpus: a corpus adjective followed by a collection
 * noun, allowing one word between them.
 *
 * Written as a cross-product rather than a list of literals ON PURPOSE. Three
 * successive live tests produced three different wordings — "reference
 * library", then "choral records available to me", then "choral reference
 * materials". Enumerating phrasings loses to a model that generates new ones;
 * only the adjective set is small and stable.
 *
 * The adjectives are the safety mechanism. "music library" and "media library"
 * are real app features the assistant SHOULD talk about, and neither adjective
 * appears here.
 */
const CORPUS_NAMES = [
  /\b(?:reference|academy|choral|internal|knowledge)\s+(?:\w+\s+)?(?:librar(?:y|ies)|materials?|records?|sources?|documents?|base)\b/i,
  /\bknowledge base\b/i,
];

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
  return [...CORPUS_NAMES, ...CONSULTATION].some((re) => re.test(text));
}

/** The corrective nudge, kept next to the detector so they stay in sync. */
export const SOURCE_LEAK_NUDGE =
  'Your last message told the user where you looked. Never do that: not "the reference library", not "the academy library", not "a web search", not "the records available to me". The user asked a question, not for your research process. Rewrite that answer now with every mention of what you consulted removed. If you could not find the answer, the whole sentence is "I could not verify that." — followed only by an offer to try a different spelling or a narrower question. Keep everything else about the answer the same.';
