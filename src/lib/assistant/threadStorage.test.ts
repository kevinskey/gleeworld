// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { saveThread, loadThread } from './threadStorage';
import type { ThreadMessage } from './types';

const msg = (id: string, extra: Partial<ThreadMessage> = {}): ThreadMessage =>
  ({ id, role: 'user', content: `m${id}`, ...extra });

describe('threadStorage', () => {
  beforeEach(() => sessionStorage.clear());
  it('round-trips messages', () => {
    saveThread([msg('1'), msg('2', { role: 'assistant' })]);
    expect(loadThread().map((m) => m.id)).toEqual(['1', '2']);
  });
  it('caps at the most recent 50', () => {
    saveThread(Array.from({ length: 60 }, (_, i) => msg(String(i))));
    const loaded = loadThread();
    expect(loaded).toHaveLength(50);
    expect(loaded[0].id).toBe('10');
  });
  it('sanitizes pending confirm cards on restore', () => {
    saveThread([msg('1', {
      role: 'assistant',
      pendingAction: { tool: 'send_sms', args: {}, confirm: true },
      actionState: 'pending',
    })]);
    const [m] = loadThread();
    expect(m.pendingAction).toBeUndefined();
    expect(m.actionState).toBe('cancelled');
  });
  it('returns [] on corrupt storage', () => {
    sessionStorage.setItem('gw_assistant_thread', '[not json');
    expect(loadThread()).toEqual([]);
  });
});
