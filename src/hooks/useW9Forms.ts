
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface W9Form {
  id: string;
  user_id: string;
  form_data: any;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  storage_path: string;
}

export const useW9Forms = () => {
  const [w9Forms, setW9Forms] = useState<W9Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const fetchW9Forms = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching W9 forms for user:', user?.id);

      if (!user) {
        console.log('No authenticated user, skipping fetch');
        setW9Forms([]);
        return;
      }

      const { data, error } = await supabase
        .from('w9_forms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('W9 forms query result:', { data, error, userId: user.id });
      console.log('W9 forms count for current user:', data?.length || 0);

      if (error) {
        console.error('Error fetching W9 forms:', error);
        throw error;
      }
      
      console.log('W9 forms fetched successfully for user:', data?.length || 0);
      setW9Forms(data || []);
    } catch (error) {
      console.error('Error fetching W9 forms:', error);
      setError('Failed to load W9 forms');
      toast({
        title: "Error",
        description: "Failed to load W9 forms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteW9Form = async (formId: string) => {
    try {
      console.log('Attempting to delete W9 form:', formId);
      console.log('Current user:', user?.id);

      if (!user) {
        throw new Error('User not authenticated');
      }

      // First, get the form to check ownership and get storage path
      const formToDelete = w9Forms.find(form => form.id === formId);
      if (!formToDelete) {
        throw new Error('Form not found in current user\'s forms');
      }

      if (formToDelete.user_id !== user.id) {
        throw new Error('Permission denied: Cannot delete another user\'s form');
      }

      // Delete from storage first if storage path exists
      if (formToDelete.storage_path) {
        console.log('Deleting file from storage:', formToDelete.storage_path);
        const { error: storageError } = await supabase.storage
          .from('w9-forms')
          .remove([formToDelete.storage_path]);

        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        } else {
          console.log('File deleted from storage successfully');
        }
      }

      // Delete from database with explicit user check
      const { error: deleteError, count } = await supabase
        .from('w9_forms')
        .delete({ count: 'exact' })
        .eq('id', formId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting W9 form from database:', deleteError);
        throw new Error(`Failed to delete W9 form: ${deleteError.message}`);
      }

      console.log('Delete operation completed. Rows affected:', count);

      if (count === 0) {
        throw new Error('No rows were deleted. Form may not exist or belong to another user.');
      }

      console.log('W9 form deleted successfully from database');
      
      // Update local state immediately
      setW9Forms(prev => {
        const updated = prev.filter(form => form.id !== formId);
        console.log('Updated local state. Forms remaining:', updated.length);
        return updated;
      });
      
      toast({
        title: "Success",
        description: "W9 form deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting W9 form:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete W9 form",
        variant: "destructive",
      });
      
      // Refetch to ensure UI is in sync with database
      await fetchW9Forms();
    }
  };

  const downloadW9Form = async (form: W9Form) => {
    try {
      console.log('Attempting to download W9 form:', form.id);
      
      if (!form.storage_path) {
        console.error('No storage path found for form:', form.id);
        toast({
          title: "Error",
          description: "No file path found for this form",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from('w9-forms')
        .download(form.storage_path);

      if (error) {
        console.error('Error downloading W9 form:', error);
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `w9-form-${form.created_at.split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('W9 form downloaded successfully');
      
      toast({
        title: "Success",
        description: "W9 form downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading W9 form:', error);
      toast({
        title: "Error",
        description: "Failed to download W9 form",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    console.log('useW9Forms effect triggered');
    console.log('Auth loading:', authLoading);
    console.log('User:', user?.id);
    
    // Wait for auth to complete loading before making decisions
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }

    if (!user) {
      console.log('No authenticated user, clearing W9 forms');
      setW9Forms([]);
      setLoading(false);
      setError(null);
      return;
    }

    console.log('User authenticated, fetching W9 forms for:', user.id);
    fetchW9Forms();

    // Set up real-time subscription for this user's W9 forms only
    const channel = supabase
      .channel('w9-forms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'w9_forms',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Real-time W9 forms change:', payload);
          // Refetch data to ensure consistency
          fetchW9Forms();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up W9 forms subscription');
      supabase.removeChannel(channel);
    };
  }, [user, authLoading]);

  return {
    w9Forms,
    loading: authLoading || loading,
    error,
    deleteW9Form,
    downloadW9Form,
    refetch: fetchW9Forms,
  };
};
