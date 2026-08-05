// Read-only tool executors. The supabase client is constructed with the
// CALLER's JWT (Task 5), so RLS scopes every query to their tenant/role.
import { executeStudentPictureTool } from './studentPicture.ts';
import { ACADEMY_CORPUS } from '../_shared/academy/corpus.ts';
import { buildIndex, searchAcademy } from '../_shared/academy/search.ts';

type SupabaseLike = {
  from: (table: string) => any;
  functions?: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export interface Deps {
  supabase: SupabaseLike;
  youtubeApiKey?: string;
  googleMapsApiKey?: string;
  homeAddress?: string;
  webSearchUrl?: string;
  webSearchAuthHeader?: string;
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
  | { kind: 'places'; query: string; near?: string; places: PlaceEntry[] };

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
      case 'find_user': return { replyJson: await findUser(args, deps) };
      case 'search_youtube': return { replyJson: await searchYoutube(args, deps) };
      case 'get_ride': return await getRide(args, deps);
      case 'order_food': return await orderFood(args);
      case 'get_date_card': return { replyJson: await getDateCard(deps) };
      case 'read_news_feeds': return { replyJson: await readNewsFeeds(args, deps) };
      case 'find_nearby_place': return await findNearbyPlace(args, deps);
      case 'get_preference': return { replyJson: await getPreference(args, deps) };
      case 'lookup_bible': return { replyJson: await lookupBible(args, deps) };
      case 'web_search': return await webSearch(args, deps);
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
  const { data: events, error } = await supabase
    .from('gw_events')
    .select('id, title, start_date, end_date, location, category')
    .gte('start_date', `${from}T00:00:00`)
    .lte('start_date', `${to}T23:59:59`)
    .order('start_date')
    .limit(50);
  if (error) return JSON.stringify({ error: error.message });
  const { data: gcal } = await supabase
    .from('gw_google_events')
    .select('id, title, start_at, end_at, location')
    .gte('start_at', `${from}T00:00:00`)
    .lte('start_at', `${to}T23:59:59`)
    .order('start_at')
    .limit(50);
  return JSON.stringify({
    events: events ?? [],
    google_calendar_events: (gcal ?? []).map((g: any) => ({ ...g, read_only: true })),
  });
}

// The corpus is bundled and immutable, so the index is built once per instance.
const academyIndex = buildIndex(ACADEMY_CORPUS);

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

async function searchMusic(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const q = String(args.query ?? '').replace(/[%_]/g, '');
  const { data, error } = await supabase
    .from('gw_sheet_music')
    .select('id, title, composer, voicing')
    .or(`title.ilike.%${q}%,composer.ilike.%${q}%`)
    .limit(10);
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ scores: data ?? [] });
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
