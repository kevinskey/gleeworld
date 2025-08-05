import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Shopping planner function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const testResponse = {
      items: [
        {
          id: "test1",
          name: "Test Shopping Item",
          estimatedPrice: 50,
          priority: "high",
          category: "Test Category",
          notes: "This is a test response"
        }
      ],
      suggestions: [
        "Function is working correctly",
        "This is a test response from the shopping planner"
      ],
      totalEstimated: 50
    };

    return new Response(JSON.stringify(testResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      items: [],
      suggestions: ["Function error occurred"],
      totalEstimated: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});