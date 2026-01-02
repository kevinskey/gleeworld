// Spring 2026 Course Session Generator
// Generates class sessions for MUS 070, MUS 240, MUS 210

import { supabase } from '@/integrations/supabase/client';

const TIMEZONE = 'America/New_York';
const SEMESTER_START = '2026-01-14';
const SEMESTER_END = '2026-04-29';

// Exception dates (no classes)
const EXCEPTION_DATES = new Set([
  '2026-01-19', // MLK Jr. Day
  '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', // Spring Break
  '2026-04-03', // Good Friday
  '2026-04-17', // Research Day
]);

interface CourseConfig {
  code: string;
  title: string;
  days: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  startTime: string; // HH:MM
  endTime: string;
  category: string;
  templateSections: { type: string; label: string }[];
}

const COURSES: CourseConfig[] = [
  {
    code: 'MUS 240',
    title: 'Survey of African American Music',
    days: [1, 3, 5], // Mon, Wed, Fri
    startTime: '13:00',
    endTime: '13:50',
    category: 'Teaching',
    templateSections: [
      { type: 'objective', label: 'Learning Objectives' },
      { type: 'listening', label: 'Required Listening' },
      { type: 'reading', label: 'Required Reading' },
      { type: 'agenda', label: 'In-Class Agenda' },
      { type: 'discussion', label: 'Discussion Questions' },
      { type: 'assignment', label: 'Assignment/Assessment' },
    ],
  },
  {
    code: 'MUS 210',
    title: 'Conducting',
    days: [1, 3], // Mon, Wed
    startTime: '14:00',
    endTime: '14:50',
    category: 'Teaching',
    templateSections: [
      { type: 'technique', label: 'Technique Focus' },
      { type: 'repertoire', label: 'Score Study / Repertoire' },
      { type: 'activity', label: 'In-Class Lab Activity' },
      { type: 'homework', label: 'Homework' },
      { type: 'assessment', label: 'Assessment Notes' },
    ],
  },
  {
    code: 'MUS 070',
    title: 'Glee Club',
    days: [1, 3, 5], // Mon, Wed, Fri
    startTime: '17:00',
    endTime: '18:15',
    category: 'Ensemble',
    templateSections: [
      { type: 'repertoire', label: 'Repertoire' },
      { type: 'warmup', label: 'Warm-ups' },
      { type: 'activity', label: 'Sectional Plan' },
      { type: 'objective', label: 'Rehearsal Goals' },
      { type: 'note', label: 'Notes/Announcements' },
    ],
  },
];

// Academic calendar all-day events
const ACADEMIC_EVENTS = [
  { title: 'MLK Jr. Day', start: '2026-01-19', end: '2026-01-19' },
  { title: 'Spring Break', start: '2026-03-09', end: '2026-03-13' },
  { title: 'Good Friday', start: '2026-04-03', end: '2026-04-03' },
  { title: 'Founders Day Observed', start: '2026-04-09', end: '2026-04-09' },
  { title: 'Research Day', start: '2026-04-17', end: '2026-04-17' },
  { title: 'Last Day of Classes', start: '2026-04-29', end: '2026-04-29' },
  { title: 'Reading Period', start: '2026-04-30', end: '2026-05-01' },
  { title: 'Final Exams', start: '2026-05-04', end: '2026-05-08' },
];

function getWeekIndex(sessionDate: Date, semesterStart: Date): number {
  const diffTime = sessionDate.getTime() - semesterStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

function generateSessionDates(days: number[]): Date[] {
  const dates: Date[] = [];
  const start = new Date(SEMESTER_START);
  const end = new Date(SEMESTER_END);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    
    if (days.includes(dayOfWeek) && !EXCEPTION_DATES.has(dateStr)) {
      dates.push(new Date(d));
    }
  }
  
  return dates;
}

export async function generateSpring2026Courses(userId: string, calendarId: string) {
  const results: { course: string; sessions: number; firstDate: string; lastDate: string }[] = [];
  
  for (const config of COURSES) {
    // Create or update course
    const { data: course, error: courseError } = await supabase
      .from('gw_courses')
      .upsert({
        course_code: config.code,
        code: config.code,
        title: config.title,
        term: 'Spring 2026',
        semester: 'Spring 2026',
        start_date: SEMESTER_START,
        end_date: '2026-05-06',
        timezone: TIMEZONE,
        meeting_patterns: {
          days: config.days,
          startTime: config.startTime,
          endTime: config.endTime,
        },
        instructor_id: userId,
        created_by: userId,
        is_active: true,
      }, { onConflict: 'course_code' })
      .select()
      .single();

    if (courseError) {
      console.error('Error creating course:', courseError);
      continue;
    }

    // Generate sessions
    const sessionDates = generateSessionDates(config.days);
    const semesterStart = new Date(SEMESTER_START);
    
    const sessions = sessionDates.map((date, index) => ({
      course_id: course.id,
      session_index: index + 1,
      session_date: date.toISOString().split('T')[0],
      start_at: `${date.toISOString().split('T')[0]}T${config.startTime}:00-05:00`,
      end_at: `${date.toISOString().split('T')[0]}T${config.endTime}:00-05:00`,
      title: `${config.code} - Session ${index + 1}`,
      week_index: getWeekIndex(date, semesterStart),
      status: 'planned',
    }));

    // Insert sessions
    const { error: sessionsError } = await supabase
      .from('gw_course_sessions')
      .insert(sessions as any);

    if (sessionsError) {
      console.error('Error creating sessions:', sessionsError);
    }

    // Create calendar events for each session
    const events = sessionDates.map((date, index) => ({
      title: `${config.code} - ${config.title}`,
      start_date: `${date.toISOString().split('T')[0]}T${config.startTime}:00-05:00`,
      end_date: `${date.toISOString().split('T')[0]}T${config.endTime}:00-05:00`,
      calendar_id: calendarId,
      course_id: course.id,
      category: config.category,
      event_type: config.category,
      created_by: userId,
      is_public: false,
    }));

    const { error: eventsError } = await supabase
      .from('gw_events')
      .insert(events as any);

    if (eventsError) {
      console.error('Error creating events:', eventsError);
    }

    // Create course template
    const { error: templateError } = await supabase
      .from('gw_course_templates')
      .insert({
        course_id: course.id,
        name: `${config.code} Default Template`,
        template_json: config.templateSections,
        is_default: true,
        created_by: userId,
      } as any);

    if (templateError) {
      console.error('Error creating template:', templateError);
    }

    results.push({
      course: config.code,
      sessions: sessionDates.length,
      firstDate: sessionDates[0]?.toISOString().split('T')[0] || '',
      lastDate: sessionDates[sessionDates.length - 1]?.toISOString().split('T')[0] || '',
    });
  }

  // Create academic calendar events
  for (const event of ACADEMIC_EVENTS) {
    await supabase.from('gw_events').insert({
      title: event.title,
      start_date: `${event.start}T00:00:00-05:00`,
      end_date: `${event.end}T23:59:59-05:00`,
      calendar_id: calendarId,
      category: 'Academic Calendar',
      event_type: 'Academic',
      all_day: true,
      created_by: userId,
      is_public: true,
    } as any);
  }

  // Create office hours events (MWF 2:30-4:30 PM)
  const officeHoursDates = generateSessionDates([1, 3, 5]);
  for (const date of officeHoursDates) {
    await supabase.from('gw_events').insert({
      title: 'Office Hours',
      start_date: `${date.toISOString().split('T')[0]}T14:30:00-05:00`,
      end_date: `${date.toISOString().split('T')[0]}T16:30:00-05:00`,
      calendar_id: calendarId,
      category: 'Office Hours',
      event_type: 'Office Hours',
      created_by: userId,
      is_public: false,
    } as any);
  }

  return results;
}
