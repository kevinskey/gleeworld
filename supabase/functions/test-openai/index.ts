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
    
    // Log all available environment variables (without values for security)
    const envKeys = Object.keys(Deno.env.toObject());
    console.log('Available environment variables:', envKeys);
    console.log('Total env vars count:', envKeys.length);
    
    // Check specifically for OpenAI key variations
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const openaiKey = Deno.env.get('OPENAI_KEY'); // Alternative name
    const openaiApiKey2 = Deno.env.get('OPENAI_API_KEY_SECRET'); // Another alternative
    
    console.log('OPENAI_API_KEY exists:', !!openAIApiKey);
    console.log('OPENAI_KEY exists:', !!openaiKey);
    console.log('OPENAI_API_KEY_SECRET exists:', !!openaiApiKey2);
    console.log('OPENAI_API_KEY length:', openAIApiKey?.length || 0);
    
    // Check if we have any OpenAI-related env vars
    const openaiEnvVars = envKeys.filter(key => 
      key.toLowerCase().includes('openai') || 
      key.toLowerCase().includes('gpt') ||
      key.toLowerCase().includes('api_key')
    );
    console.log('OpenAI-related env vars:', openaiEnvVars);

    if (!openAIApiKey && !openaiKey && !openaiApiKey2) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'No OpenAI API key found in environment',
        debug: {
          totalEnvVars: envKeys.length,
          openaiRelatedVars: openaiEnvVars,
          checkedVariables: ['OPENAI_API_KEY', 'OPENAI_KEY', 'OPENAI_API_KEY_SECRET']
        }
      }), {
        status: 200, // Return 200 so we can see the debug info
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Use whichever key we found
    const finalApiKey = openAIApiKey || openaiKey || openaiApiKey2;

    if (!finalApiKey.startsWith('sk-')) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid OpenAI API key format - should start with sk-',
        debug: {
          keyLength: finalApiKey?.length || 0,
          keyPrefix: finalApiKey?.substring(0, 3) || 'none'
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Making API request with valid key...');
    console.log('Key format check passed');
    
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${finalApiKey}`,
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