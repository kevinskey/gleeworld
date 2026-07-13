# GleeWorld Assistant — Design

**Date:** 2026-07-12
**Status:** Approved by Kevin (brainstorming session)
**Scope:** In-app AI assistant, voice + text, that answers questions about GleeWorld and performs actions on behalf of the signed-in user.

## Summary

A role-aware, tool-calling assistant available to every user from the home page. The user speaks or types a request ("what time do I have to be at rehearsal?", "text Sarah that rehearsal moved to 7", "open Studio"); a DeepSeek-powered edge function picks a typed tool and fills its arguments; the tool executes against existing GleeWorld APIs under the caller's JWT so Postgres RLS — not the model — enforces permissions and tenant isolation.

There is **no model training or fine-tuning**. App knowledge lives in a system prompt + tool catalog, updated whenever a feature ships.

## Decisions made during brainstorming

| Question | Decision |
|---|---|
| Placement | Mic + "Ask" launcher right-justified in the home greeting row (`HouseHome.tsx`, greeting at line ~150), across from "Evening, Kevin" |
| Audience | Everyone, role-aware tool filtering (not admin-only) |
| Action safety | Confirm-before-execute for outward/destructive actions only; lookups and navigation are instant |
| Voice output | Text + spoken replies with a persistent mute toggle |
| Platforms | Web + iOS in the same release; iOS gets a native speech-recognition plugin |
| Model | DeepSeek `deepseek-chat` (function calling) behind a provider adapter; swappable via env vars |

## Architecture

```
AssistantLauncher (greeting row)
        │ opens
AssistantSheet (bottom sheet on phone / anchored panel on desktop)
        │  useAssistant hook — thread state, speech in/out, action dispatch
        ▼
assistant-chat edge function (Deno)
  ├─ system prompt: GleeWorld overview, add-on capabilities, user name/role/
  │  tenant/active modules, date + timezone
  ├─ tool catalog filtered by caller's role (from JWT claims)
  ├─ provider adapter → DeepSeek chat completions w/ function calling
  │  (ASSISTANT_PROVIDER / ASSISTANT_MODEL env; OpenAI-compatible fallback)
  └─ tool execution:
       • data tools → Supabase client constructed WITH the caller's JWT
         (RLS + tenant isolation enforced by Postgres)
       • navigate tools → returned to client as directives
       • confirm-gated tools → returned as pending_action cards
```

### Response types reaching the client

1. **text** — plain assistant reply (also spoken unless muted).
2. **navigate** — `{ path }`; client routes via react-router, assistant says "Opening Studio."
3. **pending_action** — human-readable preview + the tool call. Client renders a confirmation card (e.g. *Text to Sarah Jones: "Rehearsal moved to 7" — Send / Cancel*). On confirm, the client posts the action back to `assistant-chat` for execution; the server re-validates role and re-derives recipients server-side before executing.

## Tool catalog (v1)

Role column = minimum role that sees the tool. Confirm = requires confirmation card.

| Tool | What it does | Role | Confirm |
|---|---|---|---|
| `query_calendar` | Answer what/when questions from gw_events + Google overlay for the caller | member | – |
| `create_event` | Insert gw_events row (title, date/time, location, calendar) | admin | – |
| `create_note` | Create a Planner note (owner-private) | member | – |
| `create_task` | Create a task/to-do | member | – |
| `send_sms` | Text a user/group via existing broadcast-sms / send-group-sms fns | admin | ✔ |
| `send_email` | Email a user/group via existing broadcast fns | admin | ✔ |
| `start_video_session` | Create/join a JaaS room, return link | member | – |
| `open_page` | Navigate to Studio, any add-on, any dashboard route (whitelisted route map) | member | – |
| `open_song` | Search music library by title → navigate to viewer | member | – |
| `add_youtube_video` | Search YouTube (existing integration) → save to Videos module | admin | – |

**Phase 3 tools (explicitly out of v1):** `create_class` (Academy), `download_pdf_to_library` (CPDL → personal library), recurring/scheduled actions.

Members see only lookup / navigation / self-scoped tools. The filter runs server-side from JWT role claims; the client never supplies the tool list.

## UI

- **AssistantLauncher** — mic icon button + compact "Ask" pill, right side of the greeting row (`flex justify-between` on the existing greeting container). Light-theme tokens; `text-sm`, `w-4 h-4`+ icons per Studio sizing standards.
- **AssistantSheet** — message thread, text input, mic button (hold-or-tap to talk with live transcript), speaker/mute toggle (persisted in localStorage per user), confirmation cards inline in the thread.
- Greeting row keeps its spec-fixed order (greeting → up next → widgets → app grid); the launcher lives inside the greeting block, not as a new section.

## Voice layer

- **Input facade `SpeechInputSource`** (mirrors `MidiInputSource` pattern):
  - Web: `webkitSpeechRecognition` / Web Speech API.
  - iOS app: new `GWSpeech` Capacitor plugin wrapping `SFSpeechRecognizer` + `AVAudioEngine` mic tap. **Must be registered in `MainViewController.capacitorDidLoad`** (CAPBridgedPlugin auto-discovery is dead-stripped in release builds). Mind AVAudioSession interactions documented in the iOS audio recording reference doc.
- **Output:** `window.speechSynthesis` (works in Safari/Chrome and WKWebView). Speak each assistant text reply unless muted.
- Mic button hides gracefully when no speech source is available (permission denied, unsupported browser).

## Backend details

- **Function:** `supabase/functions/assistant-chat/index.ts`, deployed on the self-hosted stack (`docker compose up -d --force-recreate functions` after adding env).
- **Env:** `DEEPSEEK_API_KEY` (already used by `ai-chat`), `ASSISTANT_PROVIDER=deepseek`, `ASSISTANT_MODEL=deepseek-chat`.
- **Loop:** non-streaming v1 (short replies; streaming is a later polish). Max ~6 tool iterations per turn; hard token/cost cap per request.
- **Auth:** function requires a valid JWT; builds the Supabase client with the caller's `Authorization` header so every query runs under RLS. Role + tenant come from `verifyJwtClaims`-style verified claims, never bare `atob`.
- **Cost:** deepseek-chat ≈ $0.03–0.05 per multi-turn conversation; no per-tenant billing in v1.

## Error handling

- Provider/API failure → friendly "I couldn't reach the assistant right now" in-thread; never a blank state.
- Tool execution error (RLS denial, validation) → the error is fed back to the model, which explains it plainly ("You don't have permission to text members").
- Silent-write gotcha: every insert/update uses `.select()` and checks returned rows (demo tenant writes fail silently otherwise).
- Speech recognition failure → fall back to text input with a toast.

## Testing

- Unit: role→tool filtering, confirmation gating (confirm-gated tool never executes without the confirm round-trip), provider adapter request/response mapping, route whitelist for `open_page`.
- Manual QA on local preview (prod write-heavy E2E is gated by policy): calendar Q&A, event create, note create, SMS confirm flow, navigation, mic + TTS on Chrome/Safari.
- iOS: TestFlight build; verify mic permission flow, speech accuracy, TTS, and that Studio audio still works after mic use (AVAudioSession ordering).

## Phasing

1. **Phase 1 — Web assistant:** edge function + tool catalog + AssistantSheet + Web Speech in/out + confirmation cards. Ships behind no flag (all tenants).
2. **Phase 2 — iOS:** `GWSpeech` plugin, facade wiring, iOS build (no ASC upload without Kevin's OK).
3. **Phase 3 — Extended tools:** `create_class`, `download_pdf_to_library`, streaming replies, scheduled/recurring actions.
