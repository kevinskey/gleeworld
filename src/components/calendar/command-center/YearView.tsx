import { useMemo } from "react";
import {
  format, startOfYear, addMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isSameDay, getDay,
} from "date-fns";
import { cn } from "@/lib/utils";

interface YearViewProps {
  currentDate: Date;
  onMonthSelect: (monthStart: Date) => void;
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Apple Calendar-style year view: 12 mini months, today circled,
 *  current month name tinted. Tapping a month jumps to Month view. */
export const YearView = ({ currentDate, onMonthSelect }: YearViewProps) => {
  const today = new Date();
  const months = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    return Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
  }, [currentDate]);

  return (
    <div className="h-full overflow-auto bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-x-12 gap-y-10">
          {months.map((monthStart) => {
            const isCurrentMonth = isSameMonth(monthStart, today);
            const monthEnd = endOfMonth(monthStart);
            const days = eachDayOfInterval({ start: startOfMonth(monthStart), end: monthEnd });
            const leadingBlanks = getDay(monthStart);

            return (
              <button
                key={monthStart.toISOString()}
                type="button"
                onClick={() => onMonthSelect(monthStart)}
                className="text-left rounded-xl p-2 -m-2 hover:bg-slate-50 transition-colors"
              >
                <h3 className={cn(
                  "text-xl font-bold mb-2",
                  isCurrentMonth ? "text-primary" : "text-foreground",
                )}>
                  {format(monthStart, 'MMM')}
                </h3>
                <div className="grid grid-cols-7 gap-x-1 gap-y-1 text-center">
                  {DOW.map((d, i) => (
                    <span key={i} className="text-[9px] font-semibold text-muted-foreground">
                      {d}
                    </span>
                  ))}
                  {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <span key={`blank-${i}`} />
                  ))}
                  {days.map((day) => {
                    const isToday = isSameDay(day, today);
                    return (
                      <span
                        key={day.toISOString()}
                        className={cn(
                          "inline-flex items-center justify-center w-6 h-6 mx-auto rounded-full text-[11px] font-medium tabular-nums",
                          isToday
                            ? "bg-primary text-primary-foreground font-bold"
                            : "text-slate-800",
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
