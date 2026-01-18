import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { readings, season, sundayTitle } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating music suggestions for:", { season, sundayTitle });

    // Build context from readings
    let readingsContext = "";
    if (readings) {
      if (readings.first_reading) {
        readingsContext += `First Reading (${readings.first_reading.citation}): ${readings.first_reading.content?.substring(0, 500) || readings.first_reading.title}\n\n`;
      }
      if (readings.responsorial_psalm) {
        readingsContext += `Responsorial Psalm: ${readings.responsorial_psalm.citation} - "${readings.responsorial_psalm.response || readings.responsorial_psalm.title}"\n\n`;
      }
      if (readings.second_reading) {
        readingsContext += `Second Reading (${readings.second_reading.citation}): ${readings.second_reading.content?.substring(0, 500) || readings.second_reading.title}\n\n`;
      }
      if (readings.gospel) {
        readingsContext += `Gospel (${readings.gospel.citation}): ${readings.gospel.content?.substring(0, 500) || readings.gospel.title}\n\n`;
      }
    }

    const systemPrompt = `You are a Catholic liturgical music director with deep knowledge of:
- Traditional Catholic hymns from hymnals like Gather, Breaking Bread, OCP, GIA
- Contemporary Catholic worship music
- The Proper of the Mass and its liturgical moments
- How to match music themes to Scripture readings

When suggesting music, provide:
1. Specific hymn/song titles that exist in common Catholic hymnals
2. The hymnal and number if known (e.g., "BB #123" for Breaking Bread, "G3 #456" for Gather Third Edition)
3. Brief reason why it fits the readings

Focus on songs that match the themes, imagery, and message of the readings.`;

    const userPrompt = `For ${sundayTitle} (${season}), suggest appropriate Catholic hymns for each part of the Mass.

READINGS FOR THIS SUNDAY:
${readingsContext || "No specific readings provided - suggest based on the liturgical season and Sunday title."}

Please suggest hymns for these liturgical moments:
1. Entrance Hymn
2. Responsorial Psalm (or a sung setting)
3. Gospel Acclamation
4. Offertory
5. Communion
6. Recessional

For each suggestion, provide:
- Song title
- Hymnal reference if known (e.g., "G3 #456", "BB #123", "JS #789")
- One sentence explaining why it fits

Format your response as a clear list.`;

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
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_music",
              description: "Return music suggestions for each liturgical moment",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        moment: { 
                          type: "string", 
                          description: "The liturgical moment (e.g., Entrance Hymn, Offertory)" 
                        },
                        title: { 
                          type: "string", 
                          description: "The song/hymn title" 
                        },
                        hymn_number: { 
                          type: "string", 
                          description: "Hymnal reference like 'G3 #456' or 'BB #123'" 
                        },
                        reason: { 
                          type: "string", 
                          description: "Brief explanation of why this song fits" 
                        }
                      },
                      required: ["moment", "title", "reason"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["suggestions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_music" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ 
        success: true, 
        suggestions: parsed.suggestions 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback to content if no tool call
    const content = data.choices?.[0]?.message?.content;
    return new Response(JSON.stringify({ 
      success: true, 
      rawSuggestions: content 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in suggest-liturgical-music:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to generate suggestions" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
