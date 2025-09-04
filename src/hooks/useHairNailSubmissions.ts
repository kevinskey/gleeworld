import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface HairNailSubmission {
  id: string;
  user_id: string;
  submission_type: 'hair' | 'nails' | 'both';
  image_url: string;
  image_path: string;
  notes?: string;
  event_date?: string;
  event_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

interface HairNailSubmissionsData {
  submissions: HairNailSubmission[];
  pendingCount: number;
  loading: boolean;
  error: string | null;
}

export const useHairNailSubmissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<HairNailSubmissionsData>({
    submissions: [],
    pendingCount: 0,
    loading: true,
    error: null
  });

  const fetchSubmissions = async () => {
    if (!user) return;

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const { data: submissionsData, error } = await supabase
        .from('gw_hair_nail_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Type-safe mapping to ensure proper types
      const submissions: HairNailSubmission[] = (submissionsData || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        submission_type: item.submission_type as 'hair' | 'nails' | 'both',
        image_url: item.image_url,
        image_path: item.image_path,
        notes: item.notes,
        event_date: item.event_date,
        event_name: item.event_name,
        status: item.status as 'pending' | 'approved' | 'rejected',
        reviewed_by: item.reviewed_by,
        reviewed_at: item.reviewed_at,
        review_notes: item.review_notes,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      const pendingCount = submissions.filter(s => s.status === 'pending').length;

      setData({
        submissions,
        pendingCount,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching hair/nail submissions:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch submissions'
      }));
    }
  };

  const submitForApproval = async (
    imageFile: File,
    submissionData: {
      submission_type: 'hair' | 'nails' | 'both';
      notes?: string;
      event_date?: string;
      event_name?: string;
    }
  ) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit photos",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload image to storage
      const fileName = `${user.id}/${Date.now()}-${imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('hair-nail-photos')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('hair-nail-photos')
        .getPublicUrl(fileName);

      // Create submission record
      const { error: insertError } = await supabase
        .from('gw_hair_nail_submissions')
        .insert({
          user_id: user.id,
          submission_type: submissionData.submission_type,
          image_url: urlData.publicUrl,
          image_path: fileName,
          notes: submissionData.notes,
          event_date: submissionData.event_date,
          event_name: submissionData.event_name,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Your photo has been submitted for approval!",
      });

      // Refresh submissions
      await fetchSubmissions();
    } catch (error) {
      console.error('Error submitting for approval:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit photo for approval",
        variant: "destructive",
      });
    }
  };

  const updateSubmissionStatus = async (
    submissionId: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('gw_hair_nail_submissions')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Submission ${status} successfully`,
      });

      // Refresh submissions
      await fetchSubmissions();
    } catch (error) {
      console.error('Error updating submission status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update submission status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubmissions();
    }
  }, [user]);

  return {
    ...data,
    submitForApproval,
    updateSubmissionStatus,
    refetch: fetchSubmissions
  };
};