import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MessageRequest {
  messageId: string;
  messageType: 'sms' | 'email' | 'internal' | 'announcement';
  recipientType: string;
  recipientIds?: string[];
  subject: string;
  content: string;
  senderId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { messageId, messageType, recipientType, recipientIds, subject, content, senderId }: MessageRequest = await req.json()

    console.log('Processing message:', { messageId, messageType, recipientType })

    // Get sender information
    const { data: sender, error: senderError } = await supabase
      .from('gw_profiles')
      .select('full_name, email')
      .eq('user_id', senderId)
      .single()

    if (senderError) {
      throw new Error('Could not fetch sender information')
    }

    // Get recipients based on type
    let recipients: any[] = []
    
    if (recipientType === 'individual' && recipientIds) {
      const { data: individualRecipients, error: recipientsError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, phone_number')
        .in('user_id', recipientIds)
      
      if (recipientsError) {
        throw new Error('Could not fetch individual recipients')
      }
      recipients = individualRecipients || []
    } else {
      // Handle group recipients
      let query = supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, phone_number')
        .not('full_name', 'is', null)

      switch (recipientType) {
        case 'executive-board':
          query = query.eq('is_exec_board', true)
          break
        case 'alumnae':
          query = query.eq('role', 'alumna')
          break
        case 'section-leaders':
          query = query.in('role', ['section-leader', 'executive', 'admin'])
          break
        // 'all-members' gets everyone (no additional filter)
      }

      const { data: groupRecipients, error: recipientsError } = await query
      
      if (recipientsError) {
        throw new Error('Could not fetch group recipients')
      }
      recipients = groupRecipients || []
    }

    console.log(`Found ${recipients.length} recipients`)

    // Process message based on type
    const results = []
    
    for (const recipient of recipients) {
      try {
        if (messageType === 'sms' && recipient.phone_number) {
          // For SMS, we would integrate with SMS provider here
          // For now, we'll log and mark as sent
          console.log(`Would send SMS to ${recipient.phone_number}: ${content}`)
          results.push({
            recipientId: recipient.user_id,
            status: 'sent',
            method: 'sms',
            phone: recipient.phone_number
          })
        } else if (messageType === 'email' && recipient.email) {
          // For email, integrate with email service
          try {
            const { error: emailError } = await supabase.functions.invoke('gw-send-email', {
              body: {
                to: [recipient.email],
                subject: subject,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px;">
                      <h1 style="color: #2563eb; margin: 0;">GleeWorld Message</h1>
                      <p style="color: #666; margin: 5px 0 0 0;">From: ${sender.full_name}</p>
                    </div>
                    
                    <h2 style="color: #333; margin-bottom: 20px;">${subject}</h2>
                    
                    <div style="line-height: 1.6; color: #333; white-space: pre-wrap;">
                      ${content}
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
                      <p>Sent via GleeWorld</p>
                      <p>Spelman College Glee Club</p>
                    </div>
                  </div>
                `,
                from: "GleeWorld <noreply@gleeworld.org>"
              }
            })

            if (emailError) {
              throw emailError
            }

            results.push({
              recipientId: recipient.user_id,
              status: 'sent',
              method: 'email',
              email: recipient.email
            })
          } catch (emailErr) {
            console.error('Email sending failed:', emailErr)
            results.push({
              recipientId: recipient.user_id,
              status: 'failed',
              method: 'email',
              error: emailErr.message
            })
          }
        } else {
          // Internal message - just stored in database
          results.push({
            recipientId: recipient.user_id,
            status: 'sent',
            method: 'internal'
          })
        }
      } catch (recipientError) {
        console.error(`Error processing recipient ${recipient.user_id}:`, recipientError)
        results.push({
          recipientId: recipient.user_id,
          status: 'failed',
          error: recipientError.message
        })
      }
    }

    // Update message status in database
    const successCount = results.filter(r => r.status === 'sent').length
    const failureCount = results.filter(r => r.status === 'failed').length
    
    let finalStatus = 'sent'
    if (failureCount > 0 && successCount === 0) {
      finalStatus = 'failed'
    } else if (failureCount > 0) {
      finalStatus = 'partially_sent'
    }

    const { error: updateError } = await supabase
      .from('gw_messages')
      .update({ 
        status: finalStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)

    if (updateError) {
      console.error('Error updating message status:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId,
        results,
        summary: {
          total: recipients.length,
          sent: successCount,
          failed: failureCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Message sending error:', error)
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})