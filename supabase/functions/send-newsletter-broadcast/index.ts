import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewsletterBroadcastRequest {
  newsletter_id: string;
  audience_id?: string; // Optional: specific audience ID, otherwise uses default
  from_email?: string; // Optional: sender email
  from_name?: string; // Optional: sender name
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
      .from("gw_profiles")
      .select("is_admin, is_super_admin")
      .eq("user_id", user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_super_admin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { 
      newsletter_id, 
      audience_id,
      from_email = "onboarding@resend.dev",
      from_name = "Spelman College Glee Club"
    }: NewsletterBroadcastRequest = await req.json();

    console.log("Sending newsletter broadcast:", { newsletter_id, audience_id });

    // Fetch newsletter data
    const { data: newsletter, error: newsletterError } = await supabase
      .from("alumnae_newsletters")
      .select("*")
      .eq("id", newsletter_id)
      .single();

    if (newsletterError || !newsletter) {
      throw new Error("Newsletter not found");
    }

    if (!newsletter.is_published) {
      throw new Error("Newsletter must be published before sending");
    }

    console.log("Newsletter data:", {
      title: newsletter.title,
      month: newsletter.month,
      year: newsletter.year,
    });

    // Create email HTML content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #55bbee;
            }
            .header h1 {
              color: #11448e;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              color: #666;
              margin: 10px 0 0 0;
            }
            .content {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${newsletter.title}</h1>
              <p>Volume ${newsletter.volume} | ${getMonthName(newsletter.month)} ${newsletter.year}</p>
            </div>
            ${newsletter.cover_image_url ? `
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="${newsletter.cover_image_url}" alt="Newsletter Cover" />
              </div>
            ` : ''}
            <div class="content">
              ${newsletter.content}
            </div>
            <div class="footer">
              <p>Spelman College Glee Club Alumnae Newsletter</p>
              <p>To Amaze and Inspire</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email broadcast
    let emailResponse;
    
    if (audience_id) {
      // Send to specific audience
      emailResponse = await resend.emails.send({
        from: `${from_name} <${from_email}>`,
        to: [`audience:${audience_id}`],
        subject: newsletter.title,
        html: emailHtml,
      });
    } else {
      // If no audience_id provided, we'll need to send individually
      // First, fetch all verified alumnae emails
      const { data: alumnae } = await supabase
        .from("gw_profiles")
        .select("email")
        .eq("role", "alumna")
        .eq("verified", true);

      if (!alumnae || alumnae.length === 0) {
        throw new Error("No verified alumnae found");
      }

      const emails = alumnae.map(a => a.email).filter(Boolean);
      
      console.log(`Sending to ${emails.length} alumnae members`);

      // Send using BCC for privacy
      emailResponse = await resend.emails.send({
        from: `${from_name} <${from_email}>`,
        to: [from_email], // Send to self
        bcc: emails,
        subject: newsletter.title,
        html: emailHtml,
      });
    }

    console.log("Email broadcast sent successfully:", emailResponse);

    // Update newsletter with sent timestamp
    await supabase
      .from("alumnae_newsletters")
      .update({ 
        published_at: new Date().toISOString(),
      })
      .eq("id", newsletter_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Newsletter broadcast sent successfully",
        email_id: emailResponse.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-newsletter-broadcast function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[month - 1] || "Unknown";
}

serve(handler);
