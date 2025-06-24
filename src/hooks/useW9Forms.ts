
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface W9Form {
  id: string;
  user_id: string;
  storage_path: string;
  submitted_at: string;
  status: string;
  form_data: any;
  created_at: string;
  updated_at: string;
}

export const useW9Forms = () => {
  const [forms, setForms] = useState<W9Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchForms = async () => {
    if (!user) {
      console.log('useW9Forms - No user, clearing forms and resetting state');
      setForms([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('useW9Forms - Fetching W9 forms for user:', user.id);
      
      const { data, error } = await supabase
        .from('w9_forms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('useW9Forms - Database query result:', data);
      console.log('useW9Forms - Forms count from database:', data?.length || 0);
      
      // Ensure we always set an array, even if data is null
      const formsData = data || [];
      setForms(formsData);
      
      console.log('useW9Forms - State updated with forms:', formsData);
      
    } catch (err) {
      console.error('useW9Forms - Error fetching W9 forms:', err);
      setError('Failed to fetch W9 forms');
      setForms([]); // Ensure forms is empty on error
    } finally {
      setLoading(false);
    }
  };

  const getTotalW9Count = async () => {
    try {
      const { count, error } = await supabase
        .from('w9_forms')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (err) {
      console.error('Error fetching W9 count:', err);
      return 0;
    }
  };

  const downloadForm = async (storagePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('w9-forms')
        .download(storagePath);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `w9-form-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading W9 form:', err);
      throw new Error('Failed to download W9 form');
    }
  };

  const deleteForm = async (formId: string) => {
    try {
      console.log('useW9Forms - Starting delete process for form:', formId);
      
      // First get the form to find the storage path
      const { data: form, error: fetchError } = await supabase
        .from('w9_forms')
        .select('storage_path')
        .eq('id', formId)
        .single();

      if (fetchError) {
        console.error('useW9Forms - Error fetching form for deletion:', fetchError);
        throw fetchError;
      }

      console.log('useW9Forms - Form found for deletion:', form);

      // Delete from database first
      const { error: dbError } = await supabase
        .from('w9_forms')
        .delete()
        .eq('id', formId);

      if (dbError) {
        console.error('useW9Forms - Error deleting from database:', dbError);
        throw dbError;
      }

      console.log('useW9Forms - Successfully deleted from database');

      // Then delete from storage bucket if path exists
      if (form?.storage_path) {
        console.log('useW9Forms - Attempting to delete from storage:', form.storage_path);
        const { error: storageError } = await supabase.storage
          .from('w9-forms')
          .remove([form.storage_path]);

        if (storageError) {
          console.error('useW9Forms - Error deleting from storage (non-critical):', storageError);
          // Don't throw here since database deletion succeeded
        } else {
          console.log('useW9Forms - Successfully deleted from storage');
        }
      }

      // Update the local state to remove the deleted form
      console.log('useW9Forms - Updating local state to remove deleted form');
      setForms(currentForms => {
        const updatedForms = currentForms.filter(form => form.id !== formId);
        console.log('useW9Forms - Forms after deletion:', updatedForms);
        console.log('useW9Forms - Forms count after deletion:', updatedForms.length);
        return updatedForms;
      });

      console.log('useW9Forms - Delete process completed successfully');

    } catch (err) {
      console.error('useW9Forms - Error deleting W9 form:', err);
      throw new Error('Failed to delete W9 form');
    }
  };

  useEffect(() => {
    console.log('useW9Forms - useEffect triggered, user:', user?.id);
    fetchForms();
  }, [user]);

  // Debug log whenever forms state changes
  useEffect(() => {
    console.log('useW9Forms - Forms state changed:', {
      count: forms.length,
      formIds: forms.map(f => f.id),
      loading,
      error,
      formsArray: forms
    });
  }, [forms, loading, error]);

  return {
    forms,
    loading,
    error,
    refetch: fetchForms,
    downloadForm,
    deleteForm,
    getTotalW9Count,
  };
};
