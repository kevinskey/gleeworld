import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ElasticEmailRequest {
  subject: string;
  content: string;
  recipients: Array<{
    email: string;
    name: string;
  }>;
  priority?: string;
  scheduleTime?: string;
  sender?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, content, recipients, priority, scheduleTime, sender }: ElasticEmailRequest = await req.json();

    const elasticEmailApiKey = Deno.env.get("ELASTIC_EMAIL_API_KEY");
    
    if (!elasticEmailApiKey) {
      throw new Error("Elastic Email API key not configured");
    }

    // Prepare email data for Elastic Email API
    const emailData = {
      Recipients: recipients.map(r => ({ Email: r.email, Fields: { name: r.name } })),
      Content: {
        Body: [
          {
            ContentType: "HTML",
            Content: content
          }
        ],
        Subject: subject,
        From: "noreply@yourdomain.com" // Replace with your verified sender email
      }
    };

    // Send email via Elastic Email API
    const response = await fetch("https://api.elasticemail.com/v2/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ElasticEmail-ApiKey": elasticEmailApiKey,
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Elastic Email API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Elastic Email response:", result);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Email sent to ${recipients.length} recipients`,
      elasticEmailResponse: result
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-elastic-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);