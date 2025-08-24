import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Music, 
  Calendar, 
  Users, 
  Shirt, 
  Eye, 
  Settings, 
  ClipboardCheck,
  BookOpen,
  Heart,
  Bell,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

interface MemberNavigationProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    is_admin?: boolean;
    is_super_admin?: boolean;
  };
}

export const MemberNavigation: React.FC<MemberNavigationProps> = ({ user }) => {
  const { profile } = useUserRole();

  // Define menu items based on user role
  const getMenuItems = () => {
    const baseItems = [
      {
        id: 'music-library',
        title: 'Music Library',
        description: 'Access sheet music, recordings, and performance materials',
        icon: Music,
        path: '/member/music-library',
        color: 'bg-purple-50 text-purple-600 border-purple-200'
      },
      {
        id: 'sight-reading',
        title: 'Sight Reading Studio',
        description: 'Practice sight reading and complete assignments',
        icon: Eye,
        path: '/member/sight-reading',
        color: 'bg-blue-50 text-blue-600 border-blue-200'
      },
      {
        id: 'attendance',
        title: 'Attendance',
        description: 'Check your attendance record and submit excuses',
        icon: ClipboardCheck,
        path: '/member/attendance',
        color: 'bg-orange-50 text-orange-600 border-orange-200'
      },
      {
        id: 'wardrobe',
        title: 'Wardrobe',
        description: 'Manage your costumes and uniform fittings',
        icon: Shirt,
        path: '/member/wardrobe',
        color: 'bg-pink-50 text-pink-600 border-pink-200'
      }
    ];

    // Add role-specific items
    if (user.is_exec_board || user.is_admin) {
      baseItems.push({
        id: 'member-management',
        title: 'Member Management',
        description: 'Manage member profiles and information',
        icon: Users,
        path: '/member/member-management',
        color: 'bg-indigo-50 text-indigo-600 border-indigo-200'
      });
    }

    // Add admin-specific items
    if (user.is_admin || user.is_super_admin) {
      baseItems.push(
        {
          id: 'notifications',
          title: 'Notifications',
          description: 'Send announcements and notifications',
          icon: Bell,
          path: '/member/notifications',
          color: 'bg-yellow-50 text-yellow-600 border-yellow-200'
        },
        {
          id: 'settings',
          title: 'System Settings',
          description: 'Configure system settings and preferences',
          icon: Settings,
          path: '/member/settings',
          color: 'bg-gray-50 text-gray-600 border-gray-200'
        }
      );
    }

    // Always add personal settings last
    baseItems.push({
      id: 'my-profile',
      title: 'My Profile',
      description: 'Update your personal information and preferences',
      icon: Heart,
      path: '/member/profile',
      color: 'bg-rose-50 text-rose-600 border-rose-200'
    });

    return baseItems;
  };

  const menuItems = getMenuItems();

  return (
    <Card className="w-full overflow-hidden bg-blue-50/50 border-blue-200/50">
      <CardHeader className="card-header-compact">
        <div className="flex items-center gap-1 md:gap-2">
          <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
          <div>
            <CardTitle className="page-header">
              Member Tools
            </CardTitle>
            <CardDescription className="mobile-text-lg">
              Access your Glee Club resources and tools
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="card-compact">
        <div className="responsive-grid-2 lg:grid-cols-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.id}
                className="group cursor-pointer hover:shadow-md transition-all duration-200 border-2 hover:border-primary/20 w-full overflow-hidden"
              >
                <CardContent className="card-compact">
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full h-auto p-0 justify-start text-left touch-target"
                  >
                    <Link to={item.path}>
                      <div className="flex items-start gap-2 md:gap-3 w-full">
                        <div className={`rounded-lg p-1.5 md:p-2 ${item.color} group-hover:scale-110 transition-transform flex-shrink-0`}>
                          <Icon className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold mobile-text-xl text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {item.title}
                            </h4>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                          </div>
                          <p className="mobile-text-lg text-muted-foreground mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};