import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Receipt {
  id: string;
  receipt_number?: string;
  vendor_name: string;
  description: string;
  amount: number;
  purchase_date: string;
  category: string;
  template_id?: string;
  event_id?: string;
  receipt_image_url?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  template?: {
    name: string;
  };
  event?: {
    title: string;
  };
  profile?: {
    full_name: string;
  };
}

export const useReceipts = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('receipts')
        .select(`
          *,
          template:contract_templates(name),
          event:events(title),
          profile:profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching receipts:', error);
        setError(error.message);
        return;
      }

      setReceipts(data || []);
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setError('Failed to fetch receipts');
    } finally {
      setLoading(false);
    }
  };

  const createReceipt = async (receiptData: Omit<Receipt, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create receipts",
          variant: "destructive",
        });
        return null;
      }

      const { data, error } = await supabase
        .from('receipts')
        .insert([{
          ...receiptData,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating receipt:', error);
        toast({
          title: "Error",
          description: "Failed to create receipt",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Receipt created successfully",
      });

      await fetchReceipts();
      return data;
    } catch (err) {
      console.error('Error creating receipt:', err);
      toast({
        title: "Error",
        description: "Failed to create receipt",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateReceipt = async (id: string, updates: Partial<Receipt>) => {
    try {
      const { error } = await supabase
        .from('receipts')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating receipt:', error);
        toast({
          title: "Error",
          description: "Failed to update receipt",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Receipt updated successfully",
      });

      await fetchReceipts();
      return true;
    } catch (err) {
      console.error('Error updating receipt:', err);
      toast({
        title: "Error",
        description: "Failed to update receipt",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteReceipt = async (id: string) => {
    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting receipt:', error);
        toast({
          title: "Error",
          description: "Failed to delete receipt",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Receipt deleted successfully",
      });

      await fetchReceipts();
      return true;
    } catch (err) {
      console.error('Error deleting receipt:', err);
      toast({
        title: "Error",
        description: "Failed to delete receipt",
        variant: "destructive",
      });
      return false;
    }
  };

  const uploadReceiptImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      // Check if the receipts bucket exists, if not we'll get an error
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        // If bucket doesn't exist, show a helpful error message
        if (uploadError.message.includes('bucket')) {
          toast({
            title: "Error",
            description: "Storage bucket not configured. Please contact admin.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to upload receipt image",
            variant: "destructive",
          });
        }
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      toast({
        title: "Error",
        description: "Failed to upload receipt image",
        variant: "destructive",
      });
      return null;
    }
  };

  const getReceiptsByTemplate = (templateId: string) => {
    return receipts.filter(receipt => receipt.template_id === templateId);
  };

  const getTemplateReceiptTotal = (templateId: string) => {
    return getReceiptsByTemplate(templateId).reduce((sum, receipt) => sum + receipt.amount, 0);
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  return {
    receipts,
    loading,
    error,
    createReceipt,
    updateReceipt,
    deleteReceipt,
    uploadReceiptImage,
    getReceiptsByTemplate,
    getTemplateReceiptTotal,
    refetch: fetchReceipts
  };
};
