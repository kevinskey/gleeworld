import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, context } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `As an expert music theory instructor, analyze the following course materials and create a comprehensive study guide for ${context}.

Course Materials:
${content}

Please create a study guide with the following structure:
1. A clear, concise summary of the main topics
2. Key points and concepts (bullet format)
3. Study questions for review and practice
4. A concept map showing relationships between topics

Focus on music theory concepts, analytical techniques, and practical applications. Make it engaging and educational for undergraduate music students.

Return the response as a JSON object with this structure:
{
  "summary": "Brief overview of all materials",
  "keyPoints": ["point1", "point2", ...],
  "studyQuestions": ["question1", "question2", ...],
  "conceptMap": {"concept1": ["related1", "related2"], "concept2": ["related3", "related4"]}
}`;

    console.log('Generating study guide...');

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
            content: 'You are an expert music theory instructor who creates comprehensive study guides. Always respond with valid JSON.'
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
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const studyGuideText = data.choices[0].message.content;
    
    try {
      const studyGuide = JSON.parse(studyGuideText);
      
      return new Response(JSON.stringify({ studyGuide }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Error parsing study guide JSON:', parseError);
      
      // Fallback to structured text if JSON parsing fails
      const fallbackGuide = {
        summary: "Generated study guide content",
        keyPoints: studyGuideText.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•')).slice(0, 10),
        studyQuestions: ["Review the main concepts", "Practice identifying musical elements", "Analyze provided examples"],
        conceptMap: {"Music Theory": ["Harmony", "Rhythm", "Melody"], "Analysis": ["Form", "Structure", "Style"]}
      };
      
      return new Response(JSON.stringify({ studyGuide: fallbackGuide }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in generate-study-guide function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});