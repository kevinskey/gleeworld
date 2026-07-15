import { describe, it, expect, vi } from 'vitest';
import { publishCourse } from '../publishCourse';

function makeSupabase(overrides: { updateData?: unknown; upsertError?: unknown } = {}) {
  const upsert = vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: [{}], error: overrides.upsertError ?? null }),
  });
  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: overrides.updateData === undefined ? [{ id: 'c-1', status: 'published' }] : overrides.updateData,
        error: null,
      }),
    }),
  });
  const from = vi.fn().mockImplementation(() => ({ update, upsert }));
  return { client: { from } as any, update, upsert };
}

describe('publishCourse', () => {
  it('flips status, enrolls resolved users, reports unresolved names', async () => {
    const { client, update, upsert } = makeSupabase();
    const r = await publishCourse(client, {
      id: 'c-1',
      pending_enrollments: [{ user_id: 'u-1', name: 'Ada' }, { name: 'Grace (no account yet)' }],
    });
    expect(r.ok).toBe(true);
    expect(update).toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      [{ course_id: 'c-1', user_id: 'u-1', role: 'student', enrollment_status: 'enrolled' }],
      { onConflict: 'course_id,user_id', ignoreDuplicates: true },
    );
    expect(r.unresolvedNames).toEqual(['Grace (no account yet)']);
  });

  it('fails when the status update returns zero rows (silent-write guard)', async () => {
    const { client } = makeSupabase({ updateData: [] });
    const r = await publishCourse(client, { id: 'c-1', pending_enrollments: null });
    expect(r.ok).toBe(false);
  });

  it('publishes cleanly with no pending enrollments', async () => {
    const { client, upsert } = makeSupabase();
    const r = await publishCourse(client, { id: 'c-1', pending_enrollments: null });
    expect(r.ok).toBe(true);
    expect(upsert).not.toHaveBeenCalled();
    expect(r.unresolvedNames).toEqual([]);
  });

  it('leaves the course a draft and reports failure if enrollment fails (never before the status flip)', async () => {
    const { client, update } = makeSupabase({ upsertError: { message: 'permission denied' } });
    const r = await publishCourse(client, {
      id: 'c-1',
      pending_enrollments: [{ user_id: 'u-1', name: 'Ada' }],
    });
    expect(r.ok).toBe(false);
    // Status must NOT be flipped when enrollment fails — the roster stays intact for retry.
    expect(update).not.toHaveBeenCalled();
    expect(r.message).toContain('still a draft');
  });
});
