
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
      setLoading(false);
      return;
    }

    const fetchLastRecipient = async () => {
      setLoading(true);
      console.log('useLastRecipient: Starting fetch for contract:', contractId);
      
      try {
        const { data, error } = await supabase
          .from('contract_recipients_v2')
          .select('recipient_email, recipient_name')
          .eq('contract_id', contractId)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('useLastRecipient: Error fetching last recipient:', error);
          setLastRecipient(null);
          return;
        }

        console.log('useLastRecipient: Query result:', data);

        if (data) {
          const recipient = {
            recipientEmail: data.recipient_email || '',
            recipientName: data.recipient_name || ''
          };
          console.log('useLastRecipient: Setting recipient:', recipient);
          setLastRecipient(recipient);
        } else {
          console.log('useLastRecipient: No previous recipient found for contract:', contractId);
          setLastRecipient(null);
        }
      } catch (error) {
        console.error('useLastRecipient: Catch block error:', error);
        setLastRecipient(null);
      } finally {
        console.log('useLastRecipient: Fetch complete for contract:', contractId);
        setLoading(false);
      }
    };

    fetchLastRecipient();
  }, [contractId]);

  // Debug log whenever values change
  useEffect(() => {
    console.log('useLastRecipient: State changed:', {
      contractId,
      lastRecipient,
      loading
    });
  }, [contractId, lastRecipient, loading]);

  return { lastRecipient, loading };
};
