import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, Store, CreditCard, Bell, Package, Save
} from 'lucide-react';

interface StoreSettings {
  store_name: string;
  store_email: string | null;
  support_email: string | null;
  default_currency: string;
  stripe_mode: 'test' | 'live';
  digital_download_expiry_days: number;
  digital_max_downloads: number;
  free_shipping_threshold: number | null;
  notifications_enabled: boolean;
}

export const StoreSettingsManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: 'GleeWorld Store',
    store_email: null,
    support_email: null,
    default_currency: 'usd',
    stripe_mode: 'test',
    digital_download_expiry_days: 7,
    digital_max_downloads: 3,
    free_shipping_threshold: null,
    notifications_enabled: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_store_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSettings(data as StoreSettings);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('gw_store_settings')
        .upsert({
          id: 1,
          ...settings
        });

      if (error) throw error;
      toast({ title: "Success", description: "Settings saved" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Store Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Store Information
          </CardTitle>
          <CardDescription>Basic information about your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input
                value={settings.store_name}
                onChange={(e) => setSettings({...settings, store_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select 
                value={settings.default_currency} 
                onValueChange={(v) => setSettings({...settings, default_currency: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                  <SelectItem value="gbp">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Store Email</Label>
              <Input
                type="email"
                value={settings.store_email || ''}
                onChange={(e) => setSettings({...settings, store_email: e.target.value || null})}
                placeholder="store@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input
                type="email"
                value={settings.support_email || ''}
                onChange={(e) => setSettings({...settings, support_email: e.target.value || null})}
                placeholder="support@example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Settings
          </CardTitle>
          <CardDescription>Configure your payment gateway</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Stripe Mode</Label>
              <p className="text-sm text-muted-foreground">
                Use test mode for development, live mode for production
              </p>
            </div>
            <Select 
              value={settings.stripe_mode} 
              onValueChange={(v: 'test' | 'live') => setSettings({...settings, stripe_mode: v})}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Test</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shipping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Shipping Settings
          </CardTitle>
          <CardDescription>Configure shipping options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Free Shipping Threshold ($)</Label>
            <Input
              type="number"
              value={settings.free_shipping_threshold || ''}
              onChange={(e) => setSettings({
                ...settings, 
                free_shipping_threshold: e.target.value ? parseFloat(e.target.value) : null
              })}
              placeholder="e.g., 150 (leave empty to disable)"
            />
            <p className="text-sm text-muted-foreground">
              Orders above this amount get free shipping
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Digital Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Digital Products
          </CardTitle>
          <CardDescription>Settings for digital downloads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Download Link Expiry (days)</Label>
              <Input
                type="number"
                value={settings.digital_download_expiry_days}
                onChange={(e) => setSettings({
                  ...settings, 
                  digital_download_expiry_days: parseInt(e.target.value) || 7
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Downloads per Purchase</Label>
              <Input
                type="number"
                value={settings.digital_max_downloads}
                onChange={(e) => setSettings({
                  ...settings, 
                  digital_max_downloads: parseInt(e.target.value) || 3
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure email notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send order confirmations and updates to customers
              </p>
            </div>
            <Switch
              checked={settings.notifications_enabled}
              onCheckedChange={(checked) => setSettings({...settings, notifications_enabled: checked})}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};
