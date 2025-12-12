import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FittingApprovalRequest {
  appointmentId: string;
  clientName: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing fitting approval request...');
    
    const { appointmentId, clientName, appointmentDate, appointmentTime, notes }: FittingApprovalRequest = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Format the approval message
    const approvalMessage = `WARDROBE FITTING APPROVAL NEEDED:
    
Client: ${clientName}
Date: ${appointmentDate}
Time: ${appointmentTime}
${notes ? `Notes: ${notes}` : ''}

Reply:
APPROVE ${appointmentId} - to approve
DENY ${appointmentId} - to deny`;

    console.log('Sending approval messages to wardrobe managers...');

    // Send SMS to both wardrobe managers
    const approvalPhones = [
      { email: 'soleilvailes@spelman.edu', name: 'Soleil' },
      { email: 'drewroberts@spelman.edu', name: 'Drew' }
    ];

    const smsPromises = approvalPhones.map(async (manager) => {
      // Look up phone number from profiles
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('phone_number, full_name')
        .eq('email', manager.email)
        .single();

      if (!profile?.phone_number) {
        console.warn(`No phone number found for ${manager.email}`);
        return null;
      }

      // Send SMS via existing SMS function
      const { data: smsResult, error: smsError } = await supabase.functions.invoke('gw-send-sms', {
        body: {
          to: profile.phone_number,
          message: approvalMessage
        }
      });

      if (smsError) {
        console.error(`Failed to send SMS to ${manager.email}:`, smsError);
        throw smsError;
      }

      console.log(`SMS sent successfully to ${manager.email}`);
      return smsResult;
    });

    const results = await Promise.allSettled(smsPromises);
    
    // Log notification delivery
    const deliveryPromises = results.map(async (result, index) => {
      const manager = approvalPhones[index];
      const status = result.status === 'fulfilled' ? 'sent' : 'failed';
      const errorMessage = result.status === 'rejected' ? result.reason?.message : null;

      return supabase
        .from('gw_notification_delivery_log')
        .insert({
          notification_id: appointmentId,
          user_email: manager.email,
          delivery_method: 'sms',
          status: status,
          error_message: errorMessage
        });
    });

    await Promise.allSettled(deliveryPromises);

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        messagesSent: successCount,
        totalManagers: approvalPhones.length,
        message: `Approval requests sent to ${successCount} wardrobe managers`
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-fitting-approval-request:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);