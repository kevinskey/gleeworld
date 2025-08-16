import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Target } from "lucide-react";
import { useFirstYearData } from "@/hooks/useFirstYearData";

export const FirstYearHeader = () => {
  const { studentRecord } = useFirstYearData();

  if (!studentRecord) {
    return (
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-4"></div>
            <div className="h-4 bg-muted rounded w-96"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentWeek = Math.ceil((Date.now() - new Date(studentRecord.cohort.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const totalWeeks = Math.ceil((new Date(studentRecord.cohort.end_date).getTime() - new Date(studentRecord.cohort.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000));

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome to First-Year Hub
            </h1>
            <p className="text-muted-foreground text-lg">
              Your journey as a {studentRecord.cohort.name} member
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Week {currentWeek} of {totalWeeks}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {studentRecord.cohort.name}
            </Badge>
            {studentRecord.voice_part && (
              <Badge variant="outline" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                {studentRecord.voice_part}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Academic Year Progress</span>
            <span>{Math.round((currentWeek / totalWeeks) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((currentWeek / totalWeeks) * 100, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};