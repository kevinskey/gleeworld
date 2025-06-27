
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
  templateId?: string;
  templateName?: string;
}

export const useAccountingData = () => {
  const [accountingData, setAccountingData] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStipends, setTotalStipends] = useState(0);
  const [contractCount, setContractCount] = useState(0);
  const { toast } = useToast();

  const extractStipendFromContent = (content: string): number => {
    console.log('Extracting stipend from content:', content.substring(0, 200) + '...');
    
    // Multiple patterns to match different stipend formats
    const stipendPatterns = [
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, // $1,000.00 or $500
      /stipend[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i, // stipend: $500 or stipend 500
      /amount[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i, // amount: $500
      /payment[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i, // payment: $500
      /compensation[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i // compensation: $500
    ];

    const amounts: number[] = [];
    
    for (const pattern of stipendPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (amount > 0 && amount <= 100000) { // Reasonable stipend range
          amounts.push(amount);
        }
      }
    }

    // Return the largest reasonable amount found
    const stipend = amounts.length > 0 ? Math.max(...amounts) : 0;
    console.log('Extracted stipend amount:', stipend);
    return stipend;
  };

  const extractNameFromTitle = (title: string): string => {
    // Try to extract name from common title patterns
    const patterns = [
      /^([^-]+)\s*-/, // "John Doe - Contract"
      /contract[:\s]*([^-\n]+)/i, // "Contract: John Doe"
      /for[:\s]*([^-\n]+)/i, // "Contract for John Doe"
      /^([A-Za-z\s]+)/, // First words as name
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        const name = match[1].trim();
        if (name && name.length > 1 && name !== 'Contract') {
          return name;
        }
      }
    }

    return 'Unknown Artist';
  };

  const fetchAccountingData = async () => {
    try {
      setLoading(true);
      console.log('Fetching contracts for accounting...');
      
      // Query contracts first
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts_v2')
        .select('*')
        .or('status.eq.completed,status.eq.pending_admin_signature')
        .order('updated_at', { ascending: false });

      if (contractsError) {
        console.error('Error fetching contracts:', contractsError);
        throw contractsError;
      }

      console.log('Found contracts:', contracts?.length || 0);

      // Get unique template IDs from contracts
      const templateIds = [...new Set(contracts
        ?.map(contract => contract.template_id)
        .filter(Boolean) || [])];

      // Fetch template names if we have template IDs
      let templatesMap: Record<string, string> = {};
      if (templateIds.length > 0) {
        const { data: templates, error: templatesError } = await supabase
          .from('contract_templates')
          .select('id, name')
          .in('id', templateIds);

        if (!templatesError && templates) {
          templatesMap = templates.reduce((acc, template) => {
            acc[template.id] = template.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const entries: AccountingEntry[] = [];
      let total = 0;

      contracts?.forEach(contract => {
        console.log('Processing contract:', contract.title, 'Status:', contract.status);
        
        // Extract stipend from contract content
        const stipendAmount = extractStipendFromContent(contract.content);
        
        if (stipendAmount > 0) {
          console.log('Found stipend in contract:', contract.title, 'Amount:', stipendAmount);
          
          // Check for embedded signatures or use status
          let dateSigned = new Date().toLocaleDateString();
          let hasSignature = false;
          
          try {
            const signatureMatch = contract.content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
            if (signatureMatch) {
              const signatures = JSON.parse(signatureMatch[1]);
              const artistSignature = signatures.find((sig: any) => sig.signerType === 'artist');
              
              if (artistSignature) {
                dateSigned = artistSignature.dateSigned || new Date(artistSignature.timestamp).toLocaleDateString();
                hasSignature = true;
              }
            }
          } catch (e) {
            console.log('No embedded signatures found, using status-based logic');
          }

          // Include contracts with stipends that are completed or have signatures
          if (hasSignature || contract.status === 'completed') {
            const name = extractNameFromTitle(contract.title);
            
            entries.push({
              id: contract.id,
              name,
              contractTitle: contract.title,
              dateSigned,
              stipend: stipendAmount,
              status: contract.status,
              templateId: contract.template_id,
              templateName: contract.template_id ? templatesMap[contract.template_id] : undefined
            });
            
            total += stipendAmount;
            console.log('Added contract to accounting:', contract.title, 'Stipend:', stipendAmount);
          }
        } else {
          console.log('No stipend found in contract:', contract.title);
        }
      });

      console.log('Final accounting data:', entries.length, 'contracts, Total:', total);
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
