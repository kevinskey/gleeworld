import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('AI Shopping planner function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request received:', JSON.stringify(body));
    
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

    console.log('Making AI request for Amazon product search...');

    let prompt = '';
    
    if (action === 'generate_plan') {
      prompt = `You are an Amazon shopping expert. Create a realistic shopping plan with actual Amazon products for:

Title: ${title}
Budget: $${budget}
Timeframe: ${timeframe}
Purpose: ${purpose}

Search Amazon's catalog and recommend specific products with realistic prices. Include:
- Exact product names as they appear on Amazon
- Realistic current market prices
- Product categories and brands
- Priority levels based on necessity
- Money-saving tips and alternatives

Return ONLY valid JSON with this structure:
{
  "items": [
    {
      "id": "unique_id",
      "name": "Exact Amazon product name",
      "estimatedPrice": realistic_price_number,
      "priority": "high|medium|low",
      "category": "Amazon category",
      "notes": "Brand, model, or money-saving tip"
    }
  ],
  "suggestions": [
    "Amazon shopping tip 1",
    "Amazon shopping tip 2"
  ],
  "totalEstimated": total_amount_number
}

Focus on staying within budget with real Amazon products.`;

    } else if (action === 'optimize_plan') {
      prompt = `You are an Amazon shopping expert. Optimize this shopping plan to find better deals and alternatives on Amazon:

Current Plan:
Title: ${plan.title}
Budget: $${plan.budget}
Current Total: $${plan.totalEstimated}
Items: ${JSON.stringify(plan.items)}

Find better Amazon alternatives, remove unnecessary items, or suggest cheaper alternatives.
Stay within budget while maintaining quality.

Return ONLY valid JSON with the same structure as the generation request.`;
    }

    // Make OpenAI API call
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
            content: 'You are an expert Amazon shopping assistant with extensive knowledge of current Amazon products, prices, and deals. Always return valid JSON only with realistic Amazon product recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    console.log('OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('AI response received successfully');
    
    const aiResponse = data.choices[0].message.content;
    console.log('AI response content length:', aiResponse.length);

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
      // Fallback response with Amazon-style products
      parsedResponse = {
        items: [
          {
            id: "fallback1",
            name: "Amazon Basics Product",
            estimatedPrice: Math.min(Number(budget) * 0.6, 50),
            priority: "high",
            category: "Amazon Basics",
            notes: "AI parsing failed - showing fallback Amazon product"
          }
        ],
        suggestions: [
          "Check Amazon's daily deals for discounts",
          "Compare prices with Amazon warehouse deals",
          "Consider Amazon Prime for free shipping"
        ],
        totalEstimated: Math.min(Number(budget) * 0.6, 50)
      };
    }

    // Ensure response has correct structure
    if (!parsedResponse.items) parsedResponse.items = [];
    if (!parsedResponse.suggestions) parsedResponse.suggestions = [];
    if (!parsedResponse.totalEstimated) {
      parsedResponse.totalEstimated = parsedResponse.items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
    }

    // Add unique IDs if missing
    parsedResponse.items = parsedResponse.items.map((item, index) => ({
      ...item,
      id: item.id || `amazon_item_${Date.now()}_${index}`
    }));

    console.log('Returning Amazon product recommendations');
    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in shopping planner function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to search Amazon products',
      items: [],
      suggestions: ["Please try again - Amazon search temporarily unavailable"],
      totalEstimated: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});