import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  donor_name: string;
  donor_organization: string | null;
  donor_address: string | null;
  donor_city: string | null;
  donor_state: string | null;
  donor_zip: string | null;
  donor_email: string | null;
  donor_phone: string | null;
  director_name: string;
  director_title: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  status: string;
  payment_status: string;
  due_date: string | null;
  media_id: string | null;
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceData {
  donor_name: string;
  donor_organization?: string;
  donor_address?: string;
  donor_city?: string;
  donor_state?: string;
  donor_zip?: string;
  donor_email?: string;
  donor_phone?: string;
  director_name?: string;
  director_title?: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  total_amount: number;
  notes?: string;
  due_date?: string;
}

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('gw_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setInvoices((data || []) as unknown as Invoice[]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const createInvoice = async (invoiceData: CreateInvoiceData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate invoice number
      const { data: seqData, error: seqError } = await supabase
        .rpc('nextval_invoice_number' as any);
      
      const invoiceNumber = seqError 
        ? `INV-${Date.now().toString().slice(-6)}`
        : `INV-${String(seqData).padStart(4, '0')}`;

      const { data, error: createError } = await supabase
        .from('gw_invoices')
        .insert({
          invoice_number: invoiceNumber,
          donor_name: invoiceData.donor_name,
          donor_organization: invoiceData.donor_organization || null,
          donor_address: invoiceData.donor_address || null,
          donor_city: invoiceData.donor_city || null,
          donor_state: invoiceData.donor_state || null,
          donor_zip: invoiceData.donor_zip || null,
          donor_email: invoiceData.donor_email || null,
          donor_phone: invoiceData.donor_phone || null,
          director_name: invoiceData.director_name || 'Dr. Kevin Phillip Johnson',
          director_title: invoiceData.director_title || 'Director, Spelman College Glee Club',
          line_items: invoiceData.line_items as any,
          subtotal: invoiceData.subtotal,
          total_amount: invoiceData.total_amount,
          notes: invoiceData.notes || null,
          due_date: invoiceData.due_date || null,
          status: 'final',
          created_by: user?.id || null,
        } as any)
        .select()
        .single();

      if (createError) throw createError;
      toast.success(`Invoice ${invoiceNumber} created successfully`);
      await fetchInvoices();
      return data as unknown as Invoice;
    } catch (err: any) {
      toast.error('Failed to create invoice: ' + err.message);
      throw err;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('gw_invoices')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      toast.success('Invoice deleted');
      await fetchInvoices();
    } catch (err: any) {
      toast.error('Failed to delete invoice: ' + err.message);
    }
  };

  return { invoices, loading, error, createInvoice, deleteInvoice, refetch: fetchInvoices };
};
