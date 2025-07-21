
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Mail, MessageSquare, Bell, Phone } from 'lucide-react';
import PhoneNumberInput from './PhoneNumberInput';

const NotificationPreferences = () => {
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const [updatingPhone, setUpdatingPhone] = useState(false);

  if (loading || !preferences) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" text="Loading preferences..." />
        </CardContent>
      </Card>
    );
  }

  const handleToggle = async (field: string, value: boolean) => {
    await updatePreferences({ [field]: value });
  };

  const handlePhoneUpdate = async (phone: string) => {
    setUpdatingPhone(true);
    try {
      const success = await updatePreferences({ phone_number: phone });
      return success;
    } finally {
      setUpdatingPhone(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* General Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4">General Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="h-4 w-4 text-blue-500" />
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications in the app
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.push_enabled}
                  onCheckedChange={(value) => handleToggle('push_enabled', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-green-500" />
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.email_enabled}
                  onCheckedChange={(value) => handleToggle('email_enabled', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via text message
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.sms_enabled}
                  onCheckedChange={(value) => handleToggle('sms_enabled', value)}
                />
              </div>
              
              {preferences.sms_enabled && (
                <div className="ml-7 mt-4 p-4 bg-muted/50 rounded-lg">
                  <PhoneNumberInput
                    value={preferences.phone_number || ''}
                    onChange={() => {}} // Handled by onSave
                    onSave={handlePhoneUpdate}
                    disabled={updatingPhone}
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Notification Types */}
          <div>
            <h3 className="text-lg font-medium mb-4">Notification Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Announcements</Label>
                    <p className="text-sm text-muted-foreground">
                      Important club announcements
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-3 w-3" />
                      <Switch
                        checked={preferences.announcement_email}
                        onCheckedChange={(value) => handleToggle('announcement_email', value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-3 w-3" />
                      <Switch
                        checked={preferences.announcement_sms}
                        onCheckedChange={(value) => handleToggle('announcement_sms', value)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Event Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Upcoming events and rehearsals
                    </p>
                  </div>
                  <Switch
                    checked={preferences.event_reminders}
                    onCheckedChange={(value) => handleToggle('event_reminders', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Contract Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Contract status changes
                    </p>
                  </div>
                  <Switch
                    checked={preferences.contract_updates}
                    onCheckedChange={(value) => handleToggle('contract_updates', value)}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Attendance Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Attendance reminders and updates
                    </p>
                  </div>
                  <Switch
                    checked={preferences.attendance_alerts}
                    onCheckedChange={(value) => handleToggle('attendance_alerts', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Financial Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Payment and budget notifications
                    </p>
                  </div>
                  <Switch
                    checked={preferences.financial_updates}
                    onCheckedChange={(value) => handleToggle('financial_updates', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Promotional content and updates
                    </p>
                  </div>
                  <Switch
                    checked={preferences.marketing_emails}
                    onCheckedChange={(value) => handleToggle('marketing_emails', value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant={preferences.push_enabled ? "default" : "secondary"}>
              <Bell className="h-3 w-3 mr-1" />
              Push: {preferences.push_enabled ? 'On' : 'Off'}
            </Badge>
            <Badge variant={preferences.email_enabled ? "default" : "secondary"}>
              <Mail className="h-3 w-3 mr-1" />
              Email: {preferences.email_enabled ? 'On' : 'Off'}
            </Badge>
            <Badge variant={preferences.sms_enabled ? "default" : "secondary"}>
              <MessageSquare className="h-3 w-3 mr-1" />
              SMS: {preferences.sms_enabled ? 'On' : 'Off'}
            </Badge>
            {preferences.phone_number && (
              <Badge variant="outline">
                <Phone className="h-3 w-3 mr-1" />
                {preferences.phone_number}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationPreferences;
