import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const handler = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const checkoutId = url.searchParams.get('checkout_id');

    if (!checkoutId) {
      return new Response(
        `<html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px;">
              <h2>Invalid Confirmation Link</h2>
              <p>The confirmation link is invalid or missing required parameters.</p>
            </div>
          </body>
        </html>`,
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find the checkout with this ID
    const { data: checkout, error: findError } = await supabase
      .from('gw_wardrobe_checkouts')
      .select(`
        id,
        status,
        member_id,
        inventory_item_id,
        quantity,
        wardrobe_items(name),
        gw_profiles!gw_wardrobe_checkouts_member_id_fkey(first_name, last_name, full_name)
      `)
      .eq('id', checkoutId)
      .single();

    if (findError || !checkout) {
      return new Response(
        `<html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px;">
              <h2>Checkout Not Found</h2>
              <p>No checkout found with this ID. The link may be expired or invalid.</p>
            </div>
          </body>
        </html>`,
        {
          status: 404,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    // Check if already confirmed
    if (checkout.status === 'confirmed') {
      return new Response(
        `<html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px;">
              <h2>Already Confirmed</h2>
              <p>This checkout has already been confirmed.</p>
              <p>Thank you for confirming receipt of your wardrobe items.</p>
            </div>
          </body>
        </html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    // Update checkout as confirmed
    const { error: updateError } = await supabase
      .from('gw_wardrobe_checkouts')
      .update({ 
        status: 'confirmed'
      })
      .eq('id', checkout.id);

    if (updateError) {
      throw new Error(`Failed to confirm checkout: ${updateError.message}`);
    }

    console.log(`Checkout ${checkout.id} confirmed by email`);

    const userName = checkout.gw_profiles?.full_name || 
      `${checkout.gw_profiles?.first_name || ''} ${checkout.gw_profiles?.last_name || ''}`.trim() ||
      'User';

    return new Response(
      `<html>
        <head>
          <title>Checkout Confirmed - Glee Club Wardrobe</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #007bff;">Spelman College Glee Club</h1>
            <h2 style="color: #28a745;">Checkout Confirmed! ✓</h2>
          </div>
          
          <div style="background-color: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>Confirmation Successful</h3>
            <p>Thank you, <strong>${userName}</strong>!</p>
            <p>You have successfully confirmed receipt of:</p>
            <p><strong>${checkout.wardrobe_items?.name || 'Wardrobe Item'}</strong> (Quantity: ${checkout.quantity})</p>
            <p><small>Confirmed on: ${new Date().toLocaleString()}</small></p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>Important Reminders:</h4>
            <ul>
              <li>Please take good care of the wardrobe items</li>
              <li>Return items by the expected return date</li>
              <li>Contact the wardrobe manager if you have any issues</li>
              <li>Items should be returned clean and in good condition</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666;">You can now close this window.</p>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );

  } catch (error: any) {
    console.error("Error in confirm-checkout-receipt function:", error);
    return new Response(
      `<html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px;">
            <h2>Error Confirming Checkout</h2>
            <p>An error occurred while confirming your checkout. Please contact the wardrobe manager.</p>
            <p><small>Error: ${error.message}</small></p>
          </div>
        </body>
      </html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
};

serve(handler);