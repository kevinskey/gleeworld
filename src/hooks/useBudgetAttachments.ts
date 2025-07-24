import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface BudgetAttachment {
  id: string;
  budget_id?: string;
  event_id?: string;
  filename: string;
  file_url: string;
  file_type?: string;
  uploaded_by?: string;
  created_at: string;
}

export const useBudgetAttachments = (budgetId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<BudgetAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttachments = async () => {
    if (!budgetId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budget_attachments')
        .select('*')
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (err) {
      console.error('Error fetching budget attachments:', err);
      toast({
        title: "Error",
        description: "Failed to load attachments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadAttachment = async (file: File) => {
    if (!user || !budgetId) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${budgetId}/${Date.now()}-${file.name}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('budget-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('budget-documents')
        .getPublicUrl(fileName);

      // Save to database
      const { data: attachmentData, error: dbError } = await supabase
        .from('budget_attachments')
        .insert({
          budget_id: budgetId,
          filename: file.name,
          file_url: publicUrl,
          file_type: fileExt,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setAttachments(prev => [attachmentData, ...prev]);
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      return attachmentData;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteAttachment = async (attachmentId: string, fileName: string) => {
    if (!user) return false;

    try {
      // Delete from storage if it's a file upload (not Google Doc)
      const attachment = attachments.find(a => a.id === attachmentId);
      if (attachment && attachment.file_type !== 'google-doc') {
        const filePath = `${user.id}/${budgetId}/${fileName}`;
        await supabase.storage
          .from('budget-documents')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('budget_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;

      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete attachment. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [budgetId]);

  return {
    attachments,
    loading,
    uploadAttachment,
    deleteAttachment,
    refetch: fetchAttachments
  };
};