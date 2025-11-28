import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { BookOpen, Calendar, Mail, ClipboardList, FileCheck, BarChart, MessageSquare, Video, Headphones, FileText, BookMarked, HelpCircle, UserCheck, Ruler, Settings, ChevronDown, Music, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CourseAnnouncements } from './CourseAnnouncements';
import { CourseResourcesList } from './CourseResourcesList';
import { MusicLibrary } from '@/components/music-library/MusicLibrary';
interface CoursePageLayoutProps {
  courseId: string;
  courseSemester: string;
  courseCode: string;
  courseTitle: string;
  welcomeMessage: string;
  welcomeDetails: string;
  courseOverview: string;
  instructor: {
    name: string;
    email: string;
    office: string;
    hours: string;
  };
  isEnrolled?: boolean;
  onEnroll?: () => void;
  children?: React.ReactNode;
}
export const CoursePageLayout: React.FC<CoursePageLayoutProps> = ({
  courseId,
  courseSemester,
  courseCode,
  courseTitle,
  welcomeMessage,
  welcomeDetails,
  courseOverview,
  instructor,
  isEnrolled = false,
  onEnroll,
  children
}) => {
  const navigate = useNavigate();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('home');
  
  const navigationItems = [{
    icon: BookOpen,
    label: 'Home',
    section: 'home',
    active: true
  }, {
    icon: FileText,
    label: 'Syllabus',
    section: 'syllabus'
  }, {
    icon: Mail,
    label: 'Announcements',
    section: 'announcements'
  }, {
    icon: ClipboardList,
    label: 'Assignments',
    section: 'assignments'
  }, {
    icon: FileCheck,
    label: 'Tests',
    section: 'tests'
  }, {
    icon: BarChart,
    label: 'Polls',
    section: 'polls'
  }, {
    icon: MessageSquare,
    label: 'Discussions',
    section: 'discussions'
  }, {
    icon: Mail,
    label: 'Mail Center',
    section: 'mail'
  }, {
    icon: BookMarked,
    label: 'Modules',
    section: 'modules'
  }, {
    icon: BarChart,
    label: 'Gradescope',
    section: 'grades'
  }, {
    icon: UserCheck,
    label: 'Attendance',
    section: 'attendance'
  }, {
    icon: Ruler,
    label: 'Rubrics',
    section: 'rubrics'
  }, {
    icon: BookOpen,
    label: 'Class Notebook',
    section: 'notebook'
  }, {
    icon: Calendar,
    label: 'Calendar',
    section: 'calendar'
  }, {
    icon: HelpCircle,
    label: 'Help',
    section: 'help'
  }];
  const resourceItems = [{
    icon: Video,
    label: 'Video Library',
    description: 'Access conducting demonstration videos'
  }, {
    icon: Headphones,
    label: 'Audio Examples',
    description: 'Listen to choral repertoire samples'
  }, {
    icon: Music,
    label: 'Sheet Music Library',
    description: 'Download scores and study materials'
  }, {
    icon: FileText,
    label: 'Course Documents',
    description: 'Syllabus, handouts, and readings'
  }];
  return <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
      <div className="flex min-h-screen bg-muted/20">
        {/* Left Sidebar - 15% */}
        <div className="w-[15%] bg-card border-r border-border flex-shrink-0">
          <div className="p-4 border-b border-border">
            <div className="text-xs font-bold text-muted-foreground mb-1">{courseSemester}</div>
            <div className="text-sm font-semibold text-foreground">{courseCode}</div>
          </div>
          
          <nav className="p-2">
            {navigationItems.map(item => <button key={item.label} onClick={() => setActiveSection(item.section)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${activeSection === item.section ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                <item.icon className="h-4 w-4" />
                <span className="text-xs">{item.label}</span>
              </button>)}
          </nav>
        </div>

        {/* Main Content Area - 60% */}
        <div className="w-[60%] flex-shrink-0 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Back to Academy Button */}
            <Button
              variant="ghost"
              onClick={() => navigate('/glee-academy')}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Academy
            </Button>

            {/* Course Title Bar */}
            <div className="bg-primary text-primary-foreground p-6 rounded-lg">
              <h1 className="text-2xl font-bold text-white bg-primary">{courseTitle}</h1>
            </div>

            {/* Dynamic Content Based on Active Section */}
            {activeSection === 'home' && (
              <>
                <Card className="bg-card/50 border-border">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-4">Welcome!</h2>
                    <p className="text-muted-foreground mb-6">{welcomeDetails}</p>
                    {!isEnrolled && onEnroll && <Button onClick={onEnroll} variant="default">
                        Enroll in Course
                      </Button>}
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-bold text-foreground">Course Overview</h2>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{courseOverview}</p>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BookMarked className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-bold text-foreground">Learning Modules</h2>
                    </div>
                    {children || <div className="space-y-2">
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                            <div className="flex items-center gap-3">
                              <BookMarked className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">Test</span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-4 py-2">
                            <p className="text-sm text-muted-foreground">test info.</p>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>}
                  </CardContent>
                </Card>
              </>
            )}

            {activeSection === 'syllabus' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Course Syllabus</h2>
                  <p className="text-muted-foreground">Syllabus content will be displayed here.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'announcements' && (
              <CourseAnnouncements courseId={courseId} />
            )}

            {activeSection === 'assignments' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Assignments</h2>
                  <p className="text-muted-foreground">Assignment list and submissions will be displayed here.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'tests' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Tests & Quizzes</h2>
                  <p className="text-muted-foreground">Tests and quizzes will be available here.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'polls' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Polls</h2>
                  <p className="text-muted-foreground">Active and past polls will be shown here.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'discussions' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Discussions</h2>
                  <p className="text-muted-foreground">Discussion forums and threads will appear here.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'mail' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Mail Center</h2>
                  <p className="text-muted-foreground">Course messaging and email communication.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'modules' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Course Modules</h2>
                  <p className="text-muted-foreground">Learning modules and weekly content will be organized here.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'grades' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Gradescope</h2>
                  <p className="text-muted-foreground">Your grades and performance analytics will be displayed here.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'attendance' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Attendance</h2>
                  <p className="text-muted-foreground">Attendance records and tracking will be shown here.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'rubrics' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Rubrics</h2>
                  <p className="text-muted-foreground">Assignment and assessment rubrics will be available here.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'notebook' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Class Notebook</h2>
                  <p className="text-muted-foreground">Your class notes and shared notebook content.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'calendar' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Course Calendar</h2>
                  <p className="text-muted-foreground">Academic calendar with important dates and deadlines.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'help' && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Help & Support</h2>
                  <p className="text-muted-foreground">Course help resources and support information.</p>
                </CardContent>
              </Card>
            )}

            {activeSection === 'video-library' && (
              <CourseResourcesList courseId={courseId} type="videos" />
            )}

            {activeSection === 'audio-examples' && (
              <CourseResourcesList courseId={courseId} type="audio" />
            )}

            {activeSection === 'course-documents' && (
              <CourseResourcesList courseId={courseId} type="documents" />
            )}

            {activeSection === 'sheet-music-library' && (
              <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
                <MusicLibrary />
              </div>
            )}

            {/* Fixed Instructor Control Center Button */}
            <div className="fixed bottom-6 right-6">
              <Button onClick={() => navigate(`/instructor/admin/${courseId}`)} variant="default" className="shadow-lg" size="lg">
                <Settings className="h-5 w-5 mr-2" />
                Instructor Control Center
              </Button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - 25% */}
        <div className="w-[25%] bg-card border-l border-border flex-shrink-0 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* To Do */}
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground mb-3">To Do</h3>
                <p className="text-sm text-muted-foreground">Nothing for now</p>
              </CardContent>
            </Card>

            {/* Course Resources */}
            <div>
              <h3 className="font-bold text-foreground mb-4">Course Resources</h3>
              <div className="space-y-3">
                <Card onClick={() => setActiveSection('video-library')} className="bg-muted/30 border-border hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Video className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-foreground mb-1">Video Library</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">Access conducting demonstration videos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card onClick={() => setActiveSection('audio-examples')} className="bg-muted/30 border-border hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Headphones className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-foreground mb-1">Audio Examples</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">Listen to choral repertoire samples</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card onClick={() => setActiveSection('sheet-music-library')} className="bg-muted/30 border-border hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Music className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-foreground mb-1">Sheet Music Library</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">Download scores and study materials</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card onClick={() => setActiveSection('course-documents')} className="bg-muted/30 border-border hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-foreground mb-1">Course Documents</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">Syllabus, handouts, and readings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Instructor Contact */}
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground mb-3">Instructor Contact</h3>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-foreground">{instructor.name}</p>
                  <p className="text-muted-foreground">{instructor.email}</p>
                  <p className="text-muted-foreground">Office: {instructor.office}</p>
                  <p className="text-muted-foreground">Hours: {instructor.hours}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UniversalLayout>;
};