# Assistant chord-naming speech design (2026-08-11)

## Problem

When the assistant talks music theory, it writes chords as bare Roman numerals
("the i chord", "V7"). TTS reads those as letters — "the eye chord", "vee
seven" — which is gibberish to the ear. Separately, the live voice mispronounces
"predominant" as "prudominate".

## Decision (Kevin, 2026-08-11)

Words + notation in text: voice says "the minor one chord"; typed replies show
the words with the symbol in parentheses on first mention — "the minor one
chord (i)", "the dominant seven (V7)". Letter chords get their quality spelled
out ("D minor", never "Dm"). "Pre-dominant" is always written hyphenated, which
both matches modern theory usage and makes TTS pronounce it correctly.

## Approach

Prompt-first (approach A), per the 2026-08-06 lesson: this model follows
prescribed sentences well; it only paraphrases around prohibitions. A narrow
code net covers the one case prompts can't: typed replies are also read aloud
on the mic path, so the parenthetical symbols must be stripped before TTS.

1. **`supabase/functions/assistant-chat/prompt.ts`** — new "Naming chords and
   harmony" note: name every chord by quality and scale degree in words; on
   non-voice turns the symbol may follow in parentheses on first mention; on
   voice turns (`ctx.voice`) symbols are banned outright. Functional names
   (tonic, pre-dominant, dominant) welcome; "pre-dominant" always hyphenated.
2. **`src/lib/assistant/speech.ts` — `sanitizeForSpeech`** — two additions:
   - strip parenthetical chord symbols — parens whose entire content is a
     Roman-numeral chord symbol, e.g. `(i)`, `(V7)`, `(vii°)`, `(♭VI)`,
     `(V6/4)`, `(V/V)`. Ordinary parentheticals untouched.
   - respell `predominant` → `pre-dominant` (case-preserving) so ElevenLabs
     and browser TTS pronounce it.
3. **ElevenLabs live agent prompt** — PATCH the same rule in (words only, no
   symbols — the reply is speech; write "pre-dominant" hyphenated), with the
   usual `/root/elabs-agent-prompt.bak-*` backup first.

## Not doing

- No rewriting of bare Roman numerals in code ("the i chord" → words): the
  regex false-positive surface ("I" the pronoun, "V" in "Vol. V") is exactly
  the landmine territory the parenthetical-only net avoids.
- No pronunciation dictionary on the ElevenLabs agent — the hyphen respelling
  covers the one known word; revisit if more crop up.

## Tests

- `prompt.test.ts`: non-voice prompt contains the words-plus-symbol example;
  voice prompt bans symbols and omits the parenthetical example.
- `speech.sanitize` tests: chord parentheticals stripped, ordinary
  parentheticals kept, predominant respelled.

## Verification

Live test via the demo@ recipe: minor-key harmony question → reply names
chords in words with symbols in parens; voice turn (`context.voice:true`) →
words only.
