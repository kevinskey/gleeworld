import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield, 
  Mail, 
  MessageSquare, 
  Bell, 
  Eye, 
  Cookie, 
  Database,
  CheckCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserPreferences {
  email_marketing: boolean;
  sms_marketing: boolean;
  push_notifications: boolean;
  newsletter_subscription: boolean;
  event_notifications: boolean;
  data_processing_consent: boolean;
  cookies_functional: boolean;
  cookies_analytics: boolean;
  cookies_marketing: boolean;
  third_party_sharing: boolean;
  gdpr_consent: boolean;
  ccpa_opt_out: boolean;
}

export function PrivacyPreferencesManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>({
    email_marketing: false,
    sms_marketing: false,
    push_notifications: true,
    newsletter_subscription: false,
    event_notifications: true,
    data_processing_consent: false,
    cookies_functional: true,
    cookies_analytics: false,
    cookies_marketing: false,
    third_party_sharing: false,
    gdpr_consent: false,
    ccpa_opt_out: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      // For now, we'll use localStorage until we set up the proper table structure
      const saved = localStorage.getItem(`privacy_preferences_${user.id}`);
      if (saved) {
        const parsedPreferences = JSON.parse(saved);
        setPreferences({ ...preferences, ...parsedPreferences });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // For now, save to localStorage until we set up the proper table structure
      localStorage.setItem(`privacy_preferences_${user.id}`, JSON.stringify(preferences));
      
      toast({
        title: 'Preferences Saved',
        description: 'Your privacy and communication preferences have been updated.',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof UserPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading preferences...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Privacy & Communication Preferences</h2>
          <p className="text-muted-foreground">
            Manage your data privacy settings and communication preferences to comply with GDPR, CCPA, and other regulations.
          </p>
        </div>
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Your privacy is important to us. You can change these settings at any time. 
          Some features may be limited if you opt out of certain data processing.
        </AlertDescription>
      </Alert>

      {/* Communication Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Communication Preferences
          </CardTitle>
          <CardDescription>
            Choose how you'd like to receive communications from us
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <label className="text-sm font-medium">Email Marketing</label>
                <Badge variant="outline" className="text-xs">Required for compliance</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Receive promotional emails, newsletters, and marketing communications
              </p>
            </div>
            <Switch
              checked={preferences.email_marketing}
              onCheckedChange={(checked) => updatePreference('email_marketing', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <label className="text-sm font-medium">SMS Marketing</label>
                <Badge variant="outline" className="text-xs">Required for compliance</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Receive text messages about promotions and updates
              </p>
            </div>
            <Switch
              checked={preferences.sms_marketing}
              onCheckedChange={(checked) => updatePreference('sms_marketing', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <label className="text-sm font-medium">Push Notifications</label>
              </div>
              <p className="text-xs text-muted-foreground">
                Important system notifications and alerts
              </p>
            </div>
            <Switch
              checked={preferences.push_notifications}
              onCheckedChange={(checked) => updatePreference('push_notifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Newsletter Subscription</label>
              <p className="text-xs text-muted-foreground">
                Monthly newsletter with updates and announcements
              </p>
            </div>
            <Switch
              checked={preferences.newsletter_subscription}
              onCheckedChange={(checked) => updatePreference('newsletter_subscription', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Event Notifications</label>
              <p className="text-xs text-muted-foreground">
                Notifications about upcoming events and rehearsals
              </p>
            </div>
            <Switch
              checked={preferences.event_notifications}
              onCheckedChange={(checked) => updatePreference('event_notifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Privacy & Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Privacy & Compliance
          </CardTitle>
          <CardDescription>
            Control how your personal data is processed and shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <label className="text-sm font-medium">Data Processing Consent</label>
                <Badge variant="destructive" className="text-xs">Required</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Allow us to process your personal data for service functionality
              </p>
            </div>
            <Switch
              checked={preferences.data_processing_consent}
              onCheckedChange={(checked) => updatePreference('data_processing_consent', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">GDPR Consent</label>
                <Badge variant="outline" className="text-xs">EU Users</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Consent to data processing under GDPR regulations
              </p>
            </div>
            <Switch
              checked={preferences.gdpr_consent}
              onCheckedChange={(checked) => updatePreference('gdpr_consent', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <label className="text-sm font-medium">CCPA Opt-Out</label>
                <Badge variant="outline" className="text-xs">CA Residents</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Opt out of personal information sale/sharing (California residents)
              </p>
            </div>
            <Switch
              checked={preferences.ccpa_opt_out}
              onCheckedChange={(checked) => updatePreference('ccpa_opt_out', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Third-Party Data Sharing</label>
              <p className="text-xs text-muted-foreground">
                Allow sharing of anonymized data with trusted partners
              </p>
            </div>
            <Switch
              checked={preferences.third_party_sharing}
              onCheckedChange={(checked) => updatePreference('third_party_sharing', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cookie Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5" />
            Cookie Preferences
          </CardTitle>
          <CardDescription>
            Control which cookies we can use to improve your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Functional Cookies</label>
                <Badge variant="secondary" className="text-xs">Required</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Essential for basic website functionality
              </p>
            </div>
            <Switch
              checked={preferences.cookies_functional}
              onCheckedChange={(checked) => updatePreference('cookies_functional', checked)}
              disabled
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Analytics Cookies</label>
              <p className="text-xs text-muted-foreground">
                Help us understand how you use our website
              </p>
            </div>
            <Switch
              checked={preferences.cookies_analytics}
              onCheckedChange={(checked) => updatePreference('cookies_analytics', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Marketing Cookies</label>
              <p className="text-xs text-muted-foreground">
                Used to show you relevant ads and measure campaign effectiveness
              </p>
            </div>
            <Switch
              checked={preferences.cookies_marketing}
              onCheckedChange={(checked) => updatePreference('cookies_marketing', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Legal Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Legal Information
          </CardTitle>
          <CardDescription>
            Review our privacy policies and terms of service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" size="sm">
              Privacy Policy
            </Button>
            <Button variant="outline" size="sm">
              Terms of Service
            </Button>
            <Button variant="outline" size="sm">
              Cookie Policy
            </Button>
            <Button variant="outline" size="sm">
              Data Processing Agreement
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Consent Summary */}
      {preferences.gdpr_consent && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Consent Status:</strong> You have provided GDPR consent. 
            You can withdraw this consent at any time by toggling the settings above.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}