import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting basic test...');
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('API Key exists:', !!openAIApiKey);
    console.log('API Key length:', openAIApiKey?.length || 0);

    if (!openAIApiKey) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'No OpenAI API key found'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey.startsWith('sk-')) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid OpenAI API key format - should start with sk-'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Making basic fetch request...');
    
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', errorText);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: `OpenAI API Error: ${response.status}`,
        details: errorText
      }), {
        status: 200, // Return 200 so we can see the actual error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const models = await response.json();
    console.log('Models retrieved successfully');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'OpenAI API is working!',
      modelCount: models.data?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 200, // Return 200 so we can see the actual error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});