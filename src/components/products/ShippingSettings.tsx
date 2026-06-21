// EasyPost shipping settings — one row per tenant in gw_shipping_settings.
//
// The tenant plugs in their own EasyPost API key (it's NEVER read from the
// client at runtime — only the edge functions easypost-rates and
// easypost-buy-label use it, server-side, where the key stays out of the
// browser). The from-address is the warehouse / pickup location EasyPost
// will print on labels.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Save, KeyRound } from 'lucide-react';

interface ShippingSettings {
  easypost_api_key: string | null;
  from_name: string | null;
  from_company: string | null;
  from_street1: string | null;
  from_street2: string | null;
  from_city: string | null;
  from_state: string | null;
  from_zip: string | null;
  from_country: string | null;
  from_phone: string | null;
  from_email: string | null;
  preferred_carrier: string | null;
  preferred_service: string | null;
}

const EMPTY: ShippingSettings = {
  easypost_api_key: '',
  from_name: '',
  from_company: '',
  from_street1: '',
  from_street2: '',
  from_city: '',
  from_state: '',
  from_zip: '',
  from_country: 'US',
  from_phone: '',
  from_email: '',
  preferred_carrier: '',
  preferred_service: '',
};

export const ShippingSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ShippingSettings>(EMPTY);
  const { toast } = useToast();

  useEffect(() => { void fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_shipping_settings')
        .select('*')
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) setSettings({ ...EMPTY, ...data });
    } catch (err: any) {
      console.error('[shipping settings] fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // tenant_id default fires from the trigger; we just upsert by
      // tenant_id (unique constraint) so re-saving updates the row.
      const { error } = await supabase
        .from('gw_shipping_settings')
        .upsert({ ...settings, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' });
      if (error) throw error;
      toast({ title: 'Saved', description: 'Shipping settings updated.' });
    } catch (err: any) {
      toast({
        title: 'Save failed',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const setField = <K extends keyof ShippingSettings>(key: K, value: ShippingSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading shipping settings…</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> EasyPost API key</CardTitle>
          <CardDescription>
            Sign up at <a href="https://easypost.com" target="_blank" rel="noreferrer" className="underline">easypost.com</a> and paste your test or production API key here.
            The key is stored per-tenant and only used server-side by the rate &amp; label edge functions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="api_key">API key</Label>
            <Input
              id="api_key"
              type="password"
              autoComplete="off"
              placeholder="EZAK… or EZTK…"
              value={settings.easypost_api_key ?? ''}
              onChange={e => setField('easypost_api_key', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pref_carrier" className="text-xs">Preferred carrier (optional)</Label>
              <Input id="pref_carrier" placeholder="USPS, UPS, FedEx…" value={settings.preferred_carrier ?? ''} onChange={e => setField('preferred_carrier', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pref_service" className="text-xs">Preferred service (optional)</Label>
              <Input id="pref_service" placeholder="Priority, Ground, …" value={settings.preferred_service ?? ''} onChange={e => setField('preferred_service', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Truck className="h-4 w-4" /> Ship-from address</CardTitle>
          <CardDescription>
            The pickup address EasyPost prints on labels. This is your warehouse, office,
            or wherever you'll be handing the package to the carrier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Contact name</Label>
              <Input value={settings.from_name ?? ''} onChange={e => setField('from_name', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Company</Label>
              <Input value={settings.from_company ?? ''} onChange={e => setField('from_company', e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Street address</Label>
            <Input value={settings.from_street1 ?? ''} onChange={e => setField('from_street1', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Apt / Suite / Floor (optional)</Label>
            <Input value={settings.from_street2 ?? ''} onChange={e => setField('from_street2', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">City</Label>
              <Input value={settings.from_city ?? ''} onChange={e => setField('from_city', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input maxLength={2} placeholder="GA" value={settings.from_state ?? ''} onChange={e => setField('from_state', e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label className="text-xs">ZIP</Label>
              <Input value={settings.from_zip ?? ''} onChange={e => setField('from_zip', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Country</Label>
              <Input value={settings.from_country ?? 'US'} onChange={e => setField('from_country', e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={settings.from_phone ?? ''} onChange={e => setField('from_phone', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={settings.from_email ?? ''} onChange={e => setField('from_email', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving…' : 'Save shipping settings'}
        </Button>
      </div>
    </div>
  );
};
