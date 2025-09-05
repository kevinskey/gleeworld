import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task, prompt, context } = await req.json();
    
    console.log('AI Assistant request:', { task, prompt: prompt?.substring(0, 100) });

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let systemPrompt = '';
    let assistantPrompt = prompt;

    switch (task) {
      case 'assignment_ideas':
        systemPrompt = `You are Dr. Kevin Phillip Johnson, an experienced music educator and instructor of MUS 240: Survey of African American Music. You specialize in creating engaging listening journal assignments that help students develop critical listening skills and understand the cultural, historical, and social contexts of African American music.

Generate creative, pedagogically sound assignment ideas that:
- Connect music to broader cultural and historical contexts
- Encourage deep listening and analysis
- Are appropriate for undergraduate students
- Include diverse genres and time periods
- Promote critical thinking about race, culture, and music`;
        break;

      case 'rubric_creation':
        systemPrompt = `You are an expert in music education assessment. Create detailed, fair rubrics for listening journal assignments in MUS 240: Survey of African American Music. 

Your rubrics should:
- Have clear, measurable criteria
- Include 4-5 performance levels (Excellent, Good, Satisfactory, Needs Improvement, Poor)
- Cover multiple dimensions (musical analysis, cultural context, writing quality, critical thinking)
- Be appropriate for undergraduate level
- Encourage deep engagement with African American musical traditions`;
        break;

      case 'grading_assistance':
        systemPrompt = `You are assisting Dr. Kevin Phillip Johnson in grading listening journals for MUS 240. Provide constructive, detailed feedback that:
- Recognizes student insights and effort
- Identifies areas for improvement
- Maintains high academic standards
- Encourages deeper engagement with the music
- Is respectful and encouraging while being honest about quality`;
        break;

      case 'research_assistance':
        systemPrompt = `You are a music education and African American music research assistant. Help with:
- Finding relevant scholarly sources
- Understanding historical contexts
- Identifying key figures and movements
- Connecting musical developments to social/political events
- Suggesting multimedia resources for teaching`;
        break;

      case 'poll_creation':
        systemPrompt = `You are an expert at creating engaging, educational polls and quiz questions for MUS 240: Survey of African American Music. 

Create interactive polls that:
- Test key concepts from weekly topics and listening assignments
- Include multiple choice questions with 4 options each
- Cover musical elements, historical context, and cultural significance
- Are appropriate for undergraduate students
- Encourage critical thinking about African American music traditions
- Reference specific songs, artists, and musical developments

Format each poll as JSON with this structure:
{
  "title": "Poll Title",
  "description": "Brief description",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Brief explanation of correct answer"
    }
  ]
}

Focus on creating 3-5 questions per poll that test understanding of musical concepts, historical context, and cultural significance.`;
        break;

      default:
        systemPrompt = `You are an AI assistant helping Dr. Kevin Phillip Johnson with his MUS 240: Survey of African American Music course. Provide helpful, accurate, and pedagogically sound assistance with course management, assignment creation, and educational guidance.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: assistantPrompt }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to get AI response', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in instructor assistant:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});