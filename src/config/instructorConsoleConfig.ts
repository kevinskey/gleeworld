/**
 * Instructor Console Template Configuration
 * 
 * Universal navigation and feature configuration for the Instructor Console.
 * ALL courses use the same console interface - this ensures consistency.
 * 
 * Courses may differ ONLY by:
 * - enabled/disabled sections (via feature flags)
 * - course-specific extension tools
 */

import { LucideIcon, FileText, FolderOpen, BookOpen, Calendar, Music, ClipboardCheck, BarChart3, ListChecks, Trophy, UserPlus, QrCode, BarChart, Megaphone, ListMusic, Video, Shield, CalendarDays, Brain, Settings, MessageSquare } from 'lucide-react';

export interface InstructorNavItem {
  value: string;
  label: string;
  icon: LucideIcon;
  requiresFeature?: string; // Feature flag key
}

export interface InstructorNavCategory {
  label: string;
  items: InstructorNavItem[];
}

// Standard instructor console navigation categories
export const INSTRUCTOR_NAV_CATEGORIES: InstructorNavCategory[] = [
  {
    label: 'Content',
    items: [
      { value: 'syllabus', label: 'Syllabus', icon: FileText },
      { value: 'modules', label: 'Modules', icon: FolderOpen },
      { value: 'class-notes', label: 'Class Notes', icon: BookOpen },
      { value: 'calendar', label: 'Calendar', icon: Calendar },
    ]
  },
  {
    label: 'Assessment',
    items: [
      { value: 'assignments', label: 'Assignments', icon: BookOpen },
      { value: 'sight-reading', label: 'Sight Reading', icon: Music, requiresFeature: 'hasSightReading' },
      { value: 'tests', label: 'Tests', icon: ClipboardCheck, requiresFeature: 'hasTests' },
      { value: 'discussions', label: 'Discussions', icon: MessageSquare, requiresFeature: 'hasDiscussions' },
      { value: 'polls', label: 'Polls', icon: BarChart3, requiresFeature: 'hasPolls' },
      { value: 'rubrics', label: 'Rubrics', icon: ListChecks },
      { value: 'grades', label: 'Grades', icon: Trophy },
    ]
  },
  {
    label: 'Students',
    items: [
      { value: 'students', label: 'Enrollment', icon: UserPlus },
      { value: 'quick-attendance', label: 'Attendance', icon: QrCode },
      { value: 'analytics', label: 'Analytics', icon: BarChart },
      { value: 'announcements', label: 'Announcements', icon: Megaphone },
    ]
  },
  {
    label: 'Resources',
    items: [
      { value: 'resources', label: 'Course Materials', icon: BookOpen },
      { value: 'playlists', label: 'Playlists', icon: ListMusic },
      { value: 'videos', label: 'Video Library', icon: Video },
    ]
  },
  {
    label: 'Tools',
    items: [
      { value: 'attendance-security', label: 'Attendance Security', icon: Shield },
      { value: 'semesters', label: 'Semesters', icon: CalendarDays },
      { value: 'ai-assistant', label: 'AI Assistant', icon: Brain },
      { value: 'settings', label: 'Settings', icon: Settings },
    ]
  }
];

// Default instructor features (all enabled by default)
export const DEFAULT_INSTRUCTOR_FEATURES: Record<string, boolean> = {
  hasTests: true,
  hasPolls: true,
  hasDiscussions: true,
  hasSightReading: true,
  hasJournals: true,
  hasAnalytics: true,
  hasAIAssistant: true,
};

// Course-specific instructor feature overrides
export const INSTRUCTOR_FEATURE_OVERRIDES: Record<string, Partial<typeof DEFAULT_INSTRUCTOR_FEATURES>> = {
  // MUS 001 - Private Lessons (minimal features)
  'a0000000-0000-0000-0000-000000000001': {
    hasTests: false,
    hasPolls: false,
    hasDiscussions: false,
    hasSightReading: false,
  },
  // GLEE 000 - Sight Singing (focused on tests and assignments)
  'a0000000-0000-0000-0000-000000000000': {
    hasPolls: false,
    hasDiscussions: false,
  },
  // LH 100 - Bowman Scholars
  'a0000000-0000-0000-0000-000000000100': {
    hasTests: false,
    hasPolls: false,
    hasDiscussions: false,
    hasSightReading: false,
  },
};

/**
 * Get instructor features for a course
 */
export const getInstructorFeatures = (courseId: string): Record<string, boolean> => {
  const overrides = INSTRUCTOR_FEATURE_OVERRIDES[courseId] || {};
  return { ...DEFAULT_INSTRUCTOR_FEATURES, ...overrides };
};

/**
 * Filter nav categories based on course features
 */
export const getFilteredNavCategories = (courseId: string): InstructorNavCategory[] => {
  const features = getInstructorFeatures(courseId);
  
  return INSTRUCTOR_NAV_CATEGORIES.map(category => ({
    ...category,
    items: category.items.filter(item => {
      if (!item.requiresFeature) return true;
      return features[item.requiresFeature] !== false;
    })
  })).filter(category => category.items.length > 0);
};

/**
 * Get flat list of all nav items for a course
 */
export const getAllInstructorNavItems = (courseId: string): InstructorNavItem[] => {
  return getFilteredNavCategories(courseId).flatMap(cat => cat.items);
};
