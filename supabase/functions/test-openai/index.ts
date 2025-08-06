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
    const { prompt } = await req.json();
    console.log('Received prompt:', prompt);
    
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('API key exists:', !!apiKey);

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: "OpenAI API key not configured" 
      }), {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: prompt || "Say 'Hello World'" }
        ],
        max_tokens: 50,
      }),
    });

    const data = await openaiRes.json();
    console.log('OpenAI response status:', openaiRes.status);
    console.log('OpenAI response:', data);

    if (!openaiRes.ok) {
      return new Response(JSON.stringify({ 
        error: data.error?.message || "OpenAI request failed",
        details: data 
      }), {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: data.choices[0].message.content,
      data: data 
    }), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });

  } catch (err) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ 
      error: err.message 
    }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
});