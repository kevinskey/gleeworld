import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Heart, Calendar, Bell, Mic, Users, Camera, CalendarClock } from 'lucide-react';
export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  console.log('🚀 QuickActions component is rendering!');
  const actions = [{
    icon: <MessageSquare className="h-4 w-4" />,
    label: 'New Message',
    description: 'Start a conversation',
    action: () => navigate('/community?tab=messages'),
    variant: 'default' as const
  }, {
    icon: <Heart className="h-4 w-4" />,
    label: 'Send Love',
    description: 'Share appreciation',
    action: () => navigate('/community?tab=love'),
    variant: 'secondary' as const
  }, {
    icon: <Calendar className="h-4 w-4" />,
    label: 'View Events',
    description: 'See what\'s coming up',
    action: () => navigate('/calendar'),
    variant: 'outline' as const
  }, {
    icon: <Mic className="h-4 w-4" />,
    label: 'Log Wellness',
    description: 'Track your vocal health',
    action: () => navigate('/community?tab=wellness'),
    variant: 'outline' as const
  }, {
    icon: <Bell className="h-4 w-4" />,
    label: 'Announcements',
    description: 'Important updates',
    action: () => navigate('/announcements'),
    variant: 'outline' as const
  }, {
    icon: <Users className="h-4 w-4" />,
    label: 'Directory',
    description: 'Find members',
    action: () => navigate('/directory'),
    variant: 'outline' as const
  }, {
    icon: <CalendarClock className="h-4 w-4" />,
    label: 'Appointments',
    description: 'Book & manage',
    action: () => {
      console.log('🗓️ Appointments button clicked, navigating to /appointments');
      try {
        navigate('/appointments');
        console.log('✅ Navigation to /appointments completed');
      } catch (error) {
        console.error('❌ Navigation error:', error);
      }
    },
    variant: 'outline' as const
  }];
  return <Card className="w-full overflow-hidden bg-card/80 backdrop-blur-sm border-border">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              onClick={action.action}
              className="h-auto py-4 flex flex-col items-center gap-2 text-center"
            >
              {action.icon}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{action.label}</span>
                <span className="text-xs opacity-70">{action.description}</span>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>;
};