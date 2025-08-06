import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    console.log("=== TEST FUNCTION DEBUG ===");
    console.log("OpenAI API Key exists:", !!openaiKey);
    console.log("OpenAI API Key length:", openaiKey?.length || 0);
    
    if (!openaiKey) {
      return new Response(JSON.stringify({ 
        error: "OpenAI API key not configured",
        debug: { hasKey: false }
      }), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: "Say 'Hello World' in a simple MusicXML format" }
        ],
        max_tokens: 100,
      }),
    });

    const result = await openaiRes.json();
    
    console.log("OpenAI response status:", openaiRes.status);
    console.log("OpenAI response ok:", openaiRes.ok);

    if (!openaiRes.ok) {
      return new Response(JSON.stringify({ 
        error: "OpenAI API failed",
        details: result 
      }), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "OpenAI API test successful",
      result: result 
    }), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Error in test function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
});