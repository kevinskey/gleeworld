import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface StoreRecordingRequest {
  exerciseId: string;
  audioBase64: string;
  durationSeconds: number;
  filename?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const { exerciseId, audioBase64, durationSeconds, filename }: StoreRecordingRequest = await req.json();

    console.log('Storing recording for exercise:', exerciseId);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const supabaseUrl = 'https://oopmlreysjzuxzylyheb.supabase.co';

    const supabase = createClient(supabaseUrl, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Convert base64 to buffer
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const audioFilename = filename || `recording-${exerciseId}-${timestamp}.webm`;
    const filePath = `recordings/${user.id}/${audioFilename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('sight-singing-recordings')
      .upload(filePath, audioBuffer, {
        contentType: 'audio/webm',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    console.log('Audio uploaded successfully:', uploadData);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('sight-singing-recordings')
      .getPublicUrl(filePath);

    // Save recording metadata to database
    const { data: recordingData, error: dbError } = await supabase
      .from('sight_singing_recordings')
      .insert({
        exercise_id: exerciseId,
        user_id: user.id,
        audio_file_path: filePath,
        duration_seconds: durationSeconds
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      
      // Clean up uploaded file on database error
      await supabase.storage
        .from('sight-singing-recordings')
        .remove([filePath]);
        
      throw new Error(`Failed to save recording metadata: ${dbError.message}`);
    }

    console.log('Recording saved successfully:', recordingData);

    return new Response(JSON.stringify({
      recordingId: recordingData.id,
      filePath,
      publicUrl,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in store-recording function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});