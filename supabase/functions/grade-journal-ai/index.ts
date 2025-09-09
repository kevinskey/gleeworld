import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== FUNCTION STARTING ===');
  console.log('Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Returning CORS response');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== PROCESSING REQUEST ===');
    
    // Check environment variables first
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      hasOpenAI: !!openAIKey,
      hasSupabase: !!supabaseUrl,
      hasServiceKey: !!supabaseKey,
      openAIStart: openAIKey ? openAIKey.substring(0, 8) + '...' : 'MISSING'
    });
    
    if (!openAIKey) {
      throw new Error('OpenAI API key not found in environment');
    }
    
    const body = await req.json();
    console.log('Request body received:', Object.keys(body));
    
    // Test OpenAI connection with minimal request
    console.log('Testing OpenAI connection...');
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
      },
    });
    
    console.log('OpenAI models response status:', testResponse.status);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('OpenAI connection failed:', errorText);
      throw new Error(`OpenAI connection failed: ${testResponse.status}`);
    }
    
    console.log('OpenAI connection successful!');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Function working, OpenAI connected',
      environmentCheck: {
        hasOpenAI: !!openAIKey,
        hasSupabase: !!supabaseUrl,
        hasServiceKey: !!supabaseKey
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('=== ERROR ===', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});