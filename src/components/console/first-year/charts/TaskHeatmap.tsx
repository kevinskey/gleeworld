import React from "react";
import { format, startOfWeek, addDays } from "date-fns";

interface TaskHeatmapProps {
  data?: Array<{
    date: string;
    day: number;
    month: number;
    submissions: number;
    intensity: number;
  }>;
}

export const TaskHeatmap = ({ data }: TaskHeatmapProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground">
        No task data available
      </div>
    );
  }

  // Group data by weeks (7-day chunks)
  const weeks = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return "bg-muted";
    if (intensity <= 0.2) return "bg-green-200";
    if (intensity <= 0.4) return "bg-green-300";
    if (intensity <= 0.6) return "bg-green-400";
    if (intensity <= 0.8) return "bg-green-500";
    return "bg-green-600";
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4">
      {/* Heatmap Grid */}
      <div className="flex items-start gap-2">
        {/* Day labels */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground w-8">
          <div className="h-3"></div> {/* Spacer for month labels */}
          {dayLabels.map((day, index) => (
            <div key={day} className="h-3 flex items-center">
              {index % 2 === 1 && <span>{day}</span>}
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="flex-1">
          {/* Month labels */}
          <div className="flex mb-1">
            {weeks.map((week, weekIndex) => {
              const firstDay = week[0];
              if (!firstDay) return <div key={weekIndex} className="w-3"></div>;
              
              const showMonth = weekIndex === 0 || 
                (weekIndex > 0 && weeks[weekIndex - 1][0]?.month !== firstDay.month);
              
              return (
                <div key={weekIndex} className="w-3 text-xs text-muted-foreground">
                  {showMonth && (
                    <span>{format(new Date(firstDay.date), "MMM")}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Days grid */}
          <div className="flex flex-col gap-1">
            {dayLabels.map((_, dayIndex) => (
              <div key={dayIndex} className="flex gap-1">
                {weeks.map((week, weekIndex) => {
                  const dayData = week[dayIndex];
                  if (!dayData) {
                    return <div key={weekIndex} className="w-3 h-3"></div>;
                  }
                  
                  return (
                    <div
                      key={weekIndex}
                      className={`w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${getIntensityColor(dayData.intensity)}`}
                      title={`${format(new Date(dayData.date), "MMM d, yyyy")}: ${dayData.submissions} submissions`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-muted"></div>
          <div className="w-3 h-3 rounded-sm bg-green-200"></div>
          <div className="w-3 h-3 rounded-sm bg-green-300"></div>
          <div className="w-3 h-3 rounded-sm bg-green-400"></div>
          <div className="w-3 h-3 rounded-sm bg-green-500"></div>
          <div className="w-3 h-3 rounded-sm bg-green-600"></div>
        </div>
        <span>More</span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-lg font-semibold">
            {data.reduce((sum, day) => sum + day.submissions, 0)}
          </div>
          <div className="text-xs text-muted-foreground">Total Submissions</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold">
            {Math.round(data.reduce((sum, day) => sum + day.submissions, 0) / data.length * 7)}
          </div>
          <div className="text-xs text-muted-foreground">Avg per Week</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold">
            {Math.max(...data.map(day => day.submissions))}
          </div>
          <div className="text-xs text-muted-foreground">Peak Day</div>
        </div>
      </div>
    </div>
  );
};