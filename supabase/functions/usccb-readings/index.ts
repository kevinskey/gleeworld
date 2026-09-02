// Daily Catholic readings proxy. Originally targeted USCCB but their
// Cloudflare Bot Fight Mode returns 403 / stub to every server-side
// fetch, so we source from universalis.com — same lectionary, less
// hostile to crawlers, and returns clean parseable HTML.
//
// Caveat: Universalis's mass.htm page strips the Responsorial Psalm body
// (citation only). The frontend surfaces this — directors paste the
// psalm verses by hand when planning the song slot.
//
// The function name is kept as `usccb-readings` for backward compat
// with deployed clients; only the upstream and parser changed.
//
// Request handling and HTML parsing live in handler.ts, which has no
// Deno-only imports, so contract.test.ts can import it directly under
// Vitest/Node. This file is only the Deno edge-runtime bootstrap.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleRequest } from "./handler.ts";

serve(handleRequest);
