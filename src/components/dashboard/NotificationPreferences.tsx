import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Mail, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const NotificationPreferences = () => {
  const { user } = useAuth();
  const { isSubscribed, subscribe, unsubscribe, permission } = usePushNotifications();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadPreferences = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('gw_profiles')
      .select('phone_number')
      .eq('user_id', user.id)
      .single();

    if (profile?.phone_number) {
      setPhoneNumber(profile.phone_number);
      setSmsEnabled(true);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Update phone number in profile
      if (smsEnabled && phoneNumber) {
        const { error } = await supabase
          .from('gw_profiles')
          .update({ phone_number: phoneNumber })
          .eq('user_id', user.id);

        if (error) throw error;
      }

      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to receive notifications from GleeWorld
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive instant browser notifications
            </p>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handlePushToggle}
            disabled={permission === 'denied'}
          />
        </div>

        {permission === 'denied' && (
          <p className="text-sm text-destructive">
            Push notifications are blocked. Please enable them in your browser settings.
          </p>
        )}

        {/* SMS Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive text message notifications
              </p>
            </div>
            <Switch
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
            />
          </div>

          {smsEnabled && (
            <div className="ml-6 space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +1 for US)
              </p>
            </div>
          )}
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications via email
            </p>
          </div>
          <Switch
            checked={emailEnabled}
            onCheckedChange={setEmailEnabled}
          />
        </div>

        <Button 
          onClick={handleSavePreferences}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
};
