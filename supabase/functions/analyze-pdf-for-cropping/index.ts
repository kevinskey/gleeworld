import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { pdfImages, sheetMusicId } = await req.json();
    console.log('Analyzing PDF for cropping:', { sheetMusicId, pageCount: pdfImages?.length });

    if (!pdfImages || !Array.isArray(pdfImages)) {
      return new Response(JSON.stringify({ error: 'PDF images array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const cropRecommendations = [];

    // Analyze each page of the PDF
    for (let i = 0; i < pdfImages.length; i++) {
      const pageImage = pdfImages[i];
      console.log(`Analyzing page ${i + 1}/${pdfImages.length}`);

      const prompt = `Analyze this sheet music page and determine the optimal crop boundaries to remove excess whitespace while preserving all musical content. 

Look for:
- Staff lines and musical notation
- Title, composer, and text elements
- Margins that can be safely cropped
- Any important markings or annotations

Provide crop recommendations as percentages from each edge:
- top: percentage to crop from top (0-50%)
- bottom: percentage to crop from bottom (0-50%) 
- left: percentage to crop from left (0-30%)
- right: percentage to crop from right (0-30%)

Respond with ONLY a JSON object in this format:
{
  "top": 15,
  "bottom": 20,
  "left": 10,
  "right": 10,
  "confidence": 85,
  "reasoning": "Large top margin with title, significant bottom margin, minimal side margins needed"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: pageImage } }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        console.error(`OpenAI API error for page ${i + 1}:`, response.status);
        cropRecommendations.push({
          page: i + 1,
          error: `Failed to analyze page ${i + 1}`,
          crop: { top: 0, bottom: 0, left: 0, right: 0, confidence: 0 }
        });
        continue;
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      try {
        // Extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const cropData = JSON.parse(jsonMatch[0]);
          cropRecommendations.push({
            page: i + 1,
            crop: {
              top: Math.min(Math.max(cropData.top || 0, 0), 50),
              bottom: Math.min(Math.max(cropData.bottom || 0, 0), 50),
              left: Math.min(Math.max(cropData.left || 0, 0), 30),
              right: Math.min(Math.max(cropData.right || 0, 0), 30),
              confidence: cropData.confidence || 0,
              reasoning: cropData.reasoning || ''
            }
          });
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (parseError) {
        console.error(`Failed to parse crop data for page ${i + 1}:`, parseError);
        cropRecommendations.push({
          page: i + 1,
          error: `Failed to parse analysis for page ${i + 1}`,
          crop: { top: 0, bottom: 0, left: 0, right: 0, confidence: 0 }
        });
      }
    }

    // Store the crop recommendations in the database
    if (sheetMusicId) {
      const { error: dbError } = await supabase
        .from('gw_sheet_music')
        .update({
          crop_recommendations: cropRecommendations,
          updated_at: new Date().toISOString()
        })
        .eq('id', sheetMusicId);

      if (dbError) {
        console.error('Error saving crop recommendations:', dbError);
      } else {
        console.log('Crop recommendations saved to database');
      }
    }

    const averageConfidence = cropRecommendations.reduce((sum, rec) => 
      sum + (rec.crop?.confidence || 0), 0) / cropRecommendations.length;

    console.log('PDF analysis complete:', {
      pages: cropRecommendations.length,
      averageConfidence: Math.round(averageConfidence)
    });

    return new Response(JSON.stringify({
      success: true,
      sheetMusicId,
      cropRecommendations,
      summary: {
        totalPages: cropRecommendations.length,
        averageConfidence: Math.round(averageConfidence),
        avgCropSuggestions: {
          top: Math.round(cropRecommendations.reduce((sum, rec) => sum + (rec.crop?.top || 0), 0) / cropRecommendations.length),
          bottom: Math.round(cropRecommendations.reduce((sum, rec) => sum + (rec.crop?.bottom || 0), 0) / cropRecommendations.length),
          left: Math.round(cropRecommendations.reduce((sum, rec) => sum + (rec.crop?.left || 0), 0) / cropRecommendations.length),
          right: Math.round(cropRecommendations.reduce((sum, rec) => sum + (rec.crop?.right || 0), 0) / cropRecommendations.length)
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-pdf-for-cropping function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to analyze PDF',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});