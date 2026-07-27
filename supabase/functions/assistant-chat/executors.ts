// Read-only tool executors. The supabase client is constructed with the
// CALLER's JWT (Task 5), so RLS scopes every query to their tenant/role.

type SupabaseLike = {
  from: (table: string) => any;
  functions?: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
};

interface Deps {
  supabase: SupabaseLike;
  youtubeApiKey?: string;
  googleMapsApiKey?: string;
  homeAddress?: string;
}

export type ConciergeResult =
  | { kind: 'ride'; query: string; resolvedAddress: string; uberUrl: string; lyftUrl: string; preferred?: 'uber' | 'lyft' }
  | { kind: 'food'; query: string; services: Array<{ name: 'DoorDash' | 'Uber Eats' | 'Grubhub'; deepLinkUrl: string }>; preferred?: 'doordash' | 'ubereats' | 'grubhub' }
  | { kind: 'web';  query: string; answer?: string; results: Array<{ title: string; url: string; snippet: string }> };

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
      case 'find_user': return { replyJson: await findUser(args, deps) };
      case 'search_youtube': return { replyJson: await searchYoutube(args, deps) };
      case 'get_ride': return await getRide(args, deps);
      case 'order_food': return await orderFood(args);
      case 'get_date_card': return { replyJson: await getDateCard(deps) };
      case 'read_news_feeds': return { replyJson: await readNewsFeeds(args, deps) };
      case 'find_nearby_place': return { replyJson: await findNearbyPlace(args, deps) };
      case 'get_preference': return { replyJson: await getPreference(args, deps) };
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

async function findNearbyPlace(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  if (!query) return JSON.stringify({ error: 'query is required' });
  const lat = typeof args.lat === 'number' ? args.lat : undefined;
  const lng = typeof args.lng === 'number' ? args.lng : undefined;
  const near = typeof args.near === 'string' ? args.near.trim() : undefined;
  if (!lat && !lng && !near) {
    return JSON.stringify({ error: 'Need either lat/lng or a `near` string — ask the user where they are.' });
  }
  if (!supabase.functions) return JSON.stringify({ error: 'places lookup unavailable in this context' });
  const { data, error } = await supabase.functions.invoke('nearby-places', {
    body: { query, lat, lng, near, maxResults: 5 },
  });
  if (error) return JSON.stringify({ error: error.message ?? 'nearby-places failed' });
  return JSON.stringify(data ?? { places: [] });
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
