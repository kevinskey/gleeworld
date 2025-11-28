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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface InstructorControlCenterProps {
  courseId: string;
}

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

export function InstructorControlCenter({ courseId }: InstructorControlCenterProps) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('content');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch user profile to check admin status
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isInstructor = profile?.is_admin || profile?.is_super_admin;

  if (!isInstructor) {
    return null;
  }

  const filteredTools = managementTools.filter(tool => tool.category === selectedCategory);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="fixed bottom-6 right-6 z-50 shadow-lg h-14 px-6" size="lg">
          <Settings className="h-5 w-5 mr-2" />
          Instructor Control Center
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Instructor Control Center</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Manage all aspects of your course from this central hub
          </p>
        </DialogHeader>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Card
                    key={tool.id}
                    className="hover:shadow-md transition-shadow cursor-pointer border-2"
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <IconComponent className="h-5 w-5 text-primary" />
                        {tool.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {tool.description}
                      </p>
                      <Button size="sm" className="w-full">
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

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Send Announcement
            </Button>
            <Button variant="outline" size="sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
            <Button variant="outline" size="sm">
              <FileCheck className="h-4 w-4 mr-2" />
              Create Test
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Add Event
            </Button>
            <Button variant="outline" size="sm">
              <Video className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
            <Button variant="outline" size="sm">
              <FileImage className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
