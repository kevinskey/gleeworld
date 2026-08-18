// The signed-in user's WhatsApp consent record. Owner-private by RLS, so
// nothing here passes a user id — the database defaults it to auth.uid() and
// refuses anything else.
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppOptIn {
  id: string;
  phone_e164: string;
  opted_in_at: string;
  opted_out_at: string | null;
  last_sent_at: string | null;
}

const COLUMNS = 'id, phone_e164, opted_in_at, opted_out_at, last_sent_at';

export async function getWhatsAppOptIn(): Promise<WhatsAppOptIn | null> {
  const { data, error } = await supabase
    .from('gw_whatsapp_optins')
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return (data as WhatsAppOptIn) ?? null;
}

/** Record consent for a number, or move consent to a new one. */
export async function optInToWhatsApp(phoneE164: string): Promise<WhatsAppOptIn> {
  const { data, error } = await supabase
    .from('gw_whatsapp_optins')
    .upsert(
      { phone_e164: phoneE164, opted_in_at: new Date().toISOString(), opted_out_at: null },
      { onConflict: 'user_id' },
    )
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as WhatsAppOptIn;
}

/**
 * Withdraw consent.
 *
 * Stamped, not deleted — "they opted out on the 3rd" is the answer to a
 * complaint, and Meta expects a business to be able to show it.
 */
export async function optOutOfWhatsApp(): Promise<void> {
  const { error } = await supabase
    .from('gw_whatsapp_optins')
    .update({ opted_out_at: new Date().toISOString() })
    .is('opted_out_at', null);
  if (error) throw error;
}
