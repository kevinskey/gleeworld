import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp } from 'lucide-react';

interface GradesSectionProps {
  courseId: string;
  gradingBreakdown: Array<{ item: string; percentage: number }>;
}

export const GradesSection: React.FC<GradesSectionProps> = ({ courseId, gradingBreakdown }) => {
  // Mock data - in real implementation, fetch from database
  const currentGrade = 92.5;
  const letterGrade = 'A';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Grades</h2>
        <Badge variant="default" className="text-lg px-4 py-2">
          Current: {letterGrade} ({currentGrade}%)
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-semibold">{currentGrade}%</span>
            </div>
            <Progress value={currentGrade} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Grade Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {gradingBreakdown.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.item}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      Worth {item.percentage}%
                    </span>
                    <Badge variant="outline">--</Badge>
                  </div>
                </div>
                <Progress value={0} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grade Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { grade: 'A', range: '90-100' },
              { grade: 'B', range: '80-89' },
              { grade: 'C', range: '70-79' },
              { grade: 'D', range: '60-69' },
              { grade: 'F', range: '0-59' }
            ].map((item) => (
              <div key={item.grade} className="text-center p-3 rounded-md bg-muted/50">
                <div className="text-2xl font-bold text-primary">{item.grade}</div>
                <div className="text-xs text-muted-foreground">{item.range}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
