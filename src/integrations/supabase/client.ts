
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

const SUPABASE_URL =
  TENANT?.supabaseUrl ||
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  "https://oopmlreysjzuxzylyheb.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  TENANT?.supabaseAnonKey ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcG1scmV5c2p6dXh6eWx5aGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNzg5NTUsImV4cCI6MjA2NDY1NDk1NX0.tDq4HaTAy9p80e4upXFHIA90gUxZSHTH5mnqfpxh7eg";

// Per-tenant DB header — Supabase Postgres routes to the right DB via the
// configured Kong/PostgREST instance; we send the tenant DB name in a header
// so a future API gateway can route correctly. Today this is informational.
const TENANT_HEADERS = TENANT?.database ? { 'x-tenant-db': TENANT.database } : {};

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
