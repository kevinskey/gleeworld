import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Lock, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';

interface ModuleRow {
  id: string;
  name: string;
  description: string | null;
  tier: 'starter' | 'addon' | 'enterprise';
  monthly_price_cents: number | null;
  category: string | null;
  sort_order: number;
}

interface Subscription {
  module_id: string;
  status: string;
  current_period_end: string | null;
}

export default function ModulesSettings() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { settings } = useBrandingSettings();

  // Toast on checkout return
  useEffect(() => {
    if (searchParams.get('activated')) {
      toast({ title: 'Module activated', description: 'It may take a few seconds to enable.' });
      setSearchParams({});
    } else if (searchParams.get('cancelled')) {
      toast({ title: 'Checkout cancelled', variant: 'destructive' });
      setSearchParams({});
    }
  }, []);

  const { data: catalog = [] } = useQuery<ModuleRow[]>({
    queryKey: ['gw_billing_modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_billing_modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as ModuleRow[];
    },
  });

  const { data: subs = [] } = useQuery<Subscription[]>({
    queryKey: ['gw_tenant_subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tenant_subscriptions')
        .select('module_id, status, current_period_end');
      if (error) throw error;
      return data as Subscription[];
    },
  });

  const subMap = new Map(subs.map((s) => [s.module_id, s]));

  const activate = async (moduleId: string) => {
    setLoadingId(moduleId);
    try {
      const { data, error } = await supabase.functions.invoke('create-module-checkout', {
        body: { module_id: moduleId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error('No checkout URL returned');
    } catch (e: any) {
      toast({ title: 'Could not start checkout', description: e.message, variant: 'destructive' });
      setLoadingId(null);
    }
  };

  const starter = catalog.filter((m) => m.tier === 'starter');
  const addons = catalog.filter((m) => m.tier === 'addon');

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Modules</h1>
        <p className="text-muted-foreground">
          Activate add-on modules for {settings.org_name ?? 'your organization'}. Cancel anytime.
        </p>
      </div>

      {/* Starter modules */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Included with your plan</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {starter.map((m) => (
            <Card key={m.id} className="opacity-90">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-sm">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.description}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Add-ons */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Available add-ons</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {addons.map((m) => {
            const sub = subMap.get(m.id);
            const active = sub && ['active', 'trial'].includes(sub.status);
            const dollars = (m.monthly_price_cents ?? 0) / 100;
            return (
              <Card key={m.id} className={active ? 'border-primary' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {m.name}
                    {active && <Badge variant="default">Active</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-4 min-h-[2.5rem]">{m.description}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold">${dollars}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                      {sub?.current_period_end && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Renews {new Date(sub.current_period_end).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {active ? (
                      <Button variant="outline" size="sm" disabled>
                        <Check className="w-4 h-4 mr-1.5" /> Enabled
                      </Button>
                    ) : (
                      <Button onClick={() => activate(m.id)} disabled={loadingId === m.id} size="sm">
                        {loadingId === m.id ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <Lock className="w-4 h-4 mr-1.5" />
                        )}
                        Activate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-muted-foreground mt-8 text-center">
        Payments processed by Stripe. <ExternalLink className="inline w-3 h-3" /> Cancel from your Stripe billing portal.
      </p>
    </div>
  );
}
