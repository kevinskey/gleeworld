
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Contract } from "@/hooks/useContracts";

export const useContractSendHistory = (contracts: Contract[]) => {
  const [contractSendHistory, setContractSendHistory] = useState<Record<string, number>>({});

  const loadContractSendHistory = async () => {
    if (contracts.length === 0) return;
    
    try {
      const contractIds = contracts.map(c => c.id);
      const { data, error } = await supabase
        .from('contract_recipients_v2')
        .select('contract_id')
        .in('contract_id', contractIds);

      if (error) throw error;

      const sendCounts = data.reduce((acc, record) => {
        acc[record.contract_id] = (acc[record.contract_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setContractSendHistory(sendCounts);
    } catch (error) {
      console.error('Error loading send history:', error);
    }
  };

  useEffect(() => {
    loadContractSendHistory();
  }, [contracts]);

  return { contractSendHistory, reloadSendHistory: loadContractSendHistory };
};
