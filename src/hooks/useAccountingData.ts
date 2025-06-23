
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AccountingEntry {
  id: string;
  name: string;
  contractTitle: string;
  dateSigned: string;
  stipend: number;
  status: string;
}

export const useAccountingData = () => {
  const [accountingData, setAccountingData] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStipends, setTotalStipends] = useState(0);
  const [contractCount, setContractCount] = useState(0);
  const { toast } = useToast();

  const fetchAccountingData = async () => {
    try {
      setLoading(true);
      
      // Query contracts with embedded signatures and extract stipend information
      const { data: contracts, error } = await supabase
        .from('contracts_v2')
        .select('*')
        .in('status', ['completed', 'pending_admin_signature'])
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching contracts:', error);
        throw error;
      }

      const entries: AccountingEntry[] = [];
      let total = 0;

      contracts?.forEach(contract => {
        // Parse embedded signatures to get signer info
        const signatureMatch = contract.content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
        
        // Extract stipend from contract content
        const stipendMatch = contract.content.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
        const stipendAmount = stipendMatch ? parseFloat(stipendMatch[1].replace(/,/g, '')) : 0;
        
        if (signatureMatch && stipendAmount > 0) {
          try {
            const signatures = JSON.parse(signatureMatch[1]);
            const artistSignature = signatures.find((sig: any) => sig.signerType === 'artist');
            
            if (artistSignature) {
              // Extract name from contract title or use default
              const nameMatch = contract.title.match(/^([^-]+)/);
              const name = nameMatch ? nameMatch[1].trim() : 'Unknown';
              
              entries.push({
                id: contract.id,
                name,
                contractTitle: contract.title,
                dateSigned: artistSignature.dateSigned || new Date(artistSignature.timestamp).toLocaleDateString(),
                stipend: stipendAmount,
                status: contract.status
              });
              
              total += stipendAmount;
            }
          } catch (e) {
            console.error('Error parsing embedded signatures:', e);
          }
        }
      });

      setAccountingData(entries);
      setTotalStipends(total);
      setContractCount(entries.length);
      
    } catch (error) {
      console.error('Error fetching accounting data:', error);
      toast({
        title: "Error",
        description: "Failed to load accounting data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
    
    // Set up real-time subscription for contract updates
    const channel = supabase
      .channel('accounting-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts_v2'
        },
        () => {
          console.log('Contract updated, refreshing accounting data');
          fetchAccountingData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    accountingData,
    loading,
    totalStipends,
    contractCount,
    refetch: fetchAccountingData
  };
};
