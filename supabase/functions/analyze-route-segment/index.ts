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

    const { segments, groupSize = 46 } = await req.json();

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'segments array is required. Each segment: { from, to, cityId }' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const segmentDescriptions = segments.map((s: any, i: number) =>
      `Leg ${i + 1}: ${s.from} → ${s.to}`
    ).join('\n');

    const prompt = `You are a charter bus logistics expert for a college choir group of ${groupSize} people traveling by charter bus in the United States.

Analyze these route segments:
${segmentDescriptions}

For EACH leg, provide:
1. Driving distance in miles (be accurate based on real highway routes)
2. Estimated drive time in hours (account for speed limits, typical highway speeds for a charter bus ~55-60mph)
3. Best highway route description (e.g. "I-85 S to I-20 W")
4. Estimated toll costs for a charter bus (many states have higher toll rates for buses/multi-axle vehicles). If no tolls, say $0.
5. Charter bus parking options at the destination city — name specific locations if possible (convention centers, large church lots, shopping centers with bus parking, designated bus parking areas)
6. DOT/FMCSA compliance notes:
   - Does this leg exceed the 10-hour driving limit?
   - Will a mandatory 30-minute break be needed (after 8 hours)?
   - Any split-driving-day recommendations?
7. Fuel estimate (charter bus averages 6 MPG, diesel ~$3.80/gal)
8. Any route warnings (construction zones, mountain passes, weather-sensitive routes, time-of-day recommendations)

Also provide:
- Total trip distance (all legs combined)
- Total estimated drive time
- Total estimated toll costs
- Overall DOT compliance assessment
- Recommended number of drivers needed`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are an expert charter bus logistics planner specializing in DOT/FMCSA compliance and route optimization for large groups.' },
          { role: 'user', content: prompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_route_segments',
            description: 'Return comprehensive route analysis for charter bus tour segments',
            parameters: {
              type: 'object',
              properties: {
                total_distance_miles: { type: 'number', description: 'Total trip distance in miles' },
                total_drive_hours: { type: 'number', description: 'Total driving time in hours' },
                total_toll_estimate: { type: 'number', description: 'Total toll costs in USD' },
                total_fuel_estimate: { type: 'number', description: 'Total fuel costs in USD' },
                recommended_drivers: { type: 'number', description: 'Recommended number of drivers for DOT compliance' },
                overall_dot_assessment: { type: 'string', description: 'Overall DOT compliance assessment summary' },
                segments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      from: { type: 'string' },
                      to: { type: 'string' },
                      distance_miles: { type: 'number' },
                      drive_hours: { type: 'number' },
                      suggested_route: { type: 'string', description: 'e.g. I-85 S to I-20 W' },
                      toll_estimate: { type: 'number', description: 'Toll cost in USD for this leg' },
                      toll_details: { type: 'string', description: 'Toll road names and costs' },
                      parking_options: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            type: { type: 'string', description: 'e.g. Convention Center, Church Lot, Designated Bus Parking' },
                            notes: { type: 'string' },
                          },
                          required: ['name', 'type', 'notes'],
                          additionalProperties: false,
                        },
                      },
                      dot_compliant: { type: 'boolean', description: 'Whether this leg is within DOT limits' },
                      dot_warnings: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      fuel_estimate: { type: 'number', description: 'Fuel cost in USD for this leg' },
                      route_warnings: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                    required: ['from', 'to', 'distance_miles', 'drive_hours', 'suggested_route', 'toll_estimate', 'parking_options', 'dot_compliant', 'dot_warnings', 'fuel_estimate'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['total_distance_miles', 'total_drive_hours', 'total_toll_estimate', 'total_fuel_estimate', 'recommended_drivers', 'overall_dot_assessment', 'segments'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_route_segments' } },
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

    // Fallback
    const content = data.choices?.[0]?.message?.content || 'No analysis available.';
    return new Response(JSON.stringify({ content, segments: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-route-segment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
