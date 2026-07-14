# Assistant Floating Mic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistent tenant-glass mic FAB on every dashboard page, with the assistant conversation lifted into a shell-level provider so it survives navigation and reloads.

**Architecture:** A new `AssistantProvider` (React context) mounted in `DashboardShell` owns the thread reducer, confirm queue, speech, TTS, and sheet-open state; `AssistantSheet` becomes a prop-less consumer. A new `AssistantFab` renders the mic + caret cluster, live-caption bubble, and per-section collapse dot. The Home greeting-row launcher is deleted.

**Tech Stack:** React 18 context + useReducer, Tailwind (tenant tokens), vitest + testing-library (jsdom), existing `speech.ts` / `clientActions.ts` / `confirmQueue.ts` untouched.

**Spec:** `docs/superpowers/specs/2026-07-13-assistant-floating-mic-design.md`

## Global Constraints

- Tenant tokens only (`bg-primary/20`, `text-primary`, `border-primary/30`) — never hardcoded colors (feedback: gleeworld-tenant-neutral, light-theme tokens).
- Minimum type size `text-xs`; icons ≥ `w-4 h-4`.
- Worktree: `/private/tmp/claude-501/-Users-kevinjohnson/18435b8d-c010-4e98-916b-12be681d5e43/scratchpad/gw-fab` (shared checkout is contested).
- Tests: `npx vitest run <file>`; full gate `npm run test`; build gate `npm run build` (`tsc --noEmit` is a no-op in this repo).
- sessionStorage key `gw_assistant_thread`; localStorage key `gw_assistant_fab_collapsed`.

---

### Task 1: Pure helpers — section keys, collapse prefs, thread storage

**Files:**
- Create: `src/lib/assistant/fabPrefs.ts`
- Create: `src/lib/assistant/threadStorage.ts`
- Test: `src/lib/assistant/fabPrefs.test.ts`
- Test: `src/lib/assistant/threadStorage.test.ts`

**Interfaces:**
- Produces: `sectionKeyFromPath(pathname: string): string`; `isFabCollapsed(section: string): boolean`; `setFabCollapsed(section: string, collapsed: boolean): void`; `saveThread(messages: ThreadMessage[]): void`; `loadThread(): ThreadMessage[]`.

- [ ] **Step 1: Write the failing tests**

`src/lib/assistant/fabPrefs.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { sectionKeyFromPath, isFabCollapsed, setFabCollapsed } from './fabPrefs';

describe('sectionKeyFromPath', () => {
  it('maps bare /dashboard to home', () => {
    expect(sectionKeyFromPath('/dashboard')).toBe('home');
    expect(sectionKeyFromPath('/dashboard/')).toBe('home');
  });
  it('uses the second segment for dashboard pages', () => {
    expect(sectionKeyFromPath('/dashboard/calendar')).toBe('calendar');
    expect(sectionKeyFromPath('/dashboard/viewer/abc123')).toBe('viewer');
  });
  it('uses the first segment elsewhere', () => {
    expect(sectionKeyFromPath('/studio/sessions/xyz')).toBe('studio');
    expect(sectionKeyFromPath('/tour-manager')).toBe('tour-manager');
  });
  it('falls back to home for the root path', () => {
    expect(sectionKeyFromPath('/')).toBe('home');
  });
});

describe('collapse prefs', () => {
  beforeEach(() => localStorage.clear());
  it('round-trips per section', () => {
    expect(isFabCollapsed('studio')).toBe(false);
    setFabCollapsed('studio', true);
    expect(isFabCollapsed('studio')).toBe(true);
    expect(isFabCollapsed('calendar')).toBe(false);
    setFabCollapsed('studio', false);
    expect(isFabCollapsed('studio')).toBe(false);
  });
  it('survives corrupt storage', () => {
    localStorage.setItem('gw_assistant_fab_collapsed', '{nope');
    expect(isFabCollapsed('studio')).toBe(false);
    setFabCollapsed('studio', true);
    expect(isFabCollapsed('studio')).toBe(true);
  });
});
```

`src/lib/assistant/threadStorage.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd <worktree> && npx vitest run src/lib/assistant/fabPrefs.test.ts src/lib/assistant/threadStorage.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/lib/assistant/fabPrefs.ts`:
```ts
// Per-section collapse preference for the floating assistant mic.
// "Section" = the page family a user thinks of as one place: the second
// path segment under /dashboard (calendar, viewer, …; bare /dashboard is
// 'home'), the first segment elsewhere (studio, tour-manager). Collapsing
// the FAB in the Studio must not hide it on the Calendar.
const KEY = 'gw_assistant_fab_collapsed';

export function sectionKeyFromPath(pathname: string): string {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return 'home';
  if (segs[0] === 'dashboard') return segs[1] ?? 'home';
  return segs[0];
}

function read(): Record<string, boolean> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

export function isFabCollapsed(section: string): boolean {
  return read()[section] === true;
}

export function setFabCollapsed(section: string, collapsed: boolean): void {
  try {
    const map = read();
    if (collapsed) map[section] = true; else delete map[section];
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch { /* private mode */ }
}
```

`src/lib/assistant/threadStorage.ts`:
```ts
import type { ThreadMessage } from './types';

// sessionStorage mirror of the assistant thread so a reload keeps the
// conversation. Confirm cards are NOT resurrected as actionable: a
// pendingAction that never got its explicit Send must come back inert
// (state 'cancelled'), otherwise a reload could re-offer a stale SMS send.
const KEY = 'gw_assistant_thread';
const CAP = 50;

export function saveThread(messages: ThreadMessage[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-CAP)));
  } catch { /* quota / private mode — mirror is best-effort */ }
}

export function loadThread(): ThreadMessage[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m: ThreadMessage) => {
      if (!m.pendingAction && m.actionState !== 'pending') return m;
      const { pendingAction: _dropped, ...rest } = m;
      return { ...rest, actionState: m.actionState === 'pending' ? 'cancelled' as const : m.actionState };
    });
  } catch { return []; }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/assistant/fabPrefs.test.ts src/lib/assistant/threadStorage.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/fabPrefs.ts src/lib/assistant/fabPrefs.test.ts src/lib/assistant/threadStorage.ts src/lib/assistant/threadStorage.test.ts
git commit -m "feat(assistant): section-key collapse prefs + thread sessionStorage mirror"
```

---

### Task 2: AssistantProvider — shell-level assistant state

**Files:**
- Create: `src/lib/assistant/AssistantProvider.tsx`
- Test: `src/lib/assistant/AssistantProvider.test.tsx`

**Interfaces:**
- Consumes: Task 1 helpers; existing `threadReducer`, `ConfirmActionQueue`, `executeClientAction`, `getSpeechInput`, `isMuted`, `setMuted`, `speak`.
- Produces:
```ts
export interface AssistantContextValue {
  state: ThreadState;
  send: (content: string) => Promise<void>;
  runAction: (msgId: string, action: AssistantAction) => Promise<void>;
  cancelAction: (msgId: string) => void;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;   // videoRoom-guarded
  micAvailable: boolean;
  listening: boolean;
  transcript: string;                       // live interim transcript
  toggleMic: () => void;                    // start/stop; final transcript auto-sends
  muted: boolean;
  toggleMute: () => void;
  videoRoom: string | null;
  setVideoRoom: (room: string | null) => void;
  captionReply: { id: string; text: string } | null; // last reply that arrived while the sheet was closed
}
export const AssistantProvider: React.FC<{ children: ReactNode; initialSheetOpen?: boolean }>;
export function useAssistant(): AssistantContextValue;          // throws outside provider
export function useAssistantOptional(): AssistantContextValue | null;
```

- [ ] **Step 1: Write the failing test**

`src/lib/assistant/AssistantProvider.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssistantProvider, useAssistant } from './AssistantProvider';
import { saveThread } from './threadStorage';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ profile: { user_id: 'u1', full_name: 'Test User', email: 't@example.com', role: 'member' } }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const Probe = () => {
  const a = useAssistant();
  return (
    <div>
      <span data-testid="count">{a.state.messages.length}</span>
      <span data-testid="sheet">{String(a.sheetOpen)}</span>
      <span data-testid="caption">{a.captionReply?.text ?? ''}</span>
      <button onClick={() => a.send('hello')}>go</button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <MemoryRouter>
      <AssistantProvider><Probe /></AssistantProvider>
    </MemoryRouter>,
  );

beforeEach(() => { sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('AssistantProvider', () => {
  it('restores the thread from sessionStorage', () => {
    saveThread([{ id: 'a', role: 'user', content: 'earlier' }]);
    renderProbe();
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('send() appends both turns and mirrors to sessionStorage', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'hi there', actions: [] }, error: null } as never);
    renderProbe();
    await act(async () => { screen.getByText('go').click(); });
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(JSON.parse(sessionStorage.getItem('gw_assistant_thread') ?? '[]')).toHaveLength(2);
  });

  it('a reply arriving while the sheet is closed becomes the caption', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'spoken answer', actions: [] }, error: null } as never);
    renderProbe();
    await act(async () => { screen.getByText('go').click(); });
    expect(screen.getByTestId('caption')).toHaveTextContent('spoken answer');
  });

  it('a confirm-gated action auto-opens the sheet', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { reply: 'ready to send', actions: [{ tool: 'send_sms', args: {}, confirm: true }] },
      error: null,
    } as never);
    renderProbe();
    expect(screen.getByTestId('sheet')).toHaveTextContent('false');
    await act(async () => { screen.getByText('go').click(); });
    expect(screen.getByTestId('sheet')).toHaveTextContent('true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/AssistantProvider.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/assistant/AssistantProvider.tsx`**

The logic is lifted verbatim from `AssistantSheet.tsx` (send/runAction/cancelAction/advanceConfirmQueue/mic/mute) with four additions: sessionStorage mirror, `captionReply`, confirm-auto-open, and the videoRoom-guarded `setSheetOpen`.

```tsx
import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { threadReducer, INITIAL_THREAD } from './threadReducer';
import { executeClientAction } from './clientActions';
import { getSpeechInput, isMuted, setMuted, speak } from './speech';
import { ConfirmActionQueue } from './confirmQueue';
import { loadThread, saveThread } from './threadStorage';
import type { AssistantAction, ThreadState } from './types';

export interface AssistantContextValue {
  state: ThreadState;
  send: (content: string) => Promise<void>;
  runAction: (msgId: string, action: AssistantAction) => Promise<void>;
  cancelAction: (msgId: string) => void;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  micAvailable: boolean;
  listening: boolean;
  transcript: string;
  toggleMic: () => void;
  muted: boolean;
  toggleMute: () => void;
  videoRoom: string | null;
  setVideoRoom: (room: string | null) => void;
  captionReply: { id: string; text: string } | null;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within AssistantProvider');
  return ctx;
}

export function useAssistantOptional(): AssistantContextValue | null {
  return useContext(AssistantContext);
}

// Owns everything about the assistant that must survive navigation: the
// thread, the confirm queue, speech in/out, and the sheet's open state.
// Mounted once in DashboardShell; AssistantSheet and AssistantFab are
// pure consumers. The thread mirrors to sessionStorage so a reload keeps
// the conversation (see threadStorage for the confirm-card sanitizing).
export const AssistantProvider = ({ children, initialSheetOpen = false }: { children: ReactNode; initialSheetOpen?: boolean }) => {
  const navigate = useNavigate();
  const { profile } = useUserRole();
  const [state, dispatch] = useReducer(
    threadReducer,
    undefined as unknown as ThreadState,
    () => ({ ...INITIAL_THREAD, messages: loadThread() }),
  );
  const [sheetOpen, setSheetOpenState] = useState(initialSheetOpen);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [muted, setMutedState] = useState(isMuted());
  const [videoRoom, setVideoRoom] = useState<string | null>(null);
  const [captionReply, setCaptionReply] = useState<{ id: string; text: string } | null>(null);
  const speechRef = useRef(getSpeechInput());
  const confirmQueueRef = useRef(new ConfirmActionQueue());
  // Async send() must see the CURRENT open state, not the one captured at
  // call time — the caption/auto-open decisions happen after the network
  // round-trip.
  const sheetOpenRef = useRef(sheetOpen);
  sheetOpenRef.current = sheetOpen;
  const videoRoomRef = useRef(videoRoom);
  videoRoomRef.current = videoRoom;

  useEffect(() => { saveThread(state.messages); }, [state.messages]);

  // Block close while a video call is live — same guard the sheet had.
  const setSheetOpen = useCallback((next: boolean) => {
    if (!next && videoRoomRef.current) return;
    setSheetOpenState(next);
  }, []);

  // Stop the mic and any in-flight reply speech when the sheet closes
  // while listening from within it; unmount safety for the whole app.
  useEffect(() => () => {
    speechRef.current.stop();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }, []);

  const advanceConfirmQueue = useCallback((msgId: string) => {
    const nextId = crypto.randomUUID();
    const nextAction = confirmQueueRef.current.next(msgId, nextId);
    if (!nextAction) return;
    dispatch({ type: 'reply', id: nextId, content: "There's one more to confirm:", pendingAction: nextAction });
  }, []);

  const runAction = useCallback(async (msgId: string, action: AssistantAction) => {
    dispatch({ type: 'action-state', id: msgId, state: 'confirmed' });
    const outcome = await executeClientAction(action);
    dispatch({ type: 'action-state', id: msgId, state: outcome.ok ? 'done' : 'error' });
    if (outcome.openVideoRoom) setVideoRoom(outcome.openVideoRoom);
    if (outcome.navigateTo) { setSheetOpen(false); navigate(outcome.navigateTo); }
    if (!outcome.ok) speak(outcome.message, { muted });
    if (action.confirm) advanceConfirmQueue(msgId);
  }, [muted, navigate, setSheetOpen, advanceConfirmQueue]);

  const cancelAction = useCallback((msgId: string) => {
    dispatch({ type: 'action-state', id: msgId, state: 'cancelled' });
    advanceConfirmQueue(msgId);
  }, [advanceConfirmQueue]);

  const send = useCallback(async (content: string) => {
    const text = content.trim();
    if (!text || state.busy) return;
    dispatch({ type: 'send', id: crypto.randomUUID(), content: text });
    const history = [...state.messages.map((m) => ({ role: m.role, content: m.content })), { role: 'user' as const, content: text }];
    try {
      const { data, error } = await supabase.functions.invoke('assistant-chat', {
        body: {
          messages: history,
          context: {
            firstName: profile?.full_name?.split(' ')[0] ?? 'there',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
      });
      if (error || data?.error) {
        dispatch({ type: 'fail', error: data?.error ?? "I couldn't reach the assistant right now." });
        return;
      }
      if (!data || (data.reply == null && data.error == null)) {
        dispatch({ type: 'fail', error: "I couldn't reach the assistant right now." });
        return;
      }
      const replyId = crypto.randomUUID();
      const actions: AssistantAction[] = data.actions ?? [];
      const { first: confirmAction, autoRun } = confirmQueueRef.current.register(replyId, actions);
      dispatch({ type: 'reply', id: replyId, content: data.reply ?? '', pendingAction: confirmAction });
      speak(data.reply ?? '', { muted });
      // Sheet closed = this turn came from the floating mic. Surface the
      // reply as a caption; and NEVER leave a confirm card invisible —
      // SMS/email sends must show their Send/Cancel, so open the sheet.
      if (!sheetOpenRef.current) {
        if (confirmAction) setSheetOpen(true);
        else if (data.reply) setCaptionReply({ id: replyId, text: data.reply });
      }
      for (const action of autoRun) {
        await runAction(replyId, action);
      }
    } catch {
      dispatch({ type: 'fail', error: "I couldn't reach the assistant right now." });
    }
  }, [state.busy, state.messages, profile, muted, runAction, setSheetOpen]);

  const toggleMic = useCallback(() => {
    const speech = speechRef.current;
    if (!speech.available) return;
    if (listening) { speech.stop(); setListening(false); return; }
    setListening(true);
    setTranscript('');
    setCaptionReply(null);
    let finalTranscript = '';
    speech.start(
      (t, isFinal) => { setTranscript(t); if (isFinal) finalTranscript = t; },
      () => { setListening(false); if (finalTranscript.trim()) void send(finalTranscript); },
    );
  }, [listening, send]);

  const toggleMute = useCallback(() => {
    const m = !muted;
    setMuted(m);
    setMutedState(m);
  }, [muted]);

  return (
    <AssistantContext.Provider value={{
      state, send, runAction, cancelAction,
      sheetOpen, setSheetOpen,
      micAvailable: speechRef.current.available, listening, transcript, toggleMic,
      muted, toggleMute,
      videoRoom, setVideoRoom,
      captionReply,
    }}>
      {children}
    </AssistantContext.Provider>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/AssistantProvider.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/AssistantProvider.tsx src/lib/assistant/AssistantProvider.test.tsx
git commit -m "feat(assistant): shell-level AssistantProvider owning thread, speech, and sheet state"
```

---

### Task 3: AssistantSheet consumes the provider

**Files:**
- Modify: `src/components/assistant/AssistantSheet.tsx` (whole file — state moves out)
- Modify: `src/components/assistant/AssistantSheet.test.tsx` (wrap in provider)

**Interfaces:**
- Consumes: `useAssistant()` from Task 2.
- Produces: `AssistantSheet` with NO props (open state from context). `AssistantSuggestions`, `AssistantThread`, `AssistantVideoOverlay` unchanged.

- [ ] **Step 1: Rewrite `AssistantSheet.tsx`**

Keep both render shells (phone Sheet / desktop Dialog) exactly as they are; replace all lifted state with context. The full new state/handler head of the component (everything before the `if (isPhone)` return stays otherwise identical to the current file):

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Mic, Send, Volume2, VolumeX } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsPhone } from '@/hooks/use-mobile';
import { useAssistant } from '@/lib/assistant/AssistantProvider';
import { AssistantThread } from './AssistantThread';
import { AssistantSuggestions } from './AssistantSuggestions';
import { AssistantVideoOverlay } from './AssistantVideoOverlay';

const ASSISTANT_DESCRIPTION = "Chat with the GleeWorld Assistant by typing or voice. Some actions ask for confirmation before they run.";

export const AssistantSheet = () => {
  const { profile } = useUserRole();
  const isPhone = useIsPhone();
  const {
    state, send, runAction, cancelAction,
    sheetOpen, setSheetOpen,
    micAvailable, listening, transcript, toggleMic,
    muted, toggleMute,
    videoRoom, setVideoRoom,
  } = useAssistant();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 999999 }); }, [state.messages.length]);

  // Mirror the live transcript into the input while listening so the user
  // sees what the mic hears (same behavior the sheet-local mic had).
  useEffect(() => { if (listening) setInput(transcript); }, [listening, transcript]);

  const submit = useCallback((content: string) => {
    if (!content.trim() || state.busy) return;
    setInput('');
    void send(content);
  }, [send, state.busy]);

  const hasMessages = state.messages.length > 0;
```

Then in BOTH shells, mechanical substitutions only:
- `open={open}` → `open={sheetOpen}`; `onOpenChange={handleOpenChange}` → `onOpenChange={setSheetOpen}` (the guard lives in the provider now).
- `send(input)` in the form submit → `submit(input)`; `onPick={send}` stays (send accepts strings).
- Delete the local `toggleMic`, `handleOpenChange`, `runAction`, `cancelAction`, `send`, reducer, refs (`speechRef`, `confirmQueueRef`), `listenRequest` effect, the open/close speech-stop effects (provider owns lifecycle), and the `listenRequest` prop.
- `state.busy || !input.trim()` disabled logic unchanged; `micAvailable`/`listening`/`toggleMic`/`muted`/`toggleMute`/`videoRoom`/`setVideoRoom` now come from context.

- [ ] **Step 2: Update the test file**

In `AssistantSheet.test.tsx`, change only the render helper (mocks stay):

```tsx
import { AssistantProvider } from '@/lib/assistant/AssistantProvider';

const renderSheet = () =>
  render(
    <MemoryRouter>
      <AssistantProvider initialSheetOpen>
        <AssistantSheet />
      </AssistantProvider>
    </MemoryRouter>,
  );
```

Also add at the top of `beforeEach`: `sessionStorage.clear();` (the provider now restores a mirrored thread; tests must start clean).

- [ ] **Step 3: Run the assistant test files**

Run: `npx vitest run src/components/assistant src/lib/assistant`
Expected: PASS — all existing sheet tests plus Tasks 1–2 tests.

- [ ] **Step 4: Commit**

```bash
git add src/components/assistant/AssistantSheet.tsx src/components/assistant/AssistantSheet.test.tsx
git commit -m "refactor(assistant): AssistantSheet consumes AssistantProvider"
```

---

### Task 4: AssistantFab — mic + caret cluster, caption bubble, collapse dot

**Files:**
- Create: `src/components/assistant/AssistantFab.tsx`
- Test: `src/components/assistant/AssistantFab.test.tsx`

**Interfaces:**
- Consumes: `useAssistantOptional()`, Task 1 `sectionKeyFromPath`/`isFabCollapsed`/`setFabCollapsed`, `useIsPhone`, `useLocation`.
- Produces: `<AssistantFab />` (no props), rendered inside the provider.

- [ ] **Step 1: Write the failing test**

`src/components/assistant/AssistantFab.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssistantProvider } from '@/lib/assistant/AssistantProvider';
import { AssistantFab } from './AssistantFab';

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ profile: { user_id: 'u1', full_name: 'Test User', email: 't@example.com', role: 'member' } }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const renderFab = (path = '/dashboard/calendar') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AssistantProvider><AssistantFab /></AssistantProvider>
    </MemoryRouter>,
  );

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('AssistantFab', () => {
  it('renders the caret (mic hidden when speech is unavailable in jsdom)', () => {
    renderFab();
    expect(screen.getByLabelText('Open assistant chat')).toBeInTheDocument();
    expect(screen.queryByLabelText('Talk to the assistant')).not.toBeInTheDocument();
  });

  it('collapses to the restore dot and remembers it for the section', () => {
    renderFab();
    fireEvent.click(screen.getByLabelText('Hide assistant on this page'));
    expect(screen.queryByLabelText('Open assistant chat')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Show assistant')).toBeInTheDocument();
    expect(localStorage.getItem('gw_assistant_fab_collapsed')).toContain('calendar');
  });

  it('restores from the dot', () => {
    renderFab();
    fireEvent.click(screen.getByLabelText('Hide assistant on this page'));
    fireEvent.click(screen.getByLabelText('Show assistant'));
    expect(screen.getByLabelText('Open assistant chat')).toBeInTheDocument();
  });

  it('starts collapsed when the section pref says so', () => {
    localStorage.setItem('gw_assistant_fab_collapsed', JSON.stringify({ calendar: true }));
    renderFab('/dashboard/calendar');
    expect(screen.getByLabelText('Show assistant')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant/AssistantFab.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/assistant/AssistantFab.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronUp, Mic, X } from 'lucide-react';
import { useIsPhone } from '@/hooks/use-mobile';
import { useAssistantOptional } from '@/lib/assistant/AssistantProvider';
import { sectionKeyFromPath, isFabCollapsed, setFabCollapsed } from '@/lib/assistant/fabPrefs';
import { cn } from '@/lib/utils';

const CAPTION_MS = 6000;

// Floating assistant entry point: tenant-glass mic (primary, voice-first)
// + caret that opens the chat sheet. Lives bottom-right on every
// dashboard page; the × collapses it to an edge dot, remembered per
// section (fabPrefs). Hidden entirely while the sheet or a video call is
// up — the sheet has its own mic and the call owns the screen.
export const AssistantFab = () => {
  const assistant = useAssistantOptional();
  const { pathname } = useLocation();
  const isPhone = useIsPhone();
  const section = sectionKeyFromPath(pathname);
  const [collapsed, setCollapsed] = useState(() => isFabCollapsed(section));
  // Re-read the pref when the section changes (collapse is per-section).
  useEffect(() => { setCollapsed(isFabCollapsed(section)); }, [section]);

  // Caption fades a few seconds after the spoken reply lands.
  const captionReply = assistant?.captionReply ?? null;
  const [visibleCaptionId, setVisibleCaptionId] = useState<string | null>(null);
  useEffect(() => {
    if (!captionReply) return;
    setVisibleCaptionId(captionReply.id);
    const t = setTimeout(() => setVisibleCaptionId(null), CAPTION_MS);
    return () => clearTimeout(t);
  }, [captionReply]);

  if (!assistant) return null;
  const { sheetOpen, setSheetOpen, micAvailable, listening, transcript, toggleMic, videoRoom, state } = assistant;
  if (sheetOpen || videoRoom) return null;

  // Above the floating MobileBottomNav pill on phones; corner on desktop.
  const bottom = isPhone
    ? 'calc(max(16px, env(safe-area-inset-bottom)) + 76px)'
    : '1.25rem';

  if (collapsed) {
    return (
      <button
        type="button"
        aria-label="Show assistant"
        onClick={() => { setCollapsed(false); setFabCollapsed(section, false); }}
        className="fixed right-0 z-40 h-8 w-4 rounded-l-full bg-primary/25 backdrop-blur-xl border border-r-0 border-primary/30 shadow-md hover:bg-primary/40 transition-colors"
        style={{ bottom }}
      />
    );
  }

  const caption = listening
    ? (transcript || 'Listening…')
    : state.busy
      ? '…'
      : visibleCaptionId && captionReply?.id === visibleCaptionId
        ? captionReply.text
        : null;

  return (
    <div className="fixed right-4 z-40 flex flex-col items-end gap-2" style={{ bottom }}>
      {caption && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="max-w-[75vw] sm:max-w-sm rounded-2xl bg-background/70 backdrop-blur-xl border border-primary/30 shadow-lg px-3.5 py-2.5 text-sm text-left text-foreground"
        >
          {caption}
        </button>
      )}
      <div className="group relative flex items-center gap-1.5 rounded-full bg-primary/20 backdrop-blur-xl border border-primary/30 shadow-lg p-1.5">
        <button
          type="button"
          aria-label="Hide assistant on this page"
          onClick={() => { setCollapsed(true); setFabCollapsed(section, true); }}
          className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-background/80 backdrop-blur border border-border shadow flex items-center justify-center text-muted-foreground opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
        <button
          type="button"
          aria-label="Open assistant chat"
          onClick={() => setSheetOpen(true)}
          className="h-8 w-8 rounded-full flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        {micAvailable && (
          <button
            type="button"
            aria-label="Talk to the assistant"
            onClick={toggleMic}
            className={cn(
              'h-11 w-11 rounded-full flex items-center justify-center transition-colors',
              listening
                ? 'bg-destructive/20 text-destructive animate-pulse'
                : 'bg-primary/25 text-primary hover:bg-primary/35',
            )}
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
```

Note the × uses `w-3 h-3` deliberately — it's a hover-reveal badge, not chrome text; the interactive mic/caret meet the `w-4 h-4` floor.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant/AssistantFab.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/assistant/AssistantFab.tsx src/components/assistant/AssistantFab.test.tsx
git commit -m "feat(assistant): floating tenant-glass mic FAB with caption bubble and per-section collapse"
```

---

### Task 5: Mount in the shell, remove the Home pill, full gates

**Files:**
- Modify: `src/components/dashboard/DashboardShell.tsx` (shell return, ~line 917)
- Modify: `src/pages/dashboard/HouseHome.tsx` (drop launcher import + usage, lines 11 and 157)
- Delete: `src/components/assistant/AssistantLauncher.tsx`

**Interfaces:**
- Consumes: `AssistantProvider`, `AssistantFab`, `AssistantSheet` (prop-less).

- [ ] **Step 1: Wrap the shell**

In `DashboardShell.tsx` add imports:
```tsx
import { AssistantProvider } from '@/lib/assistant/AssistantProvider';
import { AssistantFab } from '@/components/assistant/AssistantFab';
import { AssistantSheet } from '@/components/assistant/AssistantSheet';
```
and change the `DashboardShell` return to wrap everything, adding the FAB + sheet after `<ProductTour />`:
```tsx
  return (
    <AssistantProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* …existing content exactly as-is… */}
        <MobileBottomNav />
        <ProductTour />
        <AssistantFab />
        <AssistantSheet />
      </div>
    </AssistantProvider>
  );
```

- [ ] **Step 2: Remove the Home pill**

In `HouseHome.tsx`: delete the `AssistantLauncher` import (line 11) and the `<AssistantLauncher />` element (line 157; keep the greeting row div otherwise intact). Then:
```bash
git rm src/components/assistant/AssistantLauncher.tsx
```
Verify nothing else imports it: `grep -rn "AssistantLauncher" src/` → no hits.

- [ ] **Step 3: Full test suite**

Run: `npm run test`
Expected: PASS (same failures-none baseline as origin/main; new tests included).

- [ ] **Step 4: Build gate**

Run: `npm run build`
Expected: `✓ built` with no TS errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DashboardShell.tsx src/pages/dashboard/HouseHome.tsx
git commit -m "feat(assistant): mount provider+FAB in DashboardShell; retire Home greeting-row launcher"
```

---

## Self-review notes

- Spec coverage: provider/persistence (T1+T2), FAB + glass + caption + collapse (T4), sheet refactor (T3), shell mount + pill removal (T5), confirm-auto-open (T2 test), speech-unavailable fallback (T4 first test asserts caret-only). Covered.
- The `listenRequest` prop dies with the launcher; no other consumer exists.
- jsdom has no SpeechRecognition, so provider tests exercise text `send()`; voice paths are covered by the same `send()` plus device QA (spec's QA section).
