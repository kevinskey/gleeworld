import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useSendSMSNotification } from '@/hooks/useSMSIntegration';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageSquare, Phone, Send, Settings } from 'lucide-react';

interface SMSIntegrationPanelProps {
  groupId?: string;
  groupName?: string;
}

export const SMSIntegrationPanel: React.FC<SMSIntegrationPanelProps> = ({
  groupId,
  groupName = 'Selected Group'
}) => {
  const { user } = useAuth();
  const sendSMSNotification = useSendSMSNotification();
  const [testMessage, setTestMessage] = useState('');
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(true);

  const handleTestSMS = async () => {
    if (!groupId) {
      toast.error('Please select a group first');
      return;
    }

    if (!testMessage.trim()) {
      toast.error('Please enter a test message');
      return;
    }

    try {
      await sendSMSNotification.mutateAsync({
        groupId,
        message: testMessage,
        senderName: user?.user_metadata?.full_name || 'Test User',
        phoneNumbers: testPhoneNumber ? [testPhoneNumber] : undefined
      });
      
      setTestMessage('');
      setTestPhoneNumber('');
    } catch (error) {
      console.error('Test SMS failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>SMS Integration Status</CardTitle>
          </div>
          <CardDescription>
            Real-time SMS notifications for group messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">SMS Notifications</span>
            </div>
            <Badge variant={smsEnabled ? "default" : "secondary"}>
              {smsEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Twilio Integration</span>
            </div>
            <Badge variant="default">Connected</Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="mb-2">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>When messages are sent in groups, SMS notifications are automatically sent to members with phone numbers</li>
              <li>Users can reply via SMS using format: "GROUP_NAME: message"</li>
              <li>SMS replies are posted back to the group chat</li>
              <li>Unknown numbers receive instructions to register</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Test SMS */}
      <Card>
        <CardHeader>
          <CardTitle>Test SMS Notification</CardTitle>
          <CardDescription>
            Send a test SMS to verify the integration is working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testMessage">Test Message</Label>
            <Textarea
              id="testMessage"
              placeholder="Enter your test message..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              maxLength={160}
            />
            <div className="text-xs text-muted-foreground text-right">
              {testMessage.length}/160 characters
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="testPhone">Test Phone Number (Optional)</Label>
            <Input
              id="testPhone"
              type="tel"
              placeholder="+1234567890"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
            />
            <div className="text-xs text-muted-foreground">
              Leave empty to send to all group members with phone numbers
            </div>
          </div>

          <Button
            onClick={handleTestSMS}
            disabled={!groupId || !testMessage.trim() || sendSMSNotification.isPending}
            className="w-full"
          >
            {sendSMSNotification.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                <span>Sending...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span>Send Test SMS</span>
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Settings</CardTitle>
          <CardDescription>
            Configure SMS notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="smsToggle">Enable SMS Notifications</Label>
              <div className="text-xs text-muted-foreground">
                Automatically send SMS when messages are posted
              </div>
            </div>
            <Switch
              id="smsToggle"
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Webhook URLs for Twilio:</p>
            <div className="bg-muted p-3 rounded-lg font-mono text-xs break-all">
              <p className="mb-1">
                <strong>Incoming SMS:</strong>
              </p>
              <p className="mb-3">
                https://oopmlreysjzuxzylyheb.functions.supabase.co/functions/v1/receive-sms
              </p>
              <p className="text-xs text-muted-foreground">
                Configure this URL in your Twilio phone number settings as the webhook for incoming messages.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};