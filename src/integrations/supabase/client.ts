
// Read URL + anon key from a synchronous boot-time global that index.html sets
// from /tenant-config.json (or fall back to VITE_* env / hosted Supabase).
// This lets one frontend build serve many tenant subdomains, each pointing
// at its own database.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

declare global {
  interface Window {
    __TENANT_CONFIG__?: {
      tenant?: string;
      org?: string;
      supabaseUrl?: string;
      supabaseAnonKey?: string;
      database?: string;
    };
  }
}

const TENANT = typeof window !== 'undefined' ? window.__TENANT_CONFIG__ : undefined;

// Tenant slug for signup metadata: the handle_new_user_profile trigger uses
// raw_user_meta_data.tenant_slug to enroll the new user in the right tenant.
export const getTenantSlug = () => TENANT?.tenant || 'main';

export const SUPABASE_URL =
  TENANT?.supabaseUrl ||
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  "https://supabase.gleeworld.org";

export const SUPABASE_PUBLISHABLE_KEY =
  TENANT?.supabaseAnonKey ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24iLCAiaXNzIjogInN1cGFiYXNlIiwgImlhdCI6IDE3ODAxNzEwNzcsICJleHAiOiAyMDk1NTMxMDc3fQ.orWLkajK-mQywKVcWS48HVXU8uKWtsL6iY5BAaVn0xc";

// Per-tenant DB header — Supabase Postgres routes to the right DB via the
// configured Kong/PostgREST instance; we send the tenant DB name in a header
// so a future API gateway can route correctly. Today this is informational.
const TENANT_HEADERS = {
  // anon requests carry no JWT tenant claim; the anon_tenant_isolation RLS
  // policies scope them by this header (resolved via anon_tenant_id()).
  'x-tenant-slug': TENANT?.tenant || 'main',
  ...(TENANT?.database ? { 'x-tenant-db': TENANT.database } : {}),
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase: any = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: TENANT_HEADERS
  }
});
