// @vitest-environment jsdom
//
// The unmount cleanup previously closed over the mount-time `session`
// (null — sessions load async) with `[]` deps, so on unmount it cancelled
// the pending debounced save and then skipped its replacement flush.
// Edits made in the last <800ms before an in-app navigation were silently
// lost. This test unmounts inside that debounce window and asserts the
// LATEST edited session is the one that gets saved.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { blankSession } from '@/lib/studio/defaults';
import type { Session } from '@/lib/studio/session';

const storage = vi.hoisted(() => ({
  saved: [] as Session[],
}));

const baseSession: Session = blankSession({
  id: 's1',
  ownerUserId: 'u1',
  tenantId: 't1',
  title: 'T',
});

vi.mock('@/lib/studio/storage', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/studio/storage')>();
  return {
    ...mod,
    loadSession: vi.fn(async () => baseSession),
    saveSession: vi.fn(async (s: Session) => { storage.saved.push(s); }),
  };
});

import { useStudioSession } from '../useStudio';

describe('useStudioSession unmount flush', () => {
  beforeEach(() => { storage.saved.length = 0; });

  it('flushes the LATEST session when unmounted inside the debounce window', async () => {
    const { result, unmount } = renderHook(() => useStudioSession('s1'));
    await waitFor(() => expect(result.current.session).not.toBeNull());

    act(() => {
      result.current.update((s) => ({ ...s, title: 'EDITED' }));
    });

    unmount(); // within the 800ms debounce — no timers have fired yet

    await waitFor(() => expect(storage.saved.length).toBe(1));
    expect(storage.saved[0].title).toBe('EDITED');
  });
});
