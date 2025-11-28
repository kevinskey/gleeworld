import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Mail,
  ClipboardList,
  FileCheck,
  BarChart,
  MessageSquare,
  FolderOpen,
  BarChart3,
  UserCheck,
  Ruler,
  BookOpen,
  Calendar,
  Video,
  Headphones,
  FileImage,
  Settings,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ManagementTool {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: 'content' | 'assessment' | 'communication' | 'resources';
}

const managementTools: ManagementTool[] = [
  // Content Management
  {
    id: 'syllabus',
    title: 'Syllabus',
    description: 'Create and edit course syllabus',
    icon: FileText,
    category: 'content',
  },
  {
    id: 'modules',
    title: 'Modules',
    description: 'Organize course content into modules',
    icon: FolderOpen,
    category: 'content',
  },
  {
    id: 'class-notes',
    title: 'Class Notes',
    description: 'Upload and manage lecture notes',
    icon: BookOpen,
    category: 'content',
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'Schedule course events and deadlines',
    icon: Calendar,
    category: 'content',
  },
  
  // Assessment Management
  {
    id: 'assignments',
    title: 'Assignments',
    description: 'Create and manage assignments',
    icon: ClipboardList,
    category: 'assessment',
  },
  {
    id: 'tests',
    title: 'Tests & Quizzes',
    description: 'Create tests and quizzes',
    icon: FileCheck,
    category: 'assessment',
  },
  {
    id: 'polls',
    title: 'Polls',
    description: 'Create student polls and surveys',
    icon: BarChart,
    category: 'assessment',
  },
  {
    id: 'rubrics',
    title: 'Rubrics',
    description: 'Design grading rubrics',
    icon: Ruler,
    category: 'assessment',
  },
  {
    id: 'grades',
    title: 'Gradescope',
    description: 'Manage student grades',
    icon: BarChart3,
    category: 'assessment',
  },
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Track student attendance',
    icon: UserCheck,
    category: 'assessment',
  },
  
  // Communication
  {
    id: 'announcements',
    title: 'Announcements',
    description: 'Post announcements to students',
    icon: Mail,
    category: 'communication',
  },
  {
    id: 'discussions',
    title: 'Discussions',
    description: 'Manage discussion forums',
    icon: MessageSquare,
    category: 'communication',
  },
  
  // Resources
  {
    id: 'videos',
    title: 'Video Library',
    description: 'Upload and manage video resources',
    icon: Video,
    category: 'resources',
  },
  {
    id: 'audio',
    title: 'Audio Examples',
    description: 'Upload audio files',
    icon: Headphones,
    category: 'resources',
  },
  {
    id: 'documents',
    title: 'Course Documents',
    description: 'Upload handouts and readings',
    icon: FileImage,
    category: 'resources',
  },
];

export default function InstructorAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('content');

  // Fetch user profile to check admin status
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, exec_board_role')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isInstructor = profile?.is_admin || profile?.is_super_admin;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <UniversalHeader />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="min-h-screen bg-background">
        <UniversalHeader />
        <div className="container mx-auto px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You do not have instructor permissions to access this page.
              </p>
              <Button className="mt-4" onClick={() => navigate('/')}>
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const filteredTools = managementTools.filter(tool => tool.category === selectedCategory);

  const handleToolClick = (toolId: string) => {
    switch (toolId) {
      case 'syllabus':
        // Navigate to course page, syllabus section will be default
        navigate('/mus-210');
        break;
      case 'modules':
        // Navigate to course page, modules section
        navigate('/mus-210');
        break;
      case 'class-notes':
        // Navigate to course page, class notebook section
        navigate('/mus-210');
        break;
      case 'calendar':
        // Navigate to course calendar
        navigate('/mus-210');
        break;
      case 'assignments':
        // Navigate to course assignments section
        navigate('/mus-210');
        break;
      case 'tests':
        // Navigate to test builder
        navigate('/test-builder');
        break;
      case 'polls':
        // Navigate to course polls section
        navigate('/mus-210');
        break;
      case 'rubrics':
        // Navigate to course rubrics section
        navigate('/mus-210');
        break;
      case 'grades':
        // Navigate to course grades section
        navigate('/mus-210');
        break;
      case 'attendance':
        // Navigate to attendance management
        navigate('/attendance/scan');
        break;
      case 'announcements':
        // Navigate to create announcement
        navigate('/admin/create-announcement');
        break;
      case 'discussions':
        // Navigate to course discussions section
        navigate('/mus-210');
        break;
      case 'videos':
        // Navigate to course video library
        navigate('/mus-210');
        break;
      case 'audio':
        // Navigate to course audio examples
        navigate('/mus-210');
        break;
      case 'documents':
        // Navigate to course documents
        navigate('/mus-210');
        break;
      default:
        console.log('Tool not implemented:', toolId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-4 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Instructor Control Center</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Manage all aspects of your courses from this central hub
          </p>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mt-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Card
                    key={tool.id}
                    className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50"
                    onClick={() => handleToolClick(tool.id)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        {tool.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {tool.description}
                      </p>
                      <Button size="sm" className="w-full" onClick={(e) => {
                        e.stopPropagation();
                        handleToolClick(tool.id);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create/Manage
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-4"
                onClick={() => navigate('/admin/create-announcement')}
              >
                <Mail className="h-6 w-6 mb-2" />
                <span className="text-xs">Send Announcement</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-4"
                onClick={() => navigate('/mus-210')}
              >
                <ClipboardList className="h-6 w-6 mb-2" />
                <span className="text-xs">Create Assignment</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-4"
                onClick={() => navigate('/test-builder')}
              >
                <FileCheck className="h-6 w-6 mb-2" />
                <span className="text-xs">Create Test</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-4"
                onClick={() => navigate('/mus-210')}
              >
                <Calendar className="h-6 w-6 mb-2" />
                <span className="text-xs">Add Event</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-4"
                onClick={() => navigate('/mus-210')}
              >
                <Video className="h-6 w-6 mb-2" />
                <span className="text-xs">Upload Video</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-4"
                onClick={() => navigate('/mus-210')}
              >
                <FileImage className="h-6 w-6 mb-2" />
                <span className="text-xs">Upload Document</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
