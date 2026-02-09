import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { courseId } = await req.json();
    if (!courseId) {
      return new Response(JSON.stringify({ error: "courseId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all discussion prompts for this course
    const { data: prompts, error: promptsError } = await supabase
      .from("discussion_prompts")
      .select("id, title")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });

    if (promptsError) throw promptsError;
    if (!prompts || prompts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No discussions found for this course" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const discussionIds = prompts.map((p: any) => p.id);

    // Fetch all replies for these discussions with student info
    const { data: replies, error: repliesError } = await supabase
      .from("discussion_replies")
      .select("id, content, created_by, discussion_id, created_at")
      .in("discussion_id", discussionIds)
      .order("created_at", { ascending: true });

    if (repliesError) throw repliesError;
    if (!replies || replies.length === 0) {
      return new Response(
        JSON.stringify({ error: "No discussion submissions found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get student profiles
    const studentIds = [...new Set(replies.map((r: any) => r.created_by).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("gw_profiles")
      .select("user_id, full_name")
      .in("user_id", studentIds);

    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => {
      profileMap[p.user_id] = p.full_name || "Unknown Student";
    });

    // Build discussion title map
    const titleMap: Record<string, string> = {};
    prompts.forEach((p: any) => {
      titleMap[p.id] = p.title;
    });

    // Prepare data for AI - group by student
    const studentPosts: Record<string, { name: string; posts: { discussion: string; content: string }[] }> = {};
    replies.forEach((r: any) => {
      const uid = r.created_by;
      if (!uid) return;
      if (!studentPosts[uid]) {
        studentPosts[uid] = { name: profileMap[uid] || "Unknown", posts: [] };
      }
      // Truncate long posts to save tokens
      const content = (r.content || "").slice(0, 500);
      studentPosts[uid].posts.push({
        discussion: titleMap[r.discussion_id] || "Discussion",
        content,
      });
    });

    // Build the prompt
    const studentSummaries = Object.entries(studentPosts)
      .map(([uid, data]) => {
        const postsList = data.posts
          .map((p) => `  - [${p.discussion}]: "${p.content}"`)
          .join("\n");
        return `Student: ${data.name}\n${postsList}`;
      })
      .join("\n\n");

    const systemPrompt = `You are an educational analyst for a college-level music history course (MUS 240 - Survey of African American Music). Analyze student discussion submissions to assess temperament, engagement, and sentiment.

Return a JSON object with this exact structure:
{
  "classSummary": {
    "overallMood": "one of: Enthusiastic, Engaged, Neutral, Disengaged, Mixed",
    "engagementLevel": "one of: High, Moderate, Low",
    "keyThemes": ["theme1", "theme2", "theme3"],
    "concerns": "brief note on any concerning patterns or empty string",
    "highlights": "brief note on positive standouts"
  },
  "students": [
    {
      "name": "Student Name",
      "sentiment": "one of: Positive, Neutral, Cautious, Negative, Passionate",
      "engagement": "one of: High, Moderate, Low",
      "tone": "2-3 word description like 'Thoughtful and curious'",
      "summary": "1-2 sentence summary of their discussion temperament",
      "postCount": number
    }
  ]
}

Be constructive and professional. Focus on academic engagement patterns.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Analyze the temperament and engagement of these ${Object.keys(studentPosts).length} students across ${prompts.length} discussions:\n\n${studentSummaries}`,
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from the response (strip markdown fences if present)
    let analysis;
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI analysis", raw: rawContent }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        analysis,
        metadata: {
          totalStudents: Object.keys(studentPosts).length,
          totalDiscussions: prompts.length,
          totalReplies: replies.length,
          analyzedAt: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
