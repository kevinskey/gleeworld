import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Testing Twilio configuration...');
    
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFromNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || Deno.env.get('TWILIO_FROM_NUMBER');

    console.log('Twilio Account SID:', twilioAccountSid ? 'CONFIGURED' : 'MISSING');
    console.log('Twilio Auth Token:', twilioAuthToken ? 'CONFIGURED' : 'MISSING');
    console.log('Twilio From Number:', twilioFromNumber || 'MISSING');

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      return new Response(JSON.stringify({
        error: 'Twilio credentials not configured',
        accountSid: !!twilioAccountSid,
        authToken: !!twilioAuthToken,
        fromNumber: !!twilioFromNumber
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Mya's message
    const myaMessage = `Hi Mya! 🎵 Thank you for signing up for the Spelman College Glee Club audition! Your audition is confirmed for August 15, 2025 at 3:30 PM. We're excited to hear you sing! Please arrive 15 minutes early. Break a leg! 🌟 - Spelman Glee Club`;
    
    // Admin message
    const adminMessage = `SMS COPY: Sent to Mya Jones (443) 688-3051: "${myaMessage}"`;

    console.log('📱 Sending SMS to Mya at +14436883051');

    // Send to Mya
    const myaResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: '+14436883051',
          From: twilioFromNumber,
          Body: myaMessage,
        }),
      }
    );

    const myaResult = await myaResponse.json();
    console.log('Mya SMS Result:', myaResult);

    if (!myaResponse.ok) {
      console.error('Failed to send SMS to Mya:', myaResult);
      return new Response(JSON.stringify({
        error: 'Failed to send SMS to Mya',
        details: myaResult
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('📱 Sending copy to admin at +14706221392');

    // Send to admin
    const adminResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: '+14706221392',
          From: twilioFromNumber,
          Body: adminMessage,
        }),
      }
    );

    const adminResult = await adminResponse.json();
    console.log('Admin SMS Result:', adminResult);

    return new Response(JSON.stringify({
      success: true,
      myaMessageId: myaResult.sid,
      adminMessageId: adminResult.sid,
      myaStatus: myaResponse.ok ? 'sent' : 'failed',
      adminStatus: adminResponse.ok ? 'sent' : 'failed'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('❌ Error in direct SMS test:', error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);