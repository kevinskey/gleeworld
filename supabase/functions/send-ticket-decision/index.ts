import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Twilio from "npm:twilio@4.19.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketDecisionRequest {
  requestId: string;
  decision: 'approved' | 'rejected';
  adminMessage: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  numTickets: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-ticket-decision function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, decision, adminMessage, recipientName, recipientEmail, recipientPhone, numTickets }: TicketDecisionRequest = await req.json();

    console.log(`Processing ticket decision: ${decision} for ${recipientName} (${recipientEmail})`);

    // Create Supabase client to update the request status
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Map decision to valid database status (rejected -> cancelled)
    const dbStatus = decision === 'rejected' ? 'cancelled' : decision;

    // Update the ticket request status
    const { error: updateError } = await supabase
      .from('concert_ticket_requests')
      .update({ 
        status: dbStatus,
        notes: adminMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      console.error("Failed to update ticket request:", updateError);
      throw new Error(`Failed to update ticket request: ${updateError.message}`);
    }

    // Prepare email content based on decision
    const isApproved = decision === 'approved';
    const subjectLine = isApproved 
      ? "🎉 Your Spelman Glee Club Concert Ticket Request is Approved!" 
      : "Spelman Glee Club Concert Ticket Request Update";

    const emailHtml = isApproved ? `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Georgia', serif; background: #f8f9fa; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
          .content { padding: 40px 30px; }
          .success-badge { background: #10b981; color: white; padding: 8px 20px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
          .ticket-count { font-size: 48px; color: #1e3a5f; font-weight: bold; text-align: center; margin: 20px 0; }
          .message-box { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Spelman College Glee Club</h1>
            <p>To Amaze and Inspire</p>
          </div>
          <div class="content">
            <span class="success-badge">✓ APPROVED</span>
            <h2>Congratulations, ${recipientName}!</h2>
            <p>We're thrilled to inform you that your concert ticket request has been <strong>approved</strong>!</p>
            <div class="ticket-count">${numTickets} Ticket${numTickets > 1 ? 's' : ''}</div>
            <p style="text-align: center; color: #666;">Reserved for you</p>
            ${adminMessage ? `
            <div class="message-box">
              <strong>Message from our team:</strong>
              <p style="margin: 10px 0 0;">${adminMessage}</p>
            </div>
            ` : ''}
            <p>We look forward to seeing you at the concert! Please check your text messages for additional pickup instructions.</p>
          </div>
          <div class="footer">
            <p>Spelman College Glee Club • Atlanta, GA</p>
            <p>Questions? Reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Georgia', serif; background: #f8f9fa; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
          .content { padding: 40px 30px; }
          .message-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Spelman College Glee Club</h1>
            <p>To Amaze and Inspire</p>
          </div>
          <div class="content">
            <h2>Dear ${recipientName},</h2>
            <p>Thank you for your interest in attending our concert. Unfortunately, we are unable to fulfill your ticket request at this time.</p>
            ${adminMessage ? `
            <div class="message-box">
              <strong>Message from our team:</strong>
              <p style="margin: 10px 0 0;">${adminMessage}</p>
            </div>
            ` : ''}
            <p>We truly appreciate your support of the Spelman College Glee Club and hope to see you at a future performance.</p>
            <p>With gratitude,<br><strong>The Spelman College Glee Club</strong></p>
          </div>
          <div class="footer">
            <p>Spelman College Glee Club • Atlanta, GA</p>
            <p>Questions? Reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    console.log(`Sending email to ${recipientEmail}`);
    const emailResponse = await resend.emails.send({
      from: "Spelman Glee Club <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: subjectLine,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Send SMS with admin instructions
    if (recipientPhone && adminMessage) {
      try {
        const twilioClient = Twilio(
          Deno.env.get("TWILIO_ACCOUNT_SID")!,
          Deno.env.get("TWILIO_AUTH_TOKEN")!
        );

        // Format phone number
        let formattedPhone = recipientPhone.replace(/\D/g, '');
        if (formattedPhone.length === 10) {
          formattedPhone = '+1' + formattedPhone;
        } else if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+' + formattedPhone;
        }

        const smsBody = isApproved 
          ? `🎉 Hi ${recipientName}! Your Spelman Glee Club concert ticket request has been APPROVED for ${numTickets} ticket(s)!\n\n${adminMessage}\n\n- Spelman Glee Club`
          : `Hi ${recipientName}, regarding your Spelman Glee Club concert ticket request:\n\n${adminMessage}\n\n- Spelman Glee Club`;

        console.log(`Sending SMS to ${formattedPhone}`);
        await twilioClient.messages.create({
          body: smsBody,
          from: Deno.env.get("TWILIO_PHONE_NUMBER")!,
          to: formattedPhone,
        });

        console.log("SMS sent successfully");
      } catch (smsError) {
        console.error("SMS sending failed:", smsError);
        // Don't fail the whole request if SMS fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Ticket request ${decision}. Email sent successfully.`,
        emailResponse 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-ticket-decision function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
