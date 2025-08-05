import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Function called with method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Returning CORS response');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing request...');
    
    // Simple test response
    const testResponse = {
      items: [
        {
          id: "test1",
          name: "Test Item",
          estimatedPrice: 25,
          priority: "high",
          category: "Test",
          notes: "This is a test item"
        }
      ],
      suggestions: [
        "This is a test response",
        "The function is working correctly"
      ],
      totalEstimated: 25
    };

    console.log('Returning test response');
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