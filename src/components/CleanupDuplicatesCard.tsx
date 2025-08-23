import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const CleanupDuplicatesCard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('cleanup_user_duplicate_buckets');
      
      if (error) throw error;
      
      const result = data as { success: boolean; message: string; deleted: number };
      
      toast({
        title: "Success!",
        description: `${result.message}. Deleted ${result.deleted} duplicate entries.`,
      });
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      toast({
        title: "Error",
        description: "Failed to clean up duplicates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Trash2 className="h-5 w-5" />
          Clean Up Duplicate Buckets
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-orange-700 mb-4">
          Click the button below to remove duplicate "Bucket of Love" entries from your account.
        </p>
        <Button 
          onClick={handleCleanup}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Cleaning up...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Clean Up Duplicates
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};