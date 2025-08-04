import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { rawContent, tone, platforms, eventType } = await req.json();

    console.log('Request received:', { rawContent, tone, platforms, eventType });

    if (!rawContent) {
      return new Response(
        JSON.stringify({ error: 'Raw content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a professional social media content creator for the Spelman College Glee Club. Create engaging, platform-optimized content that maintains the club's prestigious reputation while connecting with audiences.

Guidelines:
- Maintain the elegant, inspirational tone befitting Spelman College's legacy
- Include relevant hashtags for each platform
- Respect character limits (Twitter: 280 chars)
- Use appropriate emojis sparingly and tastefully
- Include calls-to-action when appropriate
- Emphasize community, excellence, and musical artistry`;

    const toneDescriptions = {
      professional: "Maintain a polished, sophisticated tone suitable for academic and professional audiences",
      inspirational: "Use uplifting, motivational language that celebrates achievement and potential", 
      fun: "Adopt a warm, engaging tone that shows personality while remaining respectful",
      academic: "Use scholarly, educational language appropriate for academic discourse",
      gospel: "Incorporate spiritual, uplifting themes that honor faith and community traditions"
    };

    const userPrompt = `Create social media posts for the following platforms: ${platforms.join(', ')}

Raw Content: ${rawContent}
Tone: ${tone} - ${toneDescriptions[tone] || toneDescriptions.professional}
Event Type: ${eventType || 'general'}

For each platform, create:
1. Optimized caption text
2. 5-7 relevant hashtags
3. Brief explanation of platform-specific adaptations

Platform Requirements:
- Facebook: 1-2 paragraphs, engaging but professional, include link placement suggestion
- Instagram: Visual-focused, inspiring caption, story potential, optimal hashtag mix
- Twitter/X: Concise 280 chars max, punchy, conversation-starting
- LinkedIn: Professional networking tone, educational value, industry connections

Return as JSON with this structure:
{
  "facebook": {
    "caption": "...",
    "hashtags": ["...", "..."],
    "notes": "..."
  },
  "instagram": {
    "caption": "...", 
    "hashtags": ["...", "..."],
    "notes": "..."
  },
  "twitter": {
    "caption": "...",
    "hashtags": ["...", "..."], 
    "notes": "..."
  },
  "linkedin": {
    "caption": "...",
    "hashtags": ["...", "..."],
    "notes": "..."
  }
}`;

    console.log('Generating social media content...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to generate content');
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    // Parse the JSON response
    let contentData;
    try {
      // Remove any markdown formatting if present
      const cleanContent = generatedContent.replace(/```json\n?|\n?```/g, '').trim();
      contentData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI response');
    }

    console.log('Content generated successfully');

    return new Response(JSON.stringify(contentData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-social-media-content function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});