import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Users, 
  Star,
  Calendar,
  Music,
  Filter
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
    voice_part?: string;
  } | null;
  reviewer_profile?: {
    full_name: string;
  } | null;
  gw_events?: {
    title: string;
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
    voice_part?: string;
  } | null;
  gw_sheet_music?: {
    title: string;
  } | null;
}

interface MemberSummary {
  user_id: string;
  full_name: string;
  voice_part?: string;
  feedback_count: number;
  average_rating: number;
  recent_feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
}

const StarDisplay = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
      <span className="ml-1 text-sm">{rating.toFixed(1)}</span>
    </div>
  );
};

const CategoryHeatmap = ({ data }: { data: any[] }) => {
  const categories = ['Vocal Blend', 'Rhythmic Precision', 'Diction', 'Posture', 'Energy'];
  
  const categoryAverages = categories.map(category => {
    const categoryData = data.filter(item => item.category === category);
    const average = categoryData.length > 0 
      ? categoryData.reduce((sum, item) => sum + item.rating, 0) / categoryData.length 
      : 0;
    return {
      category,
      average,
      count: categoryData.length
    };
  });

  const getColorIntensity = (rating: number) => {
    if (rating >= 4.5) return 'bg-green-500';
    if (rating >= 4) return 'bg-green-400';
    if (rating >= 3.5) return 'bg-yellow-400';
    if (rating >= 3) return 'bg-orange-400';
    if (rating > 0) return 'bg-red-400';
    return 'bg-gray-200';
  };

  return (
    <div className="space-y-3">
      {categoryAverages.map((item, index) => (
        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex-1">
            <div className="font-medium">{item.category}</div>
            <div className="text-sm text-muted-foreground">{item.count} feedback entries</div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded ${getColorIntensity(item.average)}`}></div>
            <StarDisplay rating={item.average} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const FeedbackDashboard = () => {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [filters, setFilters] = useState({
    voice_part: '',
    category: '',
    review_type: '',
    piece_title: ''
  });
  const [memberSummaries, setMemberSummaries] = useState<MemberSummary[]>([]);

  useEffect(() => {
    fetchData();
  }, [dateRange, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchFeedback(),
        fetchReviews()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    try {
      let query = supabase
        .from('gw_rehearsal_feedback')
        .select(`
          *,
          gw_profiles!gw_rehearsal_feedback_user_id_fkey (full_name, voice_part),
          reviewer_profile:gw_profiles!gw_rehearsal_feedback_reviewer_id_fkey (full_name),
          gw_events (title)
        `)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59')
        .order('created_at', { ascending: false });

              // Note: Filtering by nested profile fields requires a different approach
              // We'll filter these in the client side for now

      const { data, error } = await query;
      if (error) throw error;
      
      // Client-side filtering for nested fields
      let filteredData = (data as any) || [];
      if (filters.voice_part) {
        filteredData = filteredData.filter((item: any) => 
          item.gw_profiles?.voice_part === filters.voice_part
        );
      }
      if (filters.category) {
        filteredData = filteredData.filter((item: any) => 
          item.category === filters.category
        );
      }
      
      setFeedback(filteredData);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      let query = supabase
        .from('gw_performance_reviews')
        .select(`
          *,
          gw_profiles!gw_performance_reviews_user_id_fkey (full_name, voice_part),
          gw_sheet_music (title)
        `)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59')
        .order('created_at', { ascending: false });

              if (filters.review_type) {
                query = query.eq('review_type', filters.review_type as any);
              }

      const { data, error } = await query;
      if (error) throw error;
      
      // Client-side filtering for nested fields
      let filteredData = (data as any) || [];
      if (filters.voice_part) {
        filteredData = filteredData.filter((item: any) => 
          item.gw_profiles?.voice_part === filters.voice_part
        );
      }
      
      setReviews(filteredData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const generateMemberSummaries = () => {
    const userMap = new Map<string, MemberSummary>();

    // Process feedback data
    feedback.forEach(item => {
      if (!item.gw_profiles) return;
      
      const userId = item.user_id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user_id: userId,
          full_name: item.gw_profiles.full_name,
          voice_part: item.gw_profiles.voice_part,
          feedback_count: 0,
          average_rating: 0,
          recent_feedback: '',
          strengths: [],
          areas_for_improvement: []
        });
      }

      const summary = userMap.get(userId)!;
      summary.feedback_count++;
      
      if (item.rating >= 4) {
        if (!summary.strengths.includes(item.category)) {
          summary.strengths.push(item.category);
        }
      } else if (item.rating <= 2) {
        if (!summary.areas_for_improvement.includes(item.category)) {
          summary.areas_for_improvement.push(item.category);
        }
      }
    });

    // Process reviews data
    reviews.forEach(item => {
      if (!item.gw_profiles) return;
      
      const userId = item.user_id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user_id: userId,
          full_name: item.gw_profiles.full_name,
          voice_part: item.gw_profiles.voice_part,
          feedback_count: 0,
          average_rating: 0,
          recent_feedback: '',
          strengths: [],
          areas_for_improvement: []
        });
      }

      const summary = userMap.get(userId)!;
      summary.feedback_count++;
    });

    // Calculate averages
    userMap.forEach((summary, userId) => {
      const userFeedback = feedback.filter(f => f.user_id === userId);
      const userReviews = reviews.filter(r => r.user_id === userId);
      
      const allRatings = [
        ...userFeedback.map(f => f.rating),
        ...userReviews.map(r => r.rating)
      ];
      
      if (allRatings.length > 0) {
        summary.average_rating = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;
      }

      // Get most recent feedback
      const recentItems = [...userFeedback, ...userReviews]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      if (recentItems.length > 0) {
        summary.recent_feedback = format(new Date(recentItems[0].created_at), 'MMM dd, yyyy');
      }
    });

    setMemberSummaries(Array.from(userMap.values()));
  };

  useEffect(() => {
    generateMemberSummaries();
  }, [feedback, reviews]);

  const exportToCSV = () => {
    const csvData = [
      ['Date', 'Member', 'Voice Part', 'Category/Type', 'Rating', 'Notes'],
      ...feedback.map(item => [
        format(new Date(item.created_at), 'yyyy-MM-dd'),
        item.gw_profiles?.full_name || 'Unknown',
        item.gw_profiles?.voice_part || '',
        item.category,
        item.rating.toString(),
        item.notes
      ]),
      ...reviews.map(item => [
        format(new Date(item.created_at), 'yyyy-MM-dd'),
        item.gw_profiles?.full_name || 'Unknown',
        item.gw_profiles?.voice_part || '',
        item.review_type,
        item.rating.toString(),
        item.notes
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-dashboard-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rehearsal Feedback Dashboard</h2>
          <p className="text-muted-foreground">Analyze performance trends and member progress</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
            <div>
              <Label>Voice Part</Label>
              <Select value={filters.voice_part} onValueChange={(value) => setFilters({...filters, voice_part: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All parts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Parts</SelectItem>
                  <SelectItem value="S1">Soprano 1</SelectItem>
                  <SelectItem value="S2">Soprano 2</SelectItem>
                  <SelectItem value="A1">Alto 1</SelectItem>
                  <SelectItem value="A2">Alto 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="Vocal Blend">Vocal Blend</SelectItem>
                  <SelectItem value="Rhythmic Precision">Rhythmic Precision</SelectItem>
                  <SelectItem value="Diction">Diction</SelectItem>
                  <SelectItem value="Posture">Posture</SelectItem>
                  <SelectItem value="Energy">Energy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Review Type</Label>
              <Select value={filters.review_type} onValueChange={(value) => setFilters({...filters, review_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="Self Assessment">Self Assessment</SelectItem>
                  <SelectItem value="Section Leader Review">Section Leader</SelectItem>
                  <SelectItem value="Admin Review">Admin Review</SelectItem>
                  <SelectItem value="Peer Review">Peer Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="heatmap">
        <TabsList>
          <TabsTrigger value="heatmap">Category Heatmap</TabsTrigger>
          <TabsTrigger value="members">Member Summary</TabsTrigger>
          <TabsTrigger value="recent">Recent Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Category Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryHeatmap data={feedback} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Member Progress Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {memberSummaries.map((member, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{member.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.voice_part} • {member.feedback_count} feedback entries
                        </div>
                      </div>
                      <div className="text-right">
                        <StarDisplay rating={member.average_rating} />
                        <div className="text-sm text-muted-foreground">
                          Last: {member.recent_feedback || 'No recent feedback'}
                        </div>
                      </div>
                    </div>
                    
                    {member.strengths.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-green-700">Strengths: </span>
                        <div className="flex flex-wrap gap-1">
                          {member.strengths.map((strength, i) => (
                            <Badge key={i} variant="secondary" className="bg-green-100 text-green-800">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {member.areas_for_improvement.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-orange-700">Areas to improve: </span>
                        <div className="flex flex-wrap gap-1">
                          {member.areas_for_improvement.map((area, i) => (
                            <Badge key={i} variant="secondary" className="bg-orange-100 text-orange-800">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {memberSummaries.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No feedback data available for the selected period.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Feedback Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...feedback, ...reviews]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 20)
                  .map((item, index) => (
                    <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {item.gw_profiles?.full_name || 'Unknown'}
                          </span>
                          {'category' in item ? (
                            <Badge variant="outline">{item.category}</Badge>
                          ) : (
                            <Badge variant="outline">{item.review_type}</Badge>
                          )}
                          {item.gw_profiles?.voice_part && (
                            <Badge variant="secondary">{item.gw_profiles.voice_part}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {format(new Date(item.created_at), 'MMM dd, yyyy h:mm a')}
                          {item.is_anonymous && <span className="ml-2 text-orange-600">(Anonymous)</span>}
                        </div>
                        {item.notes && (
                          <p className="text-sm">{item.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StarDisplay rating={item.rating} />
                      </div>
                    </div>
                  ))}
                {feedback.length === 0 && reviews.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No recent feedback available.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};