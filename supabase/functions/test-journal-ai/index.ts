import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== FUNCTION STARTING ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('Returning CORS response');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CHECKING ENVIRONMENT ===');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OpenAI key exists:', !!openAIKey);
    console.log('OpenAI key starts with:', openAIKey ? openAIKey.substring(0, 3) : 'NONE');
    
    console.log('=== PARSING REQUEST ===');
    const body = await req.json();
    console.log('Request body keys:', Object.keys(body));
    
    console.log('=== SIMPLE RESPONSE ===');
    return new Response(JSON.stringify({
      success: true,
      message: 'Function is working!',
      receivedData: {
        journalId: body.journalId,
        hasContent: !!body.journalContent,
        assignmentId: body.assignmentId
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('=== ERROR ===', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});