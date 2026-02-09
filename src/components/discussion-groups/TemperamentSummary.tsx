import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, RefreshCw, Users, TrendingUp, AlertTriangle, 
  Sparkles, ThermometerSun, User 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudentTemperament {
  name: string;
  sentiment: string;
  engagement: string;
  tone: string;
  summary: string;
  postCount: number;
}

interface ClassSummary {
  overallMood: string;
  engagementLevel: string;
  keyThemes: string[];
  concerns: string;
  highlights: string;
}

interface AnalysisResult {
  analysis: {
    classSummary: ClassSummary;
    students: StudentTemperament[];
  };
  metadata: {
    totalStudents: number;
    totalDiscussions: number;
    totalReplies: number;
    analyzedAt: string;
  };
}

interface TemperamentSummaryProps {
  courseId: string;
}

const sentimentColor = (s: string) => {
  switch (s.toLowerCase()) {
    case 'positive': case 'passionate': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'neutral': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'cautious': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'negative': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};

const engagementColor = (e: string) => {
  switch (e.toLowerCase()) {
    case 'high': return 'bg-emerald-100 text-emerald-800';
    case 'moderate': return 'bg-blue-100 text-blue-800';
    case 'low': return 'bg-red-100 text-red-800';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const moodIcon = (mood: string) => {
  switch (mood.toLowerCase()) {
    case 'enthusiastic': return '🔥';
    case 'engaged': return '💡';
    case 'neutral': return '😐';
    case 'disengaged': return '😶';
    case 'mixed': return '🎭';
    default: return '📊';
  }
};

export const TemperamentSummary: React.FC<TemperamentSummaryProps> = ({ courseId }) => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-discussion-temperament', {
        body: { courseId },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResult(data);
      toast.success('Temperament analysis complete');
    } catch (err: any) {
      console.error('Analysis error:', err);
      toast.error(err.message || 'Failed to run analysis');
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-60" />
          <h3 className="text-lg font-semibold mb-2">Student Temperament Analysis</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Use AI to analyze student sentiment, engagement levels, and temperament patterns 
            across all submitted discussion posts.
          </p>
          <Button onClick={runAnalysis} disabled={loading} size="lg">
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing submissions...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Run Temperament Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { classSummary, students } = result.analysis;
  const { metadata } = result;

  return (
    <div className="space-y-4">
      {/* Refresh button */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Analyzed {metadata.totalReplies} replies from {metadata.totalStudents} students across {metadata.totalDiscussions} discussions
          {' · '}
          {new Date(metadata.analyzedAt).toLocaleString()}
        </div>
        <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading}>
          {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          <span className="ml-1">Re-analyze</span>
        </Button>
      </div>

      {/* Class Summary Card */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ThermometerSun className="h-5 w-5 text-primary" />
            Class Temperament Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Overall Mood</p>
              <p className="text-lg font-semibold">
                {moodIcon(classSummary.overallMood)} {classSummary.overallMood}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Engagement Level</p>
              <p className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {classSummary.engagementLevel}
              </p>
            </div>
          </div>

          {classSummary.keyThemes.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Key Themes</p>
              <div className="flex flex-wrap gap-2">
                {classSummary.keyThemes.map((theme, i) => (
                  <Badge key={i} variant="secondary">{theme}</Badge>
                ))}
              </div>
            </div>
          )}

          {classSummary.highlights && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Highlights
              </p>
              <p className="text-sm text-emerald-800">{classSummary.highlights}</p>
            </div>
          )}

          {classSummary.concerns && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Concerns
              </p>
              <p className="text-sm text-amber-800">{classSummary.concerns}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-Student Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Individual Student Temperament
          </CardTitle>
          <CardDescription>
            {students.length} students analyzed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
              {students.map((student, i) => (
                <div key={i} className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{student.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({student.postCount} post{student.postCount !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className={`text-xs ${sentimentColor(student.sentiment)}`}>
                        {student.sentiment}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${engagementColor(student.engagement)}`}>
                        {student.engagement}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1 italic">
                    Tone: {student.tone}
                  </div>
                  <p className="text-sm text-foreground/80">{student.summary}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
