import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';

interface SlideApproval {
  id: string;
  presentation_id: string;
  slide_index: number;
  slide_title: string;
  status: 'pending' | 'approved' | 'needs_revision';
  reviewer_comment: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
}

interface SlideApprovalPanelProps {
  presentationId: string;
  slideIndex: number;
  slideTitle: string;
  onApprovalChange?: () => void;
}

export const SlideApprovalPanel: React.FC<SlideApprovalPanelProps> = ({
  presentationId,
  slideIndex,
  slideTitle,
  onApprovalChange
}) => {
  const { profile, loading: userLoading } = useUserRole();
  const [approval, setApproval] = useState<SlideApproval | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    fetchApproval();
  }, [presentationId, slideIndex]);

  const fetchApproval = async () => {
    try {
      const { data, error } = await supabase
        .from('slide_approvals')
        .select('*')
        .eq('presentation_id', presentationId)
        .eq('slide_index', slideIndex)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setApproval(data as SlideApproval);
        setComment(data.reviewer_comment || '');
      }
    } catch (error) {
      console.error('Error fetching approval:', error);
    }
  };

  const handleApprove = async () => {
    if (!isAdmin) return;
    await updateApproval('approved');
  };

  const handleRequestRevision = async () => {
    if (!isAdmin) return;
    setShowCommentBox(true);
  };

  const submitRevisionRequest = async () => {
    if (!comment.trim()) {
      toast.error('Please provide a comment explaining what needs revision');
      return;
    }
    await updateApproval('needs_revision');
    setShowCommentBox(false);
  };

  const updateApproval = async (status: 'approved' | 'needs_revision') => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const approvalData = {
        presentation_id: presentationId,
        slide_index: slideIndex,
        slide_title: slideTitle,
        status,
        reviewer_comment: comment || null,
        reviewer_id: userData.user?.id,
        reviewer_name: profile.full_name || profile.email || 'Unknown',
        reviewed_at: new Date().toISOString(),
      };

      if (approval) {
        // Update existing
        const { error } = await supabase
          .from('slide_approvals')
          .update(approvalData)
          .eq('id', approval.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('slide_approvals')
          .insert([approvalData]);

        if (error) throw error;
      }

      toast.success(status === 'approved' ? 'Slide approved!' : 'Revision requested');
      await fetchApproval();
      onApprovalChange?.();
    } catch (error) {
      console.error('Error updating approval:', error);
      toast.error('Failed to update approval status');
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) return null;

  // Show approval status to everyone
  if (approval && !isAdmin) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${
            approval.status === 'approved' 
              ? 'text-green-400' 
              : 'text-yellow-400'
          }`}>
            {approval.status === 'approved' ? (
              <Check className="h-5 w-5" />
            ) : (
              <MessageSquare className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm">
              {approval.status === 'approved' 
                ? 'Slide Approved' 
                : 'Revision Requested'
              }
            </p>
            {approval.reviewer_comment && (
              <p className="text-white/80 text-sm mt-1">{approval.reviewer_comment}</p>
            )}
            {approval.reviewer_name && (
              <p className="text-white/60 text-xs mt-2">
                By {approval.reviewer_name} • {new Date(approval.reviewed_at!).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show approval controls to admins only
  if (!isAdmin) return null;

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
      <div className="space-y-3">
        {/* Current Status */}
        {approval && (
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <div className={`flex items-center gap-1 ${
              approval.status === 'approved' 
                ? 'text-green-400' 
                : 'text-yellow-400'
            }`}>
              {approval.status === 'approved' ? (
                <Check className="h-4 w-4" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              <span className="capitalize">{approval.status.replace('_', ' ')}</span>
            </div>
          </div>
        )}

        {/* Comment Box */}
        {showCommentBox ? (
          <div className="space-y-2">
            <Textarea
              placeholder="Explain what needs to be revised..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={submitRevisionRequest}
                disabled={loading || !comment.trim()}
                size="sm"
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                Submit Request
              </Button>
              <Button
                onClick={() => {
                  setShowCommentBox(false);
                  setComment(approval?.reviewer_comment || '');
                }}
                variant="outline"
                size="sm"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Previous Comment Display */}
            {approval?.reviewer_comment && (
              <div className="bg-white/5 rounded p-2 mb-2">
                <p className="text-white/70 text-sm">{approval.reviewer_comment}</p>
                <p className="text-white/50 text-xs mt-1">
                  {approval.reviewer_name} • {new Date(approval.reviewed_at!).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={loading}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
              >
                <Check className="h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={handleRequestRevision}
                disabled={loading}
                variant="outline"
                size="sm"
                className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50 hover:bg-yellow-500/30 flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Request Revision
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
