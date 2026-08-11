import type { AssistantAction } from './types';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';

// Model-generated text (assistant tool args, possibly steered via indirect prompt
// injection through tool results) must never be trusted as HTML. Escape before
// interpolating into any HTML string we hand to an edge function or renderer.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Resolve an open_page key against the live nav catalog: exact key first,
// then a normalized label match ("Reading Music" ≈ "reading-music") so the
// model's best guess still lands. Returns undefined for anything unknown —
// the caller reports honestly instead of dumping the user on /dashboard.
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function resolvePageRoute(rawKey: string): { route: string; label: string } | undefined {
  const key = normalize(rawKey);
  const byKey = NAV_CATALOG.find((e) => e.key === key);
  if (byKey) return { route: byKey.to, label: byKey.label };
  const byLabel = NAV_CATALOG.find((e) => normalize(e.label) === key);
  if (byLabel) return { route: byLabel.to, label: byLabel.label };
  // Legacy aliases from the original hand-kept whitelist (older threads /
  // cached prompts may still emit these).
  if (Object.prototype.hasOwnProperty.call(PAGE_ROUTES, key)) {
    return { route: PAGE_ROUTES[key], label: rawKey };
  }
  return undefined;
}

// Legacy route whitelist for open_page — superseded by resolvePageRoute's
// nav-catalog lookup; kept only as an alias fallback for old key spellings.
export const PAGE_ROUTES: Record<string, string> = {
  home: '/dashboard',
  calendar: '/dashboard/calendar',
  planner: '/planner',
  notes: '/planner',   // legacy spelling, pre-rename
  'music-library': '/dashboard/music-library',
  studio: '/studio',
  video: '/video',
  messenger: '/dashboard/messenger',
  academy: '/dashboard/academy',
  'sight-reading': '/dashboard/sight-reading',
  'media-library': '/dashboard/media-library',
  songwriting: '/songwriting',
  'concert-planner': '/dashboard/concert-planner',
  'tour-manager': '/tour-manager',
  attendance: '/attendance',
  users: '/dashboard/users',
  analytics: '/dashboard/analytics',
};

export interface ActionOutcome {
  ok: boolean;
  navigateTo?: string;
  openVideoRoom?: string;
  /** External URL to open in a new tab. Only ever set from our own whitelisted
   *  deep-link builders (deepLinks.ts) — never from a model-supplied URL. */
  openExternalUrl?: string;
  /** Close the assistant's floating mini player ("stop the music"). The
   *  player is provider state, so the provider acts on this flag. */
  stopPlayback?: boolean;
  /** Start Apple Music playback in the floating popout (same window the
   *  YouTube player uses). The provider owns the MusicKit hand-off. */
  appleMusic?: { id: string; kind: 'song' | 'album' | 'playlist'; title?: string; artist?: string; artworkUrl?: string | null };
  /** Spotify playback already started by the action (the SDK owns audio);
   *  this is the popout's now-playing card. */
  spotify?: { title: string; artist?: string; artworkUrl?: string | null };
  message: string;
}

export interface ActionDeps {
  supabase: {
    from: (table: string) => any;
    functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>;
  };
  createNote: (partial: { title: string; content?: unknown }) => Promise<{ id: string; title: string }>;
  createTask: (input: { title: string; due_at?: string | null; scheduled_date?: string | null; priority?: string }) => Promise<unknown>;
  textToDoc: (text: string) => unknown;
  pushEventToGoogle: (eventId: string, op: 'create' | 'update' | 'delete') => Promise<unknown>;
}

async function defaultDeps(): Promise<ActionDeps> {
  const [{ supabase }, notesApi, tasksApi, markdown, googleConn] = await Promise.all([
    import('@/integrations/supabase/client'),
    import('@/lib/planner/notesApi'),
    import('@/lib/planner/tasksApi'),
    import('@/lib/planner/markdown'),
    import('@/hooks/useGoogleConnection'),
  ]);
  return {
    supabase: supabase as ActionDeps['supabase'],
    createNote: notesApi.createNote,
    createTask: tasksApi.createTask,
    textToDoc: markdown.textToDoc,
    pushEventToGoogle: googleConn.pushEventToGoogle,
  };
}

export async function executeClientAction(
  action: AssistantAction,
  depsOverride?: Partial<ActionDeps>,
): Promise<ActionOutcome> {
  const needsDeps = ![
    'open_page', 'open_link', 'open_song', 'open_bible', 'open_note',
    'start_video_session', 'book_ride', 'order_food', 'stop_playback',
    'close_viewer', 'play_apple_music', 'create_apple_playlist', 'play_my_playlist',
    'connect_spotify', 'play_spotify', 'create_spotify_playlist', 'play_my_spotify_playlist',
  ].includes(action.tool);
  const deps = { ...(needsDeps && !depsOverride ? await defaultDeps() : {}), ...depsOverride } as ActionDeps;
  const a = action.args;
  try {
    switch (action.tool) {
      case 'open_page': {
        const resolved = resolvePageRoute(String(a.key));
        if (!resolved) return { ok: false, message: `I don't know a page called "${a.key}".` };
        return { ok: true, navigateTo: resolved.route, message: `Opening ${resolved.label}.` };
      }
      case 'open_bible': {
        // The Bible reads its passage from the query string, so navigation is
        // the whole action. The reference is model-supplied, so it is passed
        // through encodeURIComponent and length-capped rather than trusted.
        const ref = String(a.reference ?? '').trim().slice(0, 60);
        if (!ref) return { ok: false, message: 'Which passage would you like?' };
        const tr = String(a.translation ?? '').trim().toUpperCase().slice(0, 12);
        const qs = new URLSearchParams({ ref });
        if (tr) qs.set('t', tr);
        return { ok: true, navigateTo: `/bible?${qs.toString()}`, message: `Opening ${ref}.` };
      }
      case 'open_link': {
        // External article/link hand-off (e.g. "open the full article" on a
        // news item). http(s) only — the URL is model-supplied and may echo
        // feed content, so never allow javascript:/data:/custom schemes.
        const url = String(a.url ?? '');
        if (!/^https?:\/\/\S+$/i.test(url)) return { ok: false, message: 'That link looks invalid.' };
        (globalThis as unknown as Window).open(url, '_blank', 'noopener,noreferrer');
        return { ok: true, message: `Opening ${String(a.title ?? 'the article').slice(0, 120)} in a new tab.` };
      }
      case 'open_song': {
        const id = String(a.score_id ?? '');
        if (!/^[0-9a-f-]{3,64}$/i.test(id)) return { ok: false, message: 'That score id looks invalid.' };
        // Default surface is the Viewer — the immersive full-bleed reader —
        // not the Music Library (Kevin, 2026-08-11). The library variant
        // stays reachable, but only when the user names it.
        const route = a.in_library === true
          ? `/dashboard/music-library?view=${id}`
          : `/dashboard/viewer/${id}`;
        return { ok: true, navigateTo: route, message: `Opening ${a.title ?? 'the score'}.` };
      }
      case 'close_viewer': {
        return { ok: true, navigateTo: '/dashboard/music-library', message: 'Closed the viewer.' };
      }
      case 'open_note': {
        const id = String(a.note_id ?? '');
        if (!/^[0-9a-f-]{3,64}$/i.test(id)) return { ok: false, message: 'That note id looks invalid.' };
        return { ok: true, navigateTo: `/planner/${id}`, message: `Opening ${a.title ?? 'the note'}.` };
      }
      case 'book_ride': {
        const provider = String(a.provider ?? '').trim().toLowerCase();
        if (provider !== 'uber' && provider !== 'lyft') {
          return { ok: false, message: 'The ride service has to be Uber or Lyft.' };
        }
        const address = String(a.destination_address ?? '').trim();
        if (!address) return { ok: false, message: 'Missing the destination address.' };
        const { buildRideLink } = await import('@/lib/concierge/deepLinks');
        const lat = Number(a.lat);
        const lng = Number(a.lng);
        const url = buildRideLink(provider, {
          address,
          name: typeof a.destination_name === 'string' ? a.destination_name : undefined,
          ...(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
        });
        return {
          ok: true,
          openExternalUrl: url,
          message: `Opening ${provider === 'uber' ? 'Uber' : 'Lyft'} with your trip to ${a.destination_name || address} — confirm the ride there.`,
        };
      }
      case 'order_food': {
        const { buildFoodLink } = await import('@/lib/concierge/deepLinks');
        const link = buildFoodLink(
          String(a.service ?? '').trim().toLowerCase().replace(/[^a-z]/g, ''),
          typeof a.craving === 'string' ? a.craving : undefined,
        );
        if (!link) return { ok: false, message: 'The food service has to be DoorDash, Uber Eats, or Grubhub.' };
        return { ok: true, openExternalUrl: link.url, message: `Opening ${link.label} — finish your order there.` };
      }
      case 'stop_playback': {
        return { ok: true, stopPlayback: true, message: 'Stopped.' };
      }
      case 'play_apple_music': {
        const id = String(a.id ?? '').trim();
        // Apple catalog ids are numeric (songs/albums) or prefixed
        // (playlists 'pl.'). Model-supplied, so shape-checked.
        if (!/^[A-Za-z0-9.\-]{4,40}$/.test(id)) return { ok: false, message: 'That Apple Music id looks invalid.' };
        const kind = a.kind === 'album' ? 'album' as const : 'song' as const;
        return {
          ok: true,
          appleMusic: {
            id, kind,
            title: typeof a.title === 'string' ? a.title : undefined,
            artist: typeof a.artist === 'string' ? a.artist : undefined,
            artworkUrl: typeof a.artwork_url === 'string' ? a.artwork_url : null,
          },
          message: `Playing ${a.title ?? 'it'} on Apple Music.`,
        };
      }
      case 'create_apple_playlist': {
        const playlistName = String(a.name ?? '').trim().slice(0, 80);
        if (!playlistName) return { ok: false, message: 'The playlist needs a name.' };
        const ids = Array.isArray(a.song_ids)
          ? a.song_ids.map(String).filter((s) => /^[A-Za-z0-9.\-]{4,40}$/.test(s)).slice(0, 100)
          : [];
        try {
          const mk = await import('@/lib/musicKit');
          const auth = await mk.authorizeAppleMusic();
          if (!auth.ok) return { ok: false, message: auth.message ?? 'Apple Music sign-in is required to create playlists.' };
          await mk.createLibraryPlaylist(
            playlistName,
            typeof a.description === 'string' ? a.description.slice(0, 200) : undefined,
            ids,
          );
          return {
            ok: true,
            message: `Created "${playlistName}" in your Apple Music library${ids.length ? ` with ${ids.length} song${ids.length === 1 ? '' : 's'}` : ''}. It can take a moment to appear on your devices.`,
          };
        } catch {
          return { ok: false, message: "Couldn't create the playlist in Apple Music." };
        }
      }
      case 'play_my_playlist': {
        const wanted = String(a.name ?? '').trim();
        if (!wanted) return { ok: false, message: 'Which playlist?' };
        try {
          const mk = await import('@/lib/musicKit');
          const auth = await mk.authorizeAppleMusic();
          if (!auth.ok) return { ok: false, message: auth.message ?? 'Apple Music sign-in is required to reach your playlists.' };
          const lists = await mk.listLibraryPlaylists();
          const needle = wanted.toLowerCase();
          const hit = lists.find((p) => p.name.toLowerCase() === needle)
            ?? lists.find((p) => p.name.toLowerCase().includes(needle));
          if (!hit) return { ok: false, message: `I couldn't find a playlist named "${wanted}" in your Apple Music library.` };
          return { ok: true, appleMusic: { id: hit.id, kind: 'playlist', title: hit.name }, message: `Playing ${hit.name}.` };
        } catch {
          return { ok: false, message: "Couldn't reach your Apple Music library." };
        }
      }
      case 'connect_spotify': {
        const sp = await import('@/lib/spotify');
        if (sp.isSpotifyConnected()) return { ok: true, message: 'Spotify is already connected.' };
        await sp.connectSpotify(); // navigates away to accounts.spotify.com
        return { ok: true, message: 'Sending you to Spotify to sign in.' };
      }
      case 'play_spotify': {
        const query = String(a.query ?? '').trim();
        if (!query) return { ok: false, message: 'What should I play on Spotify?' };
        const sp = await import('@/lib/spotify');
        if (!sp.isSpotifyConnected()) {
          return { ok: false, message: 'Spotify is not connected yet — say "connect Spotify" and I\'ll set it up.' };
        }
        try {
          const hit = await sp.searchSpotify(query, a.kind === 'album' ? 'album' : 'track');
          if (!hit) return { ok: false, message: `Spotify has no match for "${query}".` };
          await sp.playOnSpotify(hit);
          return { ok: true, spotify: { title: hit.title, artist: hit.artist, artworkUrl: hit.artworkUrl }, message: `Playing ${hit.title} on Spotify.` };
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          if (msg === 'premium_required') return { ok: false, message: 'Spotify playback needs a Premium account on the connected login.' };
          if (msg === 'not_connected') return { ok: false, message: 'Spotify is not connected yet — say "connect Spotify".' };
          return { ok: false, message: "Couldn't start Spotify playback." };
        }
      }
      case 'create_spotify_playlist': {
        const plName = String(a.name ?? '').trim().slice(0, 80);
        if (!plName) return { ok: false, message: 'The playlist needs a name.' };
        const queries = Array.isArray(a.queries) ? a.queries.map(String).filter(Boolean).slice(0, 50) : [];
        const sp = await import('@/lib/spotify');
        if (!sp.isSpotifyConnected()) return { ok: false, message: 'Spotify is not connected yet — say "connect Spotify".' };
        try {
          const hits = await Promise.all(queries.map((q) => sp.searchSpotify(q, 'track').catch(() => null)));
          const uris = hits.filter((h): h is NonNullable<typeof h> => !!h).map((h) => h.uri);
          await sp.createSpotifyPlaylist(plName, typeof a.description === 'string' ? a.description.slice(0, 200) : undefined, uris);
          const missed = queries.length - uris.length;
          return {
            ok: true,
            message: `Created "${plName}" on your Spotify with ${uris.length} song${uris.length === 1 ? '' : 's'}${missed > 0 ? ` — ${missed} couldn't be found` : ''}. It's private to you.`,
          };
        } catch {
          return { ok: false, message: "Couldn't create the playlist on Spotify." };
        }
      }
      case 'play_my_spotify_playlist': {
        const wanted = String(a.name ?? '').trim();
        if (!wanted) return { ok: false, message: 'Which playlist?' };
        const sp = await import('@/lib/spotify');
        if (!sp.isSpotifyConnected()) return { ok: false, message: 'Spotify is not connected yet — say "connect Spotify".' };
        try {
          const lists = await sp.listMyPlaylists();
          const needle = wanted.toLowerCase();
          const hit = lists.find((p) => p.name.toLowerCase() === needle)
            ?? lists.find((p) => p.name.toLowerCase().includes(needle));
          if (!hit) return { ok: false, message: `I couldn't find a playlist named "${wanted}" on your Spotify.` };
          await sp.playOnSpotify({ uri: hit.uri, contextUri: hit.uri, title: hit.name, artist: '', artworkUrl: null });
          return { ok: true, spotify: { title: hit.name }, message: `Playing ${hit.name} on Spotify.` };
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          if (msg === 'premium_required') return { ok: false, message: 'Spotify playback needs a Premium account on the connected login.' };
          return { ok: false, message: "Couldn't reach your Spotify playlists." };
        }
      }
      case 'start_video_session': {
        const slug = String(a.room_name ?? 'gleeworld-room').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 60) || 'gleeworld-room';
        return { ok: true, openVideoRoom: slug, message: 'Starting your video session.' };
      }
      case 'create_note': {
        const body = typeof a.body === 'string' && a.body.trim() ? a.body : '';
        const note = await deps.createNote({
          title: String(a.title ?? 'Untitled'),
          ...(body && deps.textToDoc ? { content: deps.textToDoc(body) } : {}),
        });
        return { ok: true, navigateTo: '/planner', message: `Created the note "${note.title}".` };
      }
      case 'create_task': {
        await deps.createTask({
          title: String(a.title ?? 'Untitled task'),
          due_at: typeof a.due_at === 'string' ? a.due_at : null,
          scheduled_date: typeof a.scheduled_date === 'string' ? a.scheduled_date : null,
          priority: typeof a.priority === 'string' ? a.priority : 'none',
        });
        return { ok: true, message: `Added the task "${a.title}".` };
      }
      case 'create_event': {
        const { data: cals, error: calErr } = await deps.supabase
          .from('gw_calendars').select('id, is_default').eq('is_visible', true).order('is_default', { ascending: false }).limit(1);
        if (calErr || !cals?.length) return { ok: false, message: 'No calendar available to add the event to.' };
        const { data: { user } } = await (deps.supabase as any).auth?.getUser?.() ?? { data: { user: null } };
        const { data: event, error } = await deps.supabase.from('gw_events').insert({
          title: String(a.title), description: a.description ?? null,
          start_date: String(a.start), end_date: String(a.end),
          venue_name: a.location ?? null, calendar_id: cals[0].id,
          created_by: user?.id, status: 'scheduled', is_public: false,
        }).select().single();
        if (error || !event) return { ok: false, message: `Couldn't create the event${error ? `: ${error.message}` : ' (no row returned — check permissions)'}.` };
        try { await deps.pushEventToGoogle(event.id, 'create'); } catch { /* google sync is best-effort */ }
        return { ok: true, navigateTo: '/dashboard/calendar', message: `Created "${a.title}".` };
      }
      case 'send_sms': {
        const ids = Array.isArray(a.recipient_user_ids) ? a.recipient_user_ids : [];
        if (!ids.length || typeof a.message !== 'string') return { ok: false, message: 'Missing recipients or message.' };
        // useCommunicationSystem (the proven caller of send-unified-communication) populates
        // recipient phone from `phone_number`, not `phone` — select both and prefer phone_number.
        const { data: profiles, error: pErr } = await deps.supabase
          .from('gw_profiles').select('user_id, full_name, email, phone, phone_number').in('user_id', ids);
        if (pErr || !profiles?.length) return { ok: false, message: 'Could not resolve those recipients.' };
        const { data, error } = await deps.supabase.functions.invoke('send-unified-communication', {
          body: {
            communicationId: crypto.randomUUID(),
            title: 'Assistant SMS',
            content: a.message,
            senderName: 'GleeWorld Assistant',
            recipients: profiles.map((p: any) => ({
              id: p.user_id, type: 'individual', identifier: p.user_id,
              name: p.full_name, email: p.email, phone: p.phone_number ?? p.phone,
            })),
            channels: ['sms'],
          },
        });
        if (error) return { ok: false, message: `SMS failed: ${error.message ?? 'unknown error'}` };
        // send-unified-communication returns HTTP 200 with a body even when zero/some SMS
        // sends actually went through (Twilio failures land in results.errors, not `error`).
        const results = data?.results;
        const smsSent = typeof results?.smsSent === 'number' ? results.smsSent : profiles.length;
        const totalRecipients = typeof results?.totalRecipients === 'number' ? results.totalRecipients : profiles.length;
        if (smsSent === 0) {
          const firstError = Array.isArray(results?.errors) ? results.errors[0] : undefined;
          return { ok: false, message: `SMS failed to send${firstError ? `: ${firstError}` : ' to any recipient.'}` };
        }
        if (smsSent < totalRecipients) {
          return { ok: true, message: `Text sent to ${smsSent} of ${totalRecipients} people.` };
        }
        return { ok: true, message: `Text sent to ${smsSent} ${smsSent === 1 ? 'person' : 'people'}.` };
      }
      case 'send_email': {
        const ids = Array.isArray(a.recipient_user_ids) ? a.recipient_user_ids : [];
        if (!ids.length || !a.subject || !a.body) return { ok: false, message: 'Missing recipients, subject, or body.' };
        const { data: profiles, error: pErr } = await deps.supabase
          .from('gw_profiles').select('user_id, full_name, email').in('user_id', ids);
        if (pErr || !profiles?.length) return { ok: false, message: 'Could not resolve those recipients.' };
        const to = profiles.map((p: any) => p.email).filter((e: unknown): e is string => typeof e === 'string' && e.length > 0);
        if (!to.length) return { ok: false, message: 'None of those recipients have an email on file.' };
        const html = String(a.body).split('\n').filter(Boolean).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
        const { data, error } = await deps.supabase.functions.invoke('send-branded-email', {
          body: { to, subject: String(a.subject), html },
        });
        if (error) return { ok: false, message: `Email failed: ${error.message ?? 'unknown error'}` };
        // send-branded-email returns HTTP 200 with successfulBatches/failedBatches even when
        // some (or, defensively, all) batches failed to send via Resend.
        const successfulBatches = typeof data?.successfulBatches === 'number' ? data.successfulBatches : undefined;
        const failedBatches = typeof data?.failedBatches === 'number' ? data.failedBatches : undefined;
        if (successfulBatches === 0) {
          return { ok: false, message: `Email failed to send${data?.error ? `: ${data.error}` : '.'}` };
        }
        if (typeof failedBatches === 'number' && failedBatches > 0 && typeof successfulBatches === 'number') {
          const totalBatches = successfulBatches + failedBatches;
          return { ok: true, message: `Email sent to ${to.length} ${to.length === 1 ? 'person' : 'people'} (${successfulBatches} of ${totalBatches} batches delivered).` };
        }
        return { ok: true, message: `Email sent to ${to.length} ${to.length === 1 ? 'person' : 'people'}.` };
      }
      case 'add_video': {
        const videoId = String(a.video_id ?? '');
        const title = String(a.title ?? '');
        if (!videoId || !title) return { ok: false, message: 'Missing the video id or title.' };
        // youtube_videos.channel_id is a NULLABLE FK to youtube_channels.id. A video found via
        // search_youtube isn't necessarily from a channel the tenant follows, so we save it
        // unattached (channel_id null) rather than demanding a youtube_channels row — the old
        // code bailed with "No YouTube channel is configured" whenever the tenant had none, which
        // is the normal case. tenant_id is filled by the table's BEFORE INSERT trigger; .select()
        // so a silent RLS/tenant write failure surfaces as an error rather than a fake success.
        // (a.channel — a display name from search_youtube — has no column on youtube_videos.)
        const { data, error } = await deps.supabase.from('youtube_videos').insert({
          video_id: videoId,
          channel_id: null,
          title,
          thumbnail_url: typeof a.thumbnail_url === 'string' ? a.thumbnail_url : null,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          // Stamp now so the row has a date to sort by on the YouTube page
          // (it orders by published_at) instead of a null that floats oddly.
          published_at: new Date().toISOString(),
        }).select();
        if (error || !data?.length) return { ok: false, message: `Couldn't add the video${error ? `: ${error.message}` : ' (no row returned — check permissions)'}.` };
        // Also surface it in the DASHBOARD YouTube section, a separate table
        // (dashboard_youtube_videos) that feeds the home page's video widget —
        // youtube_videos only shows on /youtube + the management module.
        // `position` is a required varchar sort key; is_active/video_type/
        // tenant_id all default (true / 'youtube' / current_tenant_id()).
        // Best-effort: the primary save already succeeded, so a hiccup here
        // must not fail the whole add.
        const dash = await deps.supabase.from('dashboard_youtube_videos').insert({
          video_id: videoId,
          title,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          position: String(Date.now()),
        }).select();
        const dashOk = !dash.error && !!dash.data?.length;
        // Land on the dashboard, where the section now shows it; the video is
        // also on /youtube and the YouTube management module.
        return {
          ok: true,
          navigateTo: '/dashboard',
          message: dashOk
            ? `Added "${title}" to your videos.`
            : `Added "${title}" to your YouTube videos (couldn't pin it to the dashboard section).`,
        };
      }
      case 'set_date_card': {
        // Import lazily so the registry (which pulls in lucide + zod) stays out
        // of the base bundle — no user hits it until they ask the assistant to
        // touch this setting.
        const { getDateCardModule, safeDateCardConfig } = await import('@/components/home/date-card/registry');
        const type = String(a.type ?? '');
        const mod = getDateCardModule(type);
        if (!mod) return { ok: false, message: `Unknown date card type "${type}".` };
        const rawConfig = type === 'custom'
          ? {
              eyebrow: typeof a.eyebrow === 'string' ? a.eyebrow : '',
              title: typeof a.title === 'string' ? a.title : '',
              subtitle: typeof a.subtitle === 'string' ? a.subtitle : '',
            }
          : {};
        // safeDateCardConfig fills defaults and drops unknown fields, so a bad
        // model call becomes a valid write instead of an RLS-passing garbage row.
        const config = safeDateCardConfig(mod, rawConfig);
        const setting = { v: 1 as const, type, config };
        // Same conflict pin as useDateCardConfig.save — the singleton `id`
        // default would otherwise re-route every tenant's upsert to id=1.
        const { error } = await deps.supabase
          .from('gw_branding_settings')
          .upsert(
            { date_card: setting, updated_at: new Date().toISOString() },
            { onConflict: 'tenant_id' } as unknown as Record<string, unknown>,
          );
        if (error) return { ok: false, message: `Couldn't update the date card: ${error.message}` };
        return { ok: true, message: `Date card set to ${mod.name}.` };
      }
      case 'switch_world': {
        // Fetch memberships (same RPC the avatar switcher uses). RLS is
        // fine on native + web since it's SECURITY DEFINER scoped to
        // auth.uid(). Returns null on RPC error so we can surface a
        // clean message rather than crash.
        const { data: rawTenants, error: rpcErr } = await deps.supabase.rpc('my_tenants', {});
        if (rpcErr) return { ok: false, message: `Couldn't look up your worlds: ${rpcErr.message ?? 'unknown error'}` };
        const tenants = (rawTenants ?? []) as Array<{ slug: string; name: string | null }>;
        if (tenants.length <= 1) {
          return { ok: false, message: "You're only in one world — there's nothing to switch to." };
        }
        // Current tenant lives in window.__TENANT_CONFIG__.tenant on
        // both web and native. Filter it out so we never "switch" the
        // user to the tenant they're already on.
        const current = (typeof window !== 'undefined'
          && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || null;
        const others = tenants.filter((t) => t.slug !== current);
        if (others.length === 0) {
          return { ok: false, message: "You're already in your only other-world slot." };
        }

        const query = String(a.query ?? '').trim().toLowerCase();
        let target: { slug: string; name: string | null } | null = null;
        if (query) {
          // Exact slug/name match wins over substring so 'main' doesn't
          // fuzzily hit 'kevinsworld' or 'gleeworld-main-choir'.
          target =
            others.find((t) => t.slug.toLowerCase() === query || (t.name ?? '').toLowerCase() === query) ??
            others.find((t) =>
              t.slug.toLowerCase().includes(query) ||
              (t.name ?? '').toLowerCase().includes(query)) ??
            null;
        }
        if (!target) {
          // No query, or nothing matched — hand the list back through the
          // reply so the assistant can ask which one. Not an error state.
          const list = others.map((t) => t.name || t.slug).join(', ');
          return {
            ok: true,
            message: query
              ? `I couldn't find a world matching "${a.query}". Your options: ${list}. Which one?`
              : `Your other worlds are ${list}. Which one?`,
          };
        }

        // Detect native without importing @capacitor/core here (client
        // action bundle stays lean — the check pattern matches the one
        // native-boot.js and isNativeApp() share).
        const isNative = typeof window !== 'undefined' && (
          window.location.protocol === 'capacitor:' ||
          window.location.protocol === 'ionic:' ||
          !!(window as any).Capacitor?.isNativePlatform?.()
        );
        if (isNative) {
          try {
            const payload = target.slug === 'main'
              ? { tenant: 'main' }
              : { tenant: target.slug, org: target.name ?? undefined };
            localStorage.setItem('gw_native_tenant', JSON.stringify(payload));
          } catch { /* private mode — reload will re-derive */ }
          window.location.reload();
        } else {
          // Web: same active-tenant pivot as the avatar-dropdown
          // switcher — see DashboardShell for details. Writes
          // active_tenant_id (not tenant_id, which stays as home) so
          // switching between worlds doesn't break sign-in on the home
          // tenant.
          const { tenantHomeUrl, tenantSwitchUrl, performTenantSwitch } = await import('@/hooks/useMyTenants');
          try {
            const refreshed = await performTenantSwitch(deps.supabase as any, target.slug);
            window.location.href = tenantSwitchUrl(target.slug, refreshed);
          } catch (e) {
            console.warn('[assistant] tenant switch pivot failed', e);
            window.location.href = tenantHomeUrl(target.slug);
          }
        }
        return { ok: true, message: `Switching to ${target.name || target.slug}…` };
      }
      case 'create_course_draft': {
        const spec = a.spec;
        if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
          return { ok: false, message: 'Missing the course spec.' };
        }
        const { data, error } = await deps.supabase.rpc('assistant_create_course', { spec });
        if (error) return { ok: false, message: `Couldn't create the course: ${error.message ?? 'unknown error'}` };
        // Silent-write guard: the RPC returns a summary object; anything else means no rows landed.
        if (!data?.course_id) {
          return { ok: false, message: "Couldn't create the course (no confirmation returned — check permissions)." };
        }
        const code = String(data.course_code ?? '').toLowerCase();
        return {
          ok: true,
          navigateTo: code ? `/academy/c/${code}` : undefined,
          message: `Draft "${String(data.title ?? '')}" created — ${data.module_count} modules, ${data.assignment_count} assignments, ${data.session_count} class sessions. Review it and publish when ready.`,
        };
      }
      default:
        return { ok: false, message: `I can't perform "${action.tool}".` };
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Action failed.' };
  }
}
