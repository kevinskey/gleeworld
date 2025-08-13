import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🎭 Function started");
    
    // Check API key first
    const apiKey = Deno.env.get("RESEND_API_KEY");
    console.log("API key exists:", !!apiKey);
    
    if (!apiKey) {
      console.error("No API key found");
      return new Response(JSON.stringify({ 
        error: 'RESEND_API_KEY not configured' 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("API key found, importing Resend...");
    
    // Import Resend after checking API key
    const { Resend } = await import("npm:resend@2.0.0");
    const resend = new Resend(apiKey);
    
    console.log("Resend initialized, parsing request...");
    
    const data = await req.json();
    console.log("Request data received for:", data.recipientEmail);

    console.log("Sending test email...");
    
    const result = await resend.emails.send({
      from: "Spelman Glee Club <noreply@gleeworld.org>",
      to: [data.recipientEmail],
      subject: "Test Email",
      html: "<p>This is a test email from the reschedule function.</p>",
    });

    console.log("Email result:", JSON.stringify(result, null, 2));

    return new Response(JSON.stringify({
      success: true,
      result: result
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Function error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);