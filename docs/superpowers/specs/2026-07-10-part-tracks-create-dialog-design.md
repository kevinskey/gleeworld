# Part Tracks: New Project dialog — optional score + backing track picker

**Date:** 2026-07-10 · **Approved by:** Kevin (chat)

## Problem

The New Project dialog is score-first and score-required
(`gw_part_tracks_projects.sheet_music_id` is NOT NULL), and the backing
track can only be chosen after entering the studio. Kevin wants to pick
the backing track at creation time, and to create projects with no
score at all (a cappella / by-ear work).

## Design

Dialog becomes three steps; only the title is required:

1. **Project title + voicing** — unchanged fields; title still
   auto-fills from a picked score when empty.
2. **Backing track (optional)** — a button opens the same
   `AccompanimentPicker` used in the studio (Upload / Apple Music /
   YouTube incl. search). The choice is held in dialog state and shown
   as a clearable chip. Applied right after project creation using the
   same persistence shape as the studio handlers (`accompaniment_*`
   columns; file uploads to `part-tracks/<projectId>/accompaniment-*`
   in the sheet-music bucket + accompaniment track `audio_url`).
   Failure to apply is non-fatal: warn and continue (the studio can set
   it again).
3. **Link a score (optional)** — same Music Library search, now
   skippable and clearable.

## Changes

- Migration: `ALTER COLUMN sheet_music_id DROP NOT NULL` (FK/CASCADE
  kept; NULL rows are simply unaffected by score deletes).
- `createPartTracksProject`: `sheetMusicId: string | null`.
- Studio: guard the score-meta query when `sheet_music_id` is null
  (the "Open score" button already hides via `score?.pdf_url &&`).
- Landing page: card subtitle falls back to "No score linked"; header
  copy no longer claims every project starts from the Music Library.

## Out of scope

Editing/relinking a score on an existing project; requiring at least
one of score/backing (both explicitly optional per Kevin).
