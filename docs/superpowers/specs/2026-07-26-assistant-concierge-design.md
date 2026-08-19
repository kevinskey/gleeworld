# Assistant Concierge — chat-driven, no forms

**Date:** 2026-07-26
**Status:** Draft — awaiting user review

## Problem

The deployed `/dashboard/concierge` page (ConciergePage.tsx, source not in origin/main) is a three-panel form: Get a ride, Order food, Search the web. Kevin wants no form. The concierge capabilities should be tools the GleeWorld Assistant calls, with:

1. All data input handled by the assistant in chat (destination, cuisine, query) — never a form field.
2. A **results side panel** on the assistant sheet where the assistant surfaces the outcome (deep-link card, search results) so the user can act on it without losing the chat.

## Non-goals

- Restoring or migrating `ConciergePage.tsx` source. A fresh build from origin/main already drops it.
- Native rideshare or delivery integrations. All three flows remain deep-link handoffs (Uber/Lyft/DoorDash/Uber Eats/Grubhub open in their own apps, user confirms and pays there).
- Nearby-places browse mode (used by Tour Manager) — out of scope; those functions stay as-is.

## Architecture

Three additions layered onto existing assistant plumbing. Nothing new is invented; each piece mirrors a pattern already in the codebase.

### 1. Assistant tools

Add three entries to `supabase/functions/assistant-chat/toolCatalog.ts` and matching handlers in `executors.ts`:

| tool | params | execution | confirm |
| --- | --- | --- | --- |
| `get_ride` | `{ destination: string, preferred?: 'uber' \| 'lyft' }` | `server` | `false` |
| `order_food` | `{ query?: string, preferred?: 'doordash' \| 'ubereats' \| 'grubhub' }` | `server` | `false` |
| `web_search` | `{ query: string }` | `server` | `false` |

All three are `minRole: 'member'` (available to any signed-in user).

**Executor behavior:**

- `get_ride` — resolves the destination via existing `google-places-lookup` edge function (fuzzy → lat/lng + formatted address). Builds Uber (`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=…&dropoff[longitude]=…&dropoff[nickname]=…`) and Lyft (`https://ride.lyft.com/ride?id=lyft&destination[latitude]=…&destination[longitude]=…`) universal deep links. Returns `{ resolvedAddress, uberUrl, lyftUrl, preferred? }`.
- `order_food` — no geocoding needed. Builds search-URL deep links: DoorDash `https://www.doordash.com/search/store/{q}`, Uber Eats `https://www.ubereats.com/search?q={q}`, Grubhub `https://www.grubhub.com/search?queryText={q}`. Empty query returns each service's homepage URL. Returns `{ query, services: [{name, deepLinkUrl}], preferred? }`.
- `web_search` — new `web-search` edge function (replaces the unreachable `concierge-search`). Calls the **Brave Search API** for real result URLs + snippets, then hands the top 5 snippets to DeepSeek (the existing assistant LLM) to synthesize a short "AI answer" for the panel header. Returns `{ answer?: string, results: [{title, url, snippet}] }`. Requires `BRAVE_SEARCH_API_KEY` in the edge function environment.

Each executor is server-side and returns a `resultsPanel` payload alongside its normal text reply, so the model can narrate ("I've pulled up Uber and Lyft with your trip to Home") while the panel displays the actionable card.

### 2. Results side panel

New state on `src/lib/assistant/AssistantProvider.tsx`, mirroring the `videoRoom` pattern:

```ts
type ConciergeResult =
  | { kind: 'ride'; resolvedAddress: string; uberUrl: string; lyftUrl: string; preferred?: 'uber' | 'lyft' }
  | { kind: 'food'; query: string; services: Array<{ name: 'DoorDash' | 'Uber Eats' | 'Grubhub'; deepLinkUrl: string }>; preferred?: string }
  | { kind: 'web';  query: string; answer?: string; results: Array<{ title: string; url: string; snippet: string }> };

resultsPanel: ConciergeResult | null;
setResultsPanel: (r: ConciergeResult | null) => void;
```

Set by the assistant reply handler when a tool result carries a `resultsPanel` field. Cleared by the user (close button) or when a new concierge tool overwrites it.

**Rendering (`src/components/assistant/AssistantResultsPanel.tsx`, new):**

- Desktop (spotlight `Dialog` in `AssistantSheet`): panel appears **next to** the dialog. Concretely — the dialog widens from `max-w-2xl` to a two-column layout: left column stays the chat (unchanged width), right column is the results panel (`~360–420px`). When `resultsPanel` is null, the panel column collapses and the dialog returns to single-column width.
- Phone (bottom `Sheet` in `AssistantSheet`): panel appears **above** the chat inside the same sheet — a collapsible section at the top of the sheet's flex column, above the message list. The message list scrolls under it.

**Card variants (single file, three sub-components):**

- `RideCard` — `resolvedAddress` in muted text, then two big buttons: "Ride with Uber" (amber, matches existing brand) and "Ride with Lyft" (pink). Each is a `<a target="_blank" rel="noopener noreferrer">` around the deep link. `preferred` gets the primary style, the other is outline.
- `FoodCard` — query in muted text, three service buttons (DoorDash, Uber Eats, Grubhub). Same anchor pattern.
- `WebCard` — optional `answer` block at top (violet accent, matches deployed style), then a list of `{title, snippet, url}` rows. Rows are anchors.

All three cards get an X close button in the panel header.

### 3. Empty-thread suggestions

Add three concierge chips to `AssistantSuggestions.tsx`:

- "Ride home"
- "Order food"
- "Search the web"

Placed in the same rotation as existing suggestions; no priority tier change.

## Data flow

```
user types "get me a ride home"
  → AssistantProvider.send()
  → assistant-chat edge function (with tool catalog)
  → model picks get_ride tool with { destination: "home" }
  → executor calls google-places-lookup("home for user X" → uses profile home address if set, else asks in chat)
  → executor returns { text: "Uber and Lyft ready for home.", resultsPanel: { kind: 'ride', ... } }
  → AssistantProvider appends assistant message + calls setResultsPanel(payload)
  → AssistantSheet re-renders with two-column (desktop) / stacked (phone) layout
  → user taps "Ride with Uber" → new tab opens the Uber universal link
```

If the model needs missing info (e.g. destination unresolvable), it asks in chat. No form ever appears.

## Error handling

- Executor errors (geocoding fails, upstream API 500) return a normal text reply from the assistant explaining what failed. `resultsPanel` is not set — user sees the message, panel stays as-is.
- Web-search backend outage: `web_search` returns `{ error: "Search is unavailable right now." }`, executor turns that into a text reply. Matches the string already in the deployed bundle.
- No `Google Places API key` on the environment: `get_ride` fails gracefully — assistant tells the user rides aren't configured. This surfaces to Kevin as an observable issue rather than a silent hang.

## Testing

- `supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts` — assert the three new tools exist with correct minRole / execution / confirm.
- New `__tests__/executors.concierge.test.ts` — unit-test the three executors with mocked upstream (google-places-lookup, web-search). Verify URL construction round-trips.
- `src/components/assistant/AssistantResultsPanel.test.tsx` (new) — render each card variant, assert anchors carry the right deep links and open in a new tab.
- Manual QA: desktop spotlight two-column layout, phone stacked layout, panel close, panel replace-on-new-tool.

## Cleanup

- The standalone `/dashboard/concierge` page and its "Concierge" nav entry come from a build that used unpushed source. A fresh build + deploy from origin/main + this branch removes both by omission — no delete-code work needed.
- If the deployed droplet still holds a stale `concierge-search` edge function, redeploy `web-search` (new) and leave the old function orphaned; no traffic will hit it once the page is gone.

## Decisions

- **Web-search backend: Brave Search API** + DeepSeek synthesis for the answer block. New `BRAVE_SEARCH_API_KEY` env var on `web-search` edge function. Free tier is 100 queries/day; per-tenant cap below prevents burn.
- **"Home" resolution for rides.** `get_ride` executor reads `profiles.home_address` (or the closest existing column — verified in the plan phase). If missing, the assistant asks in chat once, then offers to save it back to the profile.
- **Per-tenant daily cap on `web_search`.** New `assistant_usage_daily` table keyed on `(tenant_id, tool_name, date)`. Hard cap of 100/day/tenant on `web_search`; over cap, executor returns a friendly text reply and does not call Brave. `get_ride` and `order_food` are unmetered (no upstream cost).
