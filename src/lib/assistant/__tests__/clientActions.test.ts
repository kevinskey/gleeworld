import { describe, it, expect, vi } from 'vitest';
import { executeClientAction, PAGE_ROUTES } from '../clientActions';

describe('PAGE_ROUTES', () => {
  it('maps every documented open_page key to a route', () => {
    for (const key of ['home', 'calendar', 'planner', 'music-library', 'studio', 'video',
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

  it('open_song builds the viewer deep link', async () => {
    const out = await executeClientAction({ tool: 'open_song', args: { score_id: 'abc-123' }, confirm: false });
    expect(out.navigateTo).toBe('/dashboard/music-library?view=abc-123');
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

  it('send_sms resolves recipients and posts the unified-communication shape', async () => {
    const profChain: any = {
      select: () => profChain, in: async () => ({
        data: [{ user_id: 'u1', full_name: 'Sarah', email: 's@x.com', phone: '+15551234' }],
        error: null,
      }),
    };
    let invokedBody: any = null;
    const supabase = {
      from: () => profChain,
      functions: {
        invoke: vi.fn(async (_name: string, opts: { body: unknown }) => {
          invokedBody = opts.body;
          return { data: {}, error: null };
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
    expect(invokedBody.recipients[0]).toMatchObject({ id: 'u1', type: 'individual', identifier: 'u1', phone: '+15551234' });
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

  it('send_email posts to send-branded-email with to/subject/html', async () => {
    let invokedName = '';
    let invokedBody: any = null;
    const supabase = {
      from: () => ({}),
      functions: {
        invoke: vi.fn(async (name: string, opts: { body: unknown }) => {
          invokedName = name; invokedBody = opts.body;
          return { data: {}, error: null };
        }),
      },
    };
    const out = await executeClientAction(
      { tool: 'send_email', args: { to: ['a@x.com'], recipient_names: ['A'], subject: 'Update', body: 'Line one\nLine two' }, confirm: true },
      { supabase } as any,
    );
    expect(invokedName).toBe('send-branded-email');
    expect(invokedBody).toMatchObject({ to: ['a@x.com'], subject: 'Update' });
    expect(invokedBody.html).toContain('Line one');
    expect(out.ok).toBe(true);
  });

  it('add_video looks up a channel and inserts with channel_id + video_url (no channel_title column)', async () => {
    let insertedRow: any = null;
    const channelChain: any = {
      select: () => channelChain, order: () => channelChain,
      limit: () => channelChain, maybeSingle: async () => ({ data: { id: 'chan1' }, error: null }),
    };
    const videoChain: any = {
      insert: (row: any) => { insertedRow = row; return videoChain; },
      select: async () => ({ data: [{ id: 'v1' }], error: null }),
    };
    const supabase = { from: (t: string) => (t === 'youtube_channels' ? channelChain : videoChain) };
    const out = await executeClientAction(
      { tool: 'add_video', args: { video_id: 'abc123', title: 'Concert Highlights', channel: 'GleeWorld', thumbnail_url: 'https://img/1.jpg' }, confirm: false },
      { supabase } as any,
    );
    expect(insertedRow).toMatchObject({ video_id: 'abc123', title: 'Concert Highlights', channel_id: 'chan1', video_url: 'https://www.youtube.com/watch?v=abc123' });
    expect(insertedRow).not.toHaveProperty('channel_title');
    expect(out).toMatchObject({ ok: true, navigateTo: '/video' });
  });

  it('add_video fails loudly when no channel is configured', async () => {
    const channelChain: any = {
      select: () => channelChain, order: () => channelChain,
      limit: () => channelChain, maybeSingle: async () => ({ data: null, error: null }),
    };
    const supabase = { from: () => channelChain };
    const out = await executeClientAction(
      { tool: 'add_video', args: { video_id: 'abc123', title: 'X' }, confirm: false },
      { supabase } as any,
    );
    expect(out.ok).toBe(false);
  });

  it('unknown tools are rejected', async () => {
    const out = await executeClientAction({ tool: 'rm_rf', args: {}, confirm: false });
    expect(out.ok).toBe(false);
  });
});
