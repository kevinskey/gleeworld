import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Mic, FileText, Play, Clock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface Interview {
  id: string;
  interviewee_name: string;
  interviewee_class_year?: number;
  title: string;
  interview_type: 'video' | 'audio' | 'text';
  video_url?: string;
  audio_url?: string;
  transcript?: string;
  excerpt?: string;
  thumbnail_url?: string;
  duration_minutes?: number;
  tags?: string[];
  is_featured: boolean;
  published_at: string;
}

export const InterviewSegments = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const { data, error } = await supabase
        .from('alumnae_interviews')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setInterviews((data || []) as Interview[]);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const getInterviewIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Mic className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getInterviewTypeBadge = (type: string) => {
    const colors = {
      video: 'bg-blue-100 text-blue-700',
      audio: 'bg-green-100 text-green-700',
      text: 'bg-amber-100 text-amber-700'
    };
    return colors[type as keyof typeof colors] || colors.text;
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="p-12 flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (interviews.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Alumnae Interviews
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No interviews available yet</p>
          <p className="text-sm text-muted-foreground mt-2">Stay tuned for inspiring stories from our alumnae!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Alumnae Interviews
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interviews.map((interview) => (
            <div
              key={interview.id}
              className="relative p-4 rounded-lg border hover-scale cursor-pointer bg-gradient-to-br from-background to-secondary/20"
              onClick={() => setSelectedInterview(interview)}
            >
              {interview.is_featured && (
                <Badge className="absolute top-2 right-2 bg-yellow-100 text-yellow-800">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}

              {interview.thumbnail_url ? (
                <div className="relative w-full h-32 rounded-md overflow-hidden mb-3">
                  <img 
                    src={interview.thumbnail_url} 
                    alt={interview.interviewee_name}
                    className="w-full h-full object-cover"
                  />
                  {(interview.interview_type === 'video' || interview.interview_type === 'audio') && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="h-6 w-6 text-purple-600 ml-1" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-32 rounded-md bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-3">
                  {getInterviewIcon(interview.interview_type)}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getInterviewTypeBadge(interview.interview_type)}>
                    {getInterviewIcon(interview.interview_type)}
                    <span className="ml-1 capitalize">{interview.interview_type}</span>
                  </Badge>
                  {interview.duration_minutes && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {interview.duration_minutes} min
                    </Badge>
                  )}
                </div>

                <h4 className="font-semibold text-sm line-clamp-2">{interview.title}</h4>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="font-medium">{interview.interviewee_name}</span>
                  {interview.interviewee_class_year && (
                    <span>• Class of '{interview.interviewee_class_year.toString().slice(-2)}</span>
                  )}
                </div>

                {interview.excerpt && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{interview.excerpt}</p>
                )}

                {interview.tags && interview.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {interview.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-6">
          <Button variant="outline">View All Interviews</Button>
        </div>
      </CardContent>
    </Card>
  );
};
