import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShoppingItem {
  id: string;
  name: string;
  estimatedPrice: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
  notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, budget, timeframe, purpose, action, plan } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let prompt = '';
    
    if (action === 'generate_plan') {
      prompt = `
        Create a detailed shopping plan for the following requirements:
        
        Title: ${title}
        Budget: $${budget}
        Timeframe: ${timeframe}
        Purpose: ${purpose}
        
        Please provide:
        1. A list of recommended items with estimated prices, priorities (high/medium/low), and categories
        2. Money-saving suggestions and alternatives
        3. Budget optimization tips
        4. Shopping strategy recommendations
        
        Format the response as JSON with this structure:
        {
          "items": [
            {
              "id": "unique_id",
              "name": "item name",
              "estimatedPrice": number,
              "priority": "high|medium|low",
              "category": "category name",
              "notes": "optional notes or alternatives"
            }
          ],
          "suggestions": [
            "suggestion 1",
            "suggestion 2"
          ],
          "totalEstimated": total_amount
        }
        
        Keep the total estimated amount within or close to the budget. Focus on essential items first, then nice-to-have items.
      `;
    } else if (action === 'optimize_plan') {
      prompt = `
        Optimize the following shopping plan to better fit the budget and improve cost efficiency:
        
        Current Plan:
        Title: ${plan.title}
        Budget: $${plan.budget}
        Current Total: $${plan.totalEstimated}
        Items: ${JSON.stringify(plan.items)}
        
        Please provide:
        1. Optimized item list with better pricing or alternatives
        2. Items to remove or replace if over budget
        3. Additional money-saving tips
        4. Prioritization suggestions
        
        Format the response as JSON with the same structure as the generation request.
        Focus on staying within budget while maintaining quality and meeting the purpose requirements.
      `;
    }

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
            content: `You are an expert financial planning assistant specializing in creating smart, budget-conscious shopping plans. You help users optimize their spending by providing practical suggestions, cost-effective alternatives, and strategic shopping advice. Always focus on staying within budget while meeting the user's needs.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Try to parse the JSON response
    let parsedResponse;
    try {
      // Extract JSON from the response if it's wrapped in markdown
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback response
      parsedResponse = {
        items: [
          {
            id: Date.now().toString(),
            name: "Basic Item",
            estimatedPrice: Math.min(budget * 0.8, 100),
            priority: "high",
            category: "Essential",
            notes: "AI parsing failed - manual item added"
          }
        ],
        suggestions: [
          "Consider comparing prices across different vendors",
          "Look for bulk discounts if buying multiple items",
          "Check for seasonal sales and promotions"
        ],
        totalEstimated: Math.min(budget * 0.8, 100)
      };
    }

    // Ensure the response has the correct structure
    if (!parsedResponse.items) {
      parsedResponse.items = [];
    }
    if (!parsedResponse.suggestions) {
      parsedResponse.suggestions = [];
    }
    if (!parsedResponse.totalEstimated) {
      parsedResponse.totalEstimated = parsedResponse.items.reduce((sum: number, item: any) => sum + (item.estimatedPrice || 0), 0);
    }

    // Add unique IDs if missing
    parsedResponse.items = parsedResponse.items.map((item: any, index: number) => ({
      ...item,
      id: item.id || `item_${Date.now()}_${index}`
    }));

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-shopping-planner function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      items: [],
      suggestions: ["Sorry, I couldn't generate suggestions at this time. Please try again."],
      totalEstimated: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});