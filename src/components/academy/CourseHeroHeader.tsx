import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, MapPin, Calendar } from 'lucide-react';
import type { AcademyCourse } from '@/config/academyCourses';
import type { CourseTheme } from '@/lib/academy/courseTheme';

interface CourseHeroHeaderProps {
  course: AcademyCourse;
  theme: CourseTheme;
  /** Optional "next up" event/assignment. If provided, renders as an at-a-glance chip. */
  nextUp?: {
    label: string;   // e.g. "Next rehearsal"
    title: string;   // e.g. "Rehearsal — Aria Concerto"
    when: string;    // pre-formatted, e.g. "Fri · 7:00 PM"
    location?: string;
  };
}

// Universal hero block at the top of every academy class page.
// Preserves each course's identity via theme, gives students immediate
// context (course, instructor, meeting time), and surfaces one "next up"
// item so the landing tab isn't a blank canvas.
export function CourseHeroHeader({ course, theme, nextUp }: CourseHeroHeaderProps) {
  const textColor = theme.tone === 'light' ? 'text-white' : 'text-slate-900';
  const mutedColor = theme.tone === 'light' ? 'text-white/70' : 'text-slate-600';
  const softBg = theme.tone === 'light' ? 'bg-white/10' : 'bg-black/5';
  const softBorder = theme.tone === 'light' ? 'border-white/15' : 'border-black/10';

  return (
    <section className={`relative ${textColor} px-4 sm:px-6 md:px-8 pt-6 pb-8 md:pt-8 md:pb-10`}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        {/* Left: chip + title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${theme.chip[0]}, ${theme.chip[1]})`,
                color: theme.tone === 'light' ? '#0a0a0a' : '#ffffff',
              }}
            >
              {theme.glyph && <span aria-hidden className="text-sm">{theme.glyph}</span>}
              {course.courseCode}
            </span>
            <Badge variant="outline" className={`${textColor} ${softBorder} ${softBg} font-medium`}>
              {course.level}
            </Badge>
            <Badge variant="outline" className={`${textColor} ${softBorder} ${softBg} font-medium hidden sm:inline-flex`}>
              {course.duration}
            </Badge>
          </div>
          <h1 className={`text-2xl md:text-3xl lg:text-4xl font-bold leading-tight tracking-tight ${textColor}`}>
            {course.title}
          </h1>
          <p className={`mt-2 text-sm md:text-base max-w-2xl ${mutedColor}`}>
            {course.description}
          </p>
        </div>

        {/* Right: instructor identity block */}
        <div className={`flex items-center gap-3 rounded-2xl ${softBg} ${softBorder} border px-4 py-3 md:min-w-[240px]`}>
          <Avatar className="h-11 w-11">
            {course.instructor.imageUrl && (
              <AvatarImage src={course.instructor.imageUrl} alt={course.instructor.name} />
            )}
            <AvatarFallback className="text-sm">
              {course.instructor.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className={`text-xs uppercase tracking-wider ${mutedColor}`}>Instructor</div>
            <div className={`font-semibold truncate ${textColor}`}>{course.instructor.name}</div>
            <div className={`text-xs truncate ${mutedColor}`}>
              {course.instructor.office} · {course.instructor.hours}
            </div>
          </div>
        </div>
      </div>

      {/* Next-up chip (optional). Sits below hero on its own row so it
          reads as an at-a-glance action without competing with the title. */}
      {nextUp && (
        <div className={`mt-6 inline-flex items-center gap-3 rounded-full ${softBg} ${softBorder} border px-4 py-2`}>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider ${mutedColor}`}>
            <Clock className="h-3.5 w-3.5" />
            {nextUp.label}
          </span>
          <span className={`text-sm font-semibold ${textColor}`}>{nextUp.title}</span>
          <span className={`text-sm ${mutedColor} inline-flex items-center gap-1`}>
            <Calendar className="h-3.5 w-3.5" /> {nextUp.when}
          </span>
          {nextUp.location && (
            <span className={`text-sm ${mutedColor} inline-flex items-center gap-1 hidden sm:inline-flex`}>
              <MapPin className="h-3.5 w-3.5" /> {nextUp.location}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
