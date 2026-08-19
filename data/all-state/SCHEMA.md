# State data contract

Write exactly one file per state: `<state-slug>.json` (e.g. `alabama.json`).
The loader (`load-states.mjs`) reads these directly into Layer 1.

**Every string field is optional EXCEPT where marked required. OMIT a field
entirely rather than guessing. `null`, `""`, "TBD", "unknown", and invented
values are all worse than absence — an absent field renders as nothing, a
wrong one renders as authoritative.**

```jsonc
{
  "state_slug": "alabama",              // REQUIRED, must match gw_all_state_states.slug
  "retrieved_at": "2026-08-07",         // REQUIRED, date you actually scraped
  "no_program_found": false,            // set true if the state has no All-State CHORUS
                                        // program you could find; then omit everything below
  "notes": "…",                         // anything a human reviewer should know

  "organization": {                     // REQUIRED unless no_program_found
    "name": "Alabama Music Educators Association",   // REQUIRED
    "acronym": "AMEA",
    "website_url": "https://…",
    "description": "…"                  // 1-3 sentences, factual, from their own pages
  },

  "sources": [                          // REQUIRED, >=1. Pages you actually read.
    { "name": "AMEA All-State Choral Festival",
      "url": "https://…",
      "source_type": "official" }       // official | handbook_pdf | calendar | news | other
  ],

  "programs": [                         // REQUIRED unless no_program_found. >=1.
    {
      "name": "All-State Choral Festival — SATB Choir",  // REQUIRED, the state's own wording
      "lineage_key": "alabama-satb",    // REQUIRED, stable across seasons, NO season in it
      "season": "2026-27",              // REQUIRED. Use the state's own label if different.
      "school_level": "high",           // elementary | middle | high | collegiate | other
      "ensemble_type": "mixed chorus",
      "description": "…",

      "dates": [
        { "date_type": "registration_deadline",   // registration_deadline | audition_round |
                                                  // acceptance_deadline | event | results | other
          "title": "Registration closes",         // REQUIRED
          "start_at": "2026-09-15",               // ISO date, or date+time if published
          "end_at": "2026-09-17",                 // omit for single-day
          "all_day": true,                        // TRUE unless a clock time was published
          "timezone": "America/Chicago",          // the zone the STATE published in
          "description": "…",
          "source_url": "https://…" }             // REQUIRED
      ],

      "requirements": [
        { "category": "eligibility",              // eligibility | membership | materials |
                                                  // scales | sight_reading | rubric | format | other
          "title": "…",                           // REQUIRED
          "description": "…",
          "structured_data": {},                  // optional machine-readable detail
          "source_url": "https://…" }             // REQUIRED
      ],

      "repertoire": [
        { "title": "…",                           // REQUIRED
          "composer": "…",                        // OMIT if not published. Do NOT look it up.
          "arranger": "…", "publisher": "…", "catalog_number": "…",
          "voicing": "SATB", "purpose": "audition", // audition | performance
          "notes": "…",                           // e.g. round restrictions
          "source_url": "https://…" }
      ],

      "fees": [
        { "fee_type": "audition",                 // REQUIRED
          "amount_cents": 2500,                   // integer cents. OMIT if not published.
          "payable_to": "state_association",      // state_association | director | school | unknown
          "description": "…",
          "source_url": "https://…" }
      ],

      "documents": [
        { "title": "…",                           // REQUIRED
          "url": "https://…",                     // REQUIRED
          "document_type": "handbook",            // handbook | rules | form | calendar | other
          "published_at": "2026-05-01" }
      ],

      "voice_parts": [
        { "code": "S1", "label": "Soprano 1" }    // code = stable key, label = STATE's wording
      ]
    }
  ],

  "not_published": [                    // REQUIRED. What you looked for and could not find.
    "Fee amounts — behind member login",
    "2026-27 audition dates — only 2025-26 posted"
  ]
}
```

## Hard rules

1. **Never invent.** No composer lookups, no "typical" dates, no fees from
   third-party sites. If the association hasn't published it, it goes in
   `not_published`.
2. **Flag prior-year data.** Many associations still show last season. If you
   only find 2025-26, either use `"season": "2025-26"` and say so in `notes`,
   or omit the program. Never relabel old data as 2026-27.
3. **`all_day: true` unless a clock time was actually published.** Midnight is
   not a published deadline.
4. **Facts only in repertoire** — titles, composers, publishers. Never lyrics,
   excerpts, or musical content.
5. **Be economical.** Roughly 8-12 Firecrawl calls per state. Prefer one
   `search`, then scrape only the most authoritative pages.
6. **Some states have no All-State chorus**, or fold it into a festival, or run
   it through ACDA rather than the MEA. Set `no_program_found: true` with an
   explanation in `notes` — that is a valid, useful result, not a failure.
