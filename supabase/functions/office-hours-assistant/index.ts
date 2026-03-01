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

  const systemPrompt = `You are Aria, Dr. Johnson's personal AI executive assistant for the Spelman College Glee Club Office Hours system.

CURRENT DATE/TIME: ${currentDate || new Date().toISOString()}

YOUR CAPABILITIES:
1. Scheduling & Calendar: Analyze appointments, suggest optimal meeting times, identify conflicts.
2. Reminders & Nudges: Flag overdue follow-ups, recommend proactive outreach.
3. Analysis: Appointment patterns, busiest days, no-show rates, schedule optimizations.
4. Wellness: Suggest breaks, flag overloaded days.
5. Task Management: Organize to-dos, prioritize tasks, track action items.
6. Communication: Draft SMS messages, suggest follow-ups.

CURRENT APPOINTMENTS DATA:
${appointments ? JSON.stringify(appointments, null, 2) : "No appointment data available."}

STYLE RULES (CRITICAL):
- NEVER start with greetings like "Hello", "Hi", "Good morning", "Hey there", "How can I help", "Great question", etc.
- Jump straight to the answer. Be direct but pleasant.
- Keep responses to 1-2 sentences max unless asked to elaborate.
- Sound like a trusted colleague giving a quick answer, not a customer service rep.
- Only mention "To Amaze and Inspire" when truly relevant.

RESPONSE FORMAT:
- Conversational and suitable for text-to-speech
- No markdown formatting, bullet points, or special characters
- Natural speech patterns
- Numbers spoken out (e.g., "three" not "3")`;

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
