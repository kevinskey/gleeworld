import type { AssistantAction, ThreadMessage, ThreadState } from './types';

export type ThreadEvent =
  | { type: 'send'; id: string; content: string }
  | { type: 'reply'; id: string; content: string; pendingAction?: AssistantAction }
  | { type: 'settle' } // turn finished with nothing to show (silent action turn)
  | { type: 'fail'; error: string }
  | { type: 'action-state'; id: string; state: ThreadMessage['actionState'] }
  | { type: 'reset' };

export const INITIAL_THREAD: ThreadState = { messages: [], busy: false, error: null };

export function threadReducer(state: ThreadState, ev: ThreadEvent): ThreadState {
  switch (ev.type) {
    case 'send':
      return {
        messages: [...state.messages, { id: ev.id, role: 'user', content: ev.content }],
        busy: true,
        error: null,
      };
    case 'reply':
      return {
        messages: [...state.messages, {
          id: ev.id, role: 'assistant', content: ev.content,
          pendingAction: ev.pendingAction,
          actionState: ev.pendingAction ? 'pending' : undefined,
        }],
        busy: false,
        error: null,
      };
    case 'settle':
      return { ...state, busy: false, error: null };
    case 'fail':
      return { ...state, busy: false, error: ev.error };
    case 'action-state':
      return {
        ...state,
        messages: state.messages.map((m) => (m.id === ev.id ? { ...m, actionState: ev.state } : m)),
      };
    case 'reset':
      return INITIAL_THREAD;
  }
}
