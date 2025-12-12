import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "jsr:@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckoutConfirmationRequest {
  checkoutId: string;
  recipientEmail: string;
  recipientName: string;
  items: Array<{
    name: string;
    size?: string;
    color?: string;
    quantity: number;
  }>;
  checkedOutBy: string;
  checkoutDate: string;
  expectedReturnDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      checkoutId, 
      recipientEmail, 
      recipientName, 
      items, 
      checkedOutBy,
      checkoutDate,
      expectedReturnDate 
    }: CheckoutConfirmationRequest = await req.json();

    // Update checkout record to mark receipt as generated
    const { error: updateError } = await supabase
      .from('gw_wardrobe_checkouts')
      .update({ receipt_generated: true })
      .eq('id', checkoutId);

    if (updateError) {
      throw new Error(`Failed to update checkout: ${updateError.message}`);
    }

    // Create confirmation URL using the checkout ID
    const confirmationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/confirm-checkout-receipt?checkout_id=${checkoutId}`;

    // Generate items list for email
    const itemsList = items.map(item => {
      let itemText = `• ${item.name}`;
      if (item.size) itemText += ` (Size: ${item.size})`;
      if (item.color) itemText += ` (Color: ${item.color})`;
      itemText += ` - Quantity: ${item.quantity}`;
      return itemText;
    }).join('\n');

    const emailResponse = await resend.emails.send({
      from: "Glee Club Wardrobe <wardrobe@gleeworld.org>",
      to: [recipientEmail],
      subject: "Wardrobe Items Checked Out - Confirmation Required",
      html: `
        <h1>Wardrobe Checkout Confirmation</h1>
        <p>Hello ${recipientName},</p>
        
        <p>The following wardrobe items have been checked out to you by ${checkedOutBy}:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3>Items Checked Out:</h3>
          <pre style="white-space: pre-line;">${itemsList}</pre>
        </div>
        
        <p><strong>Checkout Date:</strong> ${new Date(checkoutDate).toLocaleDateString()}</p>
        ${expectedReturnDate ? `<p><strong>Expected Return Date:</strong> ${new Date(expectedReturnDate).toLocaleDateString()}</p>` : ''}
        
        <div style="margin: 30px 0;">
          <p><strong>IMPORTANT:</strong> Please confirm receipt of these items by clicking the button below:</p>
          <a href="${confirmationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">
            Confirm Receipt of Items
          </a>
        </div>
        
        <p>If you have any questions or did not receive these items, please contact the wardrobe manager immediately.</p>
        
        <p>Best regards,<br>Spelman College Glee Club<br>Wardrobe Management Team</p>
        
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message. Please do not reply to this email directly.
        </p>
      `,
    });

    console.log("Checkout confirmation email sent:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-checkout-confirmation function:", error);
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