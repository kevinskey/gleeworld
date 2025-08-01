import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Clock,
  Calendar,
  MoreHorizontal,
  Zap
} from "lucide-react";
import { format } from "date-fns";

interface DuesRemindersListProps {
  reminders: any[];
  onRefresh: () => void;
}

export const DuesRemindersList = ({ reminders, onRefresh }: DuesRemindersListProps) => {
  const { toast } = useToast();

  const handleToggleReminder = async (reminderId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_dues_reminders')
        .update({ is_active: !currentStatus })
        .eq('id', reminderId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Reminder ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast({
        title: "Error",
        description: "Failed to update reminder",
        variant: "destructive"
      });
    }
  };

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'push':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getReminderTypeColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sms':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'push':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFrequencyDisplay = (frequency: string) => {
    switch (frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      default:
        return frequency;
    }
  };

  if (reminders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Reminders Set</h3>
          <p className="text-muted-foreground mb-4">
            Create automated reminders to help members stay on top of their dues
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reminders.map((reminder) => (
        <Card key={reminder.id} className={`border-l-4 ${
          reminder.is_active 
            ? 'border-l-brand-primary bg-gradient-to-r from-brand-subtle/10 to-white' 
            : 'border-l-gray-300 bg-gray-50/50'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className={`p-2 rounded-full ${getReminderTypeColor(reminder.reminder_type)}`}>
                  {getReminderTypeIcon(reminder.reminder_type)}
                </div>
                <div>
                  <div className="font-semibold">
                    {reminder.reminder_type.charAt(0).toUpperCase() + reminder.reminder_type.slice(1)} Reminder
                  </div>
                  <div className="text-sm text-muted-foreground font-normal">
                    {getFrequencyDisplay(reminder.reminder_frequency)} • {reminder.days_before_due} days before due
                  </div>
                </div>
              </CardTitle>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Active</span>
                  <Switch 
                    checked={reminder.is_active}
                    onCheckedChange={() => handleToggleReminder(reminder.id, reminder.is_active)}
                  />
                </div>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Frequency
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {getFrequencyDisplay(reminder.reminder_frequency)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {reminder.days_before_due} days before due date
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  Last Sent
                </div>
                <div className="text-sm">
                  {reminder.last_sent_at 
                    ? format(new Date(reminder.last_sent_at), 'MMM dd, yyyy HH:mm')
                    : 'Never sent'
                  }
                </div>
              </div>
            </div>
            
            {reminder.next_send_at && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-subtle/20 border border-brand-accent/20">
                <Calendar className="h-4 w-4 text-brand-primary" />
                <span className="text-sm">
                  <span className="font-medium">Next reminder:</span>{' '}
                  {format(new Date(reminder.next_send_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            )}
            
            {reminder.custom_message && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Custom Message</div>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  "{reminder.custom_message}"
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};