import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface HairNailSubmission {
  id: string;
  user_id: string;
  submission_type: string;
  image_url: string;
  image_path: string;
  notes?: string;
  event_date?: string;
  event_name?: string;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  gw_profiles?: any;
}

export const HairNailApprovalManager = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<HairNailSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<HairNailSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_hair_nail_submissions')
        .select(`
          *,
          gw_profiles!gw_hair_nail_submissions_user_id_fkey(
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions((data as any) || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('gw_hair_nail_submissions')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast.success(`Submission ${status}!`);
      setSelectedSubmission(null);
      setReviewNotes('');
      fetchSubmissions();
    } catch (error) {
      console.error('Error reviewing submission:', error);
      toast.error('Failed to review submission');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const reviewedSubmissions = submissions.filter(s => s.status !== 'pending');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading submissions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Reviewed ({reviewedSubmissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingSubmissions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No pending submissions
              </CardContent>
            </Card>
          ) : (
            pendingSubmissions.map((submission) => (
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {submission.gw_profiles?.full_name || 'Unknown User'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {submission.gw_profiles?.email}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(submission.status)} className="flex items-center gap-1">
                      {getStatusIcon(submission.status)}
                      {submission.submission_type.charAt(0).toUpperCase() + submission.submission_type.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <img
                        src={submission.image_url}
                        alt="Submission"
                        className="w-full max-w-md rounded-lg border"
                      />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <strong>Submitted:</strong> {format(new Date(submission.created_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                      {submission.event_name && (
                        <div>
                          <strong>Event:</strong> {submission.event_name}
                        </div>
                      )}
                      {submission.event_date && (
                        <div>
                          <strong>Event Date:</strong> {format(new Date(submission.event_date), 'MMM dd, yyyy')}
                        </div>
                      )}
                      {submission.notes && (
                        <div>
                          <strong>Notes:</strong> {submission.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedSubmission?.id === submission.id ? (
                    <div className="space-y-3 border-t pt-4">
                      <div>
                        <Label htmlFor="review-notes">Review Notes (Optional)</Label>
                        <Textarea
                          id="review-notes"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Add any feedback or comments..."
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleReview(submission.id, 'approved')}
                          disabled={isProcessing}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleReview(submission.id, 'rejected')}
                          disabled={isProcessing}
                          className="flex items-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedSubmission(null);
                            setReviewNotes('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setSelectedSubmission(submission)}
                      className="w-full"
                    >
                      Review Submission
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4">
          {reviewedSubmissions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No reviewed submissions
              </CardContent>
            </Card>
          ) : (
            reviewedSubmissions.map((submission) => (
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {submission.gw_profiles?.full_name || 'Unknown User'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {submission.gw_profiles?.email}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(submission.status)} className="flex items-center gap-1">
                      {getStatusIcon(submission.status)}
                      {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <img
                        src={submission.image_url}
                        alt="Submission"
                        className="w-full max-w-md rounded-lg border"
                      />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <strong>Type:</strong> {submission.submission_type}
                      </div>
                      <div>
                        <strong>Submitted:</strong> {format(new Date(submission.created_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                      {submission.reviewed_at && (
                        <div>
                          <strong>Reviewed:</strong> {format(new Date(submission.reviewed_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}
                      {submission.review_notes && (
                        <div>
                          <strong>Review Notes:</strong> {submission.review_notes}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};