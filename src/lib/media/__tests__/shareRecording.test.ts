import { describe, it, expect, vi } from 'vitest';
import {
  ensureClassCopy, createItemShares, buildShareEmailHtml, listenPath,
  fetchCourseRecipients, notifyRecipients, fetchManagedCourses, sendShareEmail,
  type ShareableMedia,
} from '../shareRecording';

/** Chainable fake: every method returns the builder; awaiting resolves
 *  the queued results in call order. insert/upsert/select args recorded. */
function fakeSb(results: Array<{ data?: any; error?: any }>) {
  const calls: Array<{ table?: string; method: string; args: any[] }> = [];
  let i = 0;
  const builder: any = {};
  const record = (method: string) => (...args: any[]) => {
    calls.push({ method, args });
    return builder;
  };
  for (const m of ['select', 'insert', 'upsert', 'update', 'eq', 'is', 'in',
                   'not', 'order', 'limit', 'maybeSingle', 'single']) {
    builder[m] = record(m);
  }
  builder.then = (resolve: any, reject: any) => {
    const r = results[i++] ?? { data: null, error: null };
    return Promise.resolve({ data: r.data ?? null, error: r.error ?? null }).then(resolve, reject);
  };
  const sb: any = {
    from: (table: string) => { calls.push({ table, method: 'from', args: [] }); return builder; },
    rpc: vi.fn(async () => ({ data: 1, error: null })),
    functions: { invoke: vi.fn(async () => ({ data: { ok: true }, error: null })) },
  };
  return { sb, calls };
}

const MEDIA: ShareableMedia = {
  id: 'm1', title: 'Warm-up take', file_url: 'https://x/f.wav',
  file_path: 'media/u1/studio/f.wav', file_type: 'audio/wav',
  file_size: 123, uploaded_by: 'u1',
};

describe('listenPath', () => {
  it('builds the in-app route', () => {
    expect(listenPath('abc')).toBe('/listen/abc');
  });
});

describe('ensureClassCopy', () => {
  it('returns the existing copy without inserting', async () => {
    const { sb, calls } = fakeSb([{ data: [{ id: 'copy1' }] }]);
    const out = await ensureClassCopy(sb, MEDIA, 'c1');
    expect(out.id).toBe('copy1');
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
  });

  it('inserts a class copy with course_id, folder null, source link', async () => {
    const { sb, calls } = fakeSb([{ data: [] }, { data: [{ id: 'copy2' }] }]);
    const out = await ensureClassCopy(sb, MEDIA, 'c1');
    expect(out.id).toBe('copy2');
    const ins = calls.find((c) => c.method === 'insert')!;
    expect(ins.args[0]).toMatchObject({
      course_id: 'c1', folder: null, source_media_id: 'm1',
      uploaded_by: 'u1', file_path: MEDIA.file_path, is_public: false,
    });
    // live-schema guard: no forbidden columns
    for (const bad of ['filename', 'original_filename', 'mime_type', 'bucket_name']) {
      expect(ins.args[0]).not.toHaveProperty(bad);
    }
  });

  it('treats an empty insert result as failure (demo-tenant trap)', async () => {
    const { sb } = fakeSb([{ data: [] }, { data: [] }]);
    await expect(ensureClassCopy(sb, MEDIA, 'c1')).rejects.toThrow(/could not/i);
  });
});

describe('createItemShares', () => {
  it('upserts one active share per email with conflict target', async () => {
    const { sb, calls } = fakeSb([{ data: [{ id: 's1' }, { id: 's2' }] }]);
    await createItemShares(sb, 'm1', 'u1', ['A@x.com', 'b@y.com']);
    const up = calls.find((c) => c.method === 'upsert')!;
    expect(up.args[0]).toEqual([
      { media_id: 'm1', owner_user_id: 'u1', invited_email: 'a@x.com', permission: 'view', revoked_at: null },
      { media_id: 'm1', owner_user_id: 'u1', invited_email: 'b@y.com', permission: 'view', revoked_at: null },
    ]);
    expect(up.args[1]).toMatchObject({ onConflict: 'media_id,invited_email' });
  });

  it('fails on empty upsert result (demo-tenant trap)', async () => {
    const { sb } = fakeSb([{ data: [] }]);
    await expect(createItemShares(sb, 'm1', 'u1', ['a@x.com'])).rejects.toThrow();
  });
});

describe('fetchCourseRecipients', () => {
  it('joins enrollments to the directory and drops empty emails', async () => {
    const { sb } = fakeSb([
      { data: [{ user_id: 'u2' }, { user_id: 'u3' }, { user_id: null }] },
      { data: [{ user_id: 'u2', full_name: 'Ana', email: 'ana@x.com' }] },
    ]);
    const out = await fetchCourseRecipients(sb, 'c1');
    expect(out).toEqual([{ user_id: 'u2', full_name: 'Ana', email: 'ana@x.com' }]);
  });

  it('returns [] for an empty roster without a directory query', async () => {
    const { sb, calls } = fakeSb([{ data: [] }]);
    expect(await fetchCourseRecipients(sb, 'c1')).toEqual([]);
    expect(calls.filter((c) => c.method === 'from' && c.table === 'gw_profiles_directory')).toHaveLength(0);
  });
});

describe('buildShareEmailHtml', () => {
  it('escapes user-controlled text and links the listen URL', () => {
    const html = buildShareEmailHtml({
      title: 'A <b>take</b>', sharerName: 'Kevin & co', message: '<script>x</script>',
      url: 'https://t.gleeworld.org/listen/m1',
    });
    expect(html).toContain('https://t.gleeworld.org/listen/m1');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;b&gt;take&lt;/b&gt;');
    expect(html).toContain('Kevin &amp; co');
  });
});

describe('notifyRecipients', () => {
  it('calls the RPC once per user and never throws on RPC error', async () => {
    const { sb } = fakeSb([]);
    (sb.rpc as any).mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await notifyRecipients(sb, ['u2', 'u3'], { title: 't', message: 'm', actionUrl: '/listen/m1' });
    expect(sb.rpc).toHaveBeenCalledTimes(2);
    expect((sb.rpc as any).mock.calls[0][0]).toBe('create_notification_with_delivery');
    expect((sb.rpc as any).mock.calls[0][1]).toMatchObject({
      p_user_id: 'u2', p_action_url: '/listen/m1', p_send_email: false, p_send_sms: false,
    });
  });

  it('never throws on RPC rejection, continues to next user', async () => {
    const { sb } = fakeSb([]);
    (sb.rpc as any).mockRejectedValueOnce(new Error('network fail'));
    (sb.rpc as any).mockResolvedValueOnce({ data: null, error: null });
    await notifyRecipients(sb, ['u2', 'u3'], { title: 't', message: 'm', actionUrl: '/listen/m1' });
    expect(sb.rpc).toHaveBeenCalledTimes(2);
  });
});

describe('sendShareEmail', () => {
  it('invokes gw-send-email edge function with body', async () => {
    const { sb } = fakeSb([]);
    await sendShareEmail(sb, {
      to: ['a@x.com', 'b@y.com'],
      subject: 'Check it out',
      html: '<div>hi</div>',
    });
    expect((sb.functions.invoke as any)).toHaveBeenCalledOnce();
    expect((sb.functions.invoke as any).mock.calls[0][0]).toBe('gw-send-email');
    expect((sb.functions.invoke as any).mock.calls[0][1]).toMatchObject({
      body: { to: ['a@x.com', 'b@y.com'], subject: 'Check it out', html: '<div>hi</div>' },
    });
  });

  it('throws on invoke error', async () => {
    const { sb } = fakeSb([]);
    (sb.functions.invoke as any).mockResolvedValueOnce({ data: null, error: { message: 'CORS fail' } });
    await expect(sendShareEmail(sb, { to: [], subject: 's', html: 'h' })).rejects.toThrow(/CORS fail/);
  });

  it('throws on data-level error', async () => {
    const { sb } = fakeSb([]);
    (sb.functions.invoke as any).mockResolvedValueOnce({ data: { error: 'rate limited' }, error: null });
    await expect(sendShareEmail(sb, { to: [], subject: 's', html: 'h' })).rejects.toThrow(/rate limited/);
  });
});

describe('fetchManagedCourses', () => {
  it('filters by instructor for non-privileged users', async () => {
    const { sb, calls } = fakeSb([{ data: [{ id: 'c1', course_code: 'GW101', title: 'Choir' }] }]);
    const out = await fetchManagedCourses(sb, 'u1', false);
    expect(out).toHaveLength(1);
    expect(calls.some((c) => c.method === 'eq' && c.args[0] === 'instructor_id' && c.args[1] === 'u1')).toBe(true);
  });

  it('skips the instructor filter for admins', async () => {
    const { sb, calls } = fakeSb([{ data: [] }]);
    await fetchManagedCourses(sb, 'u1', true);
    expect(calls.some((c) => c.method === 'eq' && c.args[0] === 'instructor_id')).toBe(false);
  });
});
