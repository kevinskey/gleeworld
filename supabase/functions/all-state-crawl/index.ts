// All-State crawler: fetch → fingerprint → check claims → stage changes.
//
// Admin-triggered (crawl one source, one state, or a bounded batch). The
// scheduled layer is the Firecrawl monitors; this is what an admin runs when
// a monitor email says "Georgia changed" and they want the structured answer.
//
// Non-negotiables from the brief, all implemented here:
// - HASH BEFORE EXTRACT: unchanged content costs one fetch and zero analysis.
// - CRAWLS NEVER DELETE OR OVERWRITE: this function writes snapshots, change
//   rows, and source-health fields. It never touches the canon tables.
// - EXTRACTION FAILURE IS NOT A DATA CHANGE: fetch errors mark the source
//   unavailable and stop; existing published data is untouched.
// - RESPECT THE SITES: one fetch per source per run, batch capped at 15,
//   1.5s spacing, identified crawler.
//
// What "check claims" means today, deliberately deterministic: every
// published gw_all_state_dates row citing this source is searched for in the
// fresh content across common US date formats. Missing → one OPEN
// 'date_not_found' change row (deduped by partial unique index). A season
// rollover marker ("2027-2028", "2027-28") appearing when our data is 2026-27
// → 'season_rollover'. No new values are guessed; staged_extractions waits
// for an extractor with its own verification loop.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MONTHS = ['January','February','March','April','May','June','July',
  'August','September','October','November','December'];

/** Every textual form a US association plausibly prints a date in. */
function dateForms(iso: string): string[] {
  const d = new Date(iso);
  const m = d.getUTCMonth(), day = d.getUTCDate(), y = d.getUTCFullYear();
  const mon = MONTHS[m], mon3 = mon.slice(0, 3);
  return [
    `${mon} ${day}, ${y}`, `${mon} ${day} ${y}`, `${mon} ${day}`,
    `${mon3} ${day}, ${y}`, `${mon3}. ${day}, ${y}`, `${mon3} ${day}`, `${mon3}. ${day}`,
    `${m + 1}/${day}/${y}`, `${m + 1}/${day}/${String(y).slice(2)}`, `${m + 1}/${day}`,
    `${mon} ${day}st`, `${mon} ${day}nd`, `${mon} ${day}rd`, `${mon} ${day}th`,
  ];
}

/**
 * Calendar-layout match: GMEA's statewide calendar (and others like it) lists
 * dates as bare day numbers under a month heading —
 *   ### September
 *   15 All-State Chorus Registration...
 * — so no full-date form ever appears. First live crawl flagged 12 of 15
 * Georgia claims "missing" for exactly this reason. If the content has a
 * heading for the claim's month, look for the day number at a line start
 * within that month's section.
 */
function calendarFormFound(markdown: string, iso: string): boolean {
  const d = new Date(iso);
  const mon = MONTHS[d.getUTCMonth()], day = d.getUTCDate();
  const re = new RegExp(`^#{1,6}\\s*${mon}\\b[\\s\\S]*?(?=^#{1,6}\\s|$(?![\\s\\S]))`, 'im');
  const section = markdown.match(re)?.[0];
  if (!section) return false;
  return new RegExp(`^\\s*${day}(?:[-–,\\s]|$)`, 'm').test(section);
}

/**
 * Ask the LLM what the claim's NEW date is — then refuse to believe it
 * unless the answer is verifiable on the page.
 *
 * A guessed date in a review queue is worse than "this date disappeared":
 * an admin might approve it on trust. So the extraction is only staged when
 * BOTH hold: (a) the model's evidence quote appears verbatim in the content,
 * and (b) the extracted date itself is found on the page by the same
 * deterministic matchers that flagged the old one missing. Fail either
 * check and we stage nothing — the change row stays a plain "disappeared".
 */
async function extractNewDate(
  claimTitle: string,
  oldDate: string,
  markdown: string,
): Promise<{ newDate: string; evidence: string } | { fail: string } | null> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) return { fail: 'no_api_key' };
  try {
    const res = await fetch(
      Deno.env.get('ASSISTANT_API_URL') ?? 'https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: Deno.env.get('ASSISTANT_MODEL') ?? 'deepseek-v4-pro',
        // v4-pro emits a reasoning channel that shares the token budget; a
        // 300-token cap truncated the JSON answer mid-object on real pages.
        max_tokens: 2000, temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: `A music association's page previously stated "${claimTitle}" happening on ${oldDate.slice(0, 10)}. That exact date no longer appears; the item's date has likely MOVED. Read the page content and answer in JSON: {"new_date":"YYYY-MM-DD or null","evidence":"the text from the page stating it, or null"}.\nNotes: the page may word the item differently — match by meaning (e.g. "All-State Chorus Registration and Payment Postmark Deadline" is the same item as "Registration and payment due"). Calendar pages often list bare day numbers under a MONTH heading; that heading is the month. For a school-year calendar (e.g. 2026-27), July-December belong to the first year and January-June to the second. Return nulls only if no date for this item appears at all.\n\nPAGE CONTENT:\n${normalizeContent(markdown).slice(0, 12000)}`,
        }],
      }),
    });
    if (!res.ok) return { fail: `llm_http_${res.status}` };
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
    const newDate = String(parsed.new_date ?? '');
    const evidence = String(parsed.evidence ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || !evidence) {
      return { fail: `llm_declined:${JSON.stringify(parsed).slice(0, 120)}` };
    }
    // Verification (a): the evidence must exist on the page. Compare with all
    // markdown punctuation stripped — the page says "15 [All-State Chorus
    // Registration...](https://…)" while the model quotes it clean, and a
    // verbatim substring test fails on every link-wrapped line.
    const squash = (t: string) => normalizeContent(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!squash(markdown).includes(squash(evidence))) return { fail: 'evidence_not_on_page' };
    // Verification (b): the date itself must be findable on the page.
    const iso = `${newDate}T00:00:00.000Z`;
    const seen = dateForms(iso).some((f) => markdown.toLowerCase().includes(f.toLowerCase()))
      || calendarFormFound(markdown, iso);
    if (!seen) return { fail: 'date_not_on_page' };
    return { newDate, evidence: evidence.slice(0, 300) };
  } catch (e) {
    return { fail: `exception:${String(e).slice(0, 100)}` };
  }
}

/** Alert every platform owner that a source failed — once per 20h per source. */
async function alertSourceFailure(
  supabase: ReturnType<typeof createClient>,
  sourceId: string,
  url: string,
  errText: string,
): Promise<void> {
  try {
    const { data: owners } = await supabase.from('gw_profiles')
      .select('user_id').eq('is_super_admin', true).not('user_id', 'is', null).limit(5);
    for (const o of owners ?? []) {
      const { data: recent } = await supabase.from('gw_notifications')
        .select('id').eq('user_id', o.user_id).eq('type', 'all_state_source_error')
        .eq('related_id', sourceId)
        .gt('created_at', new Date(Date.now() - 20 * 3600_000).toISOString()).limit(1);
      if (recent?.length) continue;
      await supabase.from('gw_notifications').insert({
        user_id: o.user_id,
        title: 'All-State source unreachable',
        message: `${url} — ${errText.slice(0, 140)}. Published data is untouched; the source is marked unavailable.`,
        type: 'all_state_source_error', category: 'all_state', priority: 2,
        action_url: '/dashboard/all-state-admin', related_id: sourceId,
      });
    }
  } catch { /* alerting must not break the crawl */ }
}

/**
 * Normalize before diffing — the brief calls this the number one failure of
 * change detection, and it proved itself immediately: Google-Docs exports
 * embed a volatile ust= timestamp in every link, so the raw hash differed on
 * every fetch and each crawl reported "changed" on identical content. Strip
 * link targets (keeping their text) and collapse whitespace; hash THAT.
 */
function normalizeContent(markdown: string): string {
  return markdown
    .replace(/\]\((https?:[^)]+)\)/g, ']')   // markdown link targets
    .replace(/https?:\/\/\S+/g, '')            // bare URLs
    .replace(/\s+/g, ' ')
    .trim();
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!firecrawlKey) {
    return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // Caller must be a platform owner: verify the JWT signature via getUser,
  // then check the profile — never trust decoded claims (VERIFY_JWT is off).
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  // Service-role bearer = internal caller (cron, ops) — the same contract as
  // _shared/auth.ts authenticateCaller. Otherwise verify the user JWT's
  // SIGNATURE via getUser and require a platform owner.
  if (token !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: prof } = await supabase.from('gw_profiles')
      .select('is_super_admin').eq('user_id', userData.user.id).maybeSingle();
    if (!prof?.is_super_admin) {
      return new Response(JSON.stringify({ error: 'platform owner only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(15, Number(body.limit ?? 15)));

  // Resolve target sources: one id, one state slug, or the stalest batch.
  let query = supabase.from('gw_all_state_sources')
    .select('id,url,state_id,last_content_hash').eq('crawl_enabled', true);
  if (body.source_id) query = query.eq('id', body.source_id);
  else if (body.state_slug) {
    const { data: st } = await supabase.from('gw_all_state_states')
      .select('id').eq('slug', body.state_slug).maybeSingle();
    if (!st) return new Response(JSON.stringify({ error: 'unknown state' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    query = query.eq('state_id', st.id);
  } else {
    query = query.order('last_crawled_at', { ascending: true, nullsFirst: true });
  }
  const { data: sources, error: srcErr } = await query.limit(limit);
  if (srcErr) return new Response(JSON.stringify({ error: srcErr.message }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const report: Array<Record<string, unknown>> = [];

  for (const src of sources ?? []) {
    const now = new Date().toISOString();
    try {
      const fcRes = await fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${firecrawlKey}` },
        body: JSON.stringify({ url: src.url, formats: ['markdown'], onlyMainContent: false }),
      });
      if (!fcRes.ok) throw new Error(`firecrawl ${fcRes.status}`);
      const fcJson = await fcRes.json();
      const markdown: string = fcJson.data?.markdown ?? fcJson.markdown ?? '';
      if (!markdown) throw new Error('empty content');

      const hash = await sha256(normalizeContent(markdown));

      // HASH BEFORE EXTRACT.
      if (hash === src.last_content_hash) {
        await supabase.from('gw_all_state_sources')
          .update({ last_crawled_at: now, last_success_at: now, health_status: 'healthy' })
          .eq('id', src.id);
        report.push({ url: src.url, status: 'unchanged' });
        continue;
      }

      // Changed: snapshot it, keep only the latest three.
      const { data: snap } = await supabase.from('gw_all_state_snapshots')
        .insert({ source_id: src.id, url: src.url, content_hash: hash, content: markdown })
        .select('id').single();
      const { data: old } = await supabase.from('gw_all_state_snapshots')
        .select('id').eq('source_id', src.id).order('fetched_at', { ascending: false }).range(3, 50);
      if (old?.length) {
        await supabase.from('gw_all_state_snapshots').delete()
          .in('id', old.map((o: { id: string }) => o.id));
      }

      // Check every published claim citing this URL.
      const { data: claims } = await supabase.from('gw_all_state_dates')
        .select('id, title, start_at, timezone, program_id, gw_all_state_programs(state_id, season)')
        .eq('source_url', src.url).not('start_at', 'is', null);

      const haystack = markdown.toLowerCase();
      let missing = 0, rollover = 0;

      for (const c of claims ?? []) {
        const found = dateForms(c.start_at).some((f) => haystack.includes(f.toLowerCase()))
          || calendarFormFound(markdown, c.start_at);
        if (!found) {
          missing++;
          // NOT upsert: the dedupe index is PARTIAL (WHERE status='pending')
          // and PostgREST's onConflict cannot target a partial index — the
          // first live run silently wrote zero rows that way. Check-then-
          // insert, and surface write errors instead of swallowing them.
          const { data: openRow } = await supabase.from('gw_all_state_changes')
            .select('id').eq('date_id', c.id).eq('change_type', 'date_not_found')
            .eq('status', 'pending').maybeSingle();
          if (openRow) {
            await supabase.from('gw_all_state_changes')
              .update({ detected_at: now, snapshot_id: snap?.id ?? null })
              .eq('id', openRow.id);
          } else {
            // Try to extract the replacement value — verified, never trusted.
            const attempt = await extractNewDate(String(c.title), String(c.start_at), markdown);
            const extracted = attempt && 'newDate' in attempt ? attempt : null;
            if (attempt && 'fail' in attempt) {
              report.push({ url: src.url, status: 'extract_declined', reason: attempt.fail });
            }
            if (extracted) {
              await supabase.from('gw_all_state_staged_extractions').insert({
                source_id: src.id, snapshot_id: snap?.id ?? null, program_id: c.program_id,
                payload: { date_id: c.id, title: c.title, old: c.start_at,
                           new_date: extracted.newDate, evidence: extracted.evidence },
                validation_status: 'valid',
              });
            }
            const { error: insErr } = await supabase.from('gw_all_state_changes').insert({
              state_id: (c as Record<string, { state_id?: string }>).gw_all_state_programs?.state_id ?? null,
              program_id: c.program_id, date_id: c.id,
              source_id: src.id, snapshot_id: snap?.id ?? null,
              change_type: 'date_not_found', field_path: 'start_at',
              previous_value: c.start_at,
              new_value: extracted ? extracted.newDate : null,
              detail: extracted
                ? `"${c.title}" moved: the page no longer shows ${c.start_at.slice(0, 10)} and now states ${extracted.newDate}. Evidence: "${extracted.evidence.slice(0, 120)}"`
                : `"${c.title}" (${c.start_at.slice(0, 10)}) no longer appears on the cited page in any recognised format.`,
              detected_at: now, status: 'pending',
            });
            if (insErr) report.push({ url: src.url, status: 'write_error', error: insErr.message });
          }
        }
      }

      // Season rollover: next season's markers present.
      const seasons = new Set((claims ?? []).map((c) =>
        (c as Record<string, { season?: string }>).gw_all_state_programs?.season).filter(Boolean));
      for (const season of seasons) {
        const startYear = Number(String(season).match(/20\d\d/)?.[0]);
        if (!startYear) continue;
        const nextMarkers = [`${startYear + 1}-${startYear + 2}`,
          `${startYear + 1}-${String(startYear + 2).slice(2)}`, `${startYear + 1}–${startYear + 2}`];
        if (nextMarkers.some((m) => markdown.includes(m))) {
          rollover++;
          const stateId = (claims?.[0] as Record<string, { state_id?: string }> | undefined)
            ?.gw_all_state_programs?.state_id ?? null;
          await supabase.from('gw_all_state_changes').insert({
            state_id: stateId, source_id: src.id, snapshot_id: snap?.id ?? null,
            change_type: 'season_rollover',
            previous_value: String(season),
            new_value: `${startYear + 1}-${String(startYear + 2).slice(2)}`,
            detail: 'The page now mentions next season. Our data may be about to go stale; a fresh scrape of this state is likely due.',
            detected_at: now, status: 'pending',
          });
        }
      }

      await supabase.from('gw_all_state_sources').update({
        last_crawled_at: now, last_success_at: now, last_content_hash: hash,
        health_status: missing || rollover ? 'changed' : 'healthy',
      }).eq('id', src.id);
      report.push({ url: src.url, status: 'changed', claims: claims?.length ?? 0, missing, rollover });

    } catch (e) {
      // EXTRACTION FAILURE IS NOT A DATA CHANGE.
      await supabase.from('gw_all_state_sources')
        .update({ last_crawled_at: now, health_status: 'unavailable' }).eq('id', src.id);
      await supabase.from('gw_all_state_snapshots').insert({
        source_id: src.id, url: src.url, content_hash: 'error',
        parse_status: 'error', error: String(e).slice(0, 500),
      });
      await alertSourceFailure(supabase, src.id, src.url, String(e));
      report.push({ url: src.url, status: 'error', error: String(e).slice(0, 200) });
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  return new Response(JSON.stringify({ crawled: report.length, report }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
