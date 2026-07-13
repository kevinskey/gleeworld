import type { AssistantAction } from './types';

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

// Route whitelist for open_page. Paths come from src/lib/navigation/navCatalog.ts —
// keep keys in sync with the open_page tool description in toolCatalog.ts.
export const PAGE_ROUTES: Record<string, string> = {
  home: '/dashboard',
  calendar: '/dashboard/calendar',
  planner: '/planner',
  'music-library': '/dashboard/music-library',
  studio: '/studio',
  video: '/video',
  messenger: '/dashboard/messenger',
  academy: '/dashboard/academy',
  'sight-reading': '/dashboard/sight-reading',
  'part-tracks': '/dashboard/part-tracks',
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
  message: string;
}

export interface ActionDeps {
  supabase: { from: (table: string) => any; functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> } };
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
  const needsDeps = !['open_page', 'open_song', 'start_video_session'].includes(action.tool);
  const deps = { ...(needsDeps && !depsOverride ? await defaultDeps() : {}), ...depsOverride } as ActionDeps;
  const a = action.args;
  try {
    switch (action.tool) {
      case 'open_page': {
        const key = String(a.key);
        // hasOwnProperty guard: PAGE_ROUTES[key] alone resolves inherited keys like
        // 'constructor' / '__proto__' / 'hasOwnProperty' to truthy non-route values,
        // which would bypass the whitelist rejection below.
        const route = Object.prototype.hasOwnProperty.call(PAGE_ROUTES, key) ? PAGE_ROUTES[key] : undefined;
        if (typeof route !== 'string') return { ok: false, message: `I don't know a page called "${a.key}".` };
        return { ok: true, navigateTo: route, message: `Opening ${a.key}.` };
      }
      case 'open_song': {
        const id = String(a.score_id ?? '');
        if (!/^[0-9a-f-]{3,64}$/i.test(id)) return { ok: false, message: 'That score id looks invalid.' };
        return { ok: true, navigateTo: `/dashboard/music-library?view=${id}`, message: `Opening ${a.title ?? 'the score'}.` };
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
        // youtube_videos.channel_id is a required FK to youtube_channels.id (uuid) — there is
        // no channel-name column on youtube_videos itself, so `a.channel` (a display name from
        // search_youtube) can't be persisted here; resolve the configured channel row instead.
        const { data: channelRow, error: channelErr } = await deps.supabase
          .from('youtube_channels').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle();
        if (channelErr || !channelRow) return { ok: false, message: 'No YouTube channel is configured to add videos to.' };
        const { data, error } = await deps.supabase.from('youtube_videos').insert({
          video_id: videoId,
          channel_id: channelRow.id,
          title,
          thumbnail_url: typeof a.thumbnail_url === 'string' ? a.thumbnail_url : null,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
        }).select();
        if (error || !data?.length) return { ok: false, message: `Couldn't add the video${error ? `: ${error.message}` : ' (no row returned — check permissions)'}.` };
        return { ok: true, navigateTo: '/video', message: `Added "${title}" to Videos.` };
      }
      default:
        return { ok: false, message: `I can't perform "${action.tool}".` };
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Action failed.' };
  }
}
