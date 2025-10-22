import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquarePlus } from 'lucide-react';

interface PeerReviewFormProps {
  onSubmit: (feedback: string) => Promise<boolean>;
  existingReview?: { feedback: string; id: string };
}

export const PeerReviewForm: React.FC<PeerReviewFormProps> = ({ 
  onSubmit, 
  existingReview 
}) => {
  const [feedback, setFeedback] = useState(existingReview?.feedback || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const success = await onSubmit(feedback);
    if (success) {
      if (!existingReview) {
        setFeedback('');
      }
    }
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5" />
          {existingReview ? 'Edit Your Review' : 'Write a Peer Review'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Share constructive feedback on this journal entry. Consider: strengths, areas for improvement, specific examples, and suggestions..."
          rows={6}
          className="resize-none"
        />
        <div className="flex justify-end gap-2">
          <Button 
            onClick={handleSubmit}
            disabled={!feedback.trim() || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
