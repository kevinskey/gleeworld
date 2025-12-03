import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';

Deno.serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { recipientId, title, body, data } = await req.json();

    console.log('Sending push notification to user:', recipientId);

    // Get user's push subscriptions
    const { data: subscriptions, error: subsError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', recipientId);

    if (subsError) throw subsError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No subscriptions found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send push notification to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const payload = JSON.stringify({
          title,
          body,
          icon: '/logo-192.png',
          badge: '/logo-96.png',
          data: data || {},
        });

        // Use web-push library (imported via esm.sh)
        const webpush = await import('https://esm.sh/web-push@3.6.6');
        
        webpush.default.setVapidDetails(
          'mailto:gleeworldapp@gmail.com',
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY
        );

        return await webpush.default.sendNotification(pushSubscription, payload);
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`Sent ${successCount}/${subscriptions.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: subscriptions.length 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
