import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { format } from "date-fns";
import { 
  Calendar, 
  ChevronUp, 
  ChevronDown, 
  Music, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Bell 
} from "lucide-react";

interface EventsAndActivitySectionProps {
  upcomingEvents: any[];
  recentActivity: Array<{
    id: string;
    action: string;
    time: string;
    type: string;
  }>;
}

export const EventsAndActivitySection = ({ 
  upcomingEvents, 
  recentActivity 
}: EventsAndActivitySectionProps) => {
  const [isRecentActivityExpanded, setIsRecentActivityExpanded] = useState(false);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'music':
        return <Music className="h-5 w-5 text-blue-600" />;
      case 'attendance':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'practice':
        return <Clock className="h-5 w-5 text-purple-600" />;
      case 'payment':
        return <DollarSign className="h-5 w-5 text-emerald-600" />;
      case 'notification':
        return <Bell className="h-5 w-5 text-orange-600" />;
      case 'contract':
        return <CheckCircle className="h-5 w-5 text-purple-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>Your next rehearsals and performances</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length > 0 ? (
            <Carousel className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {upcomingEvents.map((event) => (
                  <CarouselItem key={event.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg min-w-[280px]">
                      <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{event.title}</h4>
                        <p className="text-sm text-gray-600">
                          {format(new Date(event.start_date), 'PPP')}
                        </p>
                        {event.location && (
                          <p className="text-sm text-gray-500 truncate">{event.location}</p>
                        )}
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          ) : (
            <p className="text-gray-500 text-center py-4">No upcoming events scheduled</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsRecentActivityExpanded(!isRecentActivityExpanded)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest actions and updates</CardDescription>
            </div>
            <EnhancedTooltip content={isRecentActivityExpanded ? "Collapse" : "Expand"}>
              <Button variant="ghost" size="sm" className="p-2">
                {isRecentActivityExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </EnhancedTooltip>
          </div>
        </CardHeader>
        {isRecentActivityExpanded && (
          <CardContent className="space-y-4 animate-fade-in">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};