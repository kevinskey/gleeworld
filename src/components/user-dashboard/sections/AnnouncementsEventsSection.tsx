import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Clock, Package, DollarSign, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useEffect } from "react";

interface AnnouncementsEventsSectionProps {
  upcomingEvents?: Array<{
    id: string;
    title: string;
    date: string;
    location?: string;
    type?: string;
  }>;
}

export const AnnouncementsEventsSection = ({ upcomingEvents }: AnnouncementsEventsSectionProps) => {
  const { announcements, loading, refetch } = useAnnouncements();
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'rehearsal': return 'bg-blue-100 text-blue-800';
      case 'performance': return 'bg-purple-100 text-purple-800';
      case 'tour': return 'bg-green-100 text-green-800';
      case 'communication': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Mock data for checked out items and dues - replace with real data
  const checkedOutItems = [
    { id: '1', title: 'Black Concert Dress', dueDate: '2024-02-15', type: 'uniform' },
    { id: '2', title: 'Music Folder - Spring Concert', dueDate: '2024-02-20', type: 'music' },
  ];

  const duesInfo = {
    totalDue: 150.00,
    dueDate: '2024-03-01',
    items: [
      { description: 'Membership Dues', amount: 100.00 },
      { description: 'Concert Attire Fee', amount: 50.00 },
    ]
  };

  return (
    <div className="w-full">
      {/* Desktop Layout - Full width with 3 columns */}
      <div className="hidden md:flex gap-4 w-full">
        {/* Notifications Column - 50% width */}
        <Card className="bg-gradient-to-r from-secondary/5 via-accent/5 to-primary/5 border-secondary/20 shadow-lg h-64 w-1/2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-secondary-foreground text-base">
              <Bell className="h-4 w-4" />
              Notifications
              <Badge variant="secondary" className="text-xs">
                {announcements.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-44">
              <div className="space-y-2 pr-4">
                {loading ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Loading notifications...</p>
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-4">
                    <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No new notifications</p>
                  </div>
                ) : (
                  announcements.map((notification) => (
                    <div key={notification.id} className="border border-secondary/10 rounded-lg p-3 bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-base text-foreground line-clamp-1">{notification.title}</h5>
                        {notification.announcement_type && (
                          <Badge className={`${getNotificationTypeColor(notification.announcement_type)} text-sm ml-2`} variant="secondary">
                            {notification.announcement_type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {notification.content}
                      </p>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {notification.created_at 
                          ? new Date(notification.created_at).toLocaleString()
                          : 'Recently posted'
                        }
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Checked Out Items Column - 50% width */}
        <Card className="bg-gradient-to-r from-accent/5 via-secondary/5 to-primary/5 border-accent/20 shadow-lg h-64 w-1/2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-secondary-foreground text-base">
              <Package className="h-4 w-4" />
              Checked Out Items
              <Badge variant="secondary" className="text-xs">
                {checkedOutItems.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-44">
              <div className="space-y-2">
                {checkedOutItems.length === 0 ? (
                  <div className="text-center py-4">
                    <Package className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm text-muted-foreground">No items checked out</p>
                  </div>
                ) : (
                  checkedOutItems.map((item) => (
                    <div key={item.id} className="border border-accent/10 rounded-lg p-2 bg-background/50 backdrop-blur-sm">
                      <div className="flex items-start justify-between mb-1">
                        <h5 className="font-medium text-sm text-foreground line-clamp-1">{item.title}</h5>
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

      </div>

      {/* Mobile Layout - Collapsible Sections */}
      <div className="md:hidden space-y-3">
        {/* Notifications Section - Mobile */}
        <Card className="bg-gradient-to-r from-secondary/5 via-accent/5 to-primary/5 border-secondary/20 shadow-lg">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
            <CardTitle className="flex items-center justify-between text-secondary-foreground text-lg">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications & Tasks
                <Badge variant="secondary" className="text-xs">
                  {announcements.length + checkedOutItems.length + (duesInfo.totalDue > 0 ? 1 : 0)}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          
          {!isCollapsed && (
            <CardContent className="space-y-4">
              {/* Notifications */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications ({announcements.length})
                </h4>
                <ScrollArea className="h-32">
                  <div className="space-y-2 pr-4">
                    {loading ? (
                      <div className="text-center py-2">
                        <p className="text-sm text-muted-foreground">Loading notifications...</p>
                      </div>
                    ) : announcements.length === 0 ? (
                      <div className="text-center py-2">
                        <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm text-muted-foreground">No new notifications</p>
                      </div>
                    ) : (
                      announcements.slice(0, 3).map((notification) => (
                        <div key={notification.id} className="border border-secondary/10 rounded-lg p-2 bg-background/50">
                          <h5 className="font-medium text-sm text-foreground line-clamp-1 mb-1">{notification.title}</h5>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {notification.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Checked Out Items */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Checked Out Items ({checkedOutItems.length})
                </h4>
                <div className="space-y-2">
                  {checkedOutItems.length === 0 ? (
                    <div className="text-center py-2">
                      <Package className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-sm text-muted-foreground">No items checked out</p>
                    </div>
                  ) : (
                    checkedOutItems.map((item) => (
                      <div key={item.id} className="border border-accent/10 rounded-lg p-2 bg-background/50">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-sm text-foreground line-clamp-1">{item.title}</h5>
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(item.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Dues */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Outstanding Dues
                  {duesInfo.totalDue > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Due
                    </Badge>
                  )}
                </h4>
                {duesInfo.totalDue === 0 ? (
                  <div className="text-center py-2">
                    <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-1" />
                    <p className="text-sm text-green-600">All dues paid!</p>
                  </div>
                ) : (
                  <div className="border border-primary/10 rounded-lg p-2 bg-background/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-bold text-foreground">${duesInfo.totalDue.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">Due: {new Date(duesInfo.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="space-y-1">
                      {duesInfo.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{item.description}</span>
                          <span className="font-medium">${item.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};