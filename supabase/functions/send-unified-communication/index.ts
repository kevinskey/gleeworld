import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UnifiedCommunicationRequest {
  communication_id: string;
  title: string;
  content: string;
  recipient_groups: Array<{
    id: string;
    label: string;
    type: string;
  }>;
  channels: string[];
  scheduled_for?: string;
}

interface Recipient {
  user_id?: string;
  email: string;
  name?: string;
  voice_part?: string;
  role?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const request: UnifiedCommunicationRequest = await req.json();
    const { communication_id, title, content, recipient_groups, channels, scheduled_for } = request;

    console.log("Processing unified communication:", {
      communication_id,
      title,
      groups: recipient_groups.map(g => g.id),
      channels
    });

    // If scheduled, don't send now
    if (scheduled_for && new Date(scheduled_for) > new Date()) {
      console.log("Communication scheduled for later:", scheduled_for);
      return new Response(JSON.stringify({
        success: true,
        message: "Communication scheduled successfully"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Resolve recipients based on groups
    const recipients = await resolveRecipients(supabase, recipient_groups);
    console.log(`Resolved ${recipients.length} recipients`);

    // Track delivery attempts
    const deliveryResults = {
      email: 0,
      mass_email: 0,
      sms: 0,
      in_app: 0,
      errors: [] as string[]
    };

    for (const recipient of recipients) {
      for (const channel of channels) {
        try {
          // Create delivery record
          const { data: delivery } = await supabase
            .from('gw_communication_deliveries')
            .insert({
              communication_id,
              recipient_id: recipient.user_id,
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              channel,
              status: 'pending'
            })
            .select()
            .single();

          if (delivery) {
            // Send based on channel
            await sendToChannel(supabase, channel, recipient, title, content, delivery.id);
            deliveryResults[channel as keyof typeof deliveryResults]++;
          }
        } catch (error) {
          console.error(`Error sending ${channel} to ${recipient.email}:`, error);
          deliveryResults.errors.push(`${channel} to ${recipient.email}: ${error.message}`);
        }
      }
    }

    // Update communication status and summary
    await supabase
      .from('gw_communications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        delivery_summary: deliveryResults
      })
      .eq('id', communication_id);

    console.log("Communication sent successfully:", deliveryResults);

    return new Response(JSON.stringify({
      success: true,
      message: "Communication sent successfully",
      delivery_summary: deliveryResults
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-unified-communication function:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function resolveRecipients(supabase: any, groups: any[]): Promise<Recipient[]> {
  const allRecipients: Recipient[] = [];
  const processedEmails = new Set<string>();

  for (const group of groups) {
    let recipients: Recipient[] = [];

    switch (group.type) {
      case 'role':
        recipients = await getRoleRecipients(supabase, group.id);
        break;
      case 'voice_part':
        recipients = await getVoicePartRecipients(supabase, group.id);
        break;
      case 'academic_year':
        recipients = await getAcademicYearRecipients(supabase, group.id);
        break;
      case 'special':
        recipients = await getSpecialGroupRecipients(supabase, group.id);
        break;
    }

    // Add unique recipients
    for (const recipient of recipients) {
      if (!processedEmails.has(recipient.email)) {
        processedEmails.add(recipient.email);
        allRecipients.push(recipient);
      }
    }
  }

  return allRecipients;
}

async function getRoleRecipients(supabase: any, roleId: string): Promise<Recipient[]> {
  if (roleId === 'doc') {
    const { data } = await supabase
      .from('gw_profiles')
      .select('user_id, email, full_name, first_name, last_name')
      .eq('is_super_admin', true);
    
    return (data || []).map((profile: any) => ({
      user_id: profile.user_id,
      email: profile.email,
      name: profile.full_name || `${profile.first_name} ${profile.last_name}`.trim()
    }));
  }

  if (roleId === 'executive_board') {
    const { data } = await supabase
      .from('gw_executive_board_members')
      .select(`
        user_id,
        gw_profiles!inner(email, full_name, first_name, last_name)
      `)
      .eq('is_active', true);

    return (data || []).map((member: any) => ({
      user_id: member.user_id,
      email: member.gw_profiles.email,
      name: member.gw_profiles.full_name || `${member.gw_profiles.first_name} ${member.gw_profiles.last_name}`.trim()
    }));
  }

  if (roleId === 'section_leaders') {
    const { data } = await supabase
      .from('gw_executive_board_members')
      .select(`
        user_id,
        gw_profiles!inner(email, full_name, first_name, last_name)
      `)
      .eq('is_active', true)
      .in('position', ['section_leader_s1', 'section_leader_s2', 'section_leader_a1', 'section_leader_a2']);

    return (data || []).map((member: any) => ({
      user_id: member.user_id,
      email: member.gw_profiles.email,
      name: member.gw_profiles.full_name || `${member.gw_profiles.first_name} ${member.gw_profiles.last_name}`.trim()
    }));
  }

  if (roleId === 'student_conductor') {
    const { data } = await supabase
      .from('gw_executive_board_members')
      .select(`
        user_id,
        gw_profiles!inner(email, full_name, first_name, last_name)
      `)
      .eq('is_active', true)
      .eq('position', 'student_conductor');

    return (data || []).map((member: any) => ({
      user_id: member.user_id,
      email: member.gw_profiles.email,
      name: member.gw_profiles.full_name || `${member.gw_profiles.first_name} ${member.gw_profiles.last_name}`.trim()
    }));
  }

  return [];
}

async function getVoicePartRecipients(supabase: any, voicePartId: string): Promise<Recipient[]> {
  const voicePartMap = {
    'soprano_1': 'Soprano 1',
    'soprano_2': 'Soprano 2',
    'alto_1': 'Alto 1',
    'alto_2': 'Alto 2'
  };

  const voicePart = voicePartMap[voicePartId as keyof typeof voicePartMap];
  if (!voicePart) return [];

  const { data } = await supabase
    .from('gw_profiles')
    .select('user_id, email, full_name, first_name, last_name, voice_part')
    .eq('voice_part', voicePart);

  return (data || []).map((profile: any) => ({
    user_id: profile.user_id,
    email: profile.email,
    name: profile.full_name || `${profile.first_name} ${profile.last_name}`.trim(),
    voice_part: profile.voice_part
  }));
}

async function getAcademicYearRecipients(supabase: any, academicYearId: string): Promise<Recipient[]> {
  const currentYear = new Date().getFullYear();
  let graduationYear;

  switch (academicYearId) {
    case 'first_years':
      graduationYear = currentYear + 4;
      break;
    case 'sophomores':
      graduationYear = currentYear + 3;
      break;
    case 'juniors':
      graduationYear = currentYear + 2;
      break;
    case 'seniors':
      graduationYear = currentYear + 1;
      break;
    default:
      return [];
  }

  const { data } = await supabase
    .from('gw_profiles')
    .select('user_id, email, full_name, first_name, last_name, graduation_year')
    .eq('graduation_year', graduationYear);

  return (data || []).map((profile: any) => ({
    user_id: profile.user_id,
    email: profile.email,
    name: profile.full_name || `${profile.first_name} ${profile.last_name}`.trim()
  }));
}

async function getSpecialGroupRecipients(supabase: any, groupId: string): Promise<Recipient[]> {
  if (groupId.startsWith('direct_email:')) {
    const email = groupId.split(':')[1];
    if (email) {
      return [{ email, name: undefined } as Recipient];
    }
    return [];
  }

  if (groupId.startsWith('direct_user:')) {
    const userId = groupId.split(':')[1];
    if (!userId) return [];
    const { data } = await supabase
      .from('gw_profiles')
      .select('user_id, email, full_name, first_name, last_name')
      .eq('user_id', userId)
      .single();
    if (!data) return [];
    return [{
      user_id: data.user_id,
      email: data.email,
      name: data.full_name || `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim()
    }];
  }

  if (groupId === 'alumnae') {
    const { data } = await supabase
      .from('gw_profiles')
      .select('user_id, email, full_name, first_name, last_name')
      .eq('role', 'alumna');

    return (data || []).map((profile: any) => ({
      user_id: profile.user_id,
      email: profile.email,
      name: profile.full_name || `${profile.first_name} ${profile.last_name}`.trim(),
      role: 'alumna'
    }));
  }

  if (groupId === 'all_users') {
    const { data } = await supabase
      .from('gw_profiles')
      .select('user_id, email, full_name, first_name, last_name')
      .not('user_id', 'is', null);

    return (data || []).map((profile: any) => ({
      user_id: profile.user_id,
      email: profile.email,
      name: profile.full_name || `${profile.first_name} ${profile.last_name}`.trim()
    }));
  }

  return [];
}

async function sendToChannel(
  supabase: any,
  channel: string,
  recipient: Recipient,
  title: string,
  content: string,
  deliveryId: string
) {
  try {
    switch (channel) {
      case 'email':
        await supabase.functions.invoke('gw-send-email', {
          body: {
            to: recipient.email,
            subject: title,
            html: content,
            delivery_id: deliveryId
          }
        });
        break;

      case 'mass_email':
        // For mass email, use Elastic Email
        await supabase.functions.invoke('send-elastic-email', {
          body: {
            subject: title,
            content: content,
            recipients: [{ email: recipient.email, name: recipient.name || '' }],
            delivery_id: deliveryId
          }
        });
        break;

      case 'sms':
        if (recipient.user_id) {
          // Get phone number from profile
          const { data: profile } = await supabase
            .from('gw_profiles')
            .select('phone_number')
            .eq('user_id', recipient.user_id)
            .single();

          if (profile?.phone_number) {
            await supabase.functions.invoke('gw-send-sms', {
              body: {
                to: profile.phone_number,
                message: `${title}\n\n${content}`,
                delivery_id: deliveryId
              }
            });
          }
        }
        break;

      case 'in_app':
        if (recipient.user_id) {
          await supabase
            .from('gw_notifications')
            .insert({
              user_id: recipient.user_id,
              title: title,
              message: content,
              type: 'communication',
              delivery_id: deliveryId
            });
        }
        break;
    }

    // Update delivery status
    await supabase
      .from('gw_communication_deliveries')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', deliveryId);

  } catch (error) {
    // Update delivery status as failed
    await supabase
      .from('gw_communication_deliveries')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', deliveryId);
    
    throw error;
  }
}

serve(handler);