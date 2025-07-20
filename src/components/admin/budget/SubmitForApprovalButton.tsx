import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubmitForApprovalButtonProps {
  eventId: string;
  currentStatus: string;
  onStatusUpdate: () => void;
}

export const SubmitForApprovalButton = ({ 
  eventId, 
  currentStatus, 
  onStatusUpdate 
}: SubmitForApprovalButtonProps) => {
  const { toast } = useToast();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitForApproval = async () => {
    try {
      setIsSubmitting(true);

      // Update the event's budget status to pending_approval
      const { error } = await supabase
        .from('events')
        .update({
          budget_status: 'pending_approval',
          date_submitted_for_approval: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Budget Submitted",
        description: "Budget has been submitted for treasurer and super admin approval",
      });

      setShowSubmitDialog(false);
      setSubmissionNotes('');
      onStatusUpdate();
    } catch (err) {
      console.error('Error submitting budget for approval:', err);
      toast({
        title: "Error",
        description: "Failed to submit budget for approval",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't show button if already submitted or approved
  if (['pending_approval', 'approved', 'rejected'].includes(currentStatus)) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setShowSubmitDialog(true)}
        size="sm"
        className="w-full"
      >
        <Send className="h-4 w-4 mr-1" />
        Submit for Approval
      </Button>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Budget for Approval</DialogTitle>
            <DialogDescription>
              This budget will be sent to the treasurer and super admin for approval. 
              Both approvals are required before the budget can be finalized.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Approval Process</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Treasurer must approve the budget</li>
                <li>• Super admin must approve the budget</li>
                <li>• Both approvals are required for final approval</li>
                <li>• You will be notified once approved or if rejected</li>
              </ul>
            </div>
            
            <Textarea
              placeholder="Optional: Add any notes or context for the approvers..."
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowSubmitDialog(false);
                setSubmissionNotes('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitForApproval}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Submit for Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};