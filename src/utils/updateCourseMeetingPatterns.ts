// Utility to update meeting_patterns JSONB for courses
// Run this from admin context (logged in as instructor/admin)

import { supabase } from '@/integrations/supabase/client';

interface MeetingPattern {
  days: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  startTime: string; // HH:MM 24-hour format
  endTime: string;
}

interface DualMeetingPattern {
  patterns: MeetingPattern[];
}

type MeetingPatterns = MeetingPattern | DualMeetingPattern;

// Confirmed Spring 2026 schedules
export const CONFIRMED_SCHEDULES: Record<string, { id: string; pattern: MeetingPatterns }> = {
  'MUS 240': {
    id: '23c4ee3c-7bbb-4534-8c0a-eecd88298d37',
    pattern: { days: [1, 3, 5], startTime: '13:00', endTime: '13:50' }, // MWF 1:00-1:50 PM (50 min)
  },
  'MUS 070': {
    id: 'a0000000-0000-0000-0000-000000000070',
    pattern: { days: [1, 3, 5], startTime: '17:00', endTime: '18:15' }, // MWF 5-6:15 PM
  },
  'MUS 210': {
    id: '2026c613-bda7-487a-a5d9-91e57c26a741',
    pattern: { days: [1, 3], startTime: '14:00', endTime: '14:50' }, // MW 2-2:50 PM
  },
  'LH 100': {
    id: 'a0000000-0000-0000-0000-000000000100',
    pattern: {
      patterns: [
        { days: [4], startTime: '19:00', endTime: '21:00' }, // Thu 7-9 PM
        { days: [0], startTime: '10:00', endTime: '13:00' }, // Sun 10 AM-1 PM
      ],
    },
  },
};

// Courses with no fixed schedule (by appointment)
export const BY_APPOINTMENT_COURSES = ['MUS 001', 'GLEE 101'];

/**
 * Updates meeting_patterns for all confirmed courses
 * Must be called from authenticated admin context
 */
export async function updateAllMeetingPatterns(): Promise<{ 
  success: boolean; 
  updated: string[]; 
  errors: string[] 
}> {
  const updated: string[] = [];
  const errors: string[] = [];

  for (const [code, { id, pattern }] of Object.entries(CONFIRMED_SCHEDULES)) {
    const { error } = await supabase
      .from('gw_courses')
      .update({ meeting_patterns: pattern as any })
      .eq('id', id);

    if (error) {
      console.error(`Error updating ${code}:`, error);
      errors.push(`${code}: ${error.message}`);
    } else {
      updated.push(code);
      console.log(`✓ Updated meeting_patterns for ${code}`);
    }
  }

  return {
    success: errors.length === 0,
    updated,
    errors,
  };
}

/**
 * Updates meeting_patterns for a single course
 */
export async function updateCourseMeetingPattern(
  courseId: string,
  pattern: MeetingPatterns
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('gw_courses')
    .update({ meeting_patterns: pattern as any })
    .eq('id', courseId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Gets the meeting pattern for a course code
 */
export function getMeetingPattern(courseCode: string): MeetingPatterns | null {
  return CONFIRMED_SCHEDULES[courseCode]?.pattern || null;
}

/**
 * Formats meeting pattern for display
 */
export function formatMeetingPattern(pattern: MeetingPatterns): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return minutes === 0 ? `${displayHours} ${ampm}` : `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  if ('patterns' in pattern) {
    return pattern.patterns
      .map(p => `${p.days.map(d => dayNames[d]).join('/')} ${formatTime(p.startTime)}-${formatTime(p.endTime)}`)
      .join(' • ');
  }

  return `${pattern.days.map(d => dayNames[d]).join('/')} ${formatTime(pattern.startTime)}-${formatTime(pattern.endTime)}`;
}
