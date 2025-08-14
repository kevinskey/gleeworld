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
    console.log('Starting comprehensive environment check...');
    
    // Get all environment variables
    const allEnvVars = Object.keys(Deno.env.toObject());
    console.log('Total env vars count:', allEnvVars.length);
    console.log('Available environment variables:', allEnvVars);
    console.log('OpenAI-related env vars:', allEnvVars.filter(key => key.includes('OPENAI') || key.includes('API_KEY')));
    
    // Check specific OpenAI key variations
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const openaiKey = Deno.env.get('OPENAI_KEY');
    const openaiApiKeySecret = Deno.env.get('OPENAI_API_KEY_SECRET');
    
    // Additional detailed logging
    console.log('OPENAI_API_KEY exists:', !!openAIApiKey);
    console.log('OPENAI_API_KEY length:', openAIApiKey?.length || 0);
    if (openAIApiKey) {
      console.log('OPENAI_API_KEY starts with sk-:', openAIApiKey.startsWith('sk-'));
      console.log('OPENAI_API_KEY first 10 chars:', openAIApiKey.substring(0, 10));
    }
    
    console.log('OPENAI_API_KEY exists:', !!openAIApiKey);
    console.log('OPENAI_API_KEY length:', openAIApiKey?.length || 0);
    console.log('OPENAI_KEY exists:', !!openaiKey);
    console.log('OPENAI_API_KEY_SECRET exists:', !!openaiApiKeySecret);

    return new Response(JSON.stringify({
      success: true,
      debug: {
        totalEnvVars: allEnvVars.length,
        openaiApiKeyExists: !!openAIApiKey,
        openaiApiKeyLength: openAIApiKey?.length || 0,
        openaiKeyExists: !!openaiKey,
        openaiApiKeySecretExists: !!openaiApiKeySecret,
        allEnvVars: allEnvVars,
        openaiRelatedVars: allEnvVars.filter(key => key.includes('OPENAI') || key.includes('API_KEY'))
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test-openai function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});