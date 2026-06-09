// recompute-health
//
// Manual trigger for the Program Health snapshot job. POST with no body to
// recompute every active ensemble; POST with { ensemble_id } to recompute
// just one. The cron job hits the same SQL functions on a nightly schedule —
// this endpoint exists so directors can refresh on demand from the dashboard.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // ensemble_id is optional; missing/null = recompute all active ensembles.
    let ensembleId: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.ensemble_id === "string") {
        ensembleId = body.ensemble_id;
      }
    } catch {
      // empty body is fine
    }

    if (ensembleId) {
      const { data, error } = await supabase.rpc("compute_health_snapshot", {
        p_ensemble_id: ensembleId,
      });
      if (error) throw error;
      return new Response(
        JSON.stringify({ snapshot_id: data, ensemble_id: ensembleId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data, error } = await supabase.rpc("recompute_all_health_snapshots");
    if (error) throw error;
    return new Response(
      JSON.stringify({ snapshots_written: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("recompute-health failed:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
