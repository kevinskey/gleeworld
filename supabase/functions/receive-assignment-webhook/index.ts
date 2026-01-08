import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WEBHOOK_SECRET = "sss-gw-sync-2026-xyz123";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook secret
    const webhookSecret = req.headers.get('X-Webhook-Secret');
    if (webhookSecret !== WEBHOOK_SECRET) {
      console.error('Invalid webhook secret provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only accept POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    console.log('Received assignment webhook:', JSON.stringify(body, null, 2));

    const { title, dueDate, exercises, students, createdAt, assignmentId } = body;

    // Validate required fields
    if (!title || !assignmentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title and assignmentId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log the received assignment data
    console.log(`Processing assignment: ${title} (ID: ${assignmentId})`);
    console.log(`Due date: ${dueDate}`);
    console.log(`Exercises count: ${exercises?.length || 0}`);
    console.log(`Students count: ${students?.length || 0}`);

    // Store assignment in database if needed
    // For now, we'll just acknowledge receipt
    const response = {
      success: true,
      message: 'Assignment received successfully',
      data: {
        assignmentId,
        title,
        dueDate,
        exercisesReceived: exercises?.length || 0,
        studentsReceived: students?.length || 0,
        receivedAt: new Date().toISOString()
      }
    };

    console.log('Assignment processed successfully:', response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing assignment webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
