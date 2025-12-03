import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🎭 Manually sending audition confirmation to Mya Jones...');

    // Mya's confirmation message
    const myaMessage = `Hi Mya! 🎵 Thank you for signing up for the Spelman College Glee Club audition! Your audition is confirmed for August 15, 2025 at 3:30 PM. We're excited to hear you sing! Please arrive 15 minutes early. Break a leg! 🌟 - Spelman Glee Club`;
    
    // Admin notification message
    const adminMessage = `SMS COPY: Sent to Mya Jones (443) 688-3051: "${myaMessage}"`;

    console.log('📱 Sending SMS to Mya:', myaMessage);

    // Send SMS to Mya
    const myaResponse = await supabase.functions.invoke('send-sms', {
      body: {
        to: '+14436883051',
        message: myaMessage
      }
    });

    console.log('Mya SMS Response:', myaResponse);

    if (myaResponse.error) {
      console.error('Failed to send SMS to Mya:', myaResponse.error);
    } else {
      console.log('✅ SMS sent to Mya successfully');
    }

    console.log('📱 Sending copy to admin:', adminMessage);

    // Send copy to admin
    const adminResponse = await supabase.functions.invoke('send-sms', {
      body: {
        to: '+14706221392',
        message: adminMessage
      }
    });

    console.log('Admin SMS Response:', adminResponse);

    if (adminResponse.error) {
      console.error('Failed to send copy to admin:', adminResponse.error);
    } else {
      console.log('✅ Copy sent to admin successfully');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Audition confirmation process completed',
      myaResponse: myaResponse.data,
      adminResponse: adminResponse.data,
      myaError: myaResponse.error,
      adminError: adminResponse.error
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('❌ Error in manual audition confirmation:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to send audition confirmation',
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
};

serve(handler);