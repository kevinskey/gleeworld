import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  const has = !!Deno.env.get("OPENAI_API_KEY");
  return new Response(JSON.stringify({ ok: true, has }), { 
    headers: { "Content-Type": "application/json" } 
  });
});