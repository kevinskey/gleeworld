import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { originCity, destinationCity, groupSize = 46 } = await req.json();

    if (!originCity || !destinationCity) {
      return new Response(
        JSON.stringify({ error: 'originCity and destinationCity are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are a tour logistics planner for a college choir group of ${groupSize} people traveling by charter bus.

The group is traveling from ${originCity} to ${destinationCity}.

Suggest 2-3 lunch stop options along this route. For each suggestion, provide:
1. Restaurant name (real, well-known chain or large restaurant that can seat ${groupSize}+ people)
2. City/town it's located in
3. Approximate distance from origin (in miles)
4. Approximate drive time from origin
5. Why it's a good stop (capacity, group-friendly, parking for charter bus, etc.)
6. Estimated per-person cost range
7. Cuisine type

Focus on restaurants that:
- Can accommodate a group of ${groupSize} without a reservation or with short notice
- Have bus/large vehicle parking nearby
- Are located roughly at the midpoint or logical stopping points along the route
- Are reasonably priced for a group meal

Also provide:
- Total estimated driving distance between the two cities (miles)
- Total estimated driving time (hours)`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a helpful tour logistics assistant. Always respond with practical, actionable suggestions.' },
          { role: 'user', content: prompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_lunch_stops',
            description: 'Return lunch stop suggestions for a bus tour group',
            parameters: {
              type: 'object',
              properties: {
                total_distance_miles: { type: 'number', description: 'Total driving distance in miles' },
                total_drive_hours: { type: 'number', description: 'Total driving time in hours' },
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Restaurant name' },
                      city: { type: 'string', description: 'City/town location' },
                      distance_from_origin_miles: { type: 'number' },
                      drive_time_from_origin: { type: 'string', description: 'e.g. 2h 30m' },
                      reason: { type: 'string', description: 'Why this is a good stop' },
                      cost_per_person: { type: 'string', description: 'e.g. $10-15' },
                      cuisine: { type: 'string' },
                    },
                    required: ['name', 'city', 'distance_from_origin_miles', 'drive_time_from_origin', 'reason', 'cost_per_person', 'cuisine'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['total_distance_miles', 'total_drive_hours', 'suggestions'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_lunch_stops' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback: return the text content
    const content = data.choices?.[0]?.message?.content || 'No suggestions available.';
    return new Response(JSON.stringify({ content, suggestions: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-lunch-stops:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
