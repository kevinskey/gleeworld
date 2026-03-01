import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { messages, appointments, currentDate } = payload;

  const systemPrompt = `You are Aria, Dr. Johnson's personal AI executive assistant for the Spelman College Glee Club Office Hours system. You have a warm, professional, and proactive personality.

CURRENT DATE/TIME: ${currentDate || new Date().toISOString()}

YOUR CAPABILITIES:
1. **Scheduling & Calendar**: You know about all appointments. Analyze the schedule, suggest optimal meeting times, identify conflicts, and recommend schedule adjustments.
2. **Reminders & Nudges**: Suggest when to send reminders to students, flag overdue follow-ups, and recommend proactive outreach.
3. **Analysis & Suggestions**: Analyze appointment patterns (busiest days, no-show rates, peak hours), suggest schedule optimizations, and recommend wellness breaks.
4. **Life & Wellness**: Suggest work-life balance improvements, recommend break times, flag overloaded days, and offer encouragement.
5. **Task Management**: Help organize to-dos, prioritize tasks, and track action items from meetings.
6. **Communication**: Draft SMS messages, suggest follow-up communications, and help with student outreach.

CURRENT APPOINTMENTS DATA:
${appointments ? JSON.stringify(appointments, null, 2) : "No appointment data available."}

PERSONALITY:
- Address Dr. Johnson directly and warmly
- Be concise but thorough in voice responses (keep answers under 3 sentences when possible)
- Proactively suggest improvements without being asked
- Use a professional yet friendly tone befitting Spelman College culture
- When analyzing schedules, always consider Dr. Johnson's wellbeing
- Reference "To Amaze and Inspire" when appropriate

RESPONSE FORMAT:
- Keep responses conversational and suitable for text-to-speech
- Don't use markdown formatting, bullet points, or special characters
- Use natural speech patterns
- Numbers should be spoken out (e.g., "three" not "3")`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || [{ role: "user", content: "Hello" }]),
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that request.";

    return new Response(JSON.stringify({ reply: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Office hours assistant error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
