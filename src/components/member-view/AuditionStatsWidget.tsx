import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Music, MapPin, TrendingUp, Timer, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AuditionStats {
  totalApplications: number;
  activeSession: string | null;
  voicePartBreakdown: { [key: string]: number };
  academicYearBreakdown: { [key: string]: number };
  majorBreakdown: { [key: string]: number };
  averageGPA: number;
  slotsAvailable: number;
  slotsFilled: number;
  averageScore: number;
  pendingCount: number;
  acceptedCount: number;
}

export const AuditionStatsWidget = () => {
  const [stats, setStats] = useState<AuditionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditionStats();
  }, []);

  const fetchAuditionStats = async () => {
    try {
      setLoading(true);

      // Get the most recent active session
      const { data: sessions } = await supabase
        .from('audition_sessions')
        .select('id, name, max_applicants')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      const activeSession = sessions?.[0];

      if (!activeSession) {
        setStats({
          totalApplications: 0,
          activeSession: null,
          voicePartBreakdown: {},
          academicYearBreakdown: {},
          majorBreakdown: {},
          averageGPA: 0,
          slotsAvailable: 0,
          slotsFilled: 0,
          averageScore: 0,
          pendingCount: 0,
          acceptedCount: 0,
        });
        return;
      }

      // Get applications for the active session
      const { data: applications } = await supabase
        .from('audition_applications')
        .select(`
          voice_part_preference,
          academic_year,
          major,
          gpa,
          status
        `)
        .eq('session_id', activeSession.id);

      // Get evaluation scores
      const { data: evaluations } = await supabase
        .from('audition_evaluations')
        .select('overall_score')
        .not('overall_score', 'is', null);

      if (!applications) {
        setLoading(false);
        return;
      }

      // Calculate statistics
      const voicePartBreakdown: { [key: string]: number } = {};
      const academicYearBreakdown: { [key: string]: number } = {};
      const majorBreakdown: { [key: string]: number } = {};
      
      let totalGPA = 0;
      let gpaCount = 0;
      let pendingCount = 0;
      let acceptedCount = 0;

      applications.forEach(app => {
        // Voice parts
        if (app.voice_part_preference) {
          voicePartBreakdown[app.voice_part_preference] = 
            (voicePartBreakdown[app.voice_part_preference] || 0) + 1;
        }

        // Academic years
        if (app.academic_year) {
          academicYearBreakdown[app.academic_year] = 
            (academicYearBreakdown[app.academic_year] || 0) + 1;
        }

        // Majors (top 5)
        if (app.major) {
          majorBreakdown[app.major] = (majorBreakdown[app.major] || 0) + 1;
        }

        // GPA
        if (app.gpa) {
          totalGPA += parseFloat(app.gpa.toString());
          gpaCount++;
        }

        // Status counts
        if (app.status === 'submitted' || app.status === 'under_review') {
          pendingCount++;
        } else if (app.status === 'accepted') {
          acceptedCount++;
        }
      });

      // Calculate average score
      const totalScore = evaluations?.reduce((sum, evaluation) => 
        sum + (parseFloat(evaluation.overall_score?.toString() || '0')), 0) || 0;
      const averageScore = evaluations?.length ? totalScore / evaluations.length : 0;

      // Sort and limit major breakdown to top 5
      const sortedMajors = Object.entries(majorBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

      const slotsAvailable = activeSession.max_applicants || 30;
      const slotsFilled = acceptedCount;

      setStats({
        totalApplications: applications.length,
        activeSession: activeSession.name,
        voicePartBreakdown,
        academicYearBreakdown,
        majorBreakdown: sortedMajors,
        averageGPA: gpaCount > 0 ? totalGPA / gpaCount : 0,
        slotsAvailable,
        slotsFilled,
        averageScore,
        pendingCount,
        acceptedCount,
      });

    } catch (error) {
      console.error('Error fetching audition stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-white/20 rounded w-3/4"></div>
            <div className="h-3 bg-white/20 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || !stats.activeSession) {
    return (
      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardContent className="p-4 text-center">
          <p className="text-white/80 text-sm">No active audition session</p>
        </CardContent>
      </Card>
    );
  }

  const fillPercentage = stats.slotsAvailable > 0 
    ? Math.round((stats.slotsFilled / stats.slotsAvailable) * 100) 
    : 0;

  const remainingSlots = Math.max(0, stats.slotsAvailable - stats.slotsFilled);

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-white" />
            <span className="text-white font-medium text-sm">Audition Insights</span>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            {stats.activeSession}
          </Badge>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-3 w-3 text-white/80" />
              <span className="text-white text-lg font-bold">{stats.totalApplications}</span>
            </div>
            <p className="text-white/70 text-xs">Auditioners</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Timer className="h-3 w-3 text-white/80" />
              <span className="text-white text-lg font-bold">{stats.pendingCount}</span>
            </div>
            <p className="text-white/70 text-xs">Pending</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-white/80" />
              <span className="text-white text-lg font-bold">{fillPercentage}%</span>
            </div>
            <p className="text-white/70 text-xs">Slots Filled</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="h-3 w-3 text-white/80" />
              <span className="text-white text-lg font-bold">{stats.averageScore.toFixed(1)}</span>
            </div>
            <p className="text-white/70 text-xs">Avg Score</p>
          </div>
        </div>

        {/* Slots Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/80">
            <span>{remainingSlots} slots available</span>
            <span>{stats.slotsFilled}/{stats.slotsAvailable}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>

        {/* Voice Parts Breakdown */}
        {Object.keys(stats.voicePartBreakdown).length > 0 && (
          <div className="space-y-1">
            <p className="text-white/80 text-xs font-medium">Voice Parts:</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.voicePartBreakdown)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 4)
                .map(([part, count]) => (
                <Badge 
                  key={part} 
                  variant="outline" 
                  className="bg-white/10 text-white/90 border-white/30 text-xs px-2 py-0"
                >
                  {part}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Academic Years */}
        {Object.keys(stats.academicYearBreakdown).length > 0 && (
          <div className="space-y-1">
            <p className="text-white/80 text-xs font-medium">Class Years:</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.academicYearBreakdown)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 4)
                .map(([year, count]) => (
                <Badge 
                  key={year} 
                  variant="outline" 
                  className="bg-white/10 text-white/90 border-white/30 text-xs px-2 py-0"
                >
                  {year}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top Majors */}
        {Object.keys(stats.majorBreakdown).length > 0 && (
          <div className="space-y-1">
            <p className="text-white/80 text-xs font-medium">Top Majors:</p>
            <div className="space-y-1">
              {Object.entries(stats.majorBreakdown)
                .slice(0, 3)
                .map(([major, count]) => (
                <div key={major} className="flex justify-between text-xs text-white/80">
                  <span className="truncate">{major}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Average GPA */}
        {stats.averageGPA > 0 && (
          <div className="text-center pt-2 border-t border-white/20">
            <span className="text-white/80 text-xs">Avg GPA: </span>
            <span className="text-white font-bold text-sm">{stats.averageGPA.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};