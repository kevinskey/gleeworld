import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

interface ImportRequest {
  send_invite_emails?: boolean;
  default_role?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { send_invite_emails = false, default_role = "alumna" }: ImportRequest = 
      req.method === "POST" ? await req.json() : {};

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Initialize Supabase Admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
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
    const importedUsers = [];
    const failedImports = [];

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

        // Check if user already exists in auth.users
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser?.users?.some(u => u.email === contact.email);

        if (userExists) {
          console.log(`User ${contact.email} already exists, skipping...`);
          continue;
        }

        try {
          // Create auth user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: contact.email,
            email_confirm: !send_invite_emails, // Auto-confirm if not sending invites
            user_metadata: {
              first_name: contact.first_name || "",
              last_name: contact.last_name || "",
              full_name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email,
            },
          });

          if (createError) {
            console.error(`Failed to create user ${contact.email}:`, createError);
            failedImports.push({ email: contact.email, error: createError.message });
            continue;
          }

          console.log(`Created user: ${contact.email}`);

          // Update profile with role information
          if (newUser?.user) {
            const { error: profileError } = await supabaseAdmin
              .from("gw_profiles")
              .update({
                role: default_role,
                first_name: contact.first_name,
                last_name: contact.last_name,
                full_name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email,
              })
              .eq("user_id", newUser.user.id);

            if (profileError) {
              console.error(`Failed to update profile for ${contact.email}:`, profileError);
            }

            // Send invite email if requested
            if (send_invite_emails) {
              const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(contact.email);
              if (inviteError) {
                console.error(`Failed to send invite to ${contact.email}:`, inviteError);
              } else {
                console.log(`Sent invite email to ${contact.email}`);
              }
            }
          }

          importedUsers.push({
            email: contact.email,
            name: [contact.first_name, contact.last_name].filter(Boolean).join(" "),
          });

        } catch (error: any) {
          console.error(`Error importing ${contact.email}:`, error);
          failedImports.push({ email: contact.email, error: error.message });
        }
      }

      totalContacts += contacts.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Imported ${importedUsers.length} new users from ${audiences.length} Resend audiences`,
        stats: {
          audiences: audiences.length,
          total_contacts: totalContacts,
          imported_users: importedUsers.length,
          failed_imports: failedImports.length,
          invite_emails_sent: send_invite_emails,
        },
        imported_users: importedUsers,
        failed_imports: failedImports,
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
