import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Asynchronous trigger for the existing grade-midterm-ai function.
// Returns immediately (202 Accepted) and relays the grading in the background
// to avoid client-side timeouts.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const submissionId = body?.submission_id;
    if (!submissionId) {
      return new Response(JSON.stringify({ success: false, error: "submission_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authorization = req.headers.get("authorization") ?? "";
    const apikey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabaseFunctionsUrl = `https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/grade-midterm-ai`;

    // Fire-and-forget background request to the synchronous grader
    (async () => {
      try {
        console.log("[grade-midterm-ai-async] Triggering grader for:", submissionId);
        const resp = await fetch(supabaseFunctionsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization,
            apikey,
            "x-client-info": "edge-relay/grade-midterm-ai-async",
          },
          body: JSON.stringify({ submission_id: submissionId }),
        });
        const text = await resp.text();
        console.log("[grade-midterm-ai-async] Grader responded:", resp.status, text?.slice(0, 2000));
      } catch (err) {
        console.error("[grade-midterm-ai-async] Relay failed:", err);
      }
    })();

    return new Response(JSON.stringify({
      success: true,
      accepted: true,
      message: "Grading started in background",
      submission_id: submissionId,
      timestamp: new Date().toISOString(),
    }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[grade-midterm-ai-async] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
