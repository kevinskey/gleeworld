
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface AdminW9Form {
  id: string;
  user_id: string | null;
  form_data: any;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  storage_path: string;
  user_email?: string;
  user_name?: string;
}

export const useAdminW9Forms = () => {
  const [w9Forms, setW9Forms] = useState<AdminW9Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const fetchW9Forms = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('useAdminW9Forms: Fetching all W9 forms for admin');

      if (!user) {
        console.log('useAdminW9Forms: No authenticated user, skipping fetch');
        setW9Forms([]);
        return;
      }

      // Fetch all W9 forms with user information
      const { data, error } = await supabase
        .from('w9_forms')
        .select(`
          *,
          profiles!left(email, full_name)
        `)
        .order('submitted_at', { ascending: false });

      console.log('useAdminW9Forms: Query result:', { 
        data, 
        error, 
        formsCount: data?.length || 0
      });

      if (error) {
        console.error('useAdminW9Forms: Error fetching W9 forms:', error);
        throw error;
      }

      // Transform data to include user information
      const transformedData: AdminW9Form[] = (data || []).map((form: any) => ({
        ...form,
        user_email: form.profiles?.email || 'Unknown',
        user_name: form.profiles?.full_name || 'Unknown User'
      }));
      
      console.log('useAdminW9Forms: Successfully fetched forms:', transformedData.length);
      setW9Forms(transformedData);
    } catch (error) {
      console.error('useAdminW9Forms: Error in fetchW9Forms:', error);
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

  const updateFormStatus = async (formId: string, newStatus: string) => {
    try {
      console.log('useAdminW9Forms: Updating form status:', { formId, newStatus });

      const { error } = await supabase
        .from('w9_forms')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', formId);

      if (error) {
        console.error('useAdminW9Forms: Error updating form status:', error);
        throw error;
      }

      // Update local state
      setW9Forms(prev => prev.map(form => 
        form.id === formId ? { ...form, status: newStatus } : form
      ));

      console.log('useAdminW9Forms: Form status updated successfully');
      
      toast({
        title: "Success",
        description: `W9 form status updated to ${newStatus}`,
      });

      return true;
    } catch (error) {
      console.error('useAdminW9Forms: Error updating form status:', error);
      toast({
        title: "Error",
        description: "Failed to update W9 form status",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteW9Form = async (formId: string) => {
    try {
      console.log('useAdminW9Forms: Deleting W9 form:', formId);

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the form to check storage path
      const formToDelete = w9Forms.find(form => form.id === formId);
      if (!formToDelete) {
        throw new Error('Form not found');
      }

      // Delete from storage first if storage path exists
      if (formToDelete.storage_path) {
        console.log('useAdminW9Forms: Deleting file from storage:', formToDelete.storage_path);
        const { error: storageError } = await supabase.storage
          .from('w9-forms')
          .remove([formToDelete.storage_path]);

        if (storageError) {
          console.error('useAdminW9Forms: Error deleting file from storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        } else {
          console.log('useAdminW9Forms: File deleted from storage successfully');
        }
      }

      // Delete from database
      const { error: deleteError, count } = await supabase
        .from('w9_forms')
        .delete({ count: 'exact' })
        .eq('id', formId);

      if (deleteError) {
        console.error('useAdminW9Forms: Error deleting W9 form from database:', deleteError);
        throw new Error(`Failed to delete W9 form: ${deleteError.message}`);
      }

      console.log('useAdminW9Forms: Delete operation completed. Rows affected:', count);

      if (count === 0) {
        throw new Error('No rows were deleted. Form may not exist.');
      }

      console.log('useAdminW9Forms: W9 form deleted successfully from database');
      
      // Update local state immediately
      setW9Forms(prev => {
        const updated = prev.filter(form => form.id !== formId);
        console.log('useAdminW9Forms: Updated local state. Forms remaining:', updated.length);
        return updated;
      });
      
      toast({
        title: "Success",
        description: "W9 form deleted successfully",
      });

      return true;
    } catch (error) {
      console.error('useAdminW9Forms: Error deleting W9 form:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete W9 form",
        variant: "destructive",
      });
      
      // Refetch to ensure UI is in sync with database
      await fetchW9Forms();
      return false;
    }
  };

  useEffect(() => {
    console.log('useAdminW9Forms: Effect triggered');
    console.log('useAdminW9Forms: Auth loading:', authLoading);
    console.log('useAdminW9Forms: User:', user?.id);
    
    // Wait for auth to complete loading before making decisions
    if (authLoading) {
      console.log('useAdminW9Forms: Auth still loading, waiting...');
      return;
    }

    if (!user) {
      console.log('useAdminW9Forms: No authenticated user, clearing W9 forms');
      setW9Forms([]);
      setLoading(false);
      setError(null);
      return;
    }

    console.log('useAdminW9Forms: User authenticated, fetching all W9 forms for admin view');
    fetchW9Forms();

    // Set up real-time subscription for all W9 forms
    const channelName = `admin-w9-forms-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'w9_forms',
        },
        (payload) => {
          console.log('useAdminW9Forms: Real-time W9 forms change:', payload);
          // Refetch data to ensure consistency
          fetchW9Forms();
        }
      )
      .subscribe();

    return () => {
      console.log('useAdminW9Forms: Cleaning up W9 forms subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, authLoading]);

  return {
    w9Forms,
    loading: authLoading || loading,
    error,
    updateFormStatus,
    deleteW9Form,
    refetch: fetchW9Forms,
  };
};
