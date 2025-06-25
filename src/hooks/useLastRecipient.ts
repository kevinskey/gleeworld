
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LastRecipient {
  recipientEmail: string;
  recipientName: string;
}

export const useLastRecipient = (contractId: string | null) => {
  const [lastRecipient, setLastRecipient] = useState<LastRecipient | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contractId) {
      setLastRecipient(null);
      return;
    }

    const fetchLastRecipient = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('contract_recipients_v2')
          .select('recipient_email, recipient_name')
          .eq('contract_id', contractId)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching last recipient:', error);
          setLastRecipient(null);
          return;
        }

        if (data) {
          setLastRecipient({
            recipientEmail: data.recipient_email,
            recipientName: data.recipient_name
          });
        } else {
          setLastRecipient(null);
        }
      } catch (error) {
        console.error('Error fetching last recipient:', error);
        setLastRecipient(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLastRecipient();
  }, [contractId]);

  return { lastRecipient, loading };
};
