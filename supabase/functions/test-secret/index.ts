import { serve } from "https://deno.land/std/http/server.ts";

serve(() => {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  return new Response(JSON.stringify({
    hasKey: !!apiKey,
    keyLength: apiKey?.length || 0,
    keyPrefix: apiKey?.substring(0, 8) || "none",
    timestamp: new Date().toISOString()
  }), {
    headers: { "Content-Type": "application/json" }
  });
});