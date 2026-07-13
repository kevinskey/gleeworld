// Read-only tool executors. The supabase client is constructed with the
// CALLER's JWT (Task 5), so RLS scopes every query to their tenant/role.

type SupabaseLike = { from: (table: string) => any };

interface Deps { supabase: SupabaseLike; youtubeApiKey?: string }

export async function executeServerTool(
  name: string,
  args: Record<string, unknown>,
  deps: Deps,
): Promise<string> {
  try {
    switch (name) {
      case 'query_calendar': return await queryCalendar(args, deps);
      case 'search_music': return await searchMusic(args, deps);
      case 'find_user': return await findUser(args, deps);
      case 'search_youtube': return await searchYoutube(args, deps);
      default: return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : 'tool failed' });
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
