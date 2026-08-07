// Custom-domain editor for an EXISTING tenant.
//
// This capability used to live in SiteSetup.tsx, but that page became
// unreachable when /admin/site-setup started redirecting to /admin/public-page
// (App.tsx). The editor kept working; nothing could open it. Setting a custom
// domain on a live tenant therefore meant hand-writing an UPDATE against
// gw_tenants. This puts it back on the surface tenants are actually managed
// from.
//
// The DNS guidance is deliberately NOT a copy of the old page's. That one told
// the customer to add `CNAME gleeworld.org` and said we would issue a cert
// automatically. Both are wrong: the droplet is reached by an A record, a CNAME
// is invalid at an apex on most providers, and certbot is a manual follow-up —
// provisioning treats a custom domain as a non-blocking warning precisely
// because DNS cannot point at us yet when the tenant is created.

import { useState } from 'react';
import { toast } from 'sonner';
import { Link2, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** The droplet every tenant vhost is served from. */
const ORIGIN_IP = '198.211.113.144';

export interface DomainTenant {
  id: string;
  slug: string;
  name?: string | null;
  subdomain: string | null;
  custom_domain: string | null;
}

export function TenantDomainDialog({
  tenant,
  open,
  onOpenChange,
  onSaved,
}: {
  tenant: DomainTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  // Seed from the tenant the first time this opens for it, without clobbering
  // what the user has typed on subsequent renders.
  const current = tenant?.custom_domain ?? '';
  if (!touched && value !== current && tenant) setValue(current);

  const cleaned = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const changed = cleaned !== current;

  async function save() {
    if (!tenant) return;
    setSaving(true);
    const { error } = await supabase
      .from('gw_tenants')
      .update({ custom_domain: cleaned || null })
      .eq('id', tenant.id);
    setSaving(false);
    if (error) {
      toast.error(`Couldn't save: ${error.message}`);
      return;
    }
    toast.success(cleaned ? `Custom domain set to ${cleaned}` : 'Custom domain cleared');
    setTouched(false);
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setTouched(false);
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Custom domain
          </DialogTitle>
          <DialogDescription>
            {tenant?.name || tenant?.slug} keeps its gleeworld.org address either way — a custom
            domain is served in addition to it, not instead of it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tenant-custom-domain" className="text-xs">Domain</Label>
            <Input
              id="tenant-custom-domain"
              value={value}
              onChange={(e) => { setTouched(true); setValue(e.target.value); }}
              placeholder="choir.example.org"
              className="font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to clear. Saving records the domain; it does not start serving it —
              the three steps below do.
            </p>
          </div>

          {cleaned && changed && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3 text-xs">
              <p className="font-semibold text-sm">Then, to actually serve it:</p>

              <div className="space-y-1">
                <p className="font-medium">1. The customer points DNS at us</p>
                <pre className="bg-background border border-border rounded p-2 overflow-x-auto"><code>{cleaned}    A    {ORIGIN_IP}</code></pre>
                <p className="text-muted-foreground">
                  An <strong>A record</strong>, not a CNAME — a CNAME is invalid at an apex on most
                  providers. If they use Cloudflare, set it to <strong>DNS only</strong> (grey
                  cloud); proxying injects a script our CSP blocks.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-medium">2. Issue the certificate, once DNS resolves</p>
                <pre className="bg-background border border-border rounded p-2 overflow-x-auto"><code>certbot --nginx -d {cleaned}</code></pre>
              </div>

              <div className="space-y-1">
                <p className="font-medium">3. Refresh link previews and the favicon</p>
                <pre className="bg-background border border-border rounded p-2 overflow-x-auto"><code>python3 /root/tenant-og.py && systemctl reload nginx</code></pre>
                <p className="text-muted-foreground">
                  Without this the domain previews as “GleeWorld” — preview crawlers don’t run
                  JavaScript, so they never see the tenant’s branding.
                </p>
              </div>
            </div>
          )}

          {!cleaned && current && (
            <p className="text-xs text-rose-600">
              Clearing this stops <span className="font-mono">{current}</span> being recorded as
              the tenant’s address. It does not remove the nginx vhost or the certificate — do
              that on the droplet.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !changed}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
