import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EvaluateRequest {
  text: string;
  prompt?: string;
  rubric?: string;
  maxPoints?: number;
}

interface EvaluationResult {
  score: number;
  feedback: string;
  letterGrade: string;
  breakdown: {
    contentQuality: number;
    organizationStructure: number;
    grammarMechanics: number;
    criticalThinking: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: EvaluateRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { text, prompt, rubric, maxPoints = 100 } = body;

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text content is required for evaluation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build evaluation prompt
    const evaluationPrompt = `You are an expert writing instructor. Please evaluate the following piece of writing and provide detailed feedback.

Assignment Prompt: ${prompt || 'General writing evaluation'}

Rubric: ${rubric || 'Standard academic writing rubric focusing on content quality, organization/structure, grammar/mechanics, and critical thinking'}

Maximum Points: ${maxPoints}

TEXT TO EVALUATE:
"""
${text}
"""

Please provide your evaluation in the following JSON format:
{
  "score": <numeric score out of ${maxPoints}>,
  "letterGrade": "<letter grade A-F>",
  "feedback": "<detailed constructive feedback paragraph>",
  "breakdown": {
    "contentQuality": <score out of 25>,
    "organizationStructure": <score out of 25>,
    "grammarMechanics": <score out of 25>,
    "criticalThinking": <score out of 25>
  }
}

Focus on providing constructive, actionable feedback that helps the student improve their writing. Be specific about strengths and areas for improvement.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are an expert writing instructor who provides detailed, constructive feedback on student writing. Always respond with valid JSON in the exact format requested."
          },
          {
            role: "user",
            content: evaluationPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "Unknown error");
      return new Response(JSON.stringify({ error: "OpenAI API error", details }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await response.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";

    let evaluation: EvaluationResult;
    try {
      evaluation = JSON.parse(raw);
    } catch {
      // Fallback evaluation
      evaluation = {
        score: Math.floor(maxPoints * 0.75),
        letterGrade: 'B',
        feedback: 'Unable to provide detailed feedback due to parsing error. Please try again.',
        breakdown: {
          contentQuality: Math.floor(maxPoints * 0.25 * 0.75),
          organizationStructure: Math.floor(maxPoints * 0.25 * 0.75),
          grammarMechanics: Math.floor(maxPoints * 0.25 * 0.75),
          criticalThinking: Math.floor(maxPoints * 0.25 * 0.75)
        }
      };
    }

    // Ensure scores are within valid ranges
    evaluation.score = Math.min(Math.max(evaluation.score, 0), maxPoints);
    
    return new Response(JSON.stringify({
      success: true,
      evaluation
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: String(err?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});