
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
      setForms([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching W9 forms for user:', user.id);
      const { data, error } = await supabase
        .from('w9_forms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('Fetched W9 forms:', data);
      setForms(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching W9 forms:', err);
      setError('Failed to fetch W9 forms');
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
      console.log('Starting delete process for form:', formId);
      
      // First get the form to find the storage path
      const { data: form, error: fetchError } = await supabase
        .from('w9_forms')
        .select('storage_path')
        .eq('id', formId)
        .single();

      if (fetchError) {
        console.error('Error fetching form for deletion:', fetchError);
        throw fetchError;
      }

      console.log('Form found for deletion:', form);

      // Delete from database first
      const { error: dbError } = await supabase
        .from('w9_forms')
        .delete()
        .eq('id', formId);

      if (dbError) {
        console.error('Error deleting from database:', dbError);
        throw dbError;
      }

      console.log('Successfully deleted from database');

      // Then delete from storage bucket if path exists
      if (form?.storage_path) {
        console.log('Attempting to delete from storage:', form.storage_path);
        const { error: storageError } = await supabase.storage
          .from('w9-forms')
          .remove([form.storage_path]);

        if (storageError) {
          console.error('Error deleting from storage (non-critical):', storageError);
          // Don't throw here since database deletion succeeded
        } else {
          console.log('Successfully deleted from storage');
        }
      }

      // Immediately update the local state to remove the deleted form
      console.log('Updating local state to remove deleted form');
      setForms(currentForms => {
        const updatedForms = currentForms.filter(form => form.id !== formId);
        console.log('Forms after deletion:', updatedForms);
        return updatedForms;
      });

      console.log('Delete process completed successfully');

    } catch (err) {
      console.error('Error deleting W9 form:', err);
      throw new Error('Failed to delete W9 form');
    }
  };

  useEffect(() => {
    fetchForms();
  }, [user]);

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
