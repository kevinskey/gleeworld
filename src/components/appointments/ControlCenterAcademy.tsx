import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const courseGradients: Record<string, string> = {
  'MUS 070': 'from-cyan-500/30 to-blue-600/30',
  'MUS 240': 'from-amber-500/30 to-orange-600/30',
  'MUS 210': 'from-violet-500/30 to-purple-600/30',
  'MUS 001': 'from-rose-500/30 to-pink-600/30',
  'GLEE 101': 'from-emerald-500/30 to-green-600/30',
  'GLEE 000': 'from-sky-500/30 to-indigo-600/30',
  'MUS 101': 'from-teal-500/30 to-cyan-600/30',
  'LH 100': 'from-yellow-500/30 to-amber-600/30',
};

const courseAccents: Record<string, string> = {
  'MUS 070': 'text-cyan-300',
  'MUS 240': 'text-amber-300',
  'MUS 210': 'text-violet-300',
  'MUS 001': 'text-rose-300',
  'GLEE 101': 'text-emerald-300',
  'GLEE 000': 'text-sky-300',
  'MUS 101': 'text-teal-300',
  'LH 100': 'text-yellow-300',
};

export const ControlCenterAcademy: React.FC = () => {
  const navigate = useNavigate();
  const activeCourses = ACADEMY_COURSES.filter(c => c.isActive);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {activeCourses.map(course => {
          const Icon = course.icon;
          const gradient = courseGradients[course.courseCode] || 'from-white/10 to-white/5';
          const accent = courseAccents[course.courseCode] || 'text-white';

          return (
            <button
              key={course.id}
              onClick={() => navigate(course.route)}
              className={cn(
                "group relative flex flex-col items-center gap-3 p-4 sm:p-5 rounded-xl",
                "bg-gradient-to-br border border-white/10 backdrop-blur-md",
                "hover:scale-[1.03] hover:border-white/25 hover:shadow-lg hover:shadow-white/5",
                "transition-all duration-300 text-center",
                gradient
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center",
                "bg-white/10 group-hover:bg-white/20 transition-colors border border-white/10"
              )}>
                <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7", accent)} />
              </div>

              {/* Course Code */}
              <span className={cn("font-['Cinzel'] text-sm sm:text-base font-bold tracking-wide", accent)}>
                {course.courseCode}
              </span>

              {/* Title */}
              <span className="text-white/70 text-[11px] sm:text-xs leading-tight line-clamp-2">
                {course.title}
              </span>

              {/* Level badge */}
              <Badge className="bg-white/10 text-white/60 border-white/10 text-[9px] px-2">
                {course.level}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2 justify-center pt-2">
        <button
          onClick={() => navigate('/grading/instructor')}
          className="text-xs text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 border border-white/10"
        >
          Instructor Console →
        </button>
        <button
          onClick={() => navigate('/grading/admin')}
          className="text-xs text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 border border-white/10"
        >
          Grading Admin →
        </button>
        <button
          onClick={() => navigate('/glee-academy')}
          className="text-xs text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 border border-white/10"
        >
          Academy Portal →
        </button>
      </div>
    </div>
  );
};
