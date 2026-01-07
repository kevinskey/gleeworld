import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const {
      courseTitle,
      courseCode,
      credits,
      term,
      numWeeks,
      purpose,
      textbooks,
      learningObjectives,
      gradingRequirements,
      additionalContext
    } = body;

    console.log(`Generating ${numWeeks}-week outline for ${courseCode}`);

    const textbookList = (textbooks || []).map((t: any) => `"${t.title}" by ${t.author}`).join(", ");
    const objectivesList = (learningObjectives || []).map((o: string, i: number) => `${i + 1}. ${o}`).join("\n");
    const gradingList = (gradingRequirements || []).map((r: any) => `${r.requirement}: ${r.weight}%`).join(", ");

    const systemPrompt = `You are an expert curriculum designer for college music courses. Generate a ${numWeeks}-week course outline. Return JSON using the generate_course_outline function.`;

    const userPrompt = `Create a ${numWeeks}-week outline for:
Course: ${courseCode} - ${courseTitle}
Credits: ${credits}, Term: ${term}
Purpose: ${purpose || "N/A"}
Textbooks: ${textbookList || "N/A"}
Objectives: ${objectivesList || "N/A"}
Grading: ${gradingList || "N/A"}
${additionalContext ? `Notes: ${additionalContext}` : ""}

For each week include readings, topics, and assignments. Progress logically through the semester.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_course_outline",
            description: "Generate weekly course outline",
            parameters: {
              type: "object",
              properties: {
                weeks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      week: { type: "string" },
                      topics: { type: "string" }
                    },
                    required: ["week", "topics"]
                  }
                }
              },
              required: ["weeks"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_course_outline" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error("AI error:", status);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI error: ${status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error("No tool call in response");
      throw new Error("AI did not return structured output");
    }

    const outlineData = JSON.parse(toolCall.function.arguments);
    console.log(`Generated ${outlineData.weeks?.length || 0} weeks`);

    return new Response(
      JSON.stringify({ success: true, schedule: outlineData.weeks || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate outline" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
