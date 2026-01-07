import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CourseOutlineRequest {
  courseTitle: string;
  courseCode: string;
  credits: number;
  term: string;
  numWeeks: number;
  purpose: string;
  textbooks: { title: string; author: string }[];
  learningObjectives: string[];
  gradingRequirements: { requirement: string; weight: number }[];
  additionalContext?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: CourseOutlineRequest = await req.json();
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
    } = requestData;

    console.log(`Generating course outline for ${courseCode}: ${courseTitle}`);

    const systemPrompt = `You are an expert curriculum designer for college music courses at Spelman College. Your task is to generate a comprehensive weekly course outline that aligns with the course objectives and grading structure.

You must return your response using the generate_course_outline function with a structured array of weekly schedules.

Guidelines:
- Create a logical progression of topics across the semester
- Include specific readings, in-class activities, and assignments due
- Align assignments with the grading requirements provided
- Build complexity gradually - fundamentals first, then advanced topics
- Include exam/midterm weeks appropriately
- Reference the textbooks provided for readings
- Consider the number of credits (${credits}) when determining workload
- For music courses, include practical exercises, listening assignments, and performance elements
- Include specific page numbers or chapters from textbooks when possible
- For choral/conducting courses, progress through historical periods (Renaissance → Baroque → Classical → Romantic → 20th Century → Contemporary)`;

    const userPrompt = `Generate a ${numWeeks}-week course outline for:

**Course:** ${courseCode} - ${courseTitle}
**Term:** ${term}
**Credits:** ${credits}

**Purpose:** ${purpose}

**Required Textbooks:**
${textbooks.map(t => `- "${t.title}" by ${t.author}`).join('\n')}

**Learning Objectives:**
${learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**Grading Requirements:**
${gradingRequirements.map(r => `- ${r.requirement}: ${r.weight}%`).join('\n')}

${additionalContext ? `**Additional Context:** ${additionalContext}` : ''}

For each week, provide:
1. The week label (e.g., "Week 1", "Midterm Week", "Finals Week")
2. Comprehensive topics including:
   - Required readings (with chapter/page numbers if applicable)
   - In-class topics and activities
   - Assignments due that week
   - Any exams or presentations

Format the topics as a detailed paragraph or bullet list that instructors can use directly in their syllabus.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "generate_course_outline",
              description: "Generate a structured weekly course outline",
              parameters: {
                type: "object",
                properties: {
                  weeks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        week: {
                          type: "string",
                          description: "Week label (e.g., 'Week 1', 'Midterm Week', 'Finals Week')"
                        },
                        topics: {
                          type: "string",
                          description: "Detailed topics including readings, activities, and assignments"
                        }
                      },
                      required: ["week", "topics"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["weeks"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_course_outline" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    console.log("AI response received:", JSON.stringify(result).slice(0, 500));

    // Extract the tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_course_outline") {
      console.error("Unexpected response format:", result);
      throw new Error("AI did not return expected structured output");
    }

    const outlineData = JSON.parse(toolCall.function.arguments);
    console.log(`Generated ${outlineData.weeks?.length || 0} weeks`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        schedule: outlineData.weeks || [] 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-course-outline error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate course outline" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
