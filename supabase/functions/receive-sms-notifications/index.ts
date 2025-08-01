import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSMessage {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
}

const supabaseUrl = 'https://oopmlreysjzuxzylyheb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcG1scmV5c2p6dXh6eWx5aGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA3ODk1NSwiZXhwIjoyMDY0NjU0OTU1fQ.VNf--TUVMvzSoF3tX-tDmNGFqjgBWdLj9OYv30h_Atg';
const supabase = createClient(supabaseUrl, supabaseKey);

// Authorized phone numbers - add your actual phone numbers here
const AUTHORIZED_NUMBERS = [
  // Add your authorized phone numbers here in E.164 format (e.g., '+15551234567')
  // Executive board members and administrators who can send SMS notifications
];

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    console.log('Received SMS webhook from Twilio');
    
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const smsData: SMSMessage = {
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string,
      MessageSid: formData.get('MessageSid') as string,
    };

    console.log('SMS Data:', smsData);

    // Check if sender is authorized
    if (!AUTHORIZED_NUMBERS.includes(smsData.From)) {
      console.log(`Unauthorized number: ${smsData.From}`);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml', ...corsHeaders }
      });
    }

    // Parse the SMS message
    const parsedNotification = parseSMSMessage(smsData.Body);
    
    if (!parsedNotification) {
      console.log('Could not parse SMS message');
      // Send error response back to sender
      const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>Invalid format. Use: PRIORITY: Message - Category</Message>
        </Response>`;
      return new Response(errorResponse, {
        status: 200,
        headers: { 'Content-Type': 'text/xml', ...corsHeaders }
      });
    }

    // Get all executive board members to notify
    const { data: executives, error: execError } = await supabase
      .from('gw_executive_board_members')
      .select('user_id')
      .eq('is_active', true);

    if (execError) {
      console.error('Error fetching executives:', execError);
      throw execError;
    }

    // Create notifications for all executive board members
    const notifications = executives?.map(exec => ({
      recipient_user_id: exec.user_id,
      title: parsedNotification.title,
      message: parsedNotification.message,
      notification_type: parsedNotification.category.toLowerCase(),
      priority: parsedNotification.priority.toLowerCase(),
      sender_phone: smsData.From,
      created_at: new Date().toISOString()
    })) || [];

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('gw_executive_board_notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        throw notificationError;
      }

      console.log(`Created ${notifications.length} notifications from SMS`);
    }

    // Log the SMS for audit trail
    const { error: logError } = await supabase
      .from('gw_sms_logs')
      .insert({
        from_number: smsData.From,
        to_number: smsData.To,
        message_body: smsData.Body,
        message_sid: smsData.MessageSid,
        processed_at: new Date().toISOString(),
        notification_count: notifications.length
      });

    if (logError) {
      console.error('Error logging SMS:', logError);
    }

    // Send confirmation response
    const confirmationResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>✅ Notification sent to ${notifications.length} executive board members</Message>
      </Response>`;

    return new Response(confirmationResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/xml', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('Error processing SMS:', error);
    
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>❌ Error processing notification. Please try again.</Message>
      </Response>`;

    return new Response(errorResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/xml', ...corsHeaders }
    });
  }
};

function parseSMSMessage(body: string): { title: string; message: string; priority: string; category: string } | null {
  // Expected format: "PRIORITY: Message - Category"
  // Examples:
  // "HIGH: Concert dress rehearsal moved to 6 PM Friday - Wardrobe"
  // "URGENT: Weather update: Tour bus delayed 2 hours - Travel"
  // "NORMAL: New sheet music available in library - Music"
  
  const regex = /^(HIGH|URGENT|NORMAL|LOW):\s*(.+?)\s*-\s*(.+)$/i;
  const match = body.trim().match(regex);
  
  if (!match) {
    return null;
  }
  
  const [, priority, message, category] = match;
  
  // Create a title from the first part of the message (up to first sentence or 50 chars)
  const titleMatch = message.match(/^([^.!?]{1,50})/);
  const title = titleMatch ? titleMatch[1].trim() : message.substring(0, 50);
  
  return {
    title: title + (title.length < message.length ? '...' : ''),
    message: message.trim(),
    priority: priority.toUpperCase(),
    category: category.trim()
  };
}

serve(handler);