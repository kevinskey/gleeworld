import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import * as Collapsible from "@radix-ui/react-collapsible";
import { 
  Book, 
  Heart, 
  ChevronDown, 
  ChevronUp, 
  Bell, 
  MessageSquare, 
  Send, 
  Users, 
  User,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { useSharedSpiritualReflections } from "@/hooks/useSharedSpiritualReflections";
import { useTasks } from "@/hooks/useTasks";
import { useNotificationDelivery } from "@/hooks/useNotificationDelivery";
import { useToast } from "@/hooks/use-toast";

export const ExpandableSpiritualReflectionsCard = () => {
  const { sharedReflections, loading } = useSharedSpiritualReflections();
  const { notifications, markNotificationAsRead, getUnreadNotificationCount } = useTasks();
  const { sendSMSNotification } = useNotificationDelivery();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [smsData, setSmsData] = useState({
    message: '',
    recipient: 'group',
    phoneNumber: ''
  });
  const [sendingSMS, setSendingSMS] = useState(false);

  const unreadCount = getUnreadNotificationCount();

  const getReflectionTypeColor = (type: string) => {
    switch (type) {
      case 'daily_devotional': return 'bg-blue-100 text-blue-800';
      case 'weekly_message': return 'bg-green-100 text-green-800';
      case 'prayer': return 'bg-purple-100 text-purple-800';
      case 'scripture_study': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assigned': return <User className="h-3 w-3 text-blue-600" />;
      case 'completed': return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'due_soon': return <Clock className="h-3 w-3 text-yellow-600" />;
      case 'overdue': return <AlertTriangle className="h-3 w-3 text-red-600" />;
      default: return <Bell className="h-3 w-3 text-gray-600" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleSendSMS = async () => {
    if (!smsData.message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    if (smsData.recipient === 'single' && !smsData.phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number for individual messages",
        variant: "destructive",
      });
      return;
    }

    setSendingSMS(true);
    try {
      if (smsData.recipient === 'group') {
        // For group messages, we'd need to implement group SMS logic
        toast({
          title: "Feature Coming Soon",
          description: "Group SMS messaging will be available soon",
          variant: "default",
        });
      } else {
        const success = await sendSMSNotification(smsData.phoneNumber, smsData.message);
        if (success) {
          setSmsData({ message: '', recipient: 'group', phoneNumber: '' });
          toast({
            title: "SMS Sent",
            description: "Your message has been sent successfully",
            variant: "default",
          });
        }
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
    } finally {
      setSendingSMS(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Book className="h-4 w-4" />
            Spiritual Gleeflections
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 text-xs flex items-center justify-center p-0">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-sm">Messages & Notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestReflection = sharedReflections[0];

  return (
    <Card className="w-full">
      <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <Collapsible.Trigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Book className="h-4 w-4" />
                  Spiritual Gleeflections
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 w-5 text-xs flex items-center justify-center p-0">
                      {unreadCount}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm">Messages & Notifications</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </Collapsible.Trigger>
        </CardHeader>
        
        <Collapsible.Content>
          <CardContent className="pt-0 space-y-4">
            {/* SMS Quick Send Section */}
            <div className="border rounded-lg p-3 bg-blue-50/30">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium text-sm">Quick SMS</h4>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Recipient</Label>
                    <Select 
                      value={smsData.recipient} 
                      onValueChange={(value) => setSmsData(prev => ({ ...prev, recipient: value }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="group">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>All Members</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="single">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span>Individual</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {smsData.recipient === 'single' && (
                    <div>
                      <Label className="text-xs">Phone Number</Label>
                      <Input
                        value={smsData.phoneNumber}
                        onChange={(e) => setSmsData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="+1234567890"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <Label className="text-xs">Message</Label>
                  <Textarea
                    value={smsData.message}
                    onChange={(e) => setSmsData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Type your message..."
                    className="min-h-[60px] text-xs resize-none"
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {smsData.message.length}/160 characters
                  </p>
                </div>
                
                <Button 
                  onClick={handleSendSMS}
                  disabled={sendingSMS || !smsData.message.trim()}
                  size="sm"
                  className="w-full h-8 text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  {sendingSMS ? 'Sending...' : 'Send SMS'}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Notifications Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-orange-600" />
                <h4 className="font-medium text-sm">Recent Notifications</h4>
              </div>
              
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Bell className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                      <p className="text-xs">No notifications</p>
                    </div>
                  ) : (
                    notifications.slice(0, 3).map((notification) => (
                      <div key={notification.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={notification.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="h-4 w-4 p-0"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Latest Spiritual Reflection */}
            {latestReflection && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="h-4 w-4 text-purple-600" />
                  <h4 className="font-medium text-sm">Latest Reflection</h4>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium text-sm leading-tight pr-2">{latestReflection.title}</h5>
                    {latestReflection.is_featured && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">Featured</Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className={getReflectionTypeColor(latestReflection.reflection_type || 'daily_devotional')} variant="secondary">
                      {(latestReflection.reflection_type || 'daily_devotional').replace('_', ' ')}
                    </Badge>
                    {latestReflection.scripture_reference && (
                      <Badge variant="outline" className="text-xs">
                        {latestReflection.scripture_reference}
                      </Badge>
                    )}
                  </div>
                  
                  <ScrollArea className="h-16 mb-2">
                    <p className="text-xs text-muted-foreground pr-4 leading-relaxed">
                      {latestReflection.content}
                    </p>
                  </ScrollArea>
                  
                  <div className="text-xs text-muted-foreground">
                    {latestReflection.shared_at 
                      ? `Shared on ${new Date(latestReflection.shared_at).toLocaleDateString()}`
                      : 'Recently shared'
                    }
                  </div>
                </div>

                {/* Additional reflections count */}
                {sharedReflections.length > 1 && (
                  <div className="text-center mt-2">
                    <p className="text-xs text-muted-foreground">
                      +{sharedReflections.length - 1} more reflection{sharedReflections.length > 2 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Collapsible.Content>
      </Collapsible.Root>
    </Card>
  );
};