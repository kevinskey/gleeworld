import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_ORG_NAME = "GleeWorld";

let cached: { orgName: string; at: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getOrgName(client?: SupabaseClient): Promise<string> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.orgName;
  try {
    const supabase = client ?? createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data } = await supabase
      .from("gw_branding_settings")
      .select("org_name")
      .order("id")
      .limit(1)
      .maybeSingle();
    const orgName = data?.org_name?.trim() || DEFAULT_ORG_NAME;
    cached = { orgName, at: Date.now() };
    return orgName;
  } catch {
    return DEFAULT_ORG_NAME;
  }
}
