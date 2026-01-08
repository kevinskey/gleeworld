import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const WEBHOOK_SECRET = "sss-gw-sync-2026-xyz123";

// Course schedule data
const COURSE_SCHEDULE = [
  {
    class: "MUS 070",
    name: "Fundamentals of Music",
    schedule: "MWF 9:00-9:50am",
    instructor: "Prof. Smith"
  },
  {
    class: "MUS 210",
    name: "Sight Singing I",
    schedule: "TTh 10:00-11:15am",
    instructor: "Prof. Jones"
  },
  {
    class: "MUS 240",
    name: "Sight Singing II",
    schedule: "TTh 1:00-2:15pm",
    instructor: "Prof. Jones"
  }
];

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

    // Only accept GET
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Course schedule API requested');

    const response = {
      courses: COURSE_SCHEDULE,
      total: COURSE_SCHEDULE.length,
      timestamp: new Date().toISOString()
    };

    console.log('Returning course schedule:', response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in course schedule API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
