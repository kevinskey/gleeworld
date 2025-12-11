import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  TrendingUp, Users, Briefcase, Music, GraduationCap, 
  ThumbsUp, ThumbsDown, Star, MapPin
} from "lucide-react";

interface ExitInterview {
  id: string;
  user_id: string;
  semester: string;
  intent_to_continue: boolean;
  interested_in_exec_board: boolean;
  exec_board_position_interest: string | null;
  interested_in_fall_tour: boolean;
  interested_in_advanced_ensemble: boolean;
  interested_in_private_lessons: boolean;
  satisfaction_overall: number | null;
  satisfaction_rehearsals: number | null;
  satisfaction_performances: number | null;
  satisfaction_community: number | null;
  satisfaction_leadership: number | null;
  satisfaction_communication: number | null;
}

interface MemberDossierAnalyticsProps {
  interviews: ExitInterview[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444'];

export const MemberDossierAnalytics: React.FC<MemberDossierAnalyticsProps> = ({ interviews }) => {
  const stats = useMemo(() => {
    const total = interviews.length;
    if (total === 0) return null;

    // Intent to continue
    const continueYes = interviews.filter(i => i.intent_to_continue).length;
    const continueNo = total - continueYes;

    // Exec board interest
    const execInterested = interviews.filter(i => i.interested_in_exec_board).length;
    
    // Position interests
    const positionCounts: Record<string, number> = {};
    interviews.forEach(i => {
      if (i.exec_board_position_interest) {
        const positions = i.exec_board_position_interest.split(',').map(p => p.trim());
        positions.forEach(pos => {
          if (pos) positionCounts[pos] = (positionCounts[pos] || 0) + 1;
        });
      }
    });

    // Tour interest
    const tourInterested = interviews.filter(i => i.interested_in_fall_tour).length;

    // Advanced ensemble
    const ensembleInterested = interviews.filter(i => i.interested_in_advanced_ensemble).length;

    // Private lessons
    const lessonsInterested = interviews.filter(i => i.interested_in_private_lessons).length;

    // Satisfaction averages
    const calcAvg = (key: keyof ExitInterview) => {
      const scores = interviews.map(i => i[key]).filter(s => s !== null) as number[];
      return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    };

    const satisfactionData = [
      { name: 'Overall', score: calcAvg('satisfaction_overall') },
      { name: 'Rehearsals', score: calcAvg('satisfaction_rehearsals') },
      { name: 'Performances', score: calcAvg('satisfaction_performances') },
      { name: 'Community', score: calcAvg('satisfaction_community') },
      { name: 'Leadership', score: calcAvg('satisfaction_leadership') },
      { name: 'Communication', score: calcAvg('satisfaction_communication') },
    ];

    return {
      total,
      continueYes,
      continueNo,
      execInterested,
      positionCounts,
      tourInterested,
      ensembleInterested,
      lessonsInterested,
      satisfactionData,
      retentionRate: (continueYes / total) * 100,
      execRate: (execInterested / total) * 100,
      tourRate: (tourInterested / total) * 100,
    };
  }, [interviews]);

  if (!stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No interview data to analyze
      </div>
    );
  }

  const retentionPieData = [
    { name: 'Continuing', value: stats.continueYes },
    { name: 'Not Continuing', value: stats.continueNo },
  ];

  const interestsPieData = [
    { name: 'Exec Board', value: stats.execInterested },
    { name: 'Fall Tour', value: stats.tourInterested },
    { name: 'Advanced Ensemble', value: stats.ensembleInterested },
    { name: 'Private Lessons', value: stats.lessonsInterested },
  ];

  const positionData = Object.entries(stats.positionCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3 w-3" />
              Total Responses
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3 w-3" />
              Retention Rate
            </div>
            <div className="text-2xl font-bold text-green-500">{stats.retentionRate.toFixed(0)}%</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Briefcase className="h-3 w-3" />
              Exec Interest
            </div>
            <div className="text-2xl font-bold text-primary">{stats.execInterested}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <MapPin className="h-3 w-3" />
              Tour Interest
            </div>
            <div className="text-2xl font-bold text-amber-500">{stats.tourInterested}</div>
          </CardContent>
        </Card>
      </div>

      {/* Satisfaction Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="h-4 w-4" />
            Satisfaction Scores (Average out of 5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.satisfactionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 14 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 14 }} width={110} />
                <Tooltip 
                  formatter={(value: number) => [value.toFixed(2), 'Score']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 14 }}
                />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Retention Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Intent to Continue (Spring 2026)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={retentionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500" />
                <span>Continuing ({stats.continueYes})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500" />
                <span>Not Continuing ({stats.continueNo})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interests Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Music className="h-4 w-4" />
              Member Interests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Executive Board</span>
                <span className="text-muted-foreground">{stats.execInterested}/{stats.total}</span>
              </div>
              <Progress value={(stats.execInterested / stats.total) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Fall Tour</span>
                <span className="text-muted-foreground">{stats.tourInterested}/{stats.total}</span>
              </div>
              <Progress value={(stats.tourInterested / stats.total) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Advanced Ensemble</span>
                <span className="text-muted-foreground">{stats.ensembleInterested}/{stats.total}</span>
              </div>
              <Progress value={(stats.ensembleInterested / stats.total) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Private Lessons</span>
                <span className="text-muted-foreground">{stats.lessonsInterested}/{stats.total}</span>
              </div>
              <Progress value={(stats.lessonsInterested / stats.total) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exec Board Position Interests */}
      {positionData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Exec Board Position Interests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {positionData.map(({ name, value }) => (
                <Badge key={name} variant="secondary" className="text-xs">
                  {name} <span className="ml-1 text-primary font-bold">({value})</span>
                </Badge>
              ))}
            </div>
            {positionData.length > 0 && (
              <div className="h-[180px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={positionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-35} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 14 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 14 }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
