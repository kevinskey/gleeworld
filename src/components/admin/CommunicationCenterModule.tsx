import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  ChevronDown, 
  ChevronUp,
  Send,
  Mail,
  Smartphone,
  Bell,
  Users,
  Clock,
  TrendingUp,
  Plus
} from 'lucide-react';

export const CommunicationCenterModule = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Mock data for communication stats
  const communicationStats = {
    totalSent: 247,
    thisWeek: 18,
    pendingScheduled: 3,
    averageDeliveryRate: 94
  };

  const recentCommunications = [
    {
      id: '1',
      title: 'Rehearsal Reminder - Spring Concert',
      recipients: 89,
      channels: ['email', 'in_app'],
      sentAt: '2024-01-18 14:30',
      status: 'delivered'
    },
    {
      id: '2', 
      title: 'Audition Results Notification',
      recipients: 12,
      channels: ['email', 'sms'],
      sentAt: '2024-01-17 10:15',
      status: 'delivered'
    },
    {
      id: '3',
      title: 'Weekly Newsletter',
      recipients: 156,
      channels: ['email'],
      sentAt: '2024-01-16 09:00',
      status: 'delivered'
    }
  ];

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-3 w-3" />;
      case 'sms': return <Smartphone className="h-3 w-3" />;
      case 'in_app': return <Bell className="h-3 w-3" />;
      default: return <Send className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-50 border-green-200';
      case 'sending': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'scheduled': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communication Center
                <Badge variant="secondary" className="ml-2">
                  {communicationStats.thisWeek} this week
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/notifications/send');
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Send Message
                </Button>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* Communication Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-primary">{communicationStats.totalSent}</div>
                <div className="text-xs text-muted-foreground">Total Sent</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-blue-600">{communicationStats.thisWeek}</div>
                <div className="text-xs text-muted-foreground">This Week</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-orange-600">{communicationStats.pendingScheduled}</div>
                <div className="text-xs text-muted-foreground">Scheduled</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-green-600">{communicationStats.averageDeliveryRate}%</div>
                <div className="text-xs text-muted-foreground">Delivery Rate</div>
              </div>
            </div>

            {/* Recent Communications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Recent Communications</h4>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/dashboard/communications')}
                  className="text-xs"
                >
                  View All
                </Button>
              </div>
              
              <div className="space-y-2">
                {recentCommunications.map((comm) => (
                  <div 
                    key={comm.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-sm font-medium truncate">{comm.title}</h5>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(comm.status)}`}
                        >
                          {comm.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {comm.recipients} recipients
                        </div>
                        <div className="flex items-center gap-1">
                          {comm.channels.map((channel, index) => (
                            <span key={index} className="flex items-center">
                              {getChannelIcon(channel)}
                            </span>
                          ))}
                          <span className="ml-1">{comm.channels.length} channels</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(comm.sentAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start gap-2"
                onClick={() => navigate('/notifications/send')}
              >
                <Send className="h-4 w-4" />
                Send Message
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start gap-2"
                onClick={() => navigate('/dashboard/templates')}
              >
                <MessageSquare className="h-4 w-4" />
                Manage Templates
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start gap-2"
                onClick={() => navigate('/dashboard/analytics')}
              >
                <TrendingUp className="h-4 w-4" />
                View Analytics
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};