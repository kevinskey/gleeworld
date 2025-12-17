import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AppointmentData {
  id: string;
  title: string;
  description?: string;
  appointment_date: string;
  duration_minutes: number;
  client_name: string;
  client_email: string;
  location?: string;
}

// Generate JWT for Google Service Account
async function getGoogleAccessToken(): Promise<string> {
  const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  }

  const credentials = JSON.parse(serviceAccountKey);
  const now = Math.floor(Date.now() / 1000);
  
  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // Create JWT claims
  const claims = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // 1 hour
  };

  // Base64url encode
  const base64url = (obj: object) => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const headerEncoded = base64url(header);
  const claimsEncoded = base64url(claims);
  const signatureInput = `${headerEncoded}.${claimsEncoded}`;

  // Import private key and sign
  const privateKey = credentials.private_key;
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${signatureInput}.${signatureEncoded}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('Token exchange error:', error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Create Google Calendar event
async function createCalendarEvent(appointment: AppointmentData, accessToken: string): Promise<string> {
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID') || 'primary';
  
  const startDate = new Date(appointment.appointment_date);
  const endDate = new Date(startDate.getTime() + appointment.duration_minutes * 60000);

  const event = {
    summary: `${appointment.title} - ${appointment.client_name}`,
    description: `Client: ${appointment.client_name}\nEmail: ${appointment.client_email}\n\n${appointment.description || ''}`,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'America/New_York',
    },
    attendees: appointment.client_email ? [{ email: appointment.client_email }] : [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 30 }, // 30 minutes before
      ],
    },
  };

  if (appointment.location) {
    (event as any).location = appointment.location;
  }

  console.log('Creating calendar event:', JSON.stringify(event, null, 2));

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Google Calendar API error:', error);
    throw new Error(`Failed to create calendar event: ${error}`);
  }

  const createdEvent = await response.json();
  console.log('Created Google Calendar event:', createdEvent.id);
  return createdEvent.id;
}

// Update Google Calendar event
async function updateCalendarEvent(eventId: string, appointment: AppointmentData, accessToken: string): Promise<void> {
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID') || 'primary';
  
  const startDate = new Date(appointment.appointment_date);
  const endDate = new Date(startDate.getTime() + appointment.duration_minutes * 60000);

  const event = {
    summary: `${appointment.title} - ${appointment.client_name}`,
    description: `Client: ${appointment.client_name}\nEmail: ${appointment.client_email}\n\n${appointment.description || ''}`,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'America/New_York',
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Google Calendar update error:', error);
    throw new Error(`Failed to update calendar event: ${error}`);
  }

  console.log('Updated Google Calendar event:', eventId);
}

// Delete Google Calendar event
async function deleteCalendarEvent(eventId: string, accessToken: string): Promise<void> {
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID') || 'primary';

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    console.error('Google Calendar delete error:', error);
    throw new Error(`Failed to delete calendar event: ${error}`);
  }

  console.log('Deleted Google Calendar event:', eventId);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, appointment, eventId } = await req.json();
    console.log(`Processing ${action} action for appointment:`, appointment?.id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get Google access token
    const accessToken = await getGoogleAccessToken();

    let googleEventId: string | null = null;

    switch (action) {
      case 'create': {
        googleEventId = await createCalendarEvent(appointment, accessToken);
        
        // Store the Google Calendar event ID in our database
        const { error: updateError } = await supabase
          .from('gw_appointment_calendar_sync')
          .upsert({
            appointment_id: appointment.id,
            calendar_type: 'google',
            external_event_id: googleEventId,
            sync_status: 'synced',
            last_sync_at: new Date().toISOString(),
          }, {
            onConflict: 'appointment_id,calendar_type'
          });

        if (updateError) {
          console.error('Error storing sync record:', updateError);
        }
        break;
      }

      case 'update': {
        if (!eventId) {
          // No existing event, create new one
          googleEventId = await createCalendarEvent(appointment, accessToken);
        } else {
          await updateCalendarEvent(eventId, appointment, accessToken);
          googleEventId = eventId;
        }

        // Update sync record
        const { error: updateError } = await supabase
          .from('gw_appointment_calendar_sync')
          .upsert({
            appointment_id: appointment.id,
            calendar_type: 'google',
            external_event_id: googleEventId,
            sync_status: 'synced',
            last_sync_at: new Date().toISOString(),
          }, {
            onConflict: 'appointment_id,calendar_type'
          });

        if (updateError) {
          console.error('Error updating sync record:', updateError);
        }
        break;
      }

      case 'delete': {
        if (eventId) {
          await deleteCalendarEvent(eventId, accessToken);
          
          // Remove sync record
          await supabase
            .from('gw_appointment_calendar_sync')
            .delete()
            .eq('appointment_id', appointment.id)
            .eq('calendar_type', 'google');
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        googleEventId,
        message: `Successfully ${action}d calendar event` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-appointment-to-gcal:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
