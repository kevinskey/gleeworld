import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Plus, 
  Heart, 
  Calendar, 
  Bell,
  Mic,
  Users,
  Camera
} from 'lucide-react';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: 'New Message',
      description: 'Start a conversation',
      action: () => navigate('/community?tab=messages'),
      variant: 'default' as const
    },
    {
      icon: <Heart className="h-4 w-4" />,
      label: 'Send Love',
      description: 'Share appreciation',
      action: () => navigate('/community?tab=love'),
      variant: 'secondary' as const
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: 'View Events',
      description: 'See what\'s coming up',
      action: () => navigate('/calendar'),
      variant: 'outline' as const
    },
    {
      icon: <Mic className="h-4 w-4" />,
      label: 'Log Wellness',
      description: 'Track your vocal health',
      action: () => navigate('/community?tab=wellness'),
      variant: 'outline' as const
    },
    {
      icon: <Bell className="h-4 w-4" />,
      label: 'Announcements',
      description: 'Important updates',
      action: () => navigate('/announcements'),
      variant: 'outline' as const
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: 'Directory',
      description: 'Find members',
      action: () => navigate('/directory'),
      variant: 'outline' as const
    }
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              size="sm"
              onClick={action.action}
              className="h-auto flex-col gap-2 p-3 text-center"
            >
              {action.icon}
              <div>
                <div className="font-medium text-xs">{action.label}</div>
                <div className="text-xs text-muted-foreground opacity-75">
                  {action.description}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};