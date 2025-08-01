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

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://oopmlreysjzuxzylyheb.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to handle SMS images
async function handleSMSImages(formData: FormData, smsData: SMSMessage): Promise<void> {
  const numMedia = parseInt(formData.get('NumMedia') as string || '0');
  
  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = formData.get(`MediaUrl${i}`) as string;
    const mediaContentType = formData.get(`MediaContentType${i}`) as string;
    
    if (mediaUrl && mediaContentType.startsWith('image/')) {
      try {
        // Download the image from Twilio
        const imageResponse = await fetch(mediaUrl);
        const imageBlob = await imageResponse.blob();
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileExtension = mediaContentType.split('/')[1];
        const fileName = `sms-image-${timestamp}-${smsData.MessageSid}.${fileExtension}`;
        
        // Convert blob to ArrayBuffer for Supabase storage
        const arrayBuffer = await imageBlob.arrayBuffer();
        
        // Upload to Supabase storage bucket
        const { error: uploadError } = await supabase.storage
          .from('sms-images')
          .upload(fileName, arrayBuffer, {
            contentType: mediaContentType,
            upsert: false
          });
        
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
        } else {
          console.log(`Successfully uploaded image: ${fileName}`);
        }
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }
  }
}

// Function to normalize phone number format
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it starts with 1 and has 11 digits, it's a US number with country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1); // Remove the country code
  }
  
  // If it has 10 digits, it's already in the format we want
  if (digits.length === 10) {
    return digits;
  }
  
  return digits; // Return as-is for other cases
}

// Function to check if phone number is authorized
async function isAuthorizedSender(phoneNumber: string): Promise<boolean> {
  const normalizedIncoming = normalizePhoneNumber(phoneNumber);
  console.log(`Checking authorization for: ${phoneNumber} (normalized: ${normalizedIncoming})`);
  
  // Check if sender is an executive board member or admin with a phone number
  const { data: authorizedUsers, error } = await supabase
    .from('gw_profiles')
    .select('phone_number, is_admin, is_super_admin, user_id, email')
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
      gw_profiles!inner(phone_number, email)
    `)
    .eq('is_active', true)
    .not('gw_profiles.phone_number', 'is', null);

  if (execError) {
    console.error('Error checking executive board members:', execError);
  }

  // Combine all authorized phone numbers and normalize them
  const allAuthorizedNumbers = [
    ...(authorizedUsers?.map(user => normalizePhoneNumber(user.phone_number)).filter(Boolean) || []),
    ...(execMembers?.map(member => normalizePhoneNumber(member.gw_profiles?.phone_number || '')).filter(Boolean) || [])
  ];

  console.log(`Authorized numbers (normalized):`, allAuthorizedNumbers);
  console.log(`Incoming number matches:`, allAuthorizedNumbers.includes(normalizedIncoming));

  return allAuthorizedNumbers.includes(normalizedIncoming);
}

// Function to get recipients based on group
async function getRecipientsByGroup(group: string): Promise<string[]> {
  switch (group.toLowerCase()) {
    case 'exec':
      // Get president only
      const { data: president } = await supabase
        .from('gw_executive_board_members')
        .select('user_id')
        .eq('position', 'president')
        .eq('is_active', true);
      return president?.map(p => p.user_id) || [];

    case 'admin':
      // Get super admins only
      const { data: superAdmins } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('is_super_admin', true);
      return superAdmins?.map(admin => admin.user_id) || [];

    case 's1':
      // Get soprano 1 section members
      const { data: s1Members } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('voice_part', 'soprano_1');
      return s1Members?.map(member => member.user_id) || [];

    case 's2':
      // Get soprano 2 section members
      const { data: s2Members } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('voice_part', 'soprano_2');
      return s2Members?.map(member => member.user_id) || [];

    case 'a1':
      // Get alto 1 section members
      const { data: a1Members } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('voice_part', 'alto_1');
      return a1Members?.map(member => member.user_id) || [];

    case 'a2':
      // Get alto 2 section members
      const { data: a2Members } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('voice_part', 'alto_2');
      return a2Members?.map(member => member.user_id) || [];

    case 'pr':
      // Get PR coordinator
      const { data: prCoordinator } = await supabase
        .from('gw_executive_board_members')
        .select('user_id')
        .eq('position', 'pr_coordinator')
        .eq('is_active', true);
      return prCoordinator?.map(pr => pr.user_id) || [];

    default:
      // Default to all verified members
      const { data: allMembers } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .neq('role', 'guest');
      return allMembers?.map(member => member.user_id) || [];
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
    console.log('=== STARTING SMS PROCESSING ===');
    console.log('Received SMS webhook from Twilio');
    
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const smsData: SMSMessage = {
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string,
      MessageSid: formData.get('MessageSid') as string,
    };

    console.log('SMS Data received:', {
      From: smsData.From,
      To: smsData.To,
      Body: smsData.Body,
      MessageSid: smsData.MessageSid
    });

    // Check if sender is authorized
    console.log('=== CHECKING AUTHORIZATION ===');
    const isAuthorized = await isAuthorizedSender(smsData.From);
    console.log(`Authorization result: ${isAuthorized} for number: ${smsData.From}`);
    
    if (!isAuthorized) {
      console.log(`❌ UNAUTHORIZED: ${smsData.From} is not authorized to send messages`);
      const unauthorizedResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>❌ Unauthorized: Your number is not registered for SMS notifications</Message>
        </Response>`;
      return new Response(unauthorizedResponse, {
        status: 200,
        headers: { 'Content-Type': 'text/xml', ...corsHeaders }
      });
    }

    // Check if SMS contains images
    const hasImages = formData.has('NumMedia') && parseInt(formData.get('NumMedia') as string || '0') > 0;
    
    if (hasImages) {
      // Handle image processing
      await handleSMSImages(formData, smsData);
      
      // Send thank you response for images
      const imageResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>Thank you for the pic! The Spelman College Glee Club</Message>
        </Response>`;
      
      return new Response(imageResponse, {
        status: 200,
        headers: { 'Content-Type': 'text/xml', ...corsHeaders }
      });
    }

    // Parse the SMS message to extract group and content
    console.log('=== PARSING MESSAGE ===');
    const parsedMessage = parseSMSMessage(smsData.Body);
    const targetGroup = parsedMessage.group;
    const messageContent = parsedMessage.message;
    const title = parsedMessage.title;

    console.log(`📝 Parsed message:`, {
      targetGroup,
      title,
      messageContent
    });

    // Get recipients based on the specified group
    console.log('=== GETTING RECIPIENTS ===');
    const recipientIds = await getRecipientsByGroup(targetGroup);
    console.log(`👥 Found ${recipientIds.length} recipients for group "${targetGroup}":`, recipientIds);
    
    if (recipientIds.length === 0) {
      console.log('❌ No recipients found for group:', targetGroup);
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
    console.log('=== CREATING NOTIFICATIONS ===');
    const notifications = recipientIds.map(userId => ({
      user_id: userId,
      title: title,
      message: messageContent,
      type: 'sms_notification',
      is_read: false,
      metadata: {
        sender_phone: smsData.From,
        message_sid: smsData.MessageSid,
        original_message: smsData.Body
      },
      created_at: new Date().toISOString()
    }));

    console.log(`📬 Attempting to create ${notifications.length} notifications`);

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('gw_notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('❌ Error creating notifications:', notificationError);
        throw notificationError;
      }

      console.log(`✅ Successfully created ${notifications.length} notifications`);
    }

    // Log the SMS for audit trail
    console.log('=== LOGGING SMS ===');
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
      console.error('⚠️ Error logging SMS (non-critical):', logError);
    } else {
      console.log('✅ SMS logged successfully');
    }

    // Send confirmation response
    console.log('=== SENDING CONFIRMATION ===');
    const confirmationResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>✅ Success! Sent notification to ${notifications.length} ${targetGroup} members</Message>
      </Response>`;

    console.log('📤 Sending confirmation SMS response');
    return new Response(confirmationResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/xml', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('💥 CRITICAL ERROR processing SMS:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>❌ System error processing your message. Please contact support.</Message>
      </Response>`;

    return new Response(errorResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/xml', ...corsHeaders }
    });
  }
};

function parseSMSMessage(body: string): { title: string; message: string; group: string } {
  // Expected format with group targeting:
  // "@exec: Your message" → Send to president
  // "@admin: Your message" → Send to super admin
  // "@s1: Your message" → Send to soprano 1 section
  // "@s2: Your message" → Send to soprano 2 section
  // "@a1: Your message" → Send to alto 1 section
  // "@a2: Your message" → Send to alto 2 section
  // "@pr: Your message" → Send to PR coordinator
  // "Your message" → Default to all members
  
  const groupRegex = /^@(exec|admin|s1|s2|a1|a2|pr):\s*(.+)$/i;
  const match = body.trim().match(groupRegex);
  
  let group = 'all'; // Default to all members
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