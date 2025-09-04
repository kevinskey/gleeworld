import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Palette, Check, X, Clock, Calendar, User, MessageSquare } from "lucide-react";
import { useHairNailSubmissions, HairNailSubmission } from "@/hooks/useHairNailSubmissions";
import { formatDistanceToNow } from 'date-fns';

export const HairNailApprovalPanel = () => {
  const { submissions, pendingCount, loading, updateSubmissionStatus } = useHairNailSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<HairNailSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (status: 'approved' | 'rejected') => {
    if (!selectedSubmission) return;

    setIsUpdating(true);
    try {
      await updateSubmissionStatus(
        selectedSubmission.id,
        status,
        reviewNotes.trim() || undefined
      );
      setSelectedSubmission(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-600"><Check className="h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSubmissionTypeDisplay = (type: string) => {
    switch (type) {
      case 'hair':
        return 'Hair Design';
      case 'nails':
        return 'Nail Design';
      case 'both':
        return 'Hair & Nails';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Hair & Nail Approval Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-r-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading submissions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Hair & Nail Approval Panel
          </div>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {pendingCount} Pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No submissions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Dialog key={submission.id}>
                <DialogTrigger asChild>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={submission.image_url}
                          alt={`${submission.submission_type} submission`}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">
                              {getSubmissionTypeDisplay(submission.submission_type)}
                            </p>
                            {getStatusBadge(submission.status)}
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              <span>Member ID: {submission.user_id.slice(0, 8)}...</span>
                            </div>
                            
                            {submission.event_name && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>{submission.event_name}</span>
                                {submission.event_date && (
                                  <span>- {new Date(submission.event_date).toLocaleDateString()}</span>
                                )}
                              </div>
                            )}
                            
                            <p>Submitted {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {getSubmissionTypeDisplay(submission.submission_type)} Submission
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <img
                        src={submission.image_url}
                        alt={`${submission.submission_type} submission`}
                        className="max-w-full max-h-96 object-contain rounded-lg"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Status</p>
                        <div className="mt-1">{getStatusBadge(submission.status)}</div>
                      </div>
                      
                      <div>
                        <p className="font-medium">Submitted</p>
                        <p className="text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      
                      {submission.event_name && (
                        <div>
                          <p className="font-medium">Event</p>
                          <p className="text-muted-foreground mt-1">{submission.event_name}</p>
                        </div>
                      )}
                      
                      {submission.event_date && (
                        <div>
                          <p className="font-medium">Event Date</p>
                          <p className="text-muted-foreground mt-1">
                            {new Date(submission.event_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {submission.notes && (
                      <div>
                        <p className="font-medium">Member Notes</p>
                        <p className="text-muted-foreground mt-1 bg-gray-50 p-3 rounded">
                          {submission.notes}
                        </p>
                      </div>
                    )}
                    
                    {submission.review_notes && (
                      <div>
                        <p className="font-medium">Review Notes</p>
                        <p className="text-muted-foreground mt-1 bg-gray-50 p-3 rounded">
                          {submission.review_notes}
                        </p>
                      </div>
                    )}
                    
                    {submission.status === 'pending' && (
                      <div className="space-y-4 pt-4 border-t">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Review Notes (Optional)
                          </label>
                          <Textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Add feedback or comments..."
                            rows={3}
                          />
                        </div>
                        
                        <div className="flex gap-3">
                          <Button
                            onClick={() => {
                              setSelectedSubmission(submission);
                              handleStatusUpdate('rejected');
                            }}
                            disabled={isUpdating}
                            variant="destructive"
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          
                          <Button
                            onClick={() => {
                              setSelectedSubmission(submission);
                              handleStatusUpdate('approved');
                            }}
                            disabled={isUpdating}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};