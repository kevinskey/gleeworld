import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface PeerReview {
  id: string;
  feedback: string;
  created_at: string;
  reviewer?: {
    full_name: string;
    email: string;
  };
}

interface PeerReviewListProps {
  reviews: PeerReview[];
}

export const PeerReviewList: React.FC<PeerReviewListProps> = ({ reviews }) => {
  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No peer reviews yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <h3 className="font-semibold">Peer Reviews</h3>
        <Badge variant="secondary">{reviews.length}</Badge>
      </div>

      {reviews.map((review) => (
        <Card key={review.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{review.reviewer?.full_name || 'Anonymous'}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(review.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{review.feedback}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
