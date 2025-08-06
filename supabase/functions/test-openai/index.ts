import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('=== TEST FUNCTION DEBUG ===');
    console.log('OpenAI API Key exists:', !!openAIApiKey);
    console.log('OpenAI API Key length:', openAIApiKey?.length || 0);
    console.log('OpenAI API Key first 10 chars:', openAIApiKey?.substring(0, 10) || 'undefined');
    
    if (!openAIApiKey) {
      console.log('ERROR: OpenAI API key not found in environment');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        debug: {
          hasKey: false,
          keyLength: 0
        }
      }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    // Simple test request to OpenAI
    console.log('Making test request to OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Say "Hello World" in MusicXML format' }
        ],
        max_tokens: 100,
      }),
    });

    console.log('OpenAI response status:', response.status);
    console.log('OpenAI response ok:', response.ok);

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return new Response(JSON.stringify({ 
        error: 'OpenAI API failed',
        status: response.status,
        details: error
      }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    const data = await response.json();
    console.log('OpenAI response successful, content length:', data.choices[0].message.content.length);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'OpenAI API test successful',
      debug: {
        hasKey: true,
        keyLength: openAIApiKey.length,
        responseLength: data.choices[0].message.content.length
      }
    }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in test function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
});