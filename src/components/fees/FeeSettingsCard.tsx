import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const METHODS = ['cash', 'check', 'venmo', 'other'] as const;

/**
 * Payment-instruction settings shown to students on My Fees (when online
 * payment isn't set up) and to families on the public pay page.
 *
 * gw_tenant_fee_settings has tenant_id as its PK with NO auto-fill trigger —
 * the upsert must supply tenant_id explicitly (resolved via the
 * current_tenant_id RPC, same pattern as useStudio) and pin
 * onConflict:'tenant_id'.
 */
export function FeeSettingsCard() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [methods, setMethods] = useState<Set<string>>(new Set(['cash', 'check']));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('gw_tenant_fee_settings')
        .select('*')
        .maybeSingle();
      if (data) {
        setName(data.treasurer_contact_name ?? '');
        setEmail(data.treasurer_contact_email ?? '');
        setPhone(data.treasurer_contact_phone ?? '');
        setMethods(new Set(data.accepted_manual_methods ?? ['cash', 'check']));
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data: tenantId, error: tErr } = await supabase.rpc('current_tenant_id');
      if (tErr || !tenantId) throw new Error(tErr?.message ?? 'Could not resolve tenant');
      const { error } = await supabase
        .from('gw_tenant_fee_settings')
        .upsert(
          {
            tenant_id: tenantId,
            treasurer_contact_name: name || null,
            treasurer_contact_email: email || null,
            treasurer_contact_phone: phone || null,
            accepted_manual_methods: Array.from(methods),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id' },
        )
        .select();
      if (error) throw error;
      toast({ title: 'Payment instructions saved' });
    } catch (e) {
      toast({
        title: 'Could not save settings',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 bg-card">
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left font-semibold text-sm"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Payment instructions shown to students
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Shown on My Fees when online payment isn't set up, and on the family
            pay page. Tell students and families who to pay and how.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input placeholder="Contact name" value={name} onChange={e => setName(e.target.value)} />
            <Input
              placeholder="Contact email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Input placeholder="Contact phone" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground">Accepted:</span>
            {METHODS.map(m => (
              <label key={m} className="flex items-center gap-1.5 cursor-pointer capitalize">
                <Checkbox
                  checked={methods.has(m)}
                  onCheckedChange={v => {
                    setMethods(prev => {
                      const next = new Set(prev);
                      if (v) next.add(m);
                      else next.delete(m);
                      return next;
                    });
                  }}
                />
                {m}
              </label>
            ))}
          </div>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </Card>
  );
}
