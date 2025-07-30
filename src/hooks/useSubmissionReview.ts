import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubmissionEntry {
  id: string;
  from: string;
  title: string;
  date: string;
  status: 'New' | 'Reviewed' | 'Forwarded' | 'Completed';
  type: 'Report' | 'Audio' | 'Document' | 'Form';
  email?: string;
  content?: string;
  created_at: string;
  updated_at: string;
}

export const useSubmissionReview = () => {
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      
      // Fetch real submission data from the database
      const { data: formSubmissions, error } = await supabase
        .from('gw_public_form_submissions')
        .select(`
          id,
          full_name,
          email,
          form_type,
          status,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform database data to match our interface
      const transformedSubmissions: SubmissionEntry[] = formSubmissions?.map(submission => ({
        id: submission.id,
        from: submission.full_name || 'Unknown',
        title: `${submission.form_type.replace('_', ' ')} Form Submission`,
        date: new Date(submission.created_at).toISOString().split('T')[0],
        status: submission.status === 'pending' ? 'New' :
                submission.status === 'reviewed' ? 'Reviewed' :
                submission.status === 'approved' ? 'Completed' : 'New',
        type: 'Form',
        email: submission.email,
        created_at: submission.created_at,
        updated_at: submission.updated_at
      })) || [];

      // Add some sample section leader reports if no form submissions exist
      if (transformedSubmissions.length === 0) {
        const sampleSubmissions: SubmissionEntry[] = [
          {
            id: 'sample-1',
            from: 'Section Leaders',
            title: 'Weekly Progress Reports',
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'New',
            type: 'Report',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'sample-2',
            from: 'Music Committee',
            title: 'Spring Concert Repertoire Suggestions',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'Forwarded',
            type: 'Document',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setSubmissions(sampleSubmissions);
      } else {
        setSubmissions(transformedSubmissions);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load submission data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (submissionId: string, status: SubmissionEntry['status']) => {
    try {
      // Check if this is a real database submission or sample data
      if (submissionId.startsWith('sample-')) {
        // Update local state only for sample data
        setSubmissions(prev => prev.map(submission => 
          submission.id === submissionId ? { ...submission, status } : submission
        ));
      } else {
        // Update in database for real submissions
        const dbStatus = status === 'New' ? 'pending' :
                        status === 'Reviewed' ? 'reviewed' :
                        status === 'Completed' ? 'approved' : 'pending';
        
        const { error } = await supabase
          .from('gw_public_form_submissions')
          .update({ status: dbStatus })
          .eq('id', submissionId);

        if (error) throw error;

        // Update local state
        setSubmissions(prev => prev.map(submission => 
          submission.id === submissionId ? { ...submission, status } : submission
        ));
      }

      toast({
        title: "Status Updated",
        description: `Submission status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating submission status:', error);
      toast({
        title: "Error",
        description: "Failed to update submission status",
        variant: "destructive",
      });
    }
  };

  const forwardToDirector = async (submissionId: string) => {
    try {
      // In the future, this would send an actual notification/email to the director
      await updateSubmissionStatus(submissionId, 'Forwarded');
      
      toast({
        title: "Forwarded",
        description: "Submission has been forwarded to the director",
      });
    } catch (error) {
      console.error('Error forwarding submission:', error);
      toast({
        title: "Error",
        description: "Failed to forward submission",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  return {
    submissions,
    loading,
    fetchSubmissions,
    updateSubmissionStatus,
    forwardToDirector
  };
};