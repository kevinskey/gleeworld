import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const OpenAITestButton = () => {
  const [testing, setTesting] = useState(false);

  const testOpenAI = async () => {
    setTesting(true);
    try {
      console.log('Testing OpenAI API...');
      const { data, error } = await supabase.functions.invoke('test-openai');
      
      if (error) {
        console.error('Test error:', error);
        toast.error(`Test failed: ${error.message}`);
        return;
      }

      console.log('Test result:', data);
      if (data.success) {
        toast.success(`OpenAI API is working! Response: ${data.response}`);
      } else {
        toast.error(`Test failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Test error:', error);
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Button 
      onClick={testOpenAI} 
      disabled={testing}
      variant="outline"
      size="sm"
    >
      {testing ? 'Testing...' : 'Test OpenAI API'}
    </Button>
  );
};