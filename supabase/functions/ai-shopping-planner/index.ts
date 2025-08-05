import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('AI Shopping Planner function called - method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing POST request');
    
    const body = await req.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));
    
    const { title, budget, timeframe, purpose, action, plan } = body;

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        items: [],
        suggestions: ["Please configure OpenAI API key"],
        totalEstimated: 0
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('OpenAI API key found, proceeding...');

    if (action === 'generate_plan') {
      console.log('Generating new plan for:', title);
      
      const prompt = `Create a simple shopping plan for: ${title} with budget $${budget} for ${purpose}. 
      Return only valid JSON with this exact structure:
      {
        "items": [
          {
            "id": "1",
            "name": "example item",
            "estimatedPrice": 50,
            "priority": "high",
            "category": "Essential",
            "notes": "example note"
          }
        ],
        "suggestions": ["Save money by comparing prices"],
        "totalEstimated": 50
      }`;

      console.log('Making OpenAI API request...');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a financial planning assistant. Always return valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      console.log('OpenAI response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('OpenAI response received successfully');
      
      const aiResponse = data.choices[0].message.content;
      console.log('AI response content:', aiResponse);

      // Parse JSON response
      let parsedResponse;
      try {
        // Try to extract JSON from the response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
        parsedResponse = JSON.parse(jsonString);
        console.log('Successfully parsed AI response');
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        // Fallback response
        parsedResponse = {
          items: [
            {
              id: "1",
              name: "Basic Item",
              estimatedPrice: Math.min(Number(budget) * 0.8, 100),
              priority: "high",
              category: "Essential",
              notes: "AI parsing failed - manual item"
            }
          ],
          suggestions: [
            "Compare prices across different vendors",
            "Look for bulk discounts",
            "Check for seasonal sales"
          ],
          totalEstimated: Math.min(Number(budget) * 0.8, 100)
        };
      }

      // Ensure response has correct structure
      if (!parsedResponse.items) parsedResponse.items = [];
      if (!parsedResponse.suggestions) parsedResponse.suggestions = [];
      if (!parsedResponse.totalEstimated) {
        parsedResponse.totalEstimated = parsedResponse.items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
      }

      // Add IDs if missing
      parsedResponse.items = parsedResponse.items.map((item, index) => ({
        ...item,
        id: item.id || `item_${Date.now()}_${index}`
      }));

      console.log('Returning successful response');
      return new Response(JSON.stringify(parsedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'optimize_plan') {
      console.log('Optimizing existing plan');
      
      // For now, return the existing plan with some modifications
      const optimizedResponse = {
        items: plan?.items || [],
        suggestions: [
          "Consider removing low-priority items to stay within budget",
          "Look for alternative brands or suppliers",
          "Check if any items can be borrowed or rented instead"
        ],
        totalEstimated: plan?.totalEstimated || 0
      };

      return new Response(JSON.stringify(optimizedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Invalid action
    throw new Error(`Invalid action: ${action}`);

  } catch (error) {
    console.error('Error in ai-shopping-planner function:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred',
      items: [],
      suggestions: ["Sorry, I couldn't generate suggestions at this time. Please try again."],
      totalEstimated: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});