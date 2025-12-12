import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsletterNotificationRequest {
  newsletter_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newsletter_id }: NewsletterNotificationRequest = await req.json();

    if (!newsletter_id) {
      return new Response(
        JSON.stringify({ error: "newsletter_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the newsletter
    const { data: newsletter, error: newsletterError } = await supabase
      .from('alumnae_newsletters')
      .select('*')
      .eq('id', newsletter_id)
      .single();

    if (newsletterError || !newsletter) {
      console.error('Error fetching newsletter:', newsletterError);
      return new Response(
        JSON.stringify({ error: "Newsletter not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all alumnae email addresses
    const { data: alumnae, error: alumnaeError } = await supabase
      .from('gw_profiles')
      .select('email, full_name')
      .eq('role', 'alumna')
      .eq('verified', true);

    if (alumnaeError) {
      console.error('Error fetching alumnae:', alumnaeError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch alumnae list" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!alumnae || alumnae.length === 0) {
      return new Response(
        JSON.stringify({ message: "No verified alumnae found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = months[newsletter.month - 1];

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Glee Club Newsletter</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #6b7280;
              font-size: 14px;
            }
            ${newsletter.cover_image_url ? `
            .cover-image {
              width: 100%;
              max-width: 600px;
              height: auto;
              border-radius: 8px;
              margin: 20px 0;
            }
            ` : ''}
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎵 Spelman College Glee Club</h1>
            <p>New Newsletter Available</p>
          </div>
          <div class="content">
            <h2>${newsletter.title}</h2>
            <p><strong>${monthName} ${newsletter.year}</strong></p>
            
            ${newsletter.cover_image_url ? `
              <img src="${newsletter.cover_image_url}" alt="${newsletter.title}" class="cover-image" />
            ` : ''}
            
            <p>Dear Glee Club Alumna,</p>
            <p>We're excited to share this month's newsletter with you! Stay connected with the latest news, events, and stories from your Glee Club family.</p>
            
            <div style="text-align: center;">
              <a href="https://gleeworld.org/dashboard/alumnae" class="button">Read Newsletter</a>
            </div>
            
            ${newsletter.pdf_url ? `
              <p style="text-align: center; margin-top: 10px;">
                <a href="${newsletter.pdf_url}" style="color: #667eea;">Download PDF Version</a>
              </p>
            ` : ''}
            
            <p>We hope you enjoy this month's edition!</p>
            <p>With love,<br><strong>Spelman College Glee Club</strong></p>
          </div>
          <div class="footer">
            <p>You received this email as a verified alumna of the Spelman College Glee Club.</p>
            <p>© ${new Date().getFullYear()} Spelman College Glee Club. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    // Send emails in batches to avoid rate limits
    const batchSize = 50;
    let successCount = 0;
    let failureCount = 0;

    console.log(`Sending newsletter to ${alumnae.length} alumnae in batches of ${batchSize}...`);

    for (let i = 0; i < alumnae.length; i += batchSize) {
      const batch = alumnae.slice(i, i + batchSize);
      const emailPromises = batch.map(async (alumna) => {
        try {
          const { error } = await resend.emails.send({
            from: "Spelman Glee Club <newsletter@gleeworld.org>",
            to: [alumna.email],
            subject: `📬 New Newsletter: ${newsletter.title} - ${monthName} ${newsletter.year}`,
            html: emailHtml,
          });

          if (error) {
            console.error(`Failed to send to ${alumna.email}:`, error);
            failureCount++;
            return false;
          }
          
          successCount++;
          return true;
        } catch (err) {
          console.error(`Exception sending to ${alumna.email}:`, err);
          failureCount++;
          return false;
        }
      });

      await Promise.all(emailPromises);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < alumnae.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Email sending complete. Success: ${successCount}, Failures: ${failureCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Newsletter notifications sent successfully`,
        stats: {
          total: alumnae.length,
          successful: successCount,
          failed: failureCount
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-newsletter-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
