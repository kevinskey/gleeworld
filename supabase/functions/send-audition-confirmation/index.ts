import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    console.log('🎭 Sending audition confirmation to Mya Jones...');

    // Mya's confirmation message
    const myaMessage = `Hi Mya! 🎵 Thank you for signing up for the Spelman College Glee Club audition! Your audition is confirmed for August 15, 2025 at 3:30 PM. We're excited to hear you sing! Please arrive 15 minutes early. Break a leg! 🌟 - Spelman Glee Club`;
    
    // Admin notification message
    const adminMessage = `SMS COPY: Sent to Mya Jones (443) 688-3051: "${myaMessage}"`;

    // Send SMS to Mya
    const myaResponse = await supabase.functions.invoke('send-sms', {
      body: {
        to: '(443) 688-3051',
        message: myaMessage
      }
    });

    if (myaResponse.error) {
      throw new Error(`Failed to send SMS to Mya: ${myaResponse.error.message}`);
    }

    console.log('✅ SMS sent to Mya successfully');

    // Send copy to admin
    const adminResponse = await supabase.functions.invoke('send-sms', {
      body: {
        to: '(470) 622-1392',
        message: adminMessage
      }
    });

    if (adminResponse.error) {
      throw new Error(`Failed to send copy to admin: ${adminResponse.error.message}`);
    }

    console.log('✅ Copy sent to admin successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Audition confirmation sent to Mya Jones and copy sent to admin',
      myaMessageId: myaResponse.data?.messageId,
      adminMessageId: adminResponse.data?.messageId
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('❌ Error sending audition confirmation:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to send audition confirmation' 
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