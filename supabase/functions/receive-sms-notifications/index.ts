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

// Function to check if phone number is authorized
async function isAuthorizedSender(phoneNumber: string): Promise<boolean> {
  // Check if sender is an executive board member or admin with a phone number
  const { data: authorizedUsers, error } = await supabase
    .from('gw_profiles')
    .select('phone_number, is_admin, is_super_admin, user_id')
    .or('is_admin.eq.true,is_super_admin.eq.true')
    .not('phone_number', 'is', null);

  if (error) {
    console.error('Error checking authorized users:', error);
    return false;
  }

  // Also check executive board members
  const { data: execMembers, error: execError } = await supabase
    .from('gw_executive_board_members')
    .select(`
      user_id,
      gw_profiles!inner(phone_number)
    `)
    .eq('is_active', true)
    .not('gw_profiles.phone_number', 'is', null);

  if (execError) {
    console.error('Error checking executive board members:', execError);
  }

  // Combine all authorized phone numbers
  const allAuthorizedNumbers = [
    ...(authorizedUsers?.map(user => user.phone_number).filter(Boolean) || []),
    ...(execMembers?.map(member => member.gw_profiles?.phone_number).filter(Boolean) || [])
  ];

  return allAuthorizedNumbers.includes(phoneNumber);
}

// Function to get recipients based on group
async function getRecipientsByGroup(group: string): Promise<string[]> {
  switch (group.toLowerCase()) {
    case 'exec':
    case 'executive':
      // Get executive board members
      const { data: executives } = await supabase
        .from('gw_executive_board_members')
        .select('user_id')
        .eq('is_active', true);
      return executives?.map(exec => exec.user_id) || [];

    case 'admin':
    case 'admins':
      // Get admins and super admins
      const { data: admins } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .or('is_admin.eq.true,is_super_admin.eq.true');
      return admins?.map(admin => admin.user_id) || [];

    case 'all':
    case 'everyone':
    case 'members':
      // Get all verified members
      const { data: allMembers } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .neq('role', 'guest');
      return allMembers?.map(member => member.user_id) || [];

    default:
      // Default to executive board
      const { data: defaultExecs } = await supabase
        .from('gw_executive_board_members')
        .select('user_id')
        .eq('is_active', true);
      return defaultExecs?.map(exec => exec.user_id) || [];
  }
}

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
    const isAuthorized = await isAuthorizedSender(smsData.From);
    if (!isAuthorized) {
      console.log(`Unauthorized number: ${smsData.From}`);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml', ...corsHeaders }
      });
    }

    // Parse the SMS message to extract group and content
    const parsedMessage = parseSMSMessage(smsData.Body);
    const targetGroup = parsedMessage.group;
    const messageContent = parsedMessage.message;
    const title = parsedMessage.title;

    console.log(`Target group: ${targetGroup}, Message: ${messageContent}`);

    // Get recipients based on the specified group
    const recipientIds = await getRecipientsByGroup(targetGroup);
    
    if (recipientIds.length === 0) {
      console.log('No recipients found for group:', targetGroup);
      const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>❌ No recipients found for group: ${targetGroup}</Message>
        </Response>`;
      return new Response(errorResponse, {
        status: 200,
        headers: { 'Content-Type': 'text/xml', ...corsHeaders }
      });
    }

    // Create notifications for recipients
    const notifications = recipientIds.map(userId => ({
      user_id: userId,
      title: title,
      message: messageContent,
      type: 'sms_notification',
      is_read: false,
      sender_phone: smsData.From,
      created_at: new Date().toISOString()
    }));

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('gw_notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        throw notificationError;
      }

      console.log(`Created ${notifications.length} notifications from SMS to ${targetGroup}`);
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
        <Message>✅ Notification sent to ${notifications.length} ${targetGroup} members</Message>
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

function parseSMSMessage(body: string): { title: string; message: string; group: string } {
  // Expected format with group targeting:
  // "@exec: Your message" → Send to executive board
  // "@admin: Your message" → Send to admins only  
  // "@all: Your message" → Send to all members
  // "Your message" → Default to executive board
  
  const groupRegex = /^@(exec|admin|all|everyone|members|executive|admins):\s*(.+)$/i;
  const match = body.trim().match(groupRegex);
  
  let group = 'exec'; // Default to executive board
  let message = body.trim();
  
  if (match) {
    group = match[1].toLowerCase();
    message = match[2].trim();
  }
  
  // Create a title from the first part of the message (up to first sentence or 50 chars)
  const titleMatch = message.match(/^([^.!?]{1,50})/);
  const title = titleMatch ? titleMatch[1].trim() : message.substring(0, 50);
  
  return {
    title: title + (title.length < message.length ? '...' : ''),
    message: message,
    group: group
  };
}

serve(handler);