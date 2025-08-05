import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Amazon search function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Search request received');
    
    const { title, budget, purpose, action, plan } = body;

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

    console.log('Searching Amazon for items...');

    let prompt = '';
    
    if (action === 'generate_plan') {
      prompt = `You are an Amazon search expert. The user wants to buy these items:

${purpose}

Budget: $${budget}

Find actual Amazon products for each item they listed. For each item, recommend specific products with:
- Exact Amazon product names as they appear on the site
- Realistic current market prices
- Specific brands and models
- Brief reason why it's recommended

Return ONLY valid JSON:
{
  "items": [
    {
      "id": "unique_id",
      "name": "Exact Amazon product name", 
      "estimatedPrice": realistic_price_number,
      "priority": "high|medium|low",
      "category": "Amazon category",
      "notes": "Brand/model and why recommended"
    }
  ],
  "suggestions": [
    "Amazon shopping tip 1",
    "Amazon shopping tip 2"
  ],
  "totalEstimated": total_number
}

Stay within budget. Focus on quality and value.`;

    } else if (action === 'optimize_plan') {
      prompt = `Find better Amazon deals for these items:

Current items: ${JSON.stringify(plan.items)}
Budget: $${plan.budget}

Find cheaper alternatives or better deals on Amazon.

Return the same JSON format with optimized products.`;
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
            content: 'You are an expert Amazon shopper with knowledge of current products and prices. Always return valid JSON with real Amazon product recommendations.'
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

    console.log('OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Amazon search completed');
    
    const aiResponse = data.choices[0].message.content;

    // Parse JSON response
    let parsedResponse;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      parsedResponse = JSON.parse(jsonString);
      console.log('Successfully found Amazon products');
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Create a simple fallback
      const items = purpose.split('\n').filter(item => item.trim()).slice(0, 5);
      const pricePerItem = Math.floor(Number(budget) / Math.max(items.length, 1));
      
      parsedResponse = {
        items: items.map((item, index) => ({
          id: `amazon_${index + 1}`,
          name: `${item.trim()} - Amazon Choice`,
          estimatedPrice: Math.min(pricePerItem, 100),
          priority: "medium",
          category: "General",
          notes: "Amazon recommended product"
        })),
        suggestions: [
          "Check Amazon's daily deals for discounts",
          "Compare customer reviews before buying",
          "Consider Amazon Prime for free shipping"
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

    // Add unique IDs if missing
    parsedResponse.items = parsedResponse.items.map((item, index) => ({
      ...item,
      id: item.id || `amazon_${Date.now()}_${index}`
    }));

    console.log(`Found ${parsedResponse.items.length} Amazon products`);
    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Amazon search:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to search Amazon',
      items: [],
      suggestions: ["Please try again - Amazon search temporarily unavailable"],
      totalEstimated: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});