import { describe, it, expect, vi } from 'vitest';
import { executeClientAction, PAGE_ROUTES } from '../clientActions';
import type { ActionDeps } from '../clientActions';

// Shared stub-deps builder: mirrors the inline `{ supabase, ... } as any` object the
// existing tests construct by hand, but lets callers override just the `rpc` (or `from`,
// or any other ActionDeps field) without rebuilding the whole supabase stub.
function makeDeps(overrides: Partial<ActionDeps> & { rpc?: any; from?: any } = {}): Partial<ActionDeps> {
  const { rpc, from, ...rest } = overrides as Record<string, any>;
  return {
    supabase: {
      from: from ?? (() => ({})),
      functions: { invoke: vi.fn() },
      rpc: rpc ?? vi.fn(),
    },
    ...rest,
  } as Partial<ActionDeps>;
}

describe('PAGE_ROUTES', () => {
  it('maps every documented open_page key to a route', () => {
    for (const key of ['home', 'calendar', 'notes', 'music-library', 'studio', 'video',
      'messenger', 'academy', 'sight-reading', 'part-tracks', 'media-library', 'songwriting',
      'concert-planner', 'tour-manager', 'attendance', 'users', 'analytics']) {
      expect(PAGE_ROUTES[key], key).toMatch(/^\//);
    }
  });
});

describe('executeClientAction', () => {
  it('open_page returns the whitelisted route and rejects unknown keys', async () => {
    const ok = await executeClientAction({ tool: 'open_page', args: { key: 'studio' }, confirm: false });
    expect(ok).toMatchObject({ ok: true, navigateTo: '/studio' });
    const bad = await executeClientAction({ tool: 'open_page', args: { key: '../evil' }, confirm: false });
    expect(bad.ok).toBe(false);
  });

  it('open_page rejects prototype-chain keys instead of resolving inherited values', async () => {
    const ctor = await executeClientAction({ tool: 'open_page', args: { key: 'constructor' }, confirm: false });
    expect(ctor).toMatchObject({ ok: false });
    const proto = await executeClientAction({ tool: 'open_page', args: { key: '__proto__' }, confirm: false });
    expect(proto).toMatchObject({ ok: false });
    const hasOwn = await executeClientAction({ tool: 'open_page', args: { key: 'hasOwnProperty' }, confirm: false });
    expect(hasOwn).toMatchObject({ ok: false });
  });

  it('open_song builds the viewer deep link', async () => {
    const out = await executeClientAction({ tool: 'open_song', args: { score_id: 'abc-123' }, confirm: false });
    expect(out.navigateTo).toBe('/dashboard/music-library?view=abc-123');
  });

  it('open_note navigates to the note deep link and rejects invalid ids', async () => {
    const ok = await executeClientAction({ tool: 'open_note', args: { note_id: 'abc-123', title: 'Setlist' }, confirm: false });
    expect(ok).toMatchObject({ ok: true, navigateTo: '/planner/abc-123' });
    const bad = await executeClientAction({ tool: 'open_note', args: { note_id: '../evil' }, confirm: false });
    expect(bad.ok).toBe(false);
  });

  it('start_video_session sanitizes the room slug', async () => {
    const out = await executeClientAction({ tool: 'start_video_session', args: { room_name: 'my room!!' }, confirm: false });
    expect(out.ok).toBe(true);
    expect(out.openVideoRoom).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it('create_note calls notesApi and reports the title', async () => {
    const createNote = vi.fn().mockResolvedValue({ id: 'n1', title: 'Setlist' });
    const out = await executeClientAction(
      { tool: 'create_note', args: { title: 'Setlist', body: 'Songs' }, confirm: false },
      { createNote } as any,
    );
    expect(createNote).toHaveBeenCalled();
    expect(out).toMatchObject({ ok: true, navigateTo: '/planner' });
  });

  it('create_task calls tasksApi with the given fields', async () => {
    const createTask = vi.fn().mockResolvedValue({ id: 't1', title: 'Order risers' });
    const out = await executeClientAction(
      { tool: 'create_task', args: { title: 'Order risers', priority: 'high' }, confirm: false },
      { createTask } as any,
    );
    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Order risers', priority: 'high' }));
    expect(out.ok).toBe(true);
  });

  it('create_event fails loudly when insert returns zero rows', async () => {
    const insertChain: any = {
      insert: () => insertChain, select: () => insertChain,
      single: async () => ({ data: null, error: null }),
    };
    const calChain: any = {
      select: () => calChain, eq: () => calChain, order: () => calChain,
      limit: async () => ({ data: [{ id: 'cal1' }], error: null }),
    };
    const supabase = { from: (t: string) => (t === 'gw_calendars' ? calChain : insertChain) };
    const out = await executeClientAction(
      { tool: 'create_event', args: { title: 'X', start: '2026-07-14T18:00:00Z', end: '2026-07-14T19:00:00Z' }, confirm: false },
      { supabase, pushEventToGoogle: vi.fn() } as any,
    );
    expect(out.ok).toBe(false);
  });

  it('create_event inserts on gw_events with the default calendar and pushes to Google', async () => {
    let insertedRow: any = null;
    const insertChain: any = {
      insert: (row: any) => { insertedRow = row; return insertChain; },
      select: () => insertChain,
      single: async () => ({ data: { id: 'ev1', ...insertedRow }, error: null }),
    };
    const calChain: any = {
      select: () => calChain, eq: () => calChain, order: () => calChain,
      limit: async () => ({ data: [{ id: 'cal1' }], error: null }),
    };
    const supabase = { from: (t: string) => (t === 'gw_calendars' ? calChain : insertChain) };
    const pushEventToGoogle = vi.fn().mockResolvedValue(undefined);
    const out = await executeClientAction(
      { tool: 'create_event', args: { title: 'Rehearsal', start: '2026-07-14T18:00:00Z', end: '2026-07-14T19:00:00Z', location: 'Sisters Chapel' }, confirm: false },
      { supabase, pushEventToGoogle } as any,
    );
    expect(insertedRow).toMatchObject({ title: 'Rehearsal', calendar_id: 'cal1', venue_name: 'Sisters Chapel' });
    expect(pushEventToGoogle).toHaveBeenCalledWith('ev1', 'create');
    expect(out).toMatchObject({ ok: true, navigateTo: '/dashboard/calendar' });
  });

  it('send_sms resolves recipients (phone_number preferred over phone) and posts the unified-communication shape', async () => {
    const profChain: any = {
      select: () => profChain, in: async () => ({
        data: [{ user_id: 'u1', full_name: 'Sarah', email: 's@x.com', phone: '+15550000', phone_number: '+15551234' }],
        error: null,
      }),
    };
    let invokedBody: any = null;
    const supabase = {
      from: () => profChain,
      functions: {
        invoke: vi.fn(async (_name: string, opts: { body: unknown }) => {
          invokedBody = opts.body;
          return { data: { success: true, results: { totalRecipients: 1, emailsSent: 0, smsSent: 1, inAppCreated: 0, errors: [] } }, error: null };
        }),
      },
    };
    const out = await executeClientAction(
      { tool: 'send_sms', args: { recipient_user_ids: ['u1'], recipient_names: ['Sarah'], message: 'Rehearsal moved to 7pm' }, confirm: true },
      { supabase } as any,
    );
    expect(out.ok).toBe(true);
    expect(invokedBody).toMatchObject({
      content: 'Rehearsal moved to 7pm',
      channels: ['sms'],
      senderName: expect.any(String),
    });
    // phone_number is what the proven caller (useCommunicationSystem) populates recipient phone from;
    // it must win over the legacy `phone` column.
    expect(invokedBody.recipients[0]).toMatchObject({ id: 'u1', type: 'individual', identifier: 'u1', phone: '+15551234' });
  });

  it('send_sms falls back to `phone` when `phone_number` is null', async () => {
    const profChain: any = {
      select: () => profChain, in: async () => ({
        data: [{ user_id: 'u1', full_name: 'Sarah', email: 's@x.com', phone: '+15550000', phone_number: null }],
        error: null,
      }),
    };
    let invokedBody: any = null;
    const supabase = {
      from: () => profChain,
      functions: {
        invoke: vi.fn(async (_name: string, opts: { body: unknown }) => {
          invokedBody = opts.body;
          return { data: { success: true, results: { totalRecipients: 1, emailsSent: 0, smsSent: 1, inAppCreated: 0, errors: [] } }, error: null };
        }),
      },
    };
    await executeClientAction(
      { tool: 'send_sms', args: { recipient_user_ids: ['u1'], recipient_names: ['Sarah'], message: 'hi' }, confirm: true },
      { supabase } as any,
    );
    expect(invokedBody.recipients[0]).toMatchObject({ phone: '+15550000' });
  });

  it('send_sms fails loudly when the edge function errors', async () => {
    const profChain: any = {
      select: () => profChain, in: async () => ({ data: [{ user_id: 'u1', full_name: 'Sarah', email: 's@x.com', phone: '+1' }], error: null }),
    };
    const supabase = {
      from: () => profChain,
      functions: { invoke: vi.fn(async () => ({ data: null, error: { message: 'Twilio down' } })) },
    };
    const out = await executeClientAction(
      { tool: 'send_sms', args: { recipient_user_ids: ['u1'], recipient_names: ['Sarah'], message: 'hi' }, confirm: true },
      { supabase } as any,
    );
    expect(out.ok).toBe(false);
  });

  it('send_sms reports failure when the edge function 200s with zero deliveries', async () => {
    const profChain: any = {
      select: () => profChain, in: async () => ({ data: [{ user_id: 'u1', full_name: 'Sarah', email: 's@x.com', phone: '+1' }], error: null }),
    };
    const supabase = {
      from: () => profChain,
      functions: {
        invoke: vi.fn(async () => ({
          data: {
            success: true,
            results: { totalRecipients: 1, emailsSent: 0, smsSent: 0, inAppCreated: 0, errors: ['Twilio error: unverified number'] },
          },
          error: null,
        })),
      },
    };
    const out = await executeClientAction(
      { tool: 'send_sms', args: { recipient_user_ids: ['u1'], recipient_names: ['Sarah'], message: 'hi' }, confirm: true },
      { supabase } as any,
    );
    expect(out.ok).toBe(false);
    expect(out.message).toContain('Twilio error: unverified number');
  });

  it('send_sms reports the real partial-delivery count when some recipients fail', async () => {
    const profChain: any = {
      select: () => profChain, in: async () => ({
        data: [
          { user_id: 'u1', full_name: 'Sarah', email: 's@x.com', phone: '+1' },
          { user_id: 'u2', full_name: 'Ben', email: 'b@x.com', phone: '+2' },
          { user_id: 'u3', full_name: 'Cass', email: 'c@x.com', phone: '+3' },
        ],
        error: null,
      }),
    };
    const supabase = {
      from: () => profChain,
      functions: {
        invoke: vi.fn(async () => ({
          data: {
            success: true,
            results: { totalRecipients: 3, emailsSent: 0, smsSent: 2, inAppCreated: 0, errors: ['Twilio error: invalid number for Cass'] },
          },
          error: null,
        })),
      },
    };
    const out = await executeClientAction(
      { tool: 'send_sms', args: { recipient_user_ids: ['u1', 'u2', 'u3'], recipient_names: ['Sarah', 'Ben', 'Cass'], message: 'hi' }, confirm: true },
      { supabase } as any,
    );
    expect(out.ok).toBe(true);
    expect(out.message).toBe('Text sent to 2 of 3 people.');
  });

  it('send_email resolves recipients from gw_profiles by id and posts to send-branded-email with the resolved addresses', async () => {
    const profChain: any = {
      select: () => profChain, in: async () => ({
        data: [{ user_id: 'u1', full_name: 'A', email: 'a@x.com' }],
        error: null,
      }),
    };
    let invokedName = '';
    let invokedBody: any = null;
    const supabase = {
      from: () => profChain,
      functions: {
        invoke: vi.fn(async (name: string, opts: { body: unknown }) => {
          invokedName = name; invokedBody = opts.body;
          return { data: { success: true, batches: 1, successfulBatches: 1, failedBatches: 0, message: 'Email sent to 1 recipient(s) in 1 batch(es)' }, error: null };
        }),
      },
    };
    const out = await executeClientAction(
      { tool: 'send_email', args: { recipient_user_ids: ['u1'], recipient_names: ['A'], subject: 'Update', body: 'Line one\nLine two' }, confirm: true },
      { supabase } as any,
    );
    expect(invokedName).toBe('send-branded-email');
    expect(invokedBody).toMatchObject({ to: ['a@x.com'], subject: 'Update' });
    expect(invokedBody.html).toContain('Line one');
    expect(out.ok).toBe(true);
  });

  it('send_email fails loudly when recipient ids are missing', async () => {
    const out = await executeClientAction(
      { tool: 'send_email', args: { recipient_user_ids: [], recipient_names: [], subject: 'Update', body: 'hi' }, confirm: true },
      { supabase: { from: () => ({}), functions: { invoke: vi.fn() } } } as any,
    );
    expect(out.ok).toBe(false);
  });

  it('send_email fails loudly when none of the ids resolve to a profile', async () => {
    const profChain: any = { select: () => profChain, in: async () => ({ data: [], error: null }) };
    const out = await executeClientAction(
      { tool: 'send_email', args: { recipient_user_ids: ['ghost'], recipient_names: ['Ghost'], subject: 'Update', body: 'hi' }, confirm: true },
      { supabase: { from: () => profChain, functions: { invoke: vi.fn() } } } as any,
    );
    expect(out.ok).toBe(false);
  });

  it('send_email skips profiles with no email and fails loudly if that leaves zero recipients', async () => {
    const profChain: any = {
      select: () => profChain, in: async () => ({
        data: [{ user_id: 'u1', full_name: 'No Email', email: null }],
        error: null,
      }),
    };
    const out = await executeClientAction(
      { tool: 'send_email', args: { recipient_user_ids: ['u1'], recipient_names: ['No Email'], subject: 'Update', body: 'hi' }, confirm: true },
      { supabase: { from: () => profChain, functions: { invoke: vi.fn() } } } as any,
    );
    expect(out.ok).toBe(false);
  });

  it('send_email skips profiles with no email but still sends to the ones that resolve', async () => {
    const profChain: any = {
      select: () => profChain, in: async () => ({
        data: [
          { user_id: 'u1', full_name: 'A', email: 'a@x.com' },
          { user_id: 'u2', full_name: 'No Email', email: null },
        ],
        error: null,
      }),
    };
    let invokedBody: any = null;
    const supabase = {
      from: () => profChain,
      functions: {
        invoke: vi.fn(async (_name: string, opts: { body: unknown }) => {
          invokedBody = opts.body;
          return { data: { success: true, batches: 1, successfulBatches: 1, failedBatches: 0, message: 'ok' }, error: null };
        }),
      },
    };
    const out = await executeClientAction(
      { tool: 'send_email', args: { recipient_user_ids: ['u1', 'u2'], recipient_names: ['A', 'No Email'], subject: 'Update', body: 'hi' }, confirm: true },
      { supabase } as any,
    );
    expect(invokedBody.to).toEqual(['a@x.com']);
    expect(out.ok).toBe(true);
    expect(out.message).toContain('1');
  });

  it('send_email escapes HTML in the body instead of injecting raw markup', async () => {
    const profChain: any = {
      select: () => profChain, in: async () => ({
        data: [{ user_id: 'u1', full_name: 'A', email: 'a@x.com' }],
        error: null,
      }),
    };
    let invokedBody: any = null;
    const supabase = {
      from: () => profChain,
      functions: {
        invoke: vi.fn(async (_name: string, opts: { body: unknown }) => {
          invokedBody = opts.body;
          return { data: { success: true, batches: 1, successfulBatches: 1, failedBatches: 0, message: 'ok' }, error: null };
        }),
      },
    };
    const out = await executeClientAction(
      {
        tool: 'send_email',
        args: {
          recipient_user_ids: ['u1'],
          recipient_names: ['A'],
          subject: 'Update',
          body: 'Hello <img src=x onerror=alert(1)> & "friends"\n<b>line2</b>',
        },
        confirm: true,
      },
      { supabase } as any,
    );
    expect(out.ok).toBe(true);
    expect(invokedBody.html).toContain('&lt;img');
    expect(invokedBody.html).toContain('&amp;');
    expect(invokedBody.html).toContain('&lt;b&gt;');
    expect(invokedBody.html).not.toContain('<img');
    expect(invokedBody.html).not.toContain('<b>');
    // the wrapping <p> tags are ours and must remain literal
    expect(invokedBody.html).toContain('<p>');
  });

  it('send_email reports failure when the edge function 200s with zero successful batches', async () => {
    const profChain: any = {
      select: () => profChain, in: async () => ({
        data: [{ user_id: 'u1', full_name: 'A', email: 'a@x.com' }],
        error: null,
      }),
    };
    const supabase = {
      from: () => profChain,
      functions: {
        invoke: vi.fn(async () => ({
          data: { success: true, batches: 1, successfulBatches: 0, failedBatches: 1, error: 'Resend error: invalid sender domain' },
          error: null,
        })),
      },
    };
    const out = await executeClientAction(
      { tool: 'send_email', args: { recipient_user_ids: ['u1'], recipient_names: ['A'], subject: 'Update', body: 'hi' }, confirm: true },
      { supabase } as any,
    );
    expect(out.ok).toBe(false);
    expect(out.message).toContain('Resend error: invalid sender domain');
  });

  it('send_email reports the real partial-delivery batch count', async () => {
    const profChain: any = {
      select: () => profChain, in: async () => ({
        data: [
          { user_id: 'u1', full_name: 'A', email: 'a@x.com' },
          { user_id: 'u2', full_name: 'B', email: 'b@x.com' },
        ],
        error: null,
      }),
    };
    const supabase = {
      from: () => profChain,
      functions: {
        invoke: vi.fn(async () => ({
          data: { success: true, batches: 2, successfulBatches: 1, failedBatches: 1, message: 'partial' },
          error: null,
        })),
      },
    };
    const out = await executeClientAction(
      { tool: 'send_email', args: { recipient_user_ids: ['u1', 'u2'], recipient_names: ['A', 'B'], subject: 'Update', body: 'hi' }, confirm: true },
      { supabase } as any,
    );
    expect(out.ok).toBe(true);
    expect(out.message).toContain('1 of 2 batches');
  });

  it('add_video saves to youtube_videos (null channel) AND the dashboard section, lands on /dashboard', async () => {
    const inserted: Record<string, any> = {};
    let queriedChannels = false;
    const chainFor = (t: string): any => ({
      insert: (row: any) => { inserted[t] = row; return chainFor(t); },
      select: async () => ({ data: [{ id: `${t}-1` }], error: null }),
    });
    const supabase = {
      from: (t: string) => { if (t === 'youtube_channels') queriedChannels = true; return chainFor(t); },
    };
    const out = await executeClientAction(
      { tool: 'add_video', args: { video_id: 'abc123', title: 'Concert Highlights', channel: 'GleeWorld', thumbnail_url: 'https://img/1.jpg' }, confirm: false },
      { supabase } as any,
    );
    // No channel lookup; searched channel name not persisted.
    expect(queriedChannels).toBe(false);
    expect(inserted['youtube_videos']).toMatchObject({
      video_id: 'abc123', title: 'Concert Highlights', channel_id: null,
      thumbnail_url: 'https://img/1.jpg', video_url: 'https://www.youtube.com/watch?v=abc123',
    });
    expect(inserted['youtube_videos'].published_at).toBeTruthy();
    expect(inserted['youtube_videos']).not.toHaveProperty('channel');
    // Also written to the dashboard section with a required position sort key.
    expect(inserted['dashboard_youtube_videos']).toMatchObject({
      video_id: 'abc123', title: 'Concert Highlights', video_url: 'https://www.youtube.com/watch?v=abc123',
    });
    expect(inserted['dashboard_youtube_videos'].position).toBeTruthy();
    expect(out).toMatchObject({ ok: true, navigateTo: '/dashboard' });
  });

  it('add_video still succeeds if the dashboard-section write fails (best-effort)', async () => {
    const chainFor = (t: string): any => ({
      insert: () => chainFor(t),
      select: async () => (t === 'dashboard_youtube_videos'
        ? { data: null, error: { message: 'rls' } }
        : { data: [{ id: 'v1' }], error: null }),
    });
    const supabase = { from: (t: string) => chainFor(t) };
    const out = await executeClientAction(
      { tool: 'add_video', args: { video_id: 'abc123', title: 'X' }, confirm: false },
      { supabase } as any,
    );
    expect(out.ok).toBe(true);
    expect(out.navigateTo).toBe('/dashboard');
    expect(out.message).toContain("couldn't pin it to the dashboard");
  });

  it('add_video surfaces a write failure loudly (no fake success)', async () => {
    const videoChain: any = {
      insert: () => videoChain,
      select: async () => ({ data: null, error: { message: 'permission denied' } }),
    };
    const supabase = { from: () => videoChain };
    const out = await executeClientAction(
      { tool: 'add_video', args: { video_id: 'abc123', title: 'X' }, confirm: false },
      { supabase } as any,
    );
    expect(out.ok).toBe(false);
    expect(out.message).toContain('permission denied');
  });

  it('unknown tools are rejected', async () => {
    const out = await executeClientAction({ tool: 'rm_rf', args: {}, confirm: false });
    expect(out.ok).toBe(false);
  });
});

describe('create_course_draft', () => {
  const spec = { title: 'Choral Conducting I' };

  it('calls the RPC and navigates to the draft course page', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        course_id: 'c-1', course_code: 'MUS-240', title: 'Choral Conducting I',
        module_count: 4, assignment_count: 9, session_count: 28,
      },
      error: null,
    });
    const deps = makeDeps({ rpc });
    const r = await executeClientAction(
      { tool: 'create_course_draft', args: { spec }, confirm: true }, deps,
    );
    expect(rpc).toHaveBeenCalledWith('assistant_create_course', { spec });
    expect(r.ok).toBe(true);
    expect(r.navigateTo).toBe('/academy/c/mus-240');
    expect(r.message).toContain('4 modules');
    expect(r.message).toContain('9 assignments');
  });

  it('surfaces RPC errors', async () => {
    const deps = makeDeps({ rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }) });
    const r = await executeClientAction(
      { tool: 'create_course_draft', args: { spec }, confirm: true }, deps,
    );
    expect(r.ok).toBe(false);
    expect(r.message).toContain('boom');
  });

  it('treats a null RPC result as failure (silent-write guard)', async () => {
    const deps = makeDeps({ rpc: vi.fn().mockResolvedValue({ data: null, error: null }) });
    const r = await executeClientAction(
      { tool: 'create_course_draft', args: { spec }, confirm: true }, deps,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects a missing spec without calling the RPC', async () => {
    const rpc = vi.fn();
    const deps = makeDeps({ rpc });
    const r = await executeClientAction(
      { tool: 'create_course_draft', args: {}, confirm: true }, deps,
    );
    expect(r.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('concierge actions', () => {
  it('book_ride builds the Uber /looking link when coordinates are present', async () => {
    const out = await executeClientAction({
      tool: 'book_ride',
      args: { provider: 'uber', destination_name: 'ATL Airport', destination_address: '6000 N Terminal Pkwy, Atlanta, GA', lat: 33.6324, lng: -84.4333 },
      confirm: true,
    });
    expect(out.ok).toBe(true);
    expect(out.openExternalUrl).toContain('https://m.uber.com/looking?pickup=my_location&drop%5B0%5D=');
    expect(decodeURIComponent(out.openExternalUrl!)).toContain('"latitude":33.6324');
    expect(decodeURIComponent(out.openExternalUrl!)).toContain('"addressLine1":"ATL Airport"');
  });

  it('book_ride falls back to the legacy Uber link without coordinates', async () => {
    const out = await executeClientAction({
      tool: 'book_ride',
      args: { provider: 'uber', destination_address: '350 Spelman Ln SW, Atlanta' },
      confirm: true,
    });
    expect(out.ok).toBe(true);
    expect(out.openExternalUrl).toContain('https://m.uber.com/ul/?action=setPickup&pickup=my_location');
  });

  it('book_ride builds the Lyft universal link and rejects unknown providers', async () => {
    const lyft = await executeClientAction({
      tool: 'book_ride',
      args: { provider: 'Lyft', destination_address: 'x', lat: 33.6, lng: -84.4 },
      confirm: true,
    });
    expect(lyft.ok).toBe(true);
    expect(lyft.openExternalUrl).toContain('https://lyft.com/ride?id=lyft');
    expect(lyft.openExternalUrl).toContain('destination%5Blatitude%5D=33.6');
    const bad = await executeClientAction({ tool: 'book_ride', args: { provider: 'waymo', destination_address: 'x' }, confirm: true });
    expect(bad.ok).toBe(false);
  });

  it('book_ride requires a destination address', async () => {
    const out = await executeClientAction({ tool: 'book_ride', args: { provider: 'uber' }, confirm: true });
    expect(out.ok).toBe(false);
  });

  it('order_food builds service search links and rejects unknown services', async () => {
    const dd = await executeClientAction({ tool: 'order_food', args: { service: 'doordash', craving: 'wings' }, confirm: true });
    expect(dd.ok).toBe(true);
    expect(dd.openExternalUrl).toBe('https://www.doordash.com/search/store/wings/');
    const ue = await executeClientAction({ tool: 'order_food', args: { service: 'Uber Eats' }, confirm: true });
    expect(ue.ok).toBe(true);
    expect(ue.openExternalUrl).toBe('https://www.ubereats.com/');
    const bad = await executeClientAction({ tool: 'order_food', args: { service: 'toString' }, confirm: true });
    expect(bad.ok).toBe(false);
  });
});
