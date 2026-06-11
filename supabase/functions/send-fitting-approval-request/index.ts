import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { authenticateCaller, unauthorizedResponse } from "../_shared/auth.ts";

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
    // Sends SMS to wardrobe managers — signed-in callers only.
    const caller = await authenticateCaller(req);
    if (!caller) return unauthorizedResponse(corsHeaders);

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

    // Look up active wardrobe managers from the executive board
    const { data: boardMembers } = await supabase
      .from('gw_executive_board_members')
      .select('user_id')
      .eq('position', 'wardrobe_manager')
      .eq('is_active', true);

    const managerIds = (boardMembers ?? []).map(m => m.user_id);
    const { data: managers } = managerIds.length > 0
      ? await supabase
          .from('gw_profiles')
          .select('email, full_name, phone_number')
          .in('user_id', managerIds)
      : { data: [] };

    const approvalPhones = (managers ?? []).filter(m => m.phone_number);

    if (approvalPhones.length === 0) {
      console.warn('No active wardrobe managers with phone numbers found');
      return new Response(
        JSON.stringify({ success: false, error: 'No wardrobe managers with phone numbers configured' }),
        { status: 422, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const smsPromises = approvalPhones.map(async (manager) => {
      const { data: smsResult, error: smsError } = await supabase.functions.invoke('gw-send-sms', {
        body: {
          to: manager.phone_number,
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