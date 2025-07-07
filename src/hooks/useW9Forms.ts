
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
      console.log('useW9Forms: Fetching W9 forms for user:', user?.id);

      if (!user) {
        console.log('useW9Forms: No authenticated user, skipping fetch');
        setW9Forms([]);
        return;
      }

      // First, let's see all W9 forms in the database
      const { data: allForms, error: allFormsError } = await supabase
        .from('w9_forms')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('useW9Forms: All W9 forms in database:', {
        total: allForms?.length || 0,
        forms: allForms,
        error: allFormsError
      });

      // Now fetch only the current user's forms
      const { data, error } = await supabase
        .from('w9_forms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('useW9Forms: User specific query result:', { 
        data, 
        error, 
        userId: user.id,
        userFormsCount: data?.length || 0
      });

      if (error) {
        console.error('useW9Forms: Error fetching W9 forms:', error);
        throw error;
      }
      
      console.log('useW9Forms: Successfully fetched forms for user:', data?.length || 0);
      setW9Forms(data || []);
    } catch (error) {
      console.error('useW9Forms: Error in fetchW9Forms:', error);
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
      console.log('useW9Forms: Attempting to delete W9 form:', formId);
      console.log('useW9Forms: Current user:', user?.id);

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
        console.log('useW9Forms: Deleting file from storage:', formToDelete.storage_path);
        const { error: storageError } = await supabase.storage
          .from('w9-forms')
          .remove([formToDelete.storage_path]);

        if (storageError) {
          console.error('useW9Forms: Error deleting file from storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        } else {
          console.log('useW9Forms: File deleted from storage successfully');
        }
      }

      // Delete from database with explicit user check
      const { error: deleteError, count } = await supabase
        .from('w9_forms')
        .delete({ count: 'exact' })
        .eq('id', formId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('useW9Forms: Error deleting W9 form from database:', deleteError);
        throw new Error(`Failed to delete W9 form: ${deleteError.message}`);
      }

      console.log('useW9Forms: Delete operation completed. Rows affected:', count);

      if (count === 0) {
        throw new Error('No rows were deleted. Form may not exist or belong to another user.');
      }

      console.log('useW9Forms: W9 form deleted successfully from database');
      
      // Update local state immediately
      setW9Forms(prev => {
        const updated = prev.filter(form => form.id !== formId);
        console.log('useW9Forms: Updated local state. Forms remaining:', updated.length);
        return updated;
      });
      
      toast({
        title: "Success",
        description: "W9 form deleted successfully",
      });
    } catch (error) {
      console.error('useW9Forms: Error deleting W9 form:', error);
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
      console.log('useW9Forms: Attempting to download W9 form:', form.id);
      
      if (!form.storage_path) {
        console.error('useW9Forms: No storage path found for form:', form.id);
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
        console.error('useW9Forms: Error downloading W9 form:', error);
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

      console.log('useW9Forms: W9 form downloaded successfully');
      
      toast({
        title: "Success",
        description: "W9 form downloaded successfully",
      });
    } catch (error) {
      console.error('useW9Forms: Error downloading W9 form:', error);
      toast({
        title: "Error",
        description: "Failed to download W9 form",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    console.log('useW9Forms: Effect triggered');
    console.log('useW9Forms: Auth loading:', authLoading);
    console.log('useW9Forms: User:', user?.id);
    
    // Wait for auth to complete loading before making decisions
    if (authLoading) {
      console.log('useW9Forms: Auth still loading, waiting...');
      return;
    }

    if (!user) {
      console.log('useW9Forms: No authenticated user, clearing W9 forms');
      setW9Forms([]);
      setLoading(false);
      setError(null);
      return;
    }

    console.log('useW9Forms: User authenticated, fetching W9 forms for:', user.id);
    fetchW9Forms();

    // Set up real-time subscription for this user's W9 forms only
    // Use a unique channel name to prevent conflicts
    const channelName = `w9-forms-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'w9_forms',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('useW9Forms: Real-time W9 forms change:', payload);
          
          // Handle different types of changes more efficiently
          if (payload.eventType === 'INSERT' && payload.new) {
            console.log('useW9Forms: New W9 form inserted, adding to state immediately');
            setW9Forms(prev => {
              // Check if form already exists (avoid duplicates)
              const exists = prev.some(form => form.id === payload.new.id);
              if (exists) return prev;
              return [payload.new as W9Form, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            console.log('useW9Forms: W9 form updated, updating state immediately');
            setW9Forms(prev => prev.map(form => 
              form.id === payload.new.id ? payload.new as W9Form : form
            ));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            console.log('useW9Forms: W9 form deleted, removing from state immediately');
            setW9Forms(prev => prev.filter(form => form.id !== payload.old.id));
          } else {
            // Fallback to full refetch for other cases
            fetchW9Forms();
          }
        }
      )
      .subscribe();

    return () => {
      console.log('useW9Forms: Cleaning up W9 forms subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, authLoading]); // Only depend on user.id and authLoading

  // Add optimistic update for immediate UI updates
  const addOptimisticW9Form = (newForm: Partial<W9Form>) => {
    console.log('useW9Forms: Adding optimistic W9 form:', newForm);
    setW9Forms(prev => {
      const optimisticForm: W9Form = {
        id: newForm.id || `temp-${Date.now()}`,
        user_id: user?.id || '',
        form_data: newForm.form_data || {},
        status: newForm.status || 'processing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        storage_path: newForm.storage_path || '',
        ...newForm
      };
      return [optimisticForm, ...prev];
    });
  };

  return {
    w9Forms,
    loading: authLoading || loading,
    error,
    deleteW9Form,
    downloadW9Form,
    refetch: fetchW9Forms,
    addOptimisticW9Form,
  };
};
