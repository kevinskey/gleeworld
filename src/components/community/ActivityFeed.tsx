import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Heart, 
  Calendar, 
  Music, 
  Bell,
  Users,
  Clock
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'message' | 'love_note' | 'event' | 'announcement' | 'wellness' | 'rehearsal';
  title: string;
  description: string;
  author: {
    name: string;
    avatar?: string;
  };
  timestamp: string;
  group?: string;
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'message',
    title: 'New message in Executive Board',
    description: 'Rehearsal schedule updates for next week',
    author: { name: 'Sarah Johnson', avatar: undefined },
    timestamp: '2 minutes ago',
    group: 'Executive Board'
  },
  {
    id: '2',
    type: 'love_note',
    title: 'Love note received',
    description: 'Amazing performance at the concert! Your voice was beautiful. 💕',
    author: { name: 'Maria Garcia' },
    timestamp: '15 minutes ago'
  },
  {
    id: '3',
    type: 'announcement',
    title: 'New announcement posted',
    description: 'Spring concert tickets now available for purchase',
    author: { name: 'Director Johnson' },
    timestamp: '1 hour ago'
  },
  {
    id: '4',
    type: 'event',
    title: 'Upcoming rehearsal',
    description: 'Regular rehearsal tomorrow at 7:00 PM in Music Hall',
    author: { name: 'System' },
    timestamp: '2 hours ago'
  },
  {
    id: '5',
    type: 'wellness',
    title: 'Vocal health reminder',
    description: 'Don\'t forget to log your daily vocal exercises',
    author: { name: 'Wellness Bot' },
    timestamp: '3 hours ago'
  }
];

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'message':
      return <MessageSquare className="h-4 w-4" />;
    case 'love_note':
      return <Heart className="h-4 w-4" />;
    case 'event':
      return <Calendar className="h-4 w-4" />;
    case 'announcement':
      return <Bell className="h-4 w-4" />;
    case 'wellness':
      return <Music className="h-4 w-4" />;
    case 'rehearsal':
      return <Users className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getActivityColor = (type: ActivityItem['type']) => {
  switch (type) {
    case 'message':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'love_note':
      return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
    case 'event':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'announcement':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'wellness':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'rehearsal':
      return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
    default:
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
};

export const ActivityFeed: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Community Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockActivities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm">{activity.title}</h4>
                {activity.group && (
                  <Badge variant="outline" className="text-xs">
                    {activity.group}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {activity.description}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>{activity.author.name}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {activity.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        <div className="text-center">
          <button className="text-sm text-primary hover:underline">
            View all activity
          </button>
        </div>
      </CardContent>
    </Card>
  );
};