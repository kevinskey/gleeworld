import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Video, 
  FileText, 
  Music, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Play, 
  ExternalLink,
  Calendar,
  Headphones,
  PenLine,
  FileCheck,
  ChevronRight,
  Lock,
  Unlock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isAfter, isBefore, startOfWeek, endOfWeek } from 'date-fns';

interface ModuleResource {
  id: string;
  title: string;
  type: 'video' | 'reading' | 'audio' | 'document' | 'assignment' | 'quiz' | 'discussion';
  url?: string;
  duration?: string;
  completed?: boolean;
  description?: string;
}

interface WeeklyModule {
  id: string;
  week_number: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_locked: boolean;
  resources: ModuleResource[];
  learning_objectives?: string[];
  completion_percentage?: number;
}

interface CourseModulesProps {
  courseId: string;
  isEnrolled?: boolean;
  isAdmin?: boolean;
}

// LH 100 modules removed

// Sample data for MUS 240 - Survey of African American Music
const MUS240_MODULES: WeeklyModule[] = [
  {
    id: 'week-1',
    week_number: 1,
    title: 'Introduction to African American Music',
    description: 'Explore the origins and significance of African American music in American culture.',
    start_date: '2025-01-13',
    end_date: '2025-01-19',
    is_active: true,
    is_locked: false,
    learning_objectives: [
      'Understand the cultural roots of African American music',
      'Identify the role of music in African American history',
      'Recognize the influence of African musical traditions'
    ],
    resources: [
      { id: '1', title: 'Course Introduction Video', type: 'video', duration: '15 min', completed: true },
      { id: '2', title: 'Chapter 1: Origins', type: 'reading', duration: '30 min', completed: true },
      { id: '3', title: 'Listening: African Roots', type: 'audio', duration: '20 min', completed: false },
      { id: '4', title: 'Week 1 Discussion', type: 'discussion', completed: false },
    ],
    completion_percentage: 50
  },
  {
    id: 'week-2',
    week_number: 2,
    title: 'Spirituals and the Enslaved Experience',
    description: 'Examine the development of spirituals and their role in the lives of enslaved people.',
    start_date: '2025-01-20',
    end_date: '2025-01-26',
    is_active: true,
    is_locked: false,
    learning_objectives: [
      'Analyze the musical characteristics of spirituals',
      'Understand the dual meaning (religious and coded messages)',
      'Connect spirituals to the Underground Railroad'
    ],
    resources: [
      { id: '5', title: 'Spirituals Documentary', type: 'video', duration: '45 min', completed: false },
      { id: '6', title: 'Chapter 2: Spirituals', type: 'reading', duration: '35 min', completed: false },
      { id: '7', title: 'Listening: Essential Spirituals', type: 'audio', duration: '25 min', completed: false },
      { id: '8', title: 'Listening Journal #1', type: 'assignment', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-3',
    week_number: 3,
    title: 'Blues: From Delta to Urban',
    description: 'Trace the evolution of the blues from its rural origins to urban centers.',
    start_date: '2025-01-27',
    end_date: '2025-02-02',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Identify the 12-bar blues structure',
      'Compare Delta and Chicago blues styles',
      'Recognize key blues artists and their contributions'
    ],
    resources: [
      { id: '9', title: 'Delta Blues Masters', type: 'video', duration: '40 min', completed: false },
      { id: '10', title: 'Chapter 3: The Blues', type: 'reading', duration: '40 min', completed: false },
      { id: '11', title: 'Listening: Blues Anthology', type: 'audio', duration: '30 min', completed: false },
      { id: '12', title: 'Blues Analysis Assignment', type: 'assignment', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-4',
    week_number: 4,
    title: 'Jazz: The Birth of an American Art Form',
    description: 'Discover how jazz emerged in New Orleans and spread across America.',
    start_date: '2025-02-03',
    end_date: '2025-02-09',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Understand the origins of jazz in New Orleans',
      'Identify early jazz styles and key figures',
      'Analyze the elements of jazz improvisation'
    ],
    resources: [
      { id: '13', title: 'Jazz Origins Documentary', type: 'video', duration: '50 min', completed: false },
      { id: '14', title: 'Chapter 4: Early Jazz', type: 'reading', duration: '45 min', completed: false },
      { id: '15', title: 'Listening: Jazz Pioneers', type: 'audio', duration: '35 min', completed: false },
      { id: '16', title: 'Week 4 Quiz', type: 'quiz', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-5',
    week_number: 5,
    title: 'The Harlem Renaissance',
    description: 'Explore the explosion of African American arts and culture in the 1920s.',
    start_date: '2025-02-10',
    end_date: '2025-02-16',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Understand the cultural context of the Harlem Renaissance',
      'Identify major musical figures of the era',
      'Connect music to broader artistic movements'
    ],
    resources: [
      { id: '17', title: 'Harlem Renaissance Overview', type: 'video', duration: '35 min', completed: false },
      { id: '18', title: 'Chapter 5: Harlem', type: 'reading', duration: '40 min', completed: false },
      { id: '19', title: 'Listening: Sounds of Harlem', type: 'audio', duration: '30 min', completed: false },
      { id: '20', title: 'Listening Journal #2', type: 'assignment', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-6',
    week_number: 6,
    title: 'Swing Era and Big Bands',
    description: 'Experience the swing era and its impact on American popular culture.',
    start_date: '2025-02-17',
    end_date: '2025-02-23',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Identify the characteristics of swing music',
      'Compare major big bands and their styles',
      'Understand the social impact of swing'
    ],
    resources: [
      { id: '21', title: 'Swing Era Documentary', type: 'video', duration: '45 min', completed: false },
      { id: '22', title: 'Chapter 6: Swing', type: 'reading', duration: '35 min', completed: false },
      { id: '23', title: 'Listening: Big Band Classics', type: 'audio', duration: '40 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-7',
    week_number: 7,
    title: 'Bebop Revolution',
    description: 'Understand the bebop movement and its radical departure from swing.',
    start_date: '2025-02-24',
    end_date: '2025-03-02',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Analyze the musical innovations of bebop',
      'Identify key bebop artists',
      'Understand bebop as artistic rebellion'
    ],
    resources: [
      { id: '24', title: 'Bebop: The Revolution', type: 'video', duration: '40 min', completed: false },
      { id: '25', title: 'Chapter 7: Bebop', type: 'reading', duration: '45 min', completed: false },
      { id: '26', title: 'Midterm Exam', type: 'quiz', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-8',
    week_number: 8,
    title: 'Gospel Music',
    description: 'Explore the power and influence of African American gospel music.',
    start_date: '2025-03-10',
    end_date: '2025-03-16',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Trace the development of gospel music',
      'Identify key gospel artists and styles',
      'Understand gospel\'s influence on other genres'
    ],
    resources: [
      { id: '27', title: 'Gospel Documentary', type: 'video', duration: '50 min', completed: false },
      { id: '28', title: 'Chapter 8: Gospel', type: 'reading', duration: '40 min', completed: false },
      { id: '29', title: 'Listening: Gospel Greats', type: 'audio', duration: '35 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-9',
    week_number: 9,
    title: 'Rhythm & Blues',
    description: 'Discover how R&B emerged and influenced rock and roll.',
    start_date: '2025-03-17',
    end_date: '2025-03-23',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Define the characteristics of R&B',
      'Identify pioneering R&B artists',
      'Connect R&B to the birth of rock and roll'
    ],
    resources: [
      { id: '30', title: 'R&B Origins', type: 'video', duration: '35 min', completed: false },
      { id: '31', title: 'Chapter 9: R&B', type: 'reading', duration: '35 min', completed: false },
      { id: '32', title: 'Listening Journal #3', type: 'assignment', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-10',
    week_number: 10,
    title: 'Soul Music and Motown',
    description: 'Examine the soul music revolution and the Motown sound.',
    start_date: '2025-03-24',
    end_date: '2025-03-30',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Define soul music characteristics',
      'Understand the Motown business model',
      'Compare Motown with other soul labels'
    ],
    resources: [
      { id: '33', title: 'Motown: The Sound of Young America', type: 'video', duration: '55 min', completed: false },
      { id: '34', title: 'Chapter 10: Soul', type: 'reading', duration: '40 min', completed: false },
      { id: '35', title: 'Listening: Motown Hits', type: 'audio', duration: '30 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-11',
    week_number: 11,
    title: 'Funk and the Power of the Groove',
    description: 'Experience the rise of funk music and its lasting influence.',
    start_date: '2025-03-31',
    end_date: '2025-04-06',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Identify the elements of funk',
      'Recognize key funk artists',
      'Understand funk\'s influence on hip-hop'
    ],
    resources: [
      { id: '36', title: 'Funk Documentary', type: 'video', duration: '40 min', completed: false },
      { id: '37', title: 'Chapter 11: Funk', type: 'reading', duration: '35 min', completed: false },
      { id: '38', title: 'Funk Analysis Assignment', type: 'assignment', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-12',
    week_number: 12,
    title: 'Hip-Hop: From the Bronx to the World',
    description: 'Trace the origins and global impact of hip-hop culture.',
    start_date: '2025-04-07',
    end_date: '2025-04-13',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Understand the four elements of hip-hop',
      'Trace hip-hop from block parties to mainstream',
      'Analyze hip-hop as social commentary'
    ],
    resources: [
      { id: '39', title: 'Hip-Hop Evolution', type: 'video', duration: '60 min', completed: false },
      { id: '40', title: 'Chapter 12: Hip-Hop', type: 'reading', duration: '45 min', completed: false },
      { id: '41', title: 'Listening: Hip-Hop Classics', type: 'audio', duration: '35 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-13',
    week_number: 13,
    title: 'Contemporary R&B and Neo-Soul',
    description: 'Explore modern expressions of African American music.',
    start_date: '2025-04-14',
    end_date: '2025-04-20',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Define contemporary R&B styles',
      'Identify neo-soul artists and characteristics',
      'Trace the evolution from classic to modern R&B'
    ],
    resources: [
      { id: '42', title: 'Neo-Soul Movement', type: 'video', duration: '35 min', completed: false },
      { id: '43', title: 'Chapter 13: Contemporary', type: 'reading', duration: '40 min', completed: false },
      { id: '44', title: 'Listening Journal #4', type: 'assignment', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-14',
    week_number: 14,
    title: 'African American Music Today',
    description: 'Examine current trends and the future of African American music.',
    start_date: '2025-04-21',
    end_date: '2025-04-27',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Identify current trends in African American music',
      'Understand streaming and social media impact',
      'Reflect on the continued evolution of the tradition'
    ],
    resources: [
      { id: '45', title: 'Music Today Documentary', type: 'video', duration: '40 min', completed: false },
      { id: '46', title: 'Chapter 14: Today', type: 'reading', duration: '35 min', completed: false },
      { id: '47', title: 'Final Project Presentation', type: 'assignment', completed: false },
      { id: '48', title: 'Final Exam', type: 'quiz', completed: false },
    ],
    completion_percentage: 0
  },
];

// Course modules map
const COURSE_MODULES: Record<string, WeeklyModule[]> = {
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37': MUS240_MODULES, // MUS 240
};

const getResourceIcon = (type: ModuleResource['type']) => {
  switch (type) {
    case 'video': return Video;
    case 'reading': return BookOpen;
    case 'audio': return Headphones;
    case 'document': return FileText;
    case 'assignment': return PenLine;
    case 'quiz': return FileCheck;
    case 'discussion': return Music;
    default: return FileText;
  }
};

const getResourceColor = (type: ModuleResource['type']) => {
  switch (type) {
    case 'video': return 'text-red-500';
    case 'reading': return 'text-blue-500';
    case 'audio': return 'text-purple-500';
    case 'document': return 'text-orange-500';
    case 'assignment': return 'text-green-500';
    case 'quiz': return 'text-yellow-500';
    case 'discussion': return 'text-pink-500';
    default: return 'text-muted-foreground';
  }
};

export const CourseModules: React.FC<CourseModulesProps> = ({ courseId, isEnrolled = true, isAdmin = false }) => {
  const { user } = useAuth();
  
  // Get modules for the specific course, default to MUS 240
  const courseModules = COURSE_MODULES[courseId] || MUS240_MODULES;
  const [modules, setModules] = useState<WeeklyModule[]>(MUS240_MODULES);
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>(['week-1', 'week-2']);

  // Calculate overall progress
  const overallProgress = modules.reduce((acc, mod) => acc + (mod.completion_percentage || 0), 0) / modules.length;

  // Find current week
  const today = new Date();
  const currentWeekModule = modules.find(mod => {
    const start = new Date(mod.start_date);
    const end = new Date(mod.end_date);
    return today >= start && today <= end;
  });

  return (
    <div className="space-y-6">
      {/* Course Progress Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Weekly Course Modules
            </CardTitle>
            {currentWeekModule && (
              <Badge variant="default" className="gap-1">
                <Calendar className="h-3 w-3" />
                Week {currentWeekModule.week_number}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Course Progress</span>
              <span className="font-medium">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {modules.filter(m => m.completion_percentage === 100).length} completed
              </span>
              <span className="flex items-center gap-1">
                <Circle className="h-3 w-3 text-primary" />
                {modules.filter(m => (m.completion_percentage || 0) > 0 && (m.completion_percentage || 0) < 100).length} in progress
              </span>
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-muted-foreground" />
                {modules.filter(m => m.is_locked).length} locked
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Accordion */}
      <Accordion 
        type="multiple" 
        value={expandedWeeks} 
        onValueChange={setExpandedWeeks}
        className="space-y-3"
      >
        {modules.map((module) => {
          const isCurrentWeek = currentWeekModule?.id === module.id;
          const completedResources = module.resources.filter(r => r.completed).length;
          const totalResources = module.resources.length;

          return (
            <AccordionItem 
              key={module.id} 
              value={module.id}
              className={`border rounded-lg overflow-hidden ${
                isCurrentWeek ? 'border-primary shadow-sm' : 'border-border'
              } ${module.is_locked ? 'opacity-75' : ''}`}
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/20">
                <div className="flex items-center gap-3 w-full">
                  {/* Week Number Badge */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    module.completion_percentage === 100 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : isCurrentWeek 
                        ? 'bg-primary text-primary-foreground'
                        : module.is_locked
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-muted text-foreground'
                  }`}>
                    {module.completion_percentage === 100 ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : module.is_locked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      module.week_number
                    )}
                  </div>

                  {/* Module Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{module.title}</span>
                      {isCurrentWeek && (
                        <Badge variant="outline" className="text-xs border-primary text-primary">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(module.start_date), 'MMM d')} - {format(new Date(module.end_date), 'MMM d')}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {completedResources}/{totalResources} items
                      </span>
                    </div>
                  </div>

                  {/* Progress Circle */}
                  <div className="flex-shrink-0 mr-2">
                    <div className="relative w-10 h-10">
                      <svg className="w-10 h-10 transform -rotate-90">
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          className="text-muted"
                        />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={`${(module.completion_percentage || 0) * 1.005} 100.5`}
                          className="text-primary"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                        {module.completion_percentage || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                {module.is_locked ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Lock className="h-5 w-5 mr-2" />
                    <span>This module will unlock on {format(new Date(module.start_date), 'MMMM d, yyyy')}</span>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground">{module.description}</p>

                    {/* Learning Objectives */}
                    {module.learning_objectives && module.learning_objectives.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Learning Objectives
                        </h4>
                        <ul className="space-y-1">
                          {module.learning_objectives.map((objective, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{objective}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Resources List */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Module Resources
                      </h4>
                      <div className="grid gap-2">
                        {module.resources.map((resource) => {
                          const Icon = getResourceIcon(resource.type);
                          const colorClass = getResourceColor(resource.type);

                          return (
                            <div 
                              key={resource.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                                resource.completed 
                                  ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30' 
                                  : 'bg-background hover:bg-muted/50'
                              }`}
                            >
                              <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">{resource.title}</span>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {resource.type}
                                  </Badge>
                                </div>
                                {resource.duration && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {resource.duration}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {resource.completed ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                  <Button size="sm" variant="ghost" className="h-8 px-3">
                                    {resource.type === 'video' ? (
                                      <>
                                        <Play className="h-3 w-3 mr-1" />
                                        Watch
                                      </>
                                    ) : resource.type === 'audio' ? (
                                      <>
                                        <Headphones className="h-3 w-3 mr-1" />
                                        Listen
                                      </>
                                    ) : (
                                      <>
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Open
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default CourseModules;
