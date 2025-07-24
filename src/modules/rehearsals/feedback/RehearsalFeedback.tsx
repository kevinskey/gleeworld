import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  MessageSquare, 
  Star, 
  TrendingUp,
  Users,
  Music,
  Plus,
  BarChart3,
  Calendar,
  User
} from 'lucide-react';

interface FeedbackEntry {
  id: string;
  event_id: string | null;
  user_id: string;
  reviewer_id: string;
  category: 'Vocal Blend' | 'Rhythmic Precision' | 'Diction' | 'Posture' | 'Energy';
  rating: number;
  notes: string;
  is_anonymous: boolean;
  created_at: string;
  gw_profiles?: {
    full_name: string;
  } | null;
  reviewer_profile?: {
    full_name: string;
  } | null;
}

interface PerformanceReview {
  id: string;
  music_id: string | null;
  user_id: string;
  reviewer_id: string;
  review_type: 'Self Assessment' | 'Section Leader Review' | 'Admin Review' | 'Peer Review';
  rating: number;
  notes: string;
  rehearsal_date: string | null;
  is_anonymous: boolean;
  created_at: string;
  gw_profiles?: {
    full_name: string;
  } | null;
  gw_sheet_music?: {
    title: string;
  } | null;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
}

const StarRating = ({ rating, onRatingChange, readonly = false }: { 
  rating: number; 
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
}) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 cursor-pointer ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
          onClick={() => !readonly && onRatingChange?.(star)}
        />
      ))}
    </div>
  );
};

export const RehearsalFeedback = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [isLeaderOrAdmin, setIsLeaderOrAdmin] = useState(false);
  const [sheetMusic, setSheetMusic] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const [newFeedback, setNewFeedback] = useState({
    event_id: '',
    user_id: '',
    category: 'Vocal Blend' as const,
    rating: 5,
    notes: '',
    is_anonymous: false
  });

  const [newReview, setNewReview] = useState({
    music_id: '',
    user_id: '',
    review_type: 'Self Assessment' as const,
    rating: 5,
    notes: '',
    rehearsal_date: format(new Date(), 'yyyy-MM-dd'),
    is_anonymous: false
  });

  useEffect(() => {
    if (user) {
      checkLeaderStatus();
      fetchFeedback();
      fetchReviews();
      fetchUsers();
      fetchSheetMusic();
      fetchEvents();
    }
  }, [user]);

  const checkLeaderStatus = async () => {
    try {
      const { data } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, role')
        .eq('user_id', user?.id)
        .single();
      
      setIsLeaderOrAdmin(
        data?.is_admin || 
        data?.is_super_admin || 
        data?.role === 'section_leader' || 
        data?.role === 'executive'
      );
    } catch (error) {
      console.error('Error checking leader status:', error);
    }
  };

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_rehearsal_feedback')
        .select(`
          *,
          gw_profiles!gw_rehearsal_feedback_user_id_fkey (full_name),
          reviewer_profile:gw_profiles!gw_rehearsal_feedback_reviewer_id_fkey (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback((data as any) || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback",
        variant: "destructive"
      });
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_performance_reviews')
        .select(`
          *,
          gw_profiles!gw_performance_reviews_user_id_fkey (full_name),
          gw_sheet_music (title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews((data as any) || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchSheetMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('id, title')
        .order('title');

      if (error) throw error;
      setSheetMusic(data || []);
    } catch (error) {
      console.error('Error fetching sheet music:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_events')
        .select('id, title')
        .eq('event_type', 'rehearsal')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const submitFeedback = async () => {
    try {
      const { error } = await supabase
        .from('gw_rehearsal_feedback')
        .insert({
          ...newFeedback,
          reviewer_id: user?.id,
          event_id: newFeedback.event_id || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feedback submitted"
      });

      setShowFeedbackDialog(false);
      setNewFeedback({
        event_id: '',
        user_id: '',
        category: 'Vocal Blend',
        rating: 5,
        notes: '',
        is_anonymous: false
      });
      
      fetchFeedback();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive"
      });
    }
  };

  const submitReview = async () => {
    try {
      const { error } = await supabase
        .from('gw_performance_reviews')
        .insert({
          ...newReview,
          reviewer_id: user?.id,
          user_id: newReview.user_id || user?.id,
          music_id: newReview.music_id || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review submitted"
      });

      setShowReviewDialog(false);
      setNewReview({
        music_id: '',
        user_id: '',
        review_type: 'Self Assessment',
        rating: 5,
        notes: '',
        rehearsal_date: format(new Date(), 'yyyy-MM-dd'),
        is_anonymous: false
      });
      
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive"
      });
    }
  };

  const getCategoryStats = () => {
    const stats = feedback.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = { total: 0, count: 0 };
      }
      acc[item.category].total += item.rating;
      acc[item.category].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return Object.entries(stats).map(([category, data]) => ({
      category,
      average: (data.total / data.count).toFixed(1)
    }));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rehearsal Feedback</h2>
          <p className="text-muted-foreground">Track performance feedback and self-assessments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/rehearsals/feedback-dashboard'}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Self Assessment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Performance Self-Assessment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Music Piece (optional)</Label>
                  <Select value={newReview.music_id} onValueChange={(value) => setNewReview({...newReview, music_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select music piece" />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetMusic.map((music) => (
                        <SelectItem key={music.id} value={music.id}>
                          {music.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="rehearsal_date">Rehearsal Date</Label>
                  <Input
                    id="rehearsal_date"
                    type="date"
                    value={newReview.rehearsal_date}
                    onChange={(e) => setNewReview({...newReview, rehearsal_date: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Overall Rating</Label>
                  <StarRating 
                    rating={newReview.rating} 
                    onRatingChange={(rating) => setNewReview({...newReview, rating})}
                  />
                </div>

                <div>
                  <Label htmlFor="review_notes">Notes</Label>
                  <Textarea
                    id="review_notes"
                    value={newReview.notes}
                    onChange={(e) => setNewReview({...newReview, notes: e.target.value})}
                    placeholder="How did you feel about your performance today?"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anonymous_review"
                    checked={newReview.is_anonymous}
                    onCheckedChange={(checked) => setNewReview({...newReview, is_anonymous: checked as boolean})}
                  />
                  <Label htmlFor="anonymous_review">Submit anonymously</Label>
                </div>

                <Button onClick={submitReview} className="w-full">
                  Submit Assessment
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {isLeaderOrAdmin && (
            <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Give Feedback
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Give Rehearsal Feedback</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Rehearsal (optional)</Label>
                    <Select value={newFeedback.event_id} onValueChange={(value) => setNewFeedback({...newFeedback, event_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rehearsal" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Member</Label>
                    <Select value={newFeedback.user_id} onValueChange={(value) => setNewFeedback({...newFeedback, user_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select value={newFeedback.category} onValueChange={(value: any) => setNewFeedback({...newFeedback, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vocal Blend">Vocal Blend</SelectItem>
                        <SelectItem value="Rhythmic Precision">Rhythmic Precision</SelectItem>
                        <SelectItem value="Diction">Diction</SelectItem>
                        <SelectItem value="Posture">Posture</SelectItem>
                        <SelectItem value="Energy">Energy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Rating</Label>
                    <StarRating 
                      rating={newFeedback.rating} 
                      onRatingChange={(rating) => setNewFeedback({...newFeedback, rating})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="feedback_notes">Notes</Label>
                    <Textarea
                      id="feedback_notes"
                      value={newFeedback.notes}
                      onChange={(e) => setNewFeedback({...newFeedback, notes: e.target.value})}
                      placeholder="Specific feedback and suggestions..."
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="anonymous_feedback"
                      checked={newFeedback.is_anonymous}
                      onCheckedChange={(checked) => setNewFeedback({...newFeedback, is_anonymous: checked as boolean})}
                    />
                    <Label htmlFor="anonymous_feedback">Submit anonymously</Label>
                  </div>

                  <Button onClick={submitFeedback} className="w-full">
                    Submit Feedback
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="feedback">
        <TabsList>
          <TabsTrigger value="feedback">Recent Feedback</TabsTrigger>
          <TabsTrigger value="reviews">Self Assessments</TabsTrigger>
          <TabsTrigger value="stats">Performance Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {feedback.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{item.category}</Badge>
                          <StarRating rating={item.rating} readonly />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(item.created_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <div className="text-sm font-medium mb-1">
                          For: {item.gw_profiles?.full_name}
                        </div>
                        {!item.is_anonymous && (
                          <div className="text-sm text-muted-foreground mb-2">
                            By: {item.reviewer_profile?.full_name}
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-sm text-muted-foreground">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {feedback.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No feedback entries yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Self Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{review.review_type}</Badge>
                          <StarRating rating={review.rating} readonly />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(review.created_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        {review.gw_sheet_music && (
                          <div className="text-sm font-medium mb-1">
                            Music: {review.gw_sheet_music.title}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground mb-1">
                          By: {review.gw_profiles?.full_name}
                        </div>
                        {review.notes && (
                          <p className="text-sm text-muted-foreground">{review.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No self-assessments yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Category Averages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getCategoryStats().map((stat) => (
                    <div key={stat.category} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{stat.category}</span>
                      <div className="flex items-center gap-2">
                        <StarRating rating={Math.round(parseFloat(stat.average))} readonly />
                        <span className="text-sm text-muted-foreground">{stat.average}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Feedback</span>
                    <span className="text-2xl font-bold">{feedback.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Self Assessments</span>
                    <span className="text-2xl font-bold">{reviews.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Rating</span>
                    <span className="text-2xl font-bold">
                      {feedback.length > 0 
                        ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
                        : '0.0'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};