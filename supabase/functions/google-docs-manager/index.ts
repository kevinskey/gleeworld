import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'create' | 'sync' | 'get_url';
  minuteId?: string;
  title?: string;
  content?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, minuteId, title, content }: RequestBody = await req.json();
    
    // Get Google API credentials from Supabase secrets
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!googleApiKey || !googleClientId || !googleClientSecret) {
      console.error('Missing Google API credentials');
      return new Response(
        JSON.stringify({ error: 'Google API credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    switch (action) {
      case 'create': {
        if (!title || !content) {
          return new Response(
            JSON.stringify({ error: 'Title and content are required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Create a new Google Doc
        const createDocResponse = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `Meeting Minutes: ${title}`,
          }),
        });

        if (!createDocResponse.ok) {
          console.error('Failed to create Google Doc:', await createDocResponse.text());
          return new Response(
            JSON.stringify({ error: 'Failed to create Google Doc' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const newDoc = await createDocResponse.json();
        const documentId = newDoc.documentId;
        const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

        // Add content to the document
        if (content) {
          const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${googleApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  insertText: {
                    location: { index: 1 },
                    text: content,
                  },
                },
              ],
            }),
          });

          if (!updateResponse.ok) {
            console.error('Failed to add content to Google Doc:', await updateResponse.text());
          }
        }

        // Update the meeting minute record with Google Doc info
        if (minuteId) {
          const { error: updateError } = await supabase
            .from('gw_meeting_minutes')
            .update({
              google_doc_id: documentId,
              google_doc_url: documentUrl,
            })
            .eq('id', minuteId);

          if (updateError) {
            console.error('Failed to update meeting minute with Google Doc info:', updateError);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            documentId,
            documentUrl,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'get_url': {
        if (!minuteId) {
          return new Response(
            JSON.stringify({ error: 'Minute ID is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Get the Google Doc URL from the database
        const { data: minute, error } = await supabase
          .from('gw_meeting_minutes')
          .select('google_doc_url, google_doc_id')
          .eq('id', minuteId)
          .single();

        if (error || !minute) {
          return new Response(
            JSON.stringify({ error: 'Meeting minute not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            documentUrl: minute.google_doc_url,
            documentId: minute.google_doc_id,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'sync': {
        if (!minuteId) {
          return new Response(
            JSON.stringify({ error: 'Minute ID is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Get the meeting minute record
        const { data: minute, error } = await supabase
          .from('gw_meeting_minutes')
          .select('google_doc_id')
          .eq('id', minuteId)
          .single();

        if (error || !minute || !minute.google_doc_id) {
          return new Response(
            JSON.stringify({ error: 'Meeting minute or Google Doc not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Get content from Google Doc
        const docResponse = await fetch(`https://docs.googleapis.com/v1/documents/${minute.google_doc_id}`, {
          headers: {
            'Authorization': `Bearer ${googleApiKey}`,
          },
        });

        if (!docResponse.ok) {
          console.error('Failed to fetch Google Doc:', await docResponse.text());
          return new Response(
            JSON.stringify({ error: 'Failed to fetch Google Doc content' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const doc = await docResponse.json();
        
        // Extract text content from the document
        let textContent = '';
        if (doc.body && doc.body.content) {
          for (const element of doc.body.content) {
            if (element.paragraph && element.paragraph.elements) {
              for (const paragraphElement of element.paragraph.elements) {
                if (paragraphElement.textRun) {
                  textContent += paragraphElement.textRun.content;
                }
              }
            }
          }
        }

        // Update the discussion_points field with the Google Doc content
        const { error: updateError } = await supabase
          .from('gw_meeting_minutes')
          .update({
            discussion_points: textContent.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', minuteId);

        if (updateError) {
          console.error('Failed to update meeting minute with synced content:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to sync content to database' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            syncedContent: textContent.trim(),
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error) {
    console.error('Error in google-docs-manager function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});