import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-ORDER-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const { orderId, emailType } = await req.json();
    
    if (!orderId) {
      throw new Error("Order ID is required");
    }
    
    logStep("Processing email", { orderId, emailType });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('gw_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    logStep("Order fetched", { orderNumber: order.order_number, email: order.customer_email });

    // Fetch order items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('gw_order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) {
      logStep("Warning: Could not fetch items", { error: itemsError.message });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      logStep("No RESEND_API_KEY configured, skipping email send");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Email skipped - no API key configured" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Determine email type and content
    let subject = '';
    let htmlContent = '';
    const customerName = order.customer_name || 'Valued Customer';
    const orderNumber = order.order_number;

    const itemsHtml = items?.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.product_title}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${item.total_price.toFixed(2)}</td>
      </tr>
    `).join('') || '';

    switch (emailType) {
      case 'confirmation':
        subject = `Order Confirmed - ${orderNumber}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #003666; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">GleeWorld Boutique</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #003666;">Thank you for your order!</h2>
              <p>Hi ${customerName},</p>
              <p>We've received your order and are getting it ready. Here are the details:</p>
              
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${order.status}</p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px;">
                <thead>
                  <tr style="background: #003666; color: white;">
                    <th style="padding: 12px; text-align: left;">Item</th>
                    <th style="padding: 12px; text-align: center;">Qty</th>
                    <th style="padding: 12px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="padding: 12px; text-align: right;"><strong>Subtotal:</strong></td>
                    <td style="padding: 12px; text-align: right;">$${order.subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding: 12px; text-align: right;"><strong>Shipping:</strong></td>
                    <td style="padding: 12px; text-align: right;">$${(order.shipping_cost || 0).toFixed(2)}</td>
                  </tr>
                  <tr style="background: #f0f0f0;">
                    <td colspan="2" style="padding: 12px; text-align: right;"><strong>Total:</strong></td>
                    <td style="padding: 12px; text-align: right;"><strong>$${order.total_amount.toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
              
              <p style="margin-top: 30px; color: #666;">We'll send you another email when your order ships.</p>
              <p style="color: #666;">Thank you for supporting the Spelman College Glee Club!</p>
            </div>
            <div style="background: #003666; padding: 15px; text-align: center; color: white; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Spelman College Glee Club. All rights reserved.</p>
            </div>
          </div>
        `;
        break;

      case 'shipped':
        subject = `Your Order Has Shipped - ${orderNumber}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #003666; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">GleeWorld Boutique</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #003666;">Your order is on its way!</h2>
              <p>Hi ${customerName},</p>
              <p>Great news! Your order has been shipped.</p>
              
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                ${order.tracking_number ? `<p><strong>Tracking Number:</strong> ${order.tracking_number}</p>` : ''}
                ${order.tracking_url ? `<p><a href="${order.tracking_url}" style="color: #003666;">Track Your Package</a></p>` : ''}
              </div>
              
              <p style="color: #666;">Thank you for shopping with GleeWorld!</p>
            </div>
            <div style="background: #003666; padding: 15px; text-align: center; color: white; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Spelman College Glee Club. All rights reserved.</p>
            </div>
          </div>
        `;
        break;

      case 'admin_notification':
        subject = `New Order Received - ${orderNumber}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #003666; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">New Order Alert</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #003666;">A new order has been placed!</h2>
              
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${order.customer_email}</p>
                <p><strong>Total:</strong> $${order.total_amount.toFixed(2)}</p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px;">
                <thead>
                  <tr style="background: #003666; color: white;">
                    <th style="padding: 12px; text-align: left;">Item</th>
                    <th style="padding: 12px; text-align: center;">Qty</th>
                    <th style="padding: 12px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <p style="margin-top: 20px;">
                <a href="https://gleeworld.org/admin/inventory-shop" style="background: #003666; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Order in Admin
                </a>
              </p>
            </div>
          </div>
        `;
        break;

      default:
        throw new Error(`Unknown email type: ${emailType}`);
    }

    // Send email via Resend
    const recipientEmail = emailType === 'admin_notification' 
      ? 'shop@gleeworld.org' 
      : order.customer_email;

    logStep("Sending email", { to: recipientEmail, subject });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "GleeWorld Boutique <orders@gleeworld.org>",
        to: [recipientEmail],
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailRes.json();
    
    if (!emailRes.ok) {
      logStep("Email send failed", emailResult);
      throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
    }

    logStep("Email sent successfully", { emailId: emailResult.id });

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResult.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
