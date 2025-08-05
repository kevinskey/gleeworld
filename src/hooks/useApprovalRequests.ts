import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ApprovalRequest {
  id: string;
  request_type: string;
  title: string;
  description: string | null;
  amount: number;
  requestor_id: string;
  requestor_name: string;
  status: string;
  budget_category: string | null;
  receipt_urls: string[] | null;
  supporting_documents: string[] | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApprovalRequestData {
  request_type: ApprovalRequest['request_type'];
  title: string;
  description?: string;
  amount: number;
  budget_category?: string;
  receipt_urls?: string[];
  supporting_documents?: string[];
  notes?: string;
}

export interface ApprovalWorkflowHistory {
  id: string;
  approval_request_id: string;
  action_type: string;
  performed_by: string;
  performer_name: string;
  notes: string | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
}

export const useApprovalRequests = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRequests = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching approval requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch approval requests');
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (requestData: CreateApprovalRequestData) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const profile = await supabase
        .from('gw_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('approval_requests')
        .insert({
          ...requestData,
          requestor_id: user.id,
          requestor_name: profile.data?.full_name || user.email || 'Unknown User'
        })
        .select()
        .single();

      if (error) throw error;

      // Log the creation action
      await supabase
        .from('approval_workflow_history')
        .insert({
          approval_request_id: data.id,
          action_type: 'submitted',
          performed_by: user.id,
          performer_name: profile.data?.full_name || user.email || 'Unknown User',
          new_status: 'pending'
        });

      toast.success('Approval request submitted successfully');
      await fetchRequests();
      return data;
    } catch (err) {
      console.error('Error creating approval request:', err);
      const message = err instanceof Error ? err.message : 'Failed to create approval request';
      toast.error(message);
      throw err;
    }
  };

  const updateRequestStatus = async (
    requestId: string, 
    status: 'approved' | 'rejected' | 'review',
    notes?: string,
    rejectionReason?: string
  ) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const updateData: any = {
        status,
        notes,
        updated_at: new Date().toISOString()
      };

      if (status === 'approved') {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
      } else if (status === 'rejected') {
        updateData.rejected_by = user.id;
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('approval_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast.success(`Request ${status} successfully`);
      await fetchRequests();
    } catch (err) {
      console.error('Error updating approval request:', err);
      const message = err instanceof Error ? err.message : 'Failed to update approval request';
      toast.error(message);
      throw err;
    }
  };

  const getRequestHistory = async (requestId: string): Promise<ApprovalWorkflowHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('approval_workflow_history')
        .select('*')
        .eq('approval_request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching request history:', err);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  return {
    requests,
    loading,
    error,
    createRequest,
    updateRequestStatus,
    getRequestHistory,
    refetch: fetchRequests
  };
};