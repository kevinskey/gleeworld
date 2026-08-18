// Read-only tool executors. The supabase client is constructed with the
// CALLER's JWT (Task 5), so RLS scopes every query to their tenant/role.
import { executeStudentPictureTool } from './studentPicture.ts';
import { ACADEMY_CORPUS } from '../_shared/academy/corpus.ts';
import { buildIndex, searchAcademy } from '../_shared/academy/search.ts';
import { LITURGY_CORPUS } from '../_shared/liturgy/corpus.ts';
import { MUSIC_FACTS } from '../_shared/musicfacts/corpus.ts';
import {
  appliesTo, authorityLabel, byAuthorityThenScore, formatCitation,
} from '../_shared/liturgy/types.ts';

type SupabaseLike = {
  from: (table: string) => any;
  functions?: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export interface Deps {
  supabase: SupabaseLike;
  /** Caller's auth-level role. RLS already decides what rows come back;
   *  this only shapes the HONESTY of the reply — a member's empty roster
   *  means "you can't see it", an admin's means "nobody is enrolled". */
  role?: 'admin' | 'member';
  /** Caller's auth.users id, for tools that write the caller's own row. */
  userId?: string;
  youtubeApiKey?: string;
  googleMapsApiKey?: string;
  homeAddress?: string;
  webSearchUrl?: string;
  webSearchAuthHeader?: string;
  /** Firecrawl, for reading source pages during repertoire research. */
  firecrawlKey?: string;
}

export interface PlaceEntry {
  name: string;
  address: string;
  rating?: number | null;
  ratingCount?: number;
  isOpen?: boolean | null;
  phone?: string | null;
  mapsUrl?: string | null;
}

export type ConciergeResult =
  | { kind: 'ride'; query: string; resolvedAddress: string; uberUrl: string; lyftUrl: string; preferred?: 'uber' | 'lyft' }
  | { kind: 'food'; query: string; services: Array<{ name: 'DoorDash' | 'Uber Eats' | 'Grubhub'; deepLinkUrl: string }>; preferred?: 'doordash' | 'ubereats' | 'grubhub' }
  | { kind: 'web';  query: string; answer?: string; results: Array<{ title: string; url: string; snippet: string }> }
  | { kind: 'places'; query: string; near?: string; places: PlaceEntry[] }
  /** A video to PLAY on screen, not a link to follow. The panel embeds it. */
  | { kind: 'video'; query: string; videoId: string; title: string; channel?: string };

export interface ToolResult {
  replyJson: string;
  resultsPanel?: ConciergeResult;
}

export async function executeServerTool(
  name: string,
  args: Record<string, unknown>,
  deps: Deps,
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'query_calendar': return { replyJson: await queryCalendar(args, deps) };
      case 'search_music': return { replyJson: await searchMusic(args, deps) };
      case 'search_academy': return { replyJson: searchAcademyTool(args) };
      case 'search_liturgy': return { replyJson: searchLiturgyTool(args) };
      case 'search_music_facts': return { replyJson: searchMusicFactsTool(args) };
      case 'find_user': return { replyJson: await findUser(args, deps) };
      case 'search_youtube': return { replyJson: await searchYoutube(args, deps) };
      case 'play_video': return await playVideo(args, deps);
      case 'get_ride': return await getRide(args, deps);
      case 'order_food': return await orderFood(args);
      case 'get_date_card': return { replyJson: await getDateCard(deps) };
      case 'read_news_feeds': return { replyJson: await readNewsFeeds(args, deps) };
      case 'find_nearby_place': return await findNearbyPlace(args, deps);
      case 'get_preference': return { replyJson: await getPreference(args, deps) };
      case 'remember_preference': return { replyJson: await rememberPreference(args, deps) };
      case 'lookup_all_state': return { replyJson: await lookupAllState(args, deps) };
      case 'lookup_bible': return { replyJson: await lookupBible(args, deps) };
      case 'liturgical_day': return { replyJson: await liturgicalDay(args, deps) };
      case 'web_search': return await webSearch(args, deps);
      case 'research_repertoire': return await researchRepertoire(args, deps);
      case 'get_score_analysis': return { replyJson: await getScoreAnalysis(args, deps) };
      case 'lookup_hymn': return { replyJson: await lookupHymn(args, deps) };
      case 'schedule_event_playlist': return { replyJson: await scheduleEventPlaylist(args, deps) };
      case 'search_apple_music': return { replyJson: await searchAppleMusicTool(args) };
      case 'set_assistant_name': return { replyJson: await setAssistantName(args, deps) };
      case 'set_preferred_name': return { replyJson: await setPreferredName(args, deps) };
      case 'list_courses': return { replyJson: await listCourses(args, deps) };
      case 'get_course_info': return { replyJson: await getCourseInfo(args, deps) };
      case 'get_course_deadlines': return { replyJson: await getCourseDeadlines(args, deps) };
      case 'get_enrollments': return { replyJson: await getEnrollments(args, deps) };
      case 'get_assignments':
      case 'get_grades':
      case 'get_grade_trend':
      case 'get_attendance':
      case 'get_balance':
      case 'get_roster_flags':
        return { replyJson: await executeStudentPictureTool(name, args, deps) };
      default: return { replyJson: JSON.stringify({ error: `Unknown tool: ${name}` }) };
    }
  } catch (e) {
    return { replyJson: JSON.stringify({ error: e instanceof Error ? e.message : 'tool failed' }) };
  }
}

async function queryCalendar(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const from = String(args.from ?? '');
  const to = String(args.to ?? '');
  // Two independent tables — query them together, not back to back.
  const [{ data: events, error }, { data: gcal }] = await Promise.all([
    supabase
      .from('gw_events')
      .select('id, title, start_date, end_date, location, category')
      .gte('start_date', `${from}T00:00:00`)
      .lte('start_date', `${to}T23:59:59`)
      .order('start_date')
      .limit(50),
    supabase
      .from('gw_google_events')
      .select('id, title, start_at, end_at, location')
      .gte('start_at', `${from}T00:00:00`)
      .lte('start_at', `${to}T23:59:59`)
      .order('start_at')
      .limit(50),
  ]);
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({
    events: events ?? [],
    google_calendar_events: (gcal ?? []).map((g: any) => ({ ...g, read_only: true })),
  });
}

// The corpus is bundled and immutable, so the index is built once per instance.
const academyIndex = buildIndex(ACADEMY_CORPUS);
const liturgyIndex = buildIndex(LITURGY_CORPUS);
const musicFactsIndex = buildIndex(MUSIC_FACTS);

/**
 * Exact instrument and voice facts. Ranges and transpositions are precise
 * numbers a model invents plausibly and wrongly, which is the whole reason
 * this corpus exists. Every passage is generated from structured data.
 */
function searchMusicFactsTool(args: Record<string, unknown>): string {
  const query = String(args.query ?? '').trim();
  const hits = query ? searchAcademy(query, musicFactsIndex, { limit: 5 }) : [];
  if (hits.length === 0) {
    return JSON.stringify({
      passages: [],
      note: 'No matching instrument or voice facts. Do not guess a range or transposition; say you could not verify that.',
    });
  }
  return JSON.stringify({
    passages: hits.map((h) => ({ subject: h.chunk.subject, title: h.chunk.title, text: h.text })),
  });
}

function searchAcademyTool(args: Record<string, unknown>): string {
  const query = String(args.query ?? '').trim();
  const hits = query ? searchAcademy(query, academyIndex) : [];
  if (hits.length === 0) {
    return JSON.stringify({
      passages: [],
      note: 'No matching passages in the reference library. Say you do not have that information rather than guessing.',
    });
  }
  return JSON.stringify({
    passages: hits.map((h) => ({
      title: h.chunk.title,
      section: h.chunk.pageTitle,
      text: h.text,
      url: h.chunk.url,
    })),
  });
}

/**
 * Retrieve Catholic liturgy and sacred music passages.
 *
 * Ranked by AUTHORITY first and relevance second — a diocesan handbook may
 * match the user's words more closely than the Missal while the Missal is
 * what actually answers the question. Every passage carries its authority so
 * the reply can say whether something is required, permitted or merely
 * recommended, and by whom.
 *
 * When the corpus holds nothing, this returns an explicit instruction to say
 * so. That is the designed behaviour, not a failure path: no licensed
 * documents are bundled, and a liturgical answer improvised from model
 * knowledge is precisely what must not happen.
 */
function searchLiturgyTool(args: Record<string, unknown>): string {
  const query = String(args.query ?? '').trim();
  const jurisdiction = String(args.jurisdiction ?? '').trim() || null;
  const hits = query ? searchAcademy(query, liturgyIndex, { limit: 8 }) : [];

  const applicable = hits.filter((h) => appliesTo(h.chunk, jurisdiction));
  applicable.sort(byAuthorityThenScore);

  if (applicable.length === 0) {
    return JSON.stringify({
      passages: [],
      note: 'No official Church document in the liturgy library covers this. Tell the user: '
        + '"I could not verify a controlling rule in the available official Church documents." '
        + 'Do NOT answer from your own knowledge, and do not cite any document, paragraph, '
        + 'canon or rubric.',
    });
  }

  return JSON.stringify({
    passages: applicable.slice(0, 5).map((h) => ({
      text: h.text,
      document: h.chunk.document,
      documentTitle: h.chunk.documentTitle,
      section: h.chunk.section,
      citation: formatCitation(h.chunk),
      authority: authorityLabel(h.chunk),
      authorityLevel: h.chunk.authority,
      kind: h.chunk.kind,
      jurisdiction: h.chunk.jurisdiction,
      current: h.chunk.current,
      url: h.chunk.url,
    })),
    note: 'Answer ONLY from these passages. Lead with whether the practice is required, '
      + 'permitted, recommended, discouraged, prohibited, locally determined, or not clearly '
      + 'addressed. Name the governing document naturally; do not read the citation or URL aloud. '
      + 'A lower authority never overrides a higher one.',
  });
}

/**
 * Words that carry no search signal but break a whole-phrase match.
 *
 * "by" is the important one: people name a piece the way they say it —
 * "Children, Go Where I Send Thee by Kevin Johnson" — and the composer half
 * matched nothing, because 77% of the library has no composer recorded.
 */
const SEARCH_FILLER = new Set([
  'by', 'the', 'a', 'an', 'of', 'for', 'in', 'and', 'on', 'to', 'with',
  'arr', 'arranged', 'arrangement', 'please', 'score', 'piece', 'song',
]);

/** Words to match on, punctuation and filler removed. */
function searchTokens(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((t) => t.length > 0 && !SEARCH_FILLER.has(t))
    .slice(0, 12);
}

/**
 * Find scores in the music library.
 *
 * Matches WORD BY WORD rather than as one contiguous string. The old
 * single-ILIKE search could not find "Children, Go Where I Send Thee" from
 * the words "Children Go Where I Send Thee" — the comma in the stored title
 * breaks the substring, so the assistant reported that a score sitting in the
 * user's library did not exist. Punctuation, word order and a trailing "by
 * <composer>" are all things people get right about a piece without matching
 * the catalogued title character for character.
 *
 * Every token must appear, in the title or the composer. If nothing matches,
 * tokens are dropped from the END and retried — a trailing composer name is
 * the usual reason a real title finds nothing, and the title itself is what
 * the user is most likely to have right.
 */
async function searchMusic(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const raw = String(args.query ?? '');
  const tokens = searchTokens(raw);
  if (tokens.length === 0) return JSON.stringify({ scores: [] });

  const run = async (toks: string[]) => {
    let query = supabase.from('gw_sheet_music').select('id, title, composer, voicing');
    for (const t of toks) {
      const safe = t.replace(/[%_,()]/g, '');
      if (!safe) continue;
      query = query.or(`title.ilike.%${safe}%,composer.ilike.%${safe}%`);
    }
    return await query.limit(10);
  };

  for (let n = tokens.length; n >= 1; n--) {
    const { data, error } = await run(tokens.slice(0, n));
    if (error) return JSON.stringify({ error: error.message });
    if (data && data.length > 0) {
      // Tell the model when the match was loose, so it can say which piece it
      // found rather than claiming it found what was asked for.
      const relaxed = n < tokens.length;
      return JSON.stringify({ scores: data, ...(relaxed ? { matchedOn: tokens.slice(0, n).join(' ') } : {}) });
    }
  }

  // Any-token fallback. Prefix relaxation assumes the informative word comes
  // first, but "German Requiem" stores as "Ein deutsches Requiem" — the only
  // matching token is the LAST one, and dropping from the end never tries it.
  // One query ORs every token; rows matching more tokens rank first, and
  // matchedOn always flags the looseness so the model names what it found
  // instead of claiming an exact hit.
  const safeTokens = tokens.map((t) => t.replace(/[%_,()]/g, '')).filter(Boolean);
  if (safeTokens.length > 1) {
    const orExpr = safeTokens.map((t) => `title.ilike.%${t}%,composer.ilike.%${t}%`).join(',');
    const { data, error } = await supabase
      .from('gw_sheet_music').select('id, title, composer, voicing').or(orExpr).limit(25);
    if (error) return JSON.stringify({ error: error.message });
    if (data && data.length > 0) {
      const hits = (row: { title?: string; composer?: string }) => safeTokens.filter((t) =>
        `${row.title ?? ''} ${row.composer ?? ''}`.toLowerCase().includes(t.toLowerCase()));
      const ranked = [...data].sort((a, b) => hits(b).length - hits(a).length).slice(0, 10);
      return JSON.stringify({ scores: ranked, matchedOn: hits(ranked[0]).join(' ') });
    }
  }
  return JSON.stringify({ scores: [] });
}

async function findNote(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const q = String(args.query ?? '').replace(/[%_]/g, '');
  const { data, error } = await supabase
    .from('gw_planner_notes')
    .select('id, title, updated_at')
    .is('deleted_at', null)
    .ilike('title', `%${q}%`)
    .order('updated_at', { ascending: false })
    .limit(10);
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ notes: data ?? [] });
}

async function findUser(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const q = String(args.name ?? '').replace(/[%_]/g, '');
  const { data, error } = await supabase
    .from('gw_profiles')
    .select('user_id, full_name, email, phone')
    .ilike('full_name', `%${q}%`)
    .limit(5);
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ users: data ?? [] });
}

// Kept in sync with src/hooks/useDateCardConfig.ts + src/components/home/date-card/registry.ts.
// If a new card type ships, add its key here so the assistant can name it.
const DATE_CARD_TYPES = ['plain', 'up_next', 'today', 'liturgical', 'custom'] as const;

async function getDateCard({ supabase }: Deps): Promise<string> {
  // RLS scopes to the caller's tenant. Same shape as gw_branding_settings.date_card.
  const { data, error } = await supabase
    .from('gw_branding_settings')
    .select('date_card')
    .limit(1)
    .maybeSingle();
  if (error) return JSON.stringify({ error: error.message });
  const raw = (data as { date_card?: unknown } | null)?.date_card;
  const setting = (raw && typeof raw === 'object'
    && (raw as any).v === 1
    && typeof (raw as any).type === 'string'
    && (DATE_CARD_TYPES as readonly string[]).includes((raw as any).type))
    ? raw
    : { v: 1, type: 'plain', config: {} };
  return JSON.stringify({ setting, available_types: DATE_CARD_TYPES });
}

async function readNewsFeeds(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const raw = Number(args.limit);
  const limit = Math.max(1, Math.min(30, Number.isFinite(raw) ? Math.trunc(raw) : 8));
  if (!supabase.functions) return JSON.stringify({ error: 'news fetch unavailable in this context' });
  // Server infers tenant from the caller's JWT when tenant is absent — see
  // fetch-news-feeds/index.ts. We deliberately don't pass one so member and
  // admin sessions land on the same rail their dashboard shows.
  const { data, error } = await supabase.functions.invoke('fetch-news-feeds', {
    body: { offset: 0, limit },
  });
  if (error) return JSON.stringify({ error: error.message ?? 'fetch-news-feeds failed' });
  const items = Array.isArray(data?.items) ? data.items : [];
  // Trim to the fields useful for a spoken reply — the model doesn't need
  // pubDate ISOs or source icons; a short { title, source, description }
  // per item keeps the tool result under a few kilobytes.
  const trimmed = items.slice(0, limit).map((it: any) => ({
    title: it?.title,
    source: it?.source,
    published: it?.pubDate,
    summary: typeof it?.description === 'string' ? it.description.slice(0, 240) : '',
    link: it?.link,
  }));
  return JSON.stringify({ items: trimmed, count: trimmed.length });
}

async function findNearbyPlace(args: Record<string, unknown>, { supabase }: Deps): Promise<ToolResult> {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  if (!query) return { replyJson: JSON.stringify({ error: 'query is required' }) };
  const lat = typeof args.lat === 'number' ? args.lat : undefined;
  const lng = typeof args.lng === 'number' ? args.lng : undefined;
  const near = typeof args.near === 'string' ? args.near.trim() : undefined;
  if (!lat && !lng && !near) {
    return { replyJson: JSON.stringify({ error: 'Need either lat/lng or a `near` string — ask the user where they are.' }) };
  }
  if (!supabase.functions) return { replyJson: JSON.stringify({ error: 'places lookup unavailable in this context' }) };
  const { data, error } = await supabase.functions.invoke('nearby-places', {
    body: { query, lat, lng, near, maxResults: 5 },
  });
  if (error) return { replyJson: JSON.stringify({ error: error.message ?? 'nearby-places failed' }) };
  const raw = Array.isArray(data?.places) ? data.places : [];
  const places: PlaceEntry[] = raw.map((p: any) => ({
    name: String(p.name ?? ''),
    address: String(p.address ?? ''),
    rating: typeof p.rating === 'number' ? p.rating : null,
    ratingCount: typeof p.ratingCount === 'number' ? p.ratingCount : undefined,
    isOpen: typeof p.isOpen === 'boolean' ? p.isOpen : null,
    phone: p.phone ?? null,
    mapsUrl: p.mapsUrl ?? null,
  }));
  // The panel carries the tappable map link — the reply text stays URL-free
  // so TTS reads clean prose. Give the model just enough context to
  // narrate: names + rough locations + whether the top hit is open.
  return {
    replyJson: JSON.stringify({
      query,
      near,
      count: places.length,
      top: places.slice(0, 3).map((p) => ({
        name: p.name,
        address: p.address,
        rating: p.rating,
        isOpen: p.isOpen,
      })),
    }),
    resultsPanel: { kind: 'places', query, near, places },
  };
}

async function getPreference(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const key = typeof args.key === 'string' ? args.key.trim() : '';
  if (!key) return JSON.stringify({ error: 'key is required' });
  // RLS scopes to auth.uid() = user_id so no need to filter user_id here.
  const { data, error } = await supabase
    .from('gw_user_preferences')
    .select('key, value, updated_at')
    .eq('key', key)
    .limit(1)
    .maybeSingle();
  if (error) return JSON.stringify({ error: error.message });
  if (!data) return JSON.stringify({ key, value: null });
  return JSON.stringify({ key: (data as any).key, value: (data as any).value, updated_at: (data as any).updated_at });
}

/**
 * Save one preference for later recall.
 *
 * Runs on the SERVER, beside getPreference, on purpose. It used to run in the
 * browser, and the two halves resolved the tenant differently:
 * current_tenant_id() prefers the x-tenant-slug header, which the browser
 * sends and this function does not. So a write from a subdomain that is not
 * the user's home tenant landed on a row the read could never see — saved,
 * then instantly forgotten. Same client, same tenant, both ways.
 *
 * tenant_id and user_id come from the column DEFAULTs (current_tenant_id() /
 * auth.uid()) under the caller's JWT; the owner policy's WITH CHECK is what
 * actually guarantees a user can only write their own row.
 */
async function rememberPreference(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const key = typeof args.key === 'string' ? args.key.trim() : '';
  const value = typeof args.value === 'string' ? args.value.trim() : '';
  if (!key) return JSON.stringify({ error: 'key is required' });
  if (!value) return JSON.stringify({ error: 'value is required' });
  if (key.length > 128) return JSON.stringify({ error: 'key must be 128 characters or fewer' });
  // Matches the CHECK on the column, so an over-long value is a clear message
  // instead of a raw constraint violation read aloud to the user.
  if (value.length > 4000) return JSON.stringify({ error: 'value must be 4000 characters or fewer' });

  const { error } = await supabase
    .from('gw_user_preferences')
    .upsert({ key, value }, { onConflict: 'tenant_id,user_id,key' });
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ ok: true, key, value });
}

/**
 * Put a video on screen.
 *
 * search_youtube hands the model a list to talk about; this plays one. The
 * distinction matters because "play me Ave Verum" is not answered by reciting
 * three titles and a URL — it is answered by the music starting. The panel
 * embeds the player, so nothing leaves GleeWorld and no URL is read aloud.
 */
async function playVideo(args: Record<string, unknown>, deps: Deps): Promise<ToolResult> {
  const q = String(args.q ?? args.query ?? '').trim();
  const explicitId = String(args.videoId ?? '').trim();

  if (explicitId) {
    return {
      replyJson: JSON.stringify({ playing: explicitId, note: 'The video is on screen. Say what is playing; do not read the URL.' }),
      resultsPanel: { kind: 'video', query: q || explicitId, videoId: explicitId, title: String(args.title ?? '') },
    };
  }
  if (!q) return { replyJson: JSON.stringify({ error: 'Ask which song or video they want.' }) };

  const raw = await searchYoutube({ q }, deps);
  // searchYoutube returns { hits: [{ video_id, title, channel, ... }] } —
  // this read { videos: [{ id }] } for months, so the q path NEVER matched
  // and every direct "play X" call failed honest-but-wrong (2026-08-12).
  let first: { video_id?: string; title?: string; channel?: string } | undefined;
  try { first = JSON.parse(raw)?.hits?.[0]; } catch { /* fall through */ }
  if (!first?.video_id) {
    return { replyJson: JSON.stringify({ error: `Nothing on YouTube matched "${q}".` }) };
  }
  return {
    replyJson: JSON.stringify({
      playing: first.video_id, title: first.title, channel: first.channel,
      note: 'The video is now on screen. Say what is playing; never read the URL or the id aloud.',
    }),
    resultsPanel: {
      kind: 'video', query: q, videoId: first.video_id,
      title: first.title ?? q, channel: first.channel,
    },
  };
}

async function searchYoutube(args: Record<string, unknown>, { youtubeApiKey }: Deps): Promise<string> {
  if (!youtubeApiKey) return JSON.stringify({ error: 'YouTube search is not configured' });
  const q = encodeURIComponent(String(args.q ?? ''));
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${q}&key=${youtubeApiKey}`;
  const res = await fetch(url);
  if (!res.ok) return JSON.stringify({ error: `YouTube API ${res.status}` });
  const data = await res.json();
  const hits = (data.items ?? []).map((it: any) => ({
    video_id: it.id?.videoId,
    title: it.snippet?.title,
    channel: it.snippet?.channelTitle,
    thumbnail_url: it.snippet?.thumbnails?.medium?.url,
    url: `https://www.youtube.com/watch?v=${it.id?.videoId}`,
  }));
  return JSON.stringify({ hits });
}

async function getRide(args: Record<string, unknown>, deps: Deps): Promise<ToolResult> {
  const rawDest = String(args.destination ?? '').trim();
  if (!rawDest) {
    return { replyJson: JSON.stringify({ error: 'Which destination?' }) };
  }
  if (!deps.googleMapsApiKey) {
    return { replyJson: JSON.stringify({ error: 'Rides are not configured on this workspace yet.' }) };
  }

  // "home" is a first-class shortcut: resolve from the profile, or bail
  // out with a specific error the model turns into a follow-up question.
  const isHome = rawDest.toLowerCase() === 'home';
  const query = isHome ? (deps.homeAddress ?? '') : rawDest;
  if (isHome && !query) {
    return { replyJson: JSON.stringify({
      error: "I don't have your home address saved. Give me the address and I'll remember it for next time.",
    }) };
  }

  // Google Places API (New) Text Search — one call gives us both the
  // canonical address and the coordinates. Fields mask keeps the response tiny.
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': deps.googleMapsApiKey,
      'X-Goog-FieldMask': 'places.formattedAddress,places.location',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  if (!res.ok) {
    return { replyJson: JSON.stringify({ error: `Places lookup failed (${res.status}).` }) };
  }
  const body = await res.json();
  const place = body.places?.[0];
  if (!place?.location) {
    return { replyJson: JSON.stringify({ error: `I couldn't find "${rawDest}".` }) };
  }
  const lat = place.location.latitude;
  const lng = place.location.longitude;
  const address = place.formattedAddress ?? rawDest;

  const uberUrl =
    'https://m.uber.com/ul/?action=setPickup&pickup=my_location'
    + `&dropoff%5Blatitude%5D=${lat}`
    + `&dropoff%5Blongitude%5D=${lng}`
    + `&dropoff%5Bnickname%5D=${encodeURIComponent(address)}`;

  const lyftUrl =
    'https://ride.lyft.com/ride?id=lyft'
    + `&destination%5Blatitude%5D=${lat}`
    + `&destination%5Blongitude%5D=${lng}`;

  const rawPref = String(args.preferred ?? '').toLowerCase();
  const preferred: 'uber' | 'lyft' | undefined = rawPref === 'uber' || rawPref === 'lyft' ? rawPref : undefined;

  return {
    replyJson: JSON.stringify({ resolvedAddress: address, preferred }),
    resultsPanel: { kind: 'ride', query: rawDest, resolvedAddress: address, uberUrl, lyftUrl, preferred },
  };
}

const WEB_SEARCH_DAILY_CAP = 100;

async function webSearch(args: Record<string, unknown>, deps: Deps): Promise<ToolResult> {
  const q = String(args.query ?? '').trim();
  if (!q) return { replyJson: JSON.stringify({ error: 'What should I search for?' }) };
  if (!deps.webSearchUrl || !deps.webSearchAuthHeader || !deps.supabase.rpc) {
    return { replyJson: JSON.stringify({ error: 'Search is not configured.' }) };
  }

  // Increment first, then check. This is intentional: we want the counter
  // to advance even if the caller retries — this is the cost meter, not
  // the request meter.
  const { data: post, error: rpcErr } = await deps.supabase.rpc('increment_assistant_usage', { p_tool_name: 'web_search' });
  if (rpcErr) {
    return { replyJson: JSON.stringify({ error: 'Search rate check failed.' }) };
  }
  if (typeof post === 'number' && post > WEB_SEARCH_DAILY_CAP) {
    return { replyJson: JSON.stringify({
      error: "You've hit today's daily search limit for this workspace. Try again tomorrow.",
    }) };
  }

  const res = await fetch(deps.webSearchUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: deps.webSearchAuthHeader },
    body: JSON.stringify({ query: q }),
  });
  if (!res.ok) {
    return { replyJson: JSON.stringify({ error: 'Search is unavailable right now. Please try again.' }) };
  }
  const body = await res.json();
  const results = Array.isArray(body.results) ? body.results : [];
  const answer = typeof body.answer === 'string' ? body.answer : undefined;

  return {
    replyJson: JSON.stringify({ query: q, answer, resultCount: results.length }),
    resultsPanel: { kind: 'web', query: q, answer, results },
  };
}

/** Repertoire research costs more than a plain search, so it gets its own meter. */
const REPERTOIRE_DAILY_CAP = 40;

/**
 * Public information about a composer or a work.
 *
 * Unlike web_search this reads the best source page in full rather than
 * stopping at snippets. For repertoire that difference is the whole point: a
 * search description will say a motet exists, but voicing, publisher, language
 * and the text's source live in the page body, and those are what a director
 * actually needs before programming it.
 *
 * Two Firecrawl calls at most — one search, one page read — so a question costs
 * about two credits against a pool shared with the lectionary backfill. The
 * page read is skipped rather than retried if it fails; snippets alone still
 * answer plenty, and half an answer beats an error.
 */
async function researchRepertoire(args: Record<string, unknown>, deps: Deps): Promise<ToolResult> {
  const work = String(args.work ?? '').trim();
  const composer = String(args.composer ?? '').trim();
  const question = String(args.question ?? '').trim();
  if (!work && !composer) {
    return { replyJson: JSON.stringify({ error: 'Which piece or composer should I look up?' }) };
  }
  if (!deps.firecrawlKey) {
    return { replyJson: JSON.stringify({ error: 'Repertoire research is not configured.' }) };
  }

  if (deps.supabase.rpc) {
    const { data: post, error: rpcErr } = await deps.supabase.rpc(
      'increment_assistant_usage', { p_tool_name: 'research_repertoire' });
    if (rpcErr) return { replyJson: JSON.stringify({ error: 'Research rate check failed.' }) };
    if (typeof post === 'number' && post > REPERTOIRE_DAILY_CAP) {
      return { replyJson: JSON.stringify({
        error: "You've hit today's research limit for this workspace. Try again tomorrow.",
      }) };
    }
  }

  // "choral" steers away from the pop record that shares many a hymn's title.
  const query = [work && `"${work}"`, composer, question, 'choral music composer']
    .filter(Boolean).join(' ');

  let results: Array<{ title: string; url: string; snippet: string }> = [];
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${deps.firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 5 }),
    });
    if (!res.ok) throw new Error('search failed');
    const body = await res.json();
    results = (Array.isArray(body?.data) ? body.data : []).slice(0, 5).map((r: any) => ({
      title: String(r.title ?? ''), url: String(r.url ?? ''), snippet: String(r.description ?? ''),
    }));
  } catch {
    return { replyJson: JSON.stringify({ error: 'Research is unavailable right now.' }) };
  }
  if (!results.length) {
    return { replyJson: JSON.stringify({ query, found: false, note: 'Nothing found for that piece.' }) };
  }

  // Read the most promising page in full. Reference sites carry the
  // catalogue detail; a shop listing rarely does.
  const PREFERRED = ['imslp', 'wikipedia', 'hymnary', 'cpdl', 'oxford', 'giamusic', 'ocp'];
  const best = results.find((r) => PREFERRED.some((d) => r.url.toLowerCase().includes(d))) ?? results[0];
  let page: string | undefined;
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${deps.firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: best.url, formats: ['markdown'] }),
    });
    if (res.ok) {
      const body = await res.json();
      const md = String(body?.data?.markdown ?? '');
      // Enough for the catalogue facts without burying the model in navigation.
      if (md) page = md.slice(0, 6000);
    }
  } catch { /* snippets alone still answer plenty */ }

  return {
    replyJson: JSON.stringify({
      query, found: true, source: best.url, sourceTitle: best.title,
      page, results: results.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet })),
      note: 'Public web sources. State what is uncertain rather than filling gaps.',
    }),
    resultsPanel: { kind: 'web', query: work || composer, results },
  };
}

async function orderFood(args: Record<string, unknown>): Promise<ToolResult> {
  const q = String(args.query ?? '').trim();
  const rawPref = String(args.preferred ?? '').toLowerCase();
  const preferred: 'doordash' | 'ubereats' | 'grubhub' | undefined =
    rawPref === 'doordash' || rawPref === 'ubereats' || rawPref === 'grubhub' ? rawPref : undefined;
  const enc = encodeURIComponent(q);

  // Homepage URLs when the query is empty — the panel still shows three
  // buttons the user can tap.
  const services = q ? [
    { name: 'DoorDash' as const, deepLinkUrl: `https://www.doordash.com/search/store/${enc}` },
    { name: 'Uber Eats' as const, deepLinkUrl: `https://www.ubereats.com/search?q=${enc}` },
    { name: 'Grubhub'  as const, deepLinkUrl: `https://www.grubhub.com/search?queryText=${enc}` },
  ] : [
    { name: 'DoorDash' as const, deepLinkUrl: 'https://www.doordash.com/' },
    { name: 'Uber Eats' as const, deepLinkUrl: 'https://www.ubereats.com/' },
    { name: 'Grubhub'  as const, deepLinkUrl: 'https://www.grubhub.com/' },
  ];

  return {
    replyJson: JSON.stringify({ query: q, preferred, count: services.length }),
    resultsPanel: { kind: 'food', query: q, services, preferred },
  };
}


// ── The Bible ────────────────────────────────────────────────────────
//
// Two modes: resolve a REFERENCE ("Psalm 23", "John 3:16") to its verses, or
// SEARCH scripture for a phrase. Both read gw_bible_verses, which is shared
// reference data — no tenant scoping, readable by any signed-in user.
//
// The assistant must quote from here rather than from memory: eight
// translations are loaded and their wording differs, so reciting a remembered
// KJV verse to someone reading the Douay-Rheims is simply wrong.

const BIBLE_BOOK_ALIASES: Record<string, string> = {
  genesis: 'GEN', gen: 'GEN', exodus: 'EXO', exod: 'EXO', leviticus: 'LEV', lev: 'LEV',
  numbers: 'NUM', num: 'NUM', deuteronomy: 'DEU', deut: 'DEU', joshua: 'JOS', josh: 'JOS',
  judges: 'JDG', ruth: 'RUT', '1 samuel': '1SA', '2 samuel': '2SA', '1 kings': '1KI',
  '2 kings': '2KI', '1 chronicles': '1CH', '2 chronicles': '2CH', ezra: 'EZR',
  nehemiah: 'NEH', esther: 'EST', job: 'JOB', psalm: 'PSA', psalms: 'PSA', ps: 'PSA',
  proverbs: 'PRO', prov: 'PRO', ecclesiastes: 'ECC', 'song of solomon': 'SNG',
  'song of songs': 'SNG', isaiah: 'ISA', isa: 'ISA', jeremiah: 'JER', jer: 'JER',
  lamentations: 'LAM', ezekiel: 'EZK', daniel: 'DAN', hosea: 'HOS', joel: 'JOL',
  amos: 'AMO', obadiah: 'OBA', jonah: 'JON', micah: 'MIC', nahum: 'NAM',
  habakkuk: 'HAB', zephaniah: 'ZEP', haggai: 'HAG', zechariah: 'ZEC', malachi: 'MAL',
  tobit: 'TOB', judith: 'JDT', wisdom: 'WIS', sirach: 'SIR', baruch: 'BAR',
  '1 maccabees': '1MA', '2 maccabees': '2MA',
  matthew: 'MAT', matt: 'MAT', mt: 'MAT', mark: 'MRK', mk: 'MRK', luke: 'LUK', lk: 'LUK',
  john: 'JHN', jn: 'JHN', acts: 'ACT', romans: 'ROM', rom: 'ROM',
  '1 corinthians': '1CO', '1 cor': '1CO', '2 corinthians': '2CO', '2 cor': '2CO',
  galatians: 'GAL', ephesians: 'EPH', philippians: 'PHP', colossians: 'COL',
  '1 thessalonians': '1TH', '2 thessalonians': '2TH', '1 timothy': '1TI',
  '2 timothy': '2TI', titus: 'TIT', philemon: 'PHM', hebrews: 'HEB', james: 'JAS',
  '1 peter': '1PE', '2 peter': '2PE', '1 john': '1JN', '2 john': '2JN',
  '3 john': '3JN', jude: 'JUD', revelation: 'REV', rev: 'REV',
};

const SINGLE_CHAPTER = new Set(['OBA', 'PHM', '2JN', '3JN', 'JUD']);

function parseBibleReference(input: string) {
  const m = /^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z\s']*?)\s*(?:(\d+)\s*(?::\s*(\d+)(?:\s*-\s*(\d+))?)?)?\s*$/.exec(input || '');
  if (!m) return null;
  const code = BIBLE_BOOK_ALIASES[m[1].trim().toLowerCase().replace(/\s+/g, ' ')];
  if (!code) return null;
  const single = SINGLE_CHAPTER.has(code);
  // For a one-chapter book, a bare number is a VERSE, not a chapter.
  const chapter = single ? 1 : (m[2] ? Number(m[2]) : 1);
  const startVerse = single && m[2] && !m[3] ? Number(m[2]) : (m[3] ? Number(m[3]) : null);
  return { code, chapter, startVerse, endVerse: m[4] ? Number(m[4]) : startVerse };
}


// ─── All-State (Phase 5) ────────────────────────────────────────────────
// Layer 1 canon lives in Postgres and changes (states move deadlines), so
// this is the search_music/lookup_bible shape — a live query under the
// caller's JWT — NOT a bundled corpus. RLS already scopes reads to verified
// programs, so an unverified state simply returns nothing here.
//
// This is the SECOND domain allowed to name its sources (liturgy is the
// first): every fact carries source_url + retrieved_at, and index.ts exempts
// replies that called this tool from the source-leak nudge. That is the
// brief's rule — "requirement answers must link the official source".
async function lookupAllState(args: Record<string, unknown>, deps: Deps): Promise<string> {
  const raw = String(args.state ?? '').trim();
  if (!raw) return JSON.stringify({ error: 'state is required' });
  const topic = String(args.topic ?? 'overview').toLowerCase();

  const or = [
    `slug.eq.${raw.toLowerCase().replace(/\s+/g, '-')}`,
    `abbreviation.eq.${raw.toUpperCase().slice(0, 2)}`,
    `name.ilike.${raw}`,
  ].join(',');
  const { data: states } = await deps.supabase.from('gw_all_state_states')
    .select('id,name,slug,active').or(or).limit(1);
  const st = states?.[0];
  if (!st) return JSON.stringify({ error: `No state matched "${raw}".` });

  const { data: programs } = await deps.supabase.from('gw_all_state_programs')
    .select('id,name,season,slug')
    .eq('state_id', st.id).eq('active', true).order('name');

  if (!programs?.length) {
    return JSON.stringify({
      state: st.name,
      note: st.active
        ? 'No verified program data is published for this state yet.'
        : 'This state has no verified All-State chorus data in GleeWorld — some (like DC and Hawaii) have no statewide auditioned All-State chorus at all. Suggest checking the state music educators association directly.',
      page: `/all-state/${st.slug}`,
    });
  }

  const ids = programs.map((p: { id: string }) => p.id);
  const want = (t: string) => topic === 'overview' || topic === t;
  const fact = (r: Record<string, unknown>) => ({
    source_url: r.source_url ?? null,
    checked: r.retrieved_at ? String(r.retrieved_at).slice(0, 10) : null,
    confidence: r.confidence ?? null,
  });

  const out: Record<string, unknown> = {
    state: st.name,
    page: `/all-state/${st.slug}`,
    programs: programs.map((p: { name: string; season: string }) => ({ name: p.name, season: p.season })),
    citation_rule: 'Dates, fees and requirements below each carry the official source_url and checked date. State them as coming from the association\'s published materials; the links render on screen.',
  };

  if (want('dates')) {
    const { data } = await deps.supabase.from('gw_all_state_dates')
      .select('program_id,title,date_type,start_at,end_at,all_day,timezone,description,source_url,retrieved_at,confidence')
      .in('program_id', ids).order('start_at');
    out.dates = (data ?? []).map((d: Record<string, unknown>) => ({
      program: programs.find((p: { id: string }) => p.id === d.program_id)?.name,
      title: d.title, type: d.date_type,
      date: d.start_at ? String(d.start_at).slice(0, 10) : 'not published',
      end: d.end_at ? String(d.end_at).slice(0, 10) : undefined,
      note: d.description ?? undefined, ...fact(d),
    }));
  }
  if (want('requirements')) {
    const { data } = await deps.supabase.from('gw_all_state_requirements')
      .select('program_id,category,title,description,source_url,retrieved_at,confidence')
      .in('program_id', ids).order('sort_order').limit(40);
    out.requirements = (data ?? []).map((r: Record<string, unknown>) => ({
      program: programs.find((p: { id: string }) => p.id === r.program_id)?.name,
      category: r.category, title: r.title, detail: r.description ?? undefined, ...fact(r),
    }));
  }
  if (want('fees')) {
    const { data } = await deps.supabase.from('gw_all_state_fees')
      .select('program_id,fee_type,amount_cents,payable_to,description,source_url,retrieved_at,confidence')
      .in('program_id', ids);
    out.fees = (data ?? []).map((f: Record<string, unknown>) => ({
      program: programs.find((p: { id: string }) => p.id === f.program_id)?.name,
      type: f.fee_type,
      amount: f.amount_cents != null ? `$${(Number(f.amount_cents) / 100).toFixed(2)}` : 'amount not published',
      payable_to: f.payable_to, note: f.description ?? undefined, ...fact(f),
    }));
    if (!(out.fees as unknown[]).length) {
      out.fees_note = 'This state publishes no fee amounts publicly. Do not guess or quote figures from third-party sites.';
    }
  }
  if (want('repertoire')) {
    const { data } = await deps.supabase.from('gw_all_state_repertoire')
      .select('program_id,title,composer,voicing,purpose,notes,source_url')
      .in('program_id', ids).order('sort_order').limit(40);
    out.repertoire = (data ?? []).map((r: Record<string, unknown>) => ({
      program: programs.find((p: { id: string }) => p.id === r.program_id)?.name,
      title: r.title, composer: r.composer ?? 'not published', voicing: r.voicing ?? undefined,
      purpose: r.purpose ?? undefined, note: r.notes ?? undefined, source_url: r.source_url ?? null,
    }));
  }

  // Analytics, fire-and-forget under the caller's JWT (emit-own policy).
  try {
    await deps.supabase.from('gw_analytics_events')
      .insert({ event_name: 'all_state_assistant_question', props: { state: st.slug, topic } });
  } catch { /* analytics never breaks a tool */ }

  return JSON.stringify(out);
}

async function lookupBible(args: Record<string, unknown>, deps: Deps): Promise<string> {
  const translation = String(args.translation ?? 'WEBCE').toUpperCase();
  const reference = typeof args.reference === 'string' ? args.reference.trim() : '';
  const query = typeof args.query === 'string' ? args.query.trim() : '';

  if (!reference && !query) {
    return JSON.stringify({ error: 'Pass either a reference or a search query.' });
  }

  if (reference) {
    const ref = parseBibleReference(reference);
    if (!ref) return JSON.stringify({ error: `I could not read "${reference}" as a scripture reference.` });

    let q = deps.supabase
      .from('gw_bible_verses')
      .select('chapter, verse, text, book:gw_bible_books!inner(name, usfm_code, gw_bible_translations!inner(code))')
      .eq('book.usfm_code', ref.code)
      .eq('book.gw_bible_translations.code', translation)
      .eq('chapter', ref.chapter)
      .order('verse');
    if (ref.startVerse) q = q.gte('verse', ref.startVerse).lte('verse', ref.endVerse ?? ref.startVerse);

    const { data, error } = await q.limit(200);
    if (error) return JSON.stringify({ error: error.message });
    const rows = (data ?? []) as Array<{ chapter: number; verse: number; text: string; book: { name: string } }>;
    if (!rows.length) return JSON.stringify({ error: `Nothing found for "${reference}" in ${translation}.` });

    return JSON.stringify({
      translation,
      reference: `${rows[0].book.name} ${ref.chapter}${ref.startVerse ? `:${ref.startVerse}${ref.endVerse && ref.endVerse !== ref.startVerse ? `-${ref.endVerse}` : ''}` : ''}`,
      verses: rows.map((r) => ({ verse: r.verse, text: r.text })),
    });
  }

  const { data, error } = await deps.supabase
    .from('gw_bible_verses')
    .select('chapter, verse, text, book:gw_bible_books!inner(name, gw_bible_translations!inner(code))')
    .eq('book.gw_bible_translations.code', translation)
    .textSearch('search_tsv', query, { type: 'websearch', config: 'english' })
    .limit(12);
  if (error) return JSON.stringify({ error: error.message });
  const rows = (data ?? []) as Array<{ chapter: number; verse: number; text: string; book: { name: string } }>;
  return JSON.stringify({
    translation,
    query,
    matches: rows.map((r) => ({ reference: `${r.book.name} ${r.chapter}:${r.verse}`, text: r.text })),
  });
}


// ── The liturgical calendar ──────────────────────────────────────────
//
// Answers "what Sunday is coming up" and "what's the psalm this Sunday" from
// gw_prayer_calendar_days / gw_prayer_readings — shared reference data, no
// tenant scoping. The calendar currently covers one liturgical year, so a date
// outside it returns a plain "not loaded" rather than a guess.

function resolveLiturgicalDate(args: Record<string, unknown>): string {
  const explicit = typeof args.date === 'string' ? args.date.trim() : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;

  const when = String(args.when ?? 'today').toLowerCase();
  const d = new Date();
  d.setHours(12, 0, 0, 0); // midday, so a timezone shift can't roll the date
  if (when === 'tomorrow') d.setDate(d.getDate() + 1);
  else if (when === 'sunday' || when === 'next_sunday') {
    // getDay(): 0 = Sunday. "sunday" is the coming Sunday, which is TODAY when
    // today is a Sunday — asking "what's this Sunday" on a Sunday means today.
    // "next_sunday" is the same but never today.
    const ahead = (7 - d.getDay()) % 7;
    d.setDate(d.getDate() + (ahead === 0 && when === 'next_sunday' ? 7 : ahead));
  }
  return d.toISOString().slice(0, 10);
}

/** Psalm HTML → { refrain, verses }.
 *
 *  The refrain is the line that RECURS. USCCB prefixes it with "R."; the
 *  Universalis feed these come from does not — it simply repeats the line — so
 *  detecting repetition works for both. */
function structurePsalm(html: string): { refrain: string | null; verses: string[] } {
  const text = html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(?:p|div|li)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&');

  const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const counts = new Map<string, number>();
  for (const l of lines) counts.set(l, (counts.get(l) ?? 0) + 1);
  const isRefrain = (l: string) => /^R\.?\s/i.test(l) || (counts.get(l) ?? 0) > 1;

  const refrain = lines.find(isRefrain) ?? null;
  const verses = lines.filter((l) => !isRefrain(l));
  return { refrain: refrain ? refrain.replace(/^R\.?\s*(\([^)]*\))?\s*/i, '') : null, verses };
}

async function liturgicalDay(args: Record<string, unknown>, deps: Deps): Promise<string> {
  const date = resolveLiturgicalDate(args);

  const { data: days, error } = await deps.supabase
    .from('gw_prayer_calendar_days')
    .select('id, name, rank_label, liturgical_season, sunday_cycle, is_holy_day_of_obligation, color')
    .eq('rite', 'roman_catholic')
    .eq('day_date', date)
    .order('rank_grade', { ascending: false })
    .limit(1);
  if (error) return JSON.stringify({ error: error.message });

  const day = (days ?? [])[0] as
    | { id: string; name: string; rank_label: string | null; liturgical_season: string | null;
        sunday_cycle: string | null; is_holy_day_of_obligation: boolean; color: string[] }
    | undefined;
  if (!day) {
    return JSON.stringify({
      date,
      error: `The liturgical calendar isn't loaded for ${date}. It currently covers one liturgical year.`,
    });
  }

  const { data: readingRows } = await deps.supabase
    .from('gw_prayer_readings')
    .select('slot, citation, sort_order')
    .eq('calendar_day_id', day.id)
    .order('sort_order');

  const readings = ((readingRows ?? []) as Array<{ slot: string; citation: string }>)
    .map((r) => ({ slot: r.slot, citation: r.citation }));

  const result: Record<string, unknown> = {
    date,
    celebration: day.name,
    rank: day.rank_label,
    // ORDINARY_TIME reads badly aloud; the assistant should say "Ordinary Time".
    season: day.liturgical_season
      ? day.liturgical_season.toLowerCase().split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : null,
    sunday_cycle: day.sunday_cycle,
    holy_day_of_obligation: day.is_holy_day_of_obligation,
    liturgical_colour: day.color?.[0] ?? null,
    readings,
  };

  if (String(args.include_psalm_text ?? '').toLowerCase() === 'true' && deps.supabase.functions) {
    // The psalm TEXT is not in our tables — only its citation — so it comes
    // from the readings function. If that fails, say so rather than dropping
    // the field silently; the assistant must not invent a psalm.
    try {
      const { data, error: fnErr } = await deps.supabase.functions.invoke('usccb-readings', {
        body: { date },
      });
      const block = (data?.readings ?? []).find((b: { heading?: string }) =>
        /responsorial\s*psalm/i.test(b.heading ?? ''));
      if (fnErr || !block) {
        result.psalm_text_error = 'Could not fetch the psalm text for that day.';
      } else {
        result.psalm = { citation: block.citation ?? null, ...structurePsalm(block.html ?? '') };
      }
    } catch (_e) {
      result.psalm_text_error = 'Could not fetch the psalm text for that day.';
    }
  }

  return JSON.stringify(result);
}

// ===================== Academy course catalog =====================
// The advising tools (sp_* RPCs) answer "how is THIS STUDENT doing".
// These answer questions about the COURSES themselves — what exists, who
// teaches it, when it meets, what's due — which the assistant previously
// could not see at all ("I don't have a direct course-listing tool",
// Kevin, 2026-08-11). All queries run under the caller's JWT: members
// see published active courses and their own enrollments; instructors
// and admins see everything. There is no prerequisites column anywhere
// in the schema — prerequisites, materials and policies live in the
// course description and syllabus, so those travel with every answer.

const COURSE_FIELDS =
  'id, title, code, course_code, description, term, semester, instructor_name, instructor_email, instructor_office, instructor_hours, syllabus_url, start_date, end_date, timezone, meeting_patterns, default_location, max_enrollment, is_active, status';

type CourseRow = {
  id: string; title?: string; code?: string; course_code?: string;
  description?: string; term?: string; semester?: string;
  instructor_name?: string; instructor_email?: string; instructor_office?: string;
  instructor_hours?: string; syllabus_url?: string; start_date?: string;
  end_date?: string; timezone?: string; meeting_patterns?: unknown;
  default_location?: string; max_enrollment?: number; is_active?: boolean; status?: string;
};

/** Case-insensitive match of a spoken course name against title and both
 *  code columns ("sight reading", "GW102", "the choir class"). Filtering in
 *  JS instead of .ilike keeps quoting/regex edge cases out of PostgREST. */
function courseMatches(c: CourseRow, q: string): boolean {
  const needle = q.toLowerCase();
  return [c.title, c.code, c.course_code]
    .some((v) => typeof v === 'string' && v.toLowerCase().includes(needle));
}

async function fetchCourses({ supabase }: Deps): Promise<CourseRow[] | { error: string }> {
  const { data, error } = await supabase
    .from('gw_courses')
    .select(COURSE_FIELDS)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return { error: error.message };
  return (data ?? []) as CourseRow[];
}

function courseSummary(c: CourseRow) {
  return {
    id: c.id,
    title: c.title,
    code: c.course_code || c.code || null,
    term: c.semester || c.term || null,
    instructor: c.instructor_name || null,
    starts: c.start_date || null,
    ends: c.end_date || null,
    location: c.default_location || null,
    active: c.is_active !== false,
  };
}

async function listCourses(args: Record<string, unknown>, deps: Deps): Promise<string> {
  const q = String(args.query ?? '').trim();
  const courses = await fetchCourses(deps);
  if ('error' in courses) return JSON.stringify({ error: courses.error });
  const matched = q ? courses.filter((c) => courseMatches(c, q)) : courses;
  // Which of these is the caller enrolled in? Members only see their own
  // enrollment rows, so this is cheap and correct for everyone.
  const { data: mine } = await deps.supabase
    .from('gw_course_enrollments')
    .select('course_id, user_id')
    .limit(200);
  const enrolledIn = new Set(((mine ?? []) as Array<{ course_id: string }>).map((r) => r.course_id));
  return JSON.stringify({
    has_data: matched.length > 0,
    count: matched.length,
    courses: matched.slice(0, 40).map((c) => ({
      ...courseSummary(c),
      caller_enrolled: enrolledIn.has(c.id) || undefined,
    })),
  });
}

// Pure resolver over an already-fetched list: getCourseDeadlines and
// getEnrollments need BOTH the resolved course and the full list (for the
// title map), and the old shape fetched the entire catalog twice per call.
function resolveCourseFrom(courses: CourseRow[], name: string): CourseRow | null {
  const q = name.trim();
  if (!q) return null;
  const exact = courses.find((c) =>
    [c.title, c.code, c.course_code].some((v) => typeof v === 'string' && v.toLowerCase() === q.toLowerCase()));
  return exact ?? courses.find((c) => courseMatches(c, q)) ?? null;
}

async function getCourseInfo(args: Record<string, unknown>, deps: Deps): Promise<string> {
  const name = String(args.course ?? '').trim();
  if (!name) return JSON.stringify({ error: 'Pass the course name or code.' });
  const courses = await fetchCourses(deps);
  if ('error' in courses) return JSON.stringify({ error: courses.error });
  const course = resolveCourseFrom(courses, name);
  if (!course) return JSON.stringify({ has_data: false, note: `No course matching "${name}" is visible to this user.` });
  // Sessions and enrollment are independent — one round-trip, not two.
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: sessions }, { data: enrolled }] = await Promise.all([
    deps.supabase
      .from('gw_course_class_sessions')
      .select('title, session_date, start_time, end_time, location, session_type')
      .eq('course_id', course.id)
      .gte('session_date', today)
      .order('session_date', { ascending: true })
      .limit(6),
    deps.supabase
      .from('gw_course_enrollments')
      .select('id, user_id')
      .eq('course_id', course.id)
      .limit(500),
  ]);
  const enrolledCount = (enrolled ?? []).length;
  return JSON.stringify({
    has_data: true,
    course: {
      ...courseSummary(course),
      description: course.description || null,
      instructor_email: course.instructor_email || null,
      instructor_office: course.instructor_office || null,
      instructor_office_hours: course.instructor_hours || null,
      syllabus_url: course.syllabus_url || null,
      meeting_patterns: course.meeting_patterns ?? null,
      max_enrollment: course.max_enrollment ?? null,
      upcoming_sessions: sessions ?? [],
    },
    // Members only see their own enrollment row, so a member's count is
    // "am I in it", not the class size. Even for admins the count is only
    // "rows RLS let you see" — named accordingly so the model cannot
    // present a partial view as the class size.
    visible_enrollment_count: deps.role === 'admin' ? enrolledCount : undefined,
    caller_enrolled: deps.role === 'admin' ? undefined : enrolledCount > 0,
    note: 'Prerequisites, materials and policies are not separate fields — when the user asks for them, read the description and point at the syllabus if one exists.',
  });
}

async function getCourseDeadlines(args: Record<string, unknown>, deps: Deps): Promise<string> {
  const name = String(args.course ?? '').trim();
  // One catalog fetch serves both the name resolution and the title map.
  const courses = await fetchCourses(deps);
  if ('error' in courses) return JSON.stringify({ error: courses.error });
  let courseId: string | null = null;
  let courseLabel: string | null = null;
  if (name) {
    const course = resolveCourseFrom(courses, name);
    if (!course) return JSON.stringify({ has_data: false, note: `No course matching "${name}" is visible to this user.` });
    courseId = course.id;
    courseLabel = course.title ?? name;
  }
  const titleById = new Map<string, string>(courses.map((c) => [c.id, c.title ?? 'Untitled course']));

  // The builder is untyped (SupabaseLike.from returns the chainable stub),
  // so this helper's parameter inherits that looseness without an annotation.
  const applyCourse = (q: ReturnType<SupabaseLike['from']>) => (courseId ? q.eq('course_id', courseId) : q);
  const [assignA, assignB, tests] = await Promise.all([
    applyCourse(deps.supabase.from('gw_course_assignments')
      .select('course_id, title, assignment_type, points, due_date, available_from, available_until, is_published')).limit(100),
    applyCourse(deps.supabase.from('gw_assignments')
      .select('course_id, title, assignment_type, points, due_at, is_active, student_id')).limit(100),
    applyCourse(deps.supabase.from('gw_course_tests')
      .select('course_id, title, test_type, total_points, available_from, available_until, duration_minutes, is_published')).limit(100),
  ]);
  const err = assignA.error ?? assignB.error ?? tests.error;
  if (err) return JSON.stringify({ error: err.message });

  type Deadline = { course: string; kind: string; title: string; due?: string | null; opens?: string | null; closes?: string | null; points?: number | null };
  // One loose shape covers all three sources; each loop reads only the
  // columns its table actually selected.
  type DeadlineSourceRow = {
    course_id: string; title: string; assignment_type?: string | null; test_type?: string | null;
    points?: number | null; total_points?: number | null; due_date?: string | null; due_at?: string | null;
    available_from?: string | null; available_until?: string | null;
    is_published?: boolean | null; is_active?: boolean | null;
  };
  const items: Deadline[] = [];
  for (const a of (assignA.data ?? []) as DeadlineSourceRow[]) {
    if (a.is_published === false) continue;
    items.push({ course: titleById.get(a.course_id) ?? 'Unknown course', kind: a.assignment_type || 'assignment', title: a.title, due: a.due_date ?? null, opens: a.available_from ?? null, closes: a.available_until ?? null, points: a.points ?? null });
  }
  for (const a of (assignB.data ?? []) as DeadlineSourceRow[]) {
    if (a.is_active === false) continue;
    items.push({ course: titleById.get(a.course_id) ?? 'Unknown course', kind: a.assignment_type || 'assignment', title: a.title, due: a.due_at ?? null, points: a.points ?? null });
  }
  for (const t of (tests.data ?? []) as DeadlineSourceRow[]) {
    if (t.is_published === false) continue;
    items.push({ course: titleById.get(t.course_id) ?? 'Unknown course', kind: t.test_type || 'test', title: t.title, opens: t.available_from ?? null, closes: t.available_until ?? null, due: t.available_until ?? null, points: t.total_points ?? null });
  }
  items.sort((x, y) => String(x.due ?? x.closes ?? '9999').localeCompare(String(y.due ?? y.closes ?? '9999')));
  return JSON.stringify({
    has_data: items.length > 0,
    scope: courseLabel ?? 'all visible courses',
    deadlines: items.slice(0, 60),
  });
}

async function getEnrollments(args: Record<string, unknown>, deps: Deps): Promise<string> {
  const courseName = String(args.course ?? '').trim();
  const personName = String(args.user_name ?? '').trim();
  // One catalog fetch: resolves the course filter AND labels the results.
  const courses = await fetchCourses(deps);
  if ('error' in courses) return JSON.stringify({ error: courses.error });
  let courseId: string | null = null;
  let courseLabel: string | null = null;
  if (courseName) {
    const course = resolveCourseFrom(courses, courseName);
    if (!course) return JSON.stringify({ has_data: false, note: `No course matching "${courseName}" is visible to this user.` });
    courseId = course.id;
    courseLabel = course.title ?? courseName;
  }
  let q = deps.supabase.from('gw_course_enrollments')
    .select('course_id, user_id, role, enrollment_status, enrolled_at')
    .order('enrolled_at', { ascending: false })
    .limit(300);
  if (courseId) q = q.eq('course_id', courseId);
  const { data: rows, error } = await q;
  if (error) return JSON.stringify({ error: error.message });

  const titleById = new Map<string, string>(courses.map((c) => [c.id, c.title ?? 'Untitled course']));
  const userIds = [...new Set(((rows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id))];
  const nameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await deps.supabase
      .from('gw_profiles')
      .select('user_id, full_name')
      .in('user_id', userIds.slice(0, 300));
    for (const p of (profiles ?? []) as Array<{ user_id: string; full_name?: string }>) {
      if (p.full_name) nameById.set(p.user_id, p.full_name);
    }
  }
  type EnrollmentRow = { course_id: string; user_id: string; role?: string | null; enrollment_status?: string | null; enrolled_at?: string | null };
  let list = ((rows ?? []) as EnrollmentRow[]).map((r) => ({
    course: titleById.get(r.course_id) ?? 'Unknown course',
    student: nameById.get(r.user_id) ?? 'Unknown member',
    role: r.role ?? 'student',
    status: r.enrollment_status ?? null,
    enrolled_at: r.enrolled_at ?? null,
  }));
  if (personName) {
    const needle = personName.toLowerCase();
    list = list.filter((r) => r.student.toLowerCase().includes(needle));
  }
  return JSON.stringify({
    has_data: list.length > 0,
    // The database is the authority on visibility (she must stay blind to
    // other people's data — Kevin, 2026-08-11), and the admin flag here is
    // tenant-blind, so never CLAIM a wider view than RLS actually granted:
    // "administer" overstated it for an admin standing in a workspace where
    // their admin role does not apply.
    scope: deps.role === 'admin'
      ? 'the enrollments your permissions expose in this workspace'
      : 'only your own enrollments',
    course: courseLabel ?? undefined,
    enrollments: list.slice(0, 100),
    // RLS scopes members to their own rows. An empty result means "nothing
    // is visible to you here" — only claim a course is empty when the
    // caller's roster view plainly covers it (they see other courses).
  });
}

// Libraries hold duplicate copies of the same title ("A Choice to Change the
// World" ×7), and the model can only pass ONE score_id — usually not the copy
// that went through Part Tracks. When the asked copy has no analysis, fall
// back to an analyzed same-tenant copy whose title matches (RLS scopes the
// candidate list, so this never crosses tenants).
const normTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function findAnalyzedCopy(
  supabase: SupabaseLike, scoreId: string,
): Promise<{ row: Record<string, unknown>; title: string } | null> {
  const { data: me } = await supabase
    .from('gw_sheet_music').select('title').eq('id', scoreId).maybeSingle();
  const askedTitle = typeof me?.title === 'string' ? me.title : '';
  if (!askedTitle) return null;
  const { data: cands } = await supabase
    .from('gw_parttrack_scores')
    .select('id, sheet_music_id, analysis, source_type, status, validation_report, tempo_override_bpm, manifest, error_message')
    .not('analysis', 'is', null)
    .in('status', ['awaiting_confirmation', 'rendering', 'ready'])
    .limit(25);
  const rows = (cands ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return null;
  const { data: sheets } = await supabase
    .from('gw_sheet_music').select('id, title')
    .in('id', rows.map((r) => r.sheet_music_id));
  const mine = normTitle(askedTitle);
  const candIds = new Set(rows.map((r) => String(r.sheet_music_id)));
  // Prefix match either way so "…World" and "…World SSAA" pair up. Only
  // sheets that actually own an analyzed candidate row count (defensive
  // even though the .in() filter already restricts the query).
  const sheet = ((sheets ?? []) as Array<{ id: string; title?: string }>).find((s) => {
    if (!candIds.has(s.id)) return false;
    const other = normTitle(s.title ?? '');
    return other.length > 0 && (other === mine || other.startsWith(mine) || mine.startsWith(other));
  });
  if (!sheet) return null;
  const row = rows.find((r) => r.sheet_music_id === sheet.id);
  return row ? { row, title: sheet.title ?? '' } : null;
}

async function getScoreAnalysis(args: Record<string, unknown>, { supabase, role }: Deps): Promise<string> {
  const scoreId = String(args.score_id ?? '').trim();
  if (!scoreId) return JSON.stringify({ error: 'Pass score_id from search_music first.' });

  const { data: rowData, error } = await supabase
    .from('gw_parttrack_scores')
    .select('id, analysis, source_type, status, validation_report, tempo_override_bpm, manifest, error_message')
    .eq('sheet_music_id', scoreId)
    .maybeSingle();
  if (error) return JSON.stringify({ error: error.message });
  let row = rowData as Record<string, unknown> | null;
  let matchedCopy: string | null = null;

  // Honesty split (Deps.role): admins can run the analysis themselves;
  // students need their director to do it.
  const hint = role === 'admin'
    ? "Not analyzed yet — open this score's ⋯ menu in the Music Library, run Part Tracks, and ask again once it finishes."
    : 'Not analyzed yet — ask your director to run this score through Part Tracks, then I can answer.';
  // A row's analysis blob can be stale from a previous source file — source
  // replacement never clears it. Only serve facts once status confirms the
  // CURRENT source has actually finished analyzing; 'failed'/'queued'/
  // 'analyzing' always short-circuit, even if an old analysis is present.
  if (row?.status === 'failed') {
    return JSON.stringify({
      analyzed: false, failed: true,
      error_message: row.error_message ?? 'analysis failed', hint,
    });
  }
  if (row?.status === 'queued' || row?.status === 'analyzing') {
    return JSON.stringify({
      analyzed: false, in_progress: true,
      hint: 'This score is being analyzed right now — ask again in a couple of minutes.',
    });
  }
  if (!row || !row.analysis) {
    const alt = await findAnalyzedCopy(supabase, scoreId);
    if (!alt) return JSON.stringify({ analyzed: false, hint });
    row = alt.row;
    matchedCopy = alt.title;
  }

  const { data: partRows, error: pErr } = await supabase
    .from('gw_parttrack_parts')
    .select('source_part_index, source_staff, source_voice, role, label, include')
    .eq('score_id', row.id);
  if (pErr) return JSON.stringify({ error: pErr.message });

  const analysis = row.analysis as Record<string, unknown>;
  const aParts = (analysis.parts ?? []) as Array<Record<string, unknown>>;
  const joinKey = (p: Record<string, unknown>) =>
    `${p.source_part_index}|${p.source_staff ?? ''}|${p.source_voice ?? ''}`;
  const dbByKey = new Map(
    ((partRows ?? []) as Array<Record<string, unknown>>).map((p) => [joinKey(p), p]));
  // The DB parts rows are the source of truth for role/label/include — the
  // director may have re-labeled parts at confirm, after analysis was stored.
  const parts = aParts.map((p) => {
    const db = dbByKey.get(joinKey(p));
    return {
      role: (db?.role ?? p.role) as string,
      label: (db?.label ?? p.label) as string,
      range: p.range ?? null,
      ...(db && db.include === false ? { excluded: true } : {}),
    };
  });

  const optical = row.source_type === 'pdf_omr';
  const markedTempo = (analysis.tempo_bpm ?? null) as number | null;
  return JSON.stringify({
    analyzed: true,
    optical,
    ...(matchedCopy ? {
      matched_copy: matchedCopy,
      matched_copy_note: 'The analyzed Part Tracks project lives on a different library copy of this title (matched_copy). Answer with these facts and mention which copy they come from.',
    } : {}),
    ...(optical ? {
      optical_note: 'These facts were read optically from the PDF (beta) and can contain errors. The FIRST time you state them in this conversation, add: "I read this optically from the PDF, so double-check anything critical against the printed score."',
    } : {}),
    key: analysis.key ?? null,
    time_signatures: analysis.time_signatures ?? [],
    marked_tempo_bpm: markedTempo,
    performance_tempo_bpm: (row.tempo_override_bpm ?? markedTempo) as number | null,
    tempo_overridden: row.tempo_override_bpm != null,
    measures: analysis.measures ?? null,
    duration_ms: (row.manifest as Record<string, unknown> | null)?.duration_ms ?? null,
    parts,
    warnings: ((row.validation_report ?? []) as Array<{ code: string }>).map((w) => w.code),
  });
}

// ===================== Hymnal number lookup =====================
// gw_hymn_index carries number/title/first-line/tune per hymnal (LMGM II,
// Gather, Baptist Hymnal — 2,300+ entries, authenticated-readable). The
// liturgy planner keys on hymn_number, and Kevin plans Masses by "what
// number is it in the hymnal", so the assistant needs the index directly.
// Numbers are exact facts: the tool answers or the assistant says it
// cannot verify — never a guessed number.

// The hymnal LIST (four rows, tenant-blind reference data, changes only
// when a new book is ingested) is cached per container so every lookup is
// one query instead of two. The hymn INDEX itself is always queried live.
type HymnalRow = { id: string; title?: string; short_name?: string };
let hymnalListCache: { rows: HymnalRow[]; ts: number } | null = null;
const HYMNAL_CACHE_TTL_MS = 10 * 60 * 1000;

async function lookupHymn(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const q = String(args.query ?? '').trim();
  const hymnalArg = String(args.hymnal ?? '').trim().toLowerCase();
  const numberArg = String(args.number ?? '').trim();
  if (!q && !numberArg) return JSON.stringify({ error: 'Pass a hymn title/first line, or a number to reverse-look-up.' });

  let hymnalRows: HymnalRow[];
  if (hymnalListCache && Date.now() - hymnalListCache.ts < HYMNAL_CACHE_TTL_MS) {
    hymnalRows = hymnalListCache.rows;
  } else {
    const { data: hymnals, error: hErr } = await supabase
      .from('gw_hymnals')
      .select('id, title, short_name');
    if (hErr) return JSON.stringify({ error: hErr.message });
    hymnalRows = (hymnals ?? []) as HymnalRow[];
    if (hymnalRows.length > 0) hymnalListCache = { rows: hymnalRows, ts: Date.now() };
  }
  const nameById = new Map(hymnalRows.map((h) => [h.id, h.short_name || h.title || h.id]));

  let hymnalIds: string[] | null = null;
  if (hymnalArg) {
    hymnalIds = hymnalRows
      .filter((h) => [h.short_name, h.title, h.id].some((v) => typeof v === 'string' && v.toLowerCase().includes(hymnalArg)))
      .map((h) => h.id);
    if (hymnalIds.length === 0) {
      return JSON.stringify({
        has_data: false,
        note: `No loaded hymnal matches "${args.hymnal}".`,
        available_hymnals: hymnalRows.map((h) => `${h.title} (${h.short_name})`),
      });
    }
  }

  let query = supabase
    .from('gw_hymn_index')
    .select('hymnal_id, number, title, first_line, tune_title, authors, composers')
    .limit(25);
  if (numberArg) query = query.eq('number', numberArg);
  if (hymnalIds) query = query.in('hymnal_id', hymnalIds);
  if (q) {
    // PostgREST .or() treats commas/parens as syntax, so strip them from
    // the user's words rather than trying to escape.
    const safe = q.replace(/[,%()]/g, ' ').trim();
    query = query.or(`title.ilike.%${safe}%,first_line.ilike.%${safe}%,tune_title.ilike.%${safe}%`);
  }
  const { data: rows, error } = await query;
  if (error) return JSON.stringify({ error: error.message });
  const hymns = ((rows ?? []) as Array<Record<string, unknown>>).map((r) => ({
    hymnal: nameById.get(r.hymnal_id as string) ?? 'Unknown hymnal',
    number: r.number,
    title: r.title,
    first_line: r.first_line || undefined,
    tune: r.tune_title || undefined,
    composers: r.composers || undefined,
  }));
  return JSON.stringify({
    has_data: hymns.length > 0,
    hymns,
    note: hymns.length === 0
      ? 'No entry found. Do not guess a number — say it could not be verified, and offer to try another spelling or hymnal.'
      : undefined,
  });
}

// ===================== Assistant naming =====================
// Per-USER, not per-tenant (Kevin, 2026-08-11): the name lives on
// gw_profiles (UNIQUE(user_id) — one row per user across all tenants).
// RLS lets a user update only their own row; the .eq is belt-and-braces
// and the .select() is required — a silently-rejected write otherwise
// reports success (the demo-tenant lesson).

async function setPreferredName(args: Record<string, unknown>, { supabase, userId }: Deps): Promise<string> {
  if (!userId) return JSON.stringify({ error: 'No caller id available.' });
  const raw = String(args.name ?? '').trim();
  const clear = args.clear === true || /^(default|none|nothing|clear)$/i.test(raw);
  const name = clear ? null : raw.slice(0, 40);
  if (!clear && !name) return JSON.stringify({ error: 'Pass what the user wants to be called.' });
  const { data, error } = await supabase
    .from('gw_profiles')
    .update({ preferred_name: name })
    .eq('user_id', userId)
    .select('preferred_name');
  if (error) return JSON.stringify({ error: error.message });
  if (!data || data.length === 0) return JSON.stringify({ error: 'The name did not save.' });
  return JSON.stringify({
    ok: true,
    preferred_name: name,
    note: name
      ? `The user is now addressed as ${name} everywhere they use the assistant. Use it naturally from your NEXT sentence on.`
      : 'Cleared — address the user by their first name again.',
  });
}

async function setAssistantName(args: Record<string, unknown>, { supabase, userId }: Deps): Promise<string> {
  if (!userId) return JSON.stringify({ error: 'No caller id available.' });
  const raw = String(args.name ?? '').trim();
  const clear = args.clear === true || /^(default|none|nothing|clear)$/i.test(raw);
  const name = clear ? null : raw.slice(0, 40);
  if (!clear && !name) return JSON.stringify({ error: 'Pass the new name.' });
  const { data, error } = await supabase
    .from('gw_profiles')
    .update({ assistant_name: name })
    .eq('user_id', userId)
    .select('assistant_name');
  if (error) return JSON.stringify({ error: error.message });
  if (!data || data.length === 0) return JSON.stringify({ error: 'The name did not save.' });
  return JSON.stringify({
    ok: true,
    assistant_name: name,
    note: name
      ? `You are now named ${name} for this user everywhere they use the assistant. Greet the name once, warmly and briefly.`
      : 'Name cleared — you are the GleeWorld Assistant again.',
  });
}

// ===================== Apple Music catalog =====================
// The developer token authenticates GleeWorld to Apple's catalog (public
// endpoint the web app already uses); it grants METADATA only. Playback
// happens client-side in the assistant popout via MusicKit with the
// listener's own Apple ID — this tool never touches user accounts.

let appleDevTokenCache: { token: string; ts: number } | null = null;
const APPLE_TOKEN_TTL_MS = 30 * 60 * 1000;

async function fetchAppleDevToken(): Promise<string | null> {
  if (appleDevTokenCache && Date.now() - appleDevTokenCache.ts < APPLE_TOKEN_TTL_MS) {
    return appleDevTokenCache.token;
  }
  try {
    const res = await fetch('https://demo.gleeworld.org/apple-music/developer-token');
    if (!res.ok) return null;
    const { token } = await res.json();
    if (typeof token === 'string' && token) {
      appleDevTokenCache = { token, ts: Date.now() };
      return token;
    }
    return null;
  } catch { return null; }
}

function appleArtwork(art: { url?: string } | undefined): string | null {
  return typeof art?.url === 'string' ? art.url.replace('{w}', '300').replace('{h}', '300') : null;
}

async function searchAppleMusicTool(args: Record<string, unknown>): Promise<string> {
  const term = String(args.query ?? '').trim();
  if (!term) return JSON.stringify({ error: 'Pass what to search for.' });
  const token = await fetchAppleDevToken();
  if (!token) return JSON.stringify({ error: 'Apple Music is not reachable right now.' });
  const url = `https://api.music.apple.com/v1/catalog/us/search?term=${encodeURIComponent(term)}&types=songs,albums,artists&limit=5`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return JSON.stringify({ error: `Apple Music search failed (${res.status}).` });
  const data = await res.json();
  const r = data?.results ?? {};
  type AppleItem = { id: string; attributes?: Record<string, unknown> };
  const songs = ((r.songs?.data ?? []) as AppleItem[]).map((s) => ({
    id: s.id, kind: 'song',
    title: s.attributes?.name, artist: s.attributes?.artistName, album: s.attributes?.albumName,
    year: typeof s.attributes?.releaseDate === 'string' ? (s.attributes.releaseDate as string).slice(0, 4) : undefined,
    artwork_url: appleArtwork(s.attributes?.artwork as { url?: string } | undefined),
  }));
  const albums = ((r.albums?.data ?? []) as AppleItem[]).map((a) => ({
    id: a.id, kind: 'album',
    title: a.attributes?.name, artist: a.attributes?.artistName,
    tracks: a.attributes?.trackCount, year: typeof a.attributes?.releaseDate === 'string' ? (a.attributes.releaseDate as string).slice(0, 4) : undefined,
    genres: a.attributes?.genreNames,
    notes: (a.attributes?.editorialNotes as { standard?: string } | undefined)?.standard?.slice(0, 400),
    artwork_url: appleArtwork(a.attributes?.artwork as { url?: string } | undefined),
  }));
  const artists = ((r.artists?.data ?? []) as AppleItem[]).map((a) => ({
    id: a.id, kind: 'artist', name: a.attributes?.name, genres: a.attributes?.genreNames,
  }));
  return JSON.stringify({
    has_data: songs.length + albums.length + artists.length > 0,
    songs, albums, artists,
    note: 'To play a song or album, call play_apple_music with its id + kind + title + artist + artwork_url. Artists are information-only.',
  });
}

// ===================== Scheduled playlists =====================
// "Play my warm-ups at Sunday's rehearsal": store a ready-to-run client
// action on the event; the app offers a one-tap play chip when the event
// starts (browsers cannot start audio unattended). Admin-gated in the
// catalog because events are the shared tenant calendar.

async function scheduleEventPlaylist(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const eventQuery = String(args.event ?? '').trim();
  if (!eventQuery) return JSON.stringify({ error: 'Pass the event title to attach to.' });
  const { data: events, error } = await supabase
    .from('gw_events')
    .select('id, title, start_date')
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(200);
  if (error) return JSON.stringify({ error: error.message });
  const needle = eventQuery.toLowerCase();
  const hit = ((events ?? []) as Array<{ id: string; title?: string; start_date?: string }>)
    .find((e) => (e.title ?? '').toLowerCase().includes(needle));
  if (!hit) return JSON.stringify({ has_data: false, note: `No upcoming event matching "${eventQuery}".` });

  let payload: Record<string, unknown> | null = null;
  if (args.clear === true) {
    payload = null;
  } else if (typeof args.playlist_name === 'string' && args.playlist_name.trim()) {
    payload = { tool: 'play_my_playlist', args: { name: args.playlist_name.trim() }, label: args.playlist_name.trim() };
  } else if (typeof args.apple_id === 'string' && args.apple_id.trim()) {
    payload = {
      tool: 'play_apple_music',
      args: { id: args.apple_id.trim(), kind: args.apple_kind === 'album' ? 'album' : 'song', title: args.label ?? '', artwork_url: args.artwork_url ?? undefined },
      label: args.label ?? 'Music',
    };
  } else {
    return JSON.stringify({ error: 'Pass playlist_name (their library playlist) OR apple_id from search_apple_music, or clear=true.' });
  }
  const { data: updated, error: upErr } = await supabase
    .from('gw_events')
    .update({ assistant_playlist: payload })
    .eq('id', hit.id)
    .select('id');
  if (upErr) return JSON.stringify({ error: upErr.message });
  if (!updated || updated.length === 0) return JSON.stringify({ error: 'The event did not accept the change (permissions).' });
  return JSON.stringify({
    ok: true,
    event: hit.title, starts: hit.start_date,
    scheduled: payload ? (payload as { label: string }).label : null,
    note: payload
      ? 'Tell the user: when the event starts, a play button for it appears next to the assistant — one tap starts the music.'
      : 'Cleared.',
  });
}
