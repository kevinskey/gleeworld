import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Asynchronous trigger for the existing grade-midterm-ai function.
// Returns immediately (202 Accepted) and relays the grading in the background
// to avoid client-side timeouts. Also computes an overall grade and
// updates mus240_midterm_submissions when grading completes.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://oopmlreysjzuxzylyheb.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

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
    const apikey = req.headers.get("apikey") ?? SUPABASE_ANON_KEY;
    const accessToken = authorization.replace(/^Bearer\s+/i, "");

    // Respond immediately so the UI never times out
    const acceptedResponse = new Response(
      JSON.stringify({
        success: true,
        accepted: true,
        message: "Grading started in background",
        submission_id: submissionId,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

    // Start background task
    (async () => {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${accessToken}` } },
        });

        console.log("[grade-midterm-ai-async] Triggering grader for:", submissionId);
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/grade-midterm-ai`, {
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

        // Try to compute final grade from function response if available
        let finalGrade: number | null = null;
        try {
          const json = JSON.parse(text);
          const grades = (json?.data?.grades || json?.grades || []) as Array<{ score?: number; total_points?: number }>;
          if (Array.isArray(grades) && grades.length) {
            const totals = grades.reduce(
              (acc, g) => {
                const score = typeof g.score === "number" ? g.score : 0;
                const max = typeof g.total_points === "number" ? g.total_points : 0;
                return { achieved: acc.achieved + score, possible: acc.possible + max };
              },
              { achieved: 0, possible: 0 }
            );
            if (totals.possible > 0) {
              // Use raw score instead of percentage (exam is out of 90 points)
              finalGrade = Math.round(totals.achieved);
            }
          }
        } catch (e) {
          console.warn("[grade-midterm-ai-async] Could not parse grader JSON, will fall back to DB rows.");
        }

        // Fallback: if finalGrade still null, compute from DB rows with retries (wait for grader to finish)
        if (finalGrade === null) {
          const computeFromDb = async (): Promise<number | null> => {
            // Get unique grades by question_id to avoid duplicates
            const { data: rows, error: rowsErr } = await supabase
              .from("mus240_submission_grades")
              .select("ai_score, rubric_breakdown, question_id")
              .eq("submission_id", submissionId)
              .order("created_at", { ascending: false });
            
            if (rowsErr) {
              console.warn("[grade-midterm-ai-async] DB select error:", rowsErr);
              return null;
            }
            if (!rows || rows.length === 0) return null;

            // Get unique questions to avoid duplicate scoring
            const uniqueQuestions = new Map();
            for (const row of rows) {
              if (!uniqueQuestions.has(row.question_id)) {
                uniqueQuestions.set(row.question_id, row);
              }
            }

            const uniqueRows = Array.from(uniqueQuestions.values());
            console.log(`[grade-midterm-ai-async] Found ${rows.length} total grades, ${uniqueRows.length} unique questions`);

            let achieved = 0;
            let possible = 0;
            for (const r of uniqueRows as any[]) {
              const score = typeof r.ai_score === "number" ? r.ai_score : Number(r.ai_score) || 0;
              achieved += score;

              // Try to infer total points from rubric_breakdown if available
              let maxFromRubric = 0;
              let rb: any = r.rubric_breakdown;
              // Some rows store rubric_breakdown as TEXT; parse when needed
              if (rb && typeof rb === "string") {
                try { rb = JSON.parse(rb); } catch { rb = null; }
              }
              if (rb && typeof rb === "object") {
                const values = Object.values(rb) as any[];
                maxFromRubric = values.reduce((sum: number, crit: any) => {
                  const raw = typeof crit?.max_points === "number" ? crit.max_points : (typeof crit?.points === "number" ? crit.points : 0);
                  const mp = Number(raw) || 0;
                  return sum + mp;
                }, 0);
              }

              if (maxFromRubric > 0) {
                possible += maxFromRubric;
              } else {
                // Heuristic fallback when no rubric info
                possible += 10;
              }
            }

            console.log(`[grade-midterm-ai-async] Final calculation: ${achieved}/${possible} points`);
            // Return raw score instead of percentage (exam is out of 90 points)
            if (possible > 0) return Math.round(achieved);
            return null;
          };

          for (let attempt = 1; attempt <= 8 && finalGrade === null; attempt++) {
            finalGrade = await computeFromDb();
            if (finalGrade === null) {
              console.log(`[grade-midterm-ai-async] Attempt ${attempt}: grades not ready, retrying...`);
              await new Promise((r) => setTimeout(r, 1000));
            }
          }
        }

        // Update submission if we computed a grade or at least mark graded_at
        const { data: auth } = await supabase.auth.getUser();
        const graderId = auth?.user?.id ?? null;
        const updatePayload: Record<string, any> = {
          graded_at: new Date().toISOString(),
        };
        if (graderId) updatePayload["graded_by"] = graderId;
        if (finalGrade !== null) updatePayload["grade"] = finalGrade;

        const { error: updateErr } = await supabase
          .from("mus240_midterm_submissions")
          .update(updatePayload)
          .eq("id", submissionId);
        if (updateErr) {
          console.error("[grade-midterm-ai-async] Failed to update submission with final grade:", updateErr);
        } else {
          console.log("[grade-midterm-ai-async] Submission updated with grade:", finalGrade);
        }
      } catch (err) {
        console.error("[grade-midterm-ai-async] Relay failed:", err);
      }
    })();

    return acceptedResponse;
  } catch (error) {
    console.error("[grade-midterm-ai-async] Error:", error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
