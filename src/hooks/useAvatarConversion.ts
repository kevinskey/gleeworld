import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConversionResult {
  user_id: string;
  full_name: string;
  email: string;
  success: boolean;
  error?: string;
  source_url?: string;
  target_url?: string;
}

interface ConversionResponse {
  success: boolean;
  message: string;
  total_processed: number;
  successful: number;
  failed: number;
  results: ConversionResult[];
}

export const useAvatarConversion = () => {
  const [converting, setConverting] = useState(false);
  const [lastResult, setLastResult] = useState<ConversionResponse | null>(null);

  const convertAuditionerAvatars = async (): Promise<ConversionResponse | null> => {
    setConverting(true);
    try {
      const { data, error } = await supabase.functions.invoke('convert-auditioner-avatars', {
        body: {}
      });

      if (error) {
        console.error('Error calling conversion function:', error);
        toast.error('Failed to convert auditioner avatars');
        return null;
      }

      const result = data as ConversionResponse;
      setLastResult(result);

      if (result.success) {
        if (result.successful > 0) {
          toast.success(`Successfully converted ${result.successful} auditioner avatars`);
        } else {
          toast.info('No auditioners needed avatar conversion');
        }
        
        if (result.failed > 0) {
          toast.warning(`${result.failed} conversions failed`);
        }
      } else {
        toast.error('Avatar conversion failed');
      }

      return result;
    } catch (error) {
      console.error('Avatar conversion error:', error);
      toast.error('Failed to convert auditioner avatars');
      return null;
    } finally {
      setConverting(false);
    }
  };

  return {
    converting,
    lastResult,
    convertAuditionerAvatars
  };
};