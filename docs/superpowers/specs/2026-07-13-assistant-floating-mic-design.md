# Assistant Floating Mic — Design

**Date:** 2026-07-13
**Status:** Approved (Kevin, 2026-07-13)

## Problem

The Assistant launcher (mic + Ask pill) lives only in the Home greeting
row, and the conversation thread lives inside `AssistantSheet`'s own
state. From any other page the assistant can't be invoked at all, and
any assistant-triggered navigation unmounts the launcher and wipes the
thread. Kevin wants a persistent, voice-first assistant available on
every page.

## Decisions (Kevin, 2026-07-13)

- **Primary interface = floating mic FAB**, bottom-right on every
  dashboard page (including Studio session editor / Viewer reader), in
  tenant-color liquid glass so it doesn't read as a blocking panel.
- **Chat window closed by default.** A caret button next to the mic
  opens the existing `AssistantSheet` (to re-read or copy text).
- **Voice flow with the window closed:** mic tap → FAB pulses, a small
  glass **caption bubble** above the FAB shows the live transcript,
  then shows the spoken reply and fades after a few seconds. Tapping
  the bubble opens the full chat.
- **Dismissable per section:** a tiny × collapses the cluster into a
  small glass dot hugging the right screen edge; tapping the dot
  restores it. Collapse state is remembered per app section
  (localStorage): key = second path segment for `/dashboard/*` routes
  (`calendar`, `viewer`, bare `/dashboard` → `home`), first segment
  otherwise (`studio`, `tour-manager`) — e.g. collapsed in the Studio
  stays collapsed there, full-size on Calendar.
- **Home greeting-row pill is removed** — the FAB replaces it.

## Architecture

- **`AssistantProvider`** (new, `src/lib/assistant/AssistantProvider.tsx`),
  mounted once in `DashboardShell`. Owns everything that must survive
  navigation: thread reducer state, busy/error, the `ConfirmActionQueue`,
  speech input/output wiring, sheet open state, and `send()`. The
  provider also mirrors thread messages to `sessionStorage`
  (`gw_assistant_thread`) so a reload keeps the conversation; mirror is
  size-capped (last 50 messages).
- **`AssistantFab`** (new) — the mic + caret cluster, caption bubble,
  and collapsed-dot rendering. Renders `null` outside the provider.
- **`AssistantSheet`** — UI unchanged; state moves to the provider
  (component keeps only input text / listening / mute local state, all
  thread operations come from context).
- **`AssistantLauncher`** — deleted; `HouseHome` greeting row drops it.

Alternatives considered: patching persistence into the current
component with sessionStorage only (fragile — speech and confirm-queue
lifecycles still die with the component), or a global store library
(new dependency for one feature). Provider-in-shell is the native
pattern and gives the speech/queue a single owner.

## FAB details

- Position: `fixed right-4 z-40`; phones
  `bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]` (clears
  MobileBottomNav), sm+ `bottom-5`.
- Liquid glass: `bg-primary/20 backdrop-blur-xl border border-primary/30
  shadow-lg text-primary` (tenant tint tokens only — no hardcoded
  colors; works over Studio's dark chrome and light pages).
- Mic button ~48px round; caret (ChevronUp) ~32px round beside it;
  tiny × badge on the cluster (hover-reveal on desktop, faint-visible
  on touch).
- Collapsed dot: ~14px glass dot, right edge, same vertical position.
- Listening: mic pulses (`animate-pulse` + destructive tint like the
  sheet's mic).

## Voice flow (window closed)

1. Mic tap → provider starts speech input; caption bubble shows interim
   transcript.
2. Final transcript → `send()` into the shared thread; bubble shows
   "…" while busy.
3. Reply → spoken via `speak()` (respects existing mute setting) and
   shown in the bubble; bubble auto-fades after ~6s.
4. **Confirm-gated actions auto-open the sheet** — SMS/email sends
   always show their Send/Cancel card; nothing confirm-gated ever runs
   on voice alone.
5. Non-confirm actions (navigate, open video) run exactly as they do
   from the sheet today; navigation no longer wipes the thread because
   the provider lives in the shell.

## Edge handling

- Speech unavailable (no SpeechRecognition, e.g. some webviews): mic
  button hides; caret-only cluster remains.
- Sheet open: FAB hides while the sheet/dialog is open (no duplicate
  mic), returns on close.
- iOS keyboard/safe areas: FAB uses `env(safe-area-inset-bottom)`;
  the caption bubble grows upward.

## Testing

- Unit: provider reducer behavior unchanged (existing threadReducer
  tests keep passing); new tests for sessionStorage mirror
  (cap + restore) and per-section collapse persistence.
- Existing `AssistantSheet.test.tsx` updated to render within the
  provider.
- Device QA (next iOS build): FAB clears bottom nav + home indicator,
  glass renders over Studio dark chrome, caption bubble legible both
  themes.
