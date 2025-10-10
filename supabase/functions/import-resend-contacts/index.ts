import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendContact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  unsubscribed: boolean;
}

interface ResendAudience {
  id: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Fetching audiences from Resend...");

    // Fetch audiences from Resend
    const audiencesResponse = await fetch("https://api.resend.com/audiences", {
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!audiencesResponse.ok) {
      const error = await audiencesResponse.text();
      throw new Error(`Failed to fetch audiences: ${error}`);
    }

    const audiencesData = await audiencesResponse.json();
    const audiences: ResendAudience[] = audiencesData.data || [];

    console.log(`Found ${audiences.length} audiences`);

    let totalContacts = 0;
    const importedContacts = [];

    // Fetch contacts from each audience
    for (const audience of audiences) {
      console.log(`Fetching contacts from audience: ${audience.name}`);
      
      const contactsResponse = await fetch(
        `https://api.resend.com/audiences/${audience.id}/contacts`,
        {
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!contactsResponse.ok) {
        console.error(`Failed to fetch contacts for audience ${audience.name}`);
        continue;
      }

      const contactsData = await contactsResponse.json();
      const contacts: ResendContact[] = contactsData.data || [];

      console.log(`Found ${contacts.length} contacts in ${audience.name}`);

      for (const contact of contacts) {
        if (contact.unsubscribed) continue;

        // Check if contact already exists
        const { data: existingProfile } = await supabaseClient
          .from("gw_profiles")
          .select("id, email")
          .eq("email", contact.email)
          .single();

        if (!existingProfile) {
          importedContacts.push({
            email: contact.email,
            first_name: contact.first_name,
            last_name: contact.last_name,
            full_name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || null,
            role: "alumna",
            created_at: new Date().toISOString(),
          });
        }
      }

      totalContacts += contacts.length;
    }

    console.log(`Importing ${importedContacts.length} new contacts...`);

    // Bulk insert new contacts
    if (importedContacts.length > 0) {
      const { error: insertError } = await supabaseClient
        .from("gw_profiles")
        .insert(importedContacts);

      if (insertError) {
        console.error("Error inserting contacts:", insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Imported ${importedContacts.length} new contacts from ${audiences.length} audiences`,
        stats: {
          audiences: audiences.length,
          total_contacts: totalContacts,
          new_contacts: importedContacts.length,
        },
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
    console.error("Error importing Resend contacts:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to import contacts",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);
