import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, User, MessageSquare,
  Loader2, Send, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ConflictRequest {
  id: string;
  user_id: string;
  conflict_course_name: string;
  conflict_course_code: string | null;
  conflict_days: string[];
  conflict_start_time: string;
  conflict_end_time: string;
  excuse_type: string;
  reason: string | null;
  status: string;
  review_notes: string | null;
  created_at: string;
  student_name?: string;
  student_phone?: string;
}

export const AdminConflictApproval: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewingRequest, setReviewingRequest] = useState<ConflictRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');

  // Check if user is super admin
  const { data: isSuperAdmin } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_profiles')
        .select('is_super_admin')
        .eq('user_id', user!.id)
        .single();
      return data?.is_super_admin || false;
    },
    enabled: !!user,
  });

  // Fetch all conflict requests with student info
  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-conflict-requests', filter],
    queryFn: async () => {
      let query = supabase
        .from('gw_rehearsal_excuse_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with student profile info
      const userIds = [...new Set((data as any[]).map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (data as any[]).map((req: any) => {
        const profile = profileMap.get(req.user_id);
        return {
          ...req,
          student_name: profile?.full_name || 'Unknown Student',
          student_phone: profile?.phone || null,
        } as ConflictRequest;
      });
    },
    enabled: !!user && isSuperAdmin === true,
  });

  if (!isSuperAdmin) return null;

  const handleDecision = async (requestId: string, decision: 'approved' | 'denied') => {
    if (!user) return;

    try {
      setProcessing(true);

      // Update the request status
      const { error: updateError } = await supabase
        .from('gw_rehearsal_excuse_requests' as any)
        .update({
          status: decision,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes.trim() || null,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Send SMS notification if student has a phone number
      const request = requests?.find(r => r.id === requestId);
      if (request?.student_phone) {
        const statusText = decision === 'approved' ? '✅ APPROVED' : '❌ DENIED';
        const excuseText = request.excuse_type === 'full' ? 'full' : 'partial';
        const smsMessage = `GleeWorld: Your ${excuseText} rehearsal excuse for ${request.conflict_course_code || request.conflict_course_name} has been ${statusText}.${reviewNotes.trim() ? ` Note: ${reviewNotes.trim()}` : ''} — Spelman Glee Club`;

        try {
          const { error: smsError } = await supabase.functions.invoke('gw-send-sms', {
            body: {
              to: request.student_phone,
              message: smsMessage,
            },
          });
          if (smsError) {
            console.error('SMS send error:', smsError);
            toast.warning('Request updated but SMS notification failed');
          }
        } catch (smsErr) {
          console.error('SMS error:', smsErr);
        }
      }

      toast.success(`Request ${decision}`);
      queryClient.invalidateQueries({ queryKey: ['admin-conflict-requests'] });
      queryClient.invalidateQueries({ queryKey: ['rehearsal-excuse-requests'] });
      setReviewingRequest(null);
      setReviewNotes('');
    } catch (err) {
      console.error('Error processing request:', err);
      toast.error('Failed to process request');
    } finally {
      setProcessing(false);
    }
  };

  const statusCounts = {
    pending: requests?.filter(r => r.status === 'pending').length || 0,
    approved: requests?.filter(r => r.status === 'approved').length || 0,
    denied: requests?.filter(r => r.status === 'denied').length || 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'denied':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[10px]"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <>
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Conflict Excuse Approvals
                {statusCounts.pending > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    {statusCounts.pending}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Review and approve student rehearsal conflict excuses
              </CardDescription>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mt-2">
            {(['pending', 'approved', 'denied', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors capitalize",
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {f} {f !== 'all' && `(${statusCounts[f] || 0})`}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-xs text-muted-foreground">Loading requests...</div>
          ) : requests && requests.length > 0 ? (
            <div className="space-y-2">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-semibold">{req.student_name}</span>
                      </div>
                      <p className="text-xs font-medium">
                        {req.conflict_course_code ? `${req.conflict_course_code} — ` : ''}{req.conflict_course_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {req.conflict_days?.join(', ')} · {req.conflict_start_time?.slice(0, 5)}–{req.conflict_end_time?.slice(0, 5)} · {req.excuse_type === 'full' ? 'Full' : 'Partial'} excuse
                      </p>
                      {req.reason && (
                        <p className="text-[10px] text-muted-foreground mt-1 italic">"{req.reason}"</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Submitted {format(new Date(req.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="shrink-0 ml-2 flex flex-col items-end gap-1.5">
                      {getStatusBadge(req.status)}
                      {req.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-6 px-2"
                          onClick={() => {
                            setReviewingRequest(req);
                            setReviewNotes('');
                          }}
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                  {req.review_notes && (
                    <div className="text-[10px] p-2 rounded bg-muted border border-border/50">
                      <span className="font-medium">Review note:</span> {req.review_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">
              No {filter !== 'all' ? filter : ''} conflict requests.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewingRequest} onOpenChange={(open) => !open && setReviewingRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Review Conflict Request</DialogTitle>
          </DialogHeader>
          {reviewingRequest && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1.5">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{reviewingRequest.student_name}</span>
                </div>
                <p className="text-sm">
                  {reviewingRequest.conflict_course_code ? `${reviewingRequest.conflict_course_code} — ` : ''}
                  {reviewingRequest.conflict_course_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reviewingRequest.conflict_days?.join(', ')} · {reviewingRequest.conflict_start_time?.slice(0, 5)}–{reviewingRequest.conflict_end_time?.slice(0, 5)}
                </p>
                <Badge variant="outline" className="text-xs capitalize">
                  {reviewingRequest.excuse_type} excuse
                </Badge>
                {reviewingRequest.reason && (
                  <p className="text-xs text-muted-foreground italic mt-1">"{reviewingRequest.reason}"</p>
                )}
                {reviewingRequest.student_phone ? (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Send className="h-3 w-3" /> SMS will be sent to {reviewingRequest.student_phone}
                  </p>
                ) : (
                  <p className="text-[10px] text-orange-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3" /> No phone on file — no SMS will be sent
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Review Notes (optional)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Add a note for the student..."
                  className="text-sm resize-none"
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={processing}
                  onClick={() => handleDecision(reviewingRequest.id, 'approved')}
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={processing}
                  onClick={() => handleDecision(reviewingRequest.id, 'denied')}
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Deny
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
