import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Shopping planner function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request received');
    
    const { title, budget, purpose, action, plan } = body;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ 
        error: 'AI service not configured',
        items: [],
        suggestions: ["AI service is not available"],
        totalEstimated: 0
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating shopping plan...');

    let prompt = '';
    
    if (action === 'generate_plan') {
      prompt = `You are a shopping expert. The user wants to buy these items:

${purpose}

Budget: $${budget}

Find products for each item they listed. For each item, recommend specific products with:
- Exact product names
- Realistic current market prices
- Specific brands and models
- Brief reason why it's recommended

Return ONLY valid JSON:
{
  "items": [
    {
      "id": "unique_id",
      "name": "Exact product name", 
      "estimatedPrice": realistic_price_number,
      "priority": "high|medium|low",
      "category": "Category",
      "notes": "Brand/model and why recommended",
      "amazonUrl": "https://amazon.com/s?k=encoded_product_name"
    }
  ],
  "suggestions": [
    "Shopping tip 1",
    "Shopping tip 2"
  ],
  "totalEstimated": total_number
}

Stay within budget. Focus on quality and value.`;

    } else if (action === 'optimize_plan') {
      prompt = `Find better deals for these items:

Current items: ${JSON.stringify(plan.items)}
Budget: $${plan.budget}

Find cheaper alternatives or better deals.

Return ONLY valid JSON with the same structure:
{
  "items": [
    {
      "id": "unique_id",
      "name": "Optimized product name", 
      "estimatedPrice": lower_price_number,
      "priority": "high|medium|low",
      "category": "Category",
      "notes": "Why this is a better deal",
      "amazonUrl": "https://amazon.com/s?k=encoded_product_name"
    }
  ],
  "suggestions": [
    "Cost-saving tip 1",
    "Cost-saving tip 2"
  ],
  "totalEstimated": total_number
}`;
    }

    // Make Lovable AI Gateway call
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert shopper with knowledge of current products and prices. Always return valid JSON with real product recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    console.log('AI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      // Handle rate limit errors
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          items: [],
          suggestions: ["Please wait a moment and try again"],
          totalEstimated: 0
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits exhausted. Please add funds.',
          items: [],
          suggestions: ["Please add AI credits to continue"],
          totalEstimated: 0
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    const aiResponse = data.choices[0].message.content;

    // Parse JSON response
    let parsedResponse;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      parsedResponse = JSON.parse(jsonString);
      console.log('Successfully parsed shopping plan');
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Create a simple fallback
      const items = (purpose || '').split('\n').filter(item => item.trim()).slice(0, 5);
      const pricePerItem = Math.floor(Number(budget) / Math.max(items.length, 1));
      
      parsedResponse = {
        items: items.map((item, index) => ({
          id: `item_${index + 1}`,
          name: `${item.trim()} - Recommended`,
          estimatedPrice: Math.min(pricePerItem, 100),
          priority: "medium",
          category: "General",
          notes: "Recommended product"
        })),
        suggestions: [
          "Check for daily deals and discounts",
          "Compare customer reviews before buying",
          "Consider bundle deals to save money"
        ],
        totalEstimated: Math.min(Number(budget), items.length * 50)
      };
    }

    // Ensure response structure
    if (!parsedResponse.items) parsedResponse.items = [];
    if (!parsedResponse.suggestions) parsedResponse.suggestions = [];
    if (!parsedResponse.totalEstimated) {
      parsedResponse.totalEstimated = parsedResponse.items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
    }

    // Add unique IDs and URLs if missing
    parsedResponse.items = parsedResponse.items.map((item, index) => ({
      ...item,
      id: item.id || `item_${Date.now()}_${index}`,
      amazonUrl: item.amazonUrl || `https://amazon.com/s?k=${encodeURIComponent(item.name || 'product')}`
    }));

    console.log(`Generated ${parsedResponse.items.length} product recommendations`);
    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in shopping planner:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate shopping plan',
      items: [],
      suggestions: ["Please try again - service temporarily unavailable"],
      totalEstimated: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
