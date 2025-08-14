import { serve } from "https://deno.land/std/http/server.ts";

serve(() =>
  new Response(JSON.stringify({
    ok: true,
    hasOpenAI: !!Deno.env.get("OPENAI_API_KEY"),
  }), { headers: { "Content-Type": "application/json" } })
);