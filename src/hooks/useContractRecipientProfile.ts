import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RecipientProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export const useContractRecipientProfile = (contractId: string) => {
  const [profile, setProfile] = useState<RecipientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipientProfile = async () => {
      if (!contractId) {
        setLoading(false);
        return;
      }

      try {
        // First get the recipient email from contract_recipients_v2
        const { data: recipientData, error: recipientError } = await supabase
          .from('contract_recipients_v2')
          .select('recipient_email')
          .eq('contract_id', contractId)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recipientError || !recipientData) {
          setProfile(null);
          setLoading(false);
          return;
        }

        // Then get the profile for that email
        const { data: profileData, error: profileError } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, avatar_url, email')
          .eq('email', recipientData.recipient_email)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching recipient profile:', profileError);
        }

        setProfile(profileData ? { ...profileData, id: profileData.user_id } : null);
      } catch (error) {
        console.error('Error in useContractRecipientProfile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipientProfile();
  }, [contractId]);

  return { profile, loading };
};