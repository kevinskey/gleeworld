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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('Testing OpenAI API...');
    console.log('API Key present:', !!openAIApiKey);
    console.log('API Key length:', openAIApiKey?.length || 0);
    console.log('API Key starts with sk-:', openAIApiKey?.startsWith('sk-') || false);

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }

    // Test with a simple request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: 'Say hello' }
        ],
        max_tokens: 10
      }),
    });

    console.log('OpenAI Response Status:', response.status);
    console.log('OpenAI Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Error Response:', errorText);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'OpenAI API Error',
        status: response.status,
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log('OpenAI Success Response:', result);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'OpenAI API is working',
      response: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test function error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});