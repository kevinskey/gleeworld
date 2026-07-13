import { describe, it, expect } from 'vitest';
import { threadReducer, INITIAL_THREAD } from '../threadReducer';

describe('threadReducer', () => {
  it('send appends a user message and sets busy', () => {
    const s = threadReducer(INITIAL_THREAD, { type: 'send', id: 'u1', content: 'hi' });
    expect(s.messages).toHaveLength(1);
    expect(s.busy).toBe(true);
    expect(s.error).toBeNull();
  });

  it('reply appends assistant message and clears busy', () => {
    let s = threadReducer(INITIAL_THREAD, { type: 'send', id: 'u1', content: 'hi' });
    s = threadReducer(s, { type: 'reply', id: 'a1', content: 'hello' });
    expect(s.messages[1]).toMatchObject({ role: 'assistant', content: 'hello' });
    expect(s.busy).toBe(false);
  });

  it('reply with pendingAction marks the message pending', () => {
    let s = threadReducer(INITIAL_THREAD, { type: 'send', id: 'u1', content: 'text sarah' });
    s = threadReducer(s, {
      type: 'reply', id: 'a1', content: 'Ready to send.',
      pendingAction: { tool: 'send_sms', args: { message: 'hi' }, confirm: true },
    });
    expect(s.messages[1].actionState).toBe('pending');
  });

  it('action-state updates only the targeted message', () => {
    let s = threadReducer(INITIAL_THREAD, { type: 'send', id: 'u1', content: 'x' });
    s = threadReducer(s, {
      type: 'reply', id: 'a1', content: 'ok',
      pendingAction: { tool: 'send_sms', args: {}, confirm: true },
    });
    s = threadReducer(s, { type: 'action-state', id: 'a1', state: 'done' });
    expect(s.messages[1].actionState).toBe('done');
  });

  it('fail clears busy and sets error', () => {
    let s = threadReducer(INITIAL_THREAD, { type: 'send', id: 'u1', content: 'x' });
    s = threadReducer(s, { type: 'fail', error: 'network' });
    expect(s.busy).toBe(false);
    expect(s.error).toBe('network');
  });
});
