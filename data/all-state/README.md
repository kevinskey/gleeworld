# All-State Layer 1 source data

One JSON file per state, matching `SCHEMA.md`. These are the *source* of the
global editorial canon in `gw_all_state_*` — the database is loaded from here,
not hand-edited, so a state's data is reviewable in a diff.

Load (idempotent — safe to re-run, only new rows insert):

    node scripts/load-all-state-json.mjs data/all-state > /tmp/all-state.sql
    # review, then:
    ssh root@<droplet> 'docker exec -i supabase-db psql -U supabase_admin -d postgres' < /tmp/all-state.sql

Note `-U supabase_admin`, not `postgres` — 43 gw_ tables are owned by
supabase_admin and postgres is not superuser.

Rows load as `pending_verification`. Publishing is a separate act, either in
the staff editor at /dashboard/all-state-admin or by flipping
`verification_status` to `verified`.

## The one rule that matters

**Omission beats invention.** Every field except identifiers is optional. A
missing fee renders as nothing; a guessed one renders as authoritative next to
a source link, which is worse than useless — it is a lie with a citation.
Anything an association does not publish belongs in `not_published`, which is
how gaps stay visible instead of becoming silent holes.

Retrieved 2026-08-07 from each association's own site.

## Known shape of the domain, learned the hard way

- **The MEA does not always run it.** Indiana's is ACDA, Iowa's is the High
  School Music Association, South Dakota's is the high school activities
  association, Michigan's choral side is MSVMA, Wisconsin's is WSMA,
  Missouri's is MCDA, Montana's is MHSA, West Virginia's is WVVMA.
- **Seasons drift within a single page.** Associations routinely post next
  season's repertoire above last season's deadlines. Several files carry
  `season: "2025-26"` because that is genuinely all that was published; they
  are labelled honestly rather than relabelled.
- **Acronyms collide.** MMEA is Missouri, Minnesota, Maryland, Massachusetts,
  Maine, Montana and Mississippi depending on the domain. NMEA is Nebraska and
  Nevada. TMEA is Texas and Tennessee. Search results cross-contaminate.
- **Not every state has one.** DC and Hawaii have no statewide auditioned
  All-State chorus; both are recorded with `no_program_found: true` and an
  explanation rather than left blank.
- **Much of it is behind a login.** Kentucky, New Jersey and parts of others
  gate requirements and fees behind member portals. Those are `not_published`,
  not missing work.
