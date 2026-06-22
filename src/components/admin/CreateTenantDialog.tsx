// In-app tenant provisioning. Calls POST /superadmin/api/tenants which is
// proxied to the gleeworld-superadmin Node service at 127.0.0.1:3035 — that
// service does the full provisioning (tenant row, branding, admin invite,
// Stripe customer, nginx vhost, bootstrap.js, starter modules, welcome email).
// We just collect the inputs and forward the current session JWT for auth.
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';

interface CreatedTenant {
  id: string;
  slug: string;
  name: string;
  subdomain: string;
  admin_email: string;
  url: string;
}

export function CreateTenantDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedTenant | null>(null);

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [plan, setPlan] = useState('starter');
  const [customDomain, setCustomDomain] = useState('');

  const reset = () => {
    setSlug('');
    setName('');
    setAdminEmail('');
    setAdminName('');
    setPlan('starter');
    setCustomDomain('');
    setCreated(null);
  };

  // Auto-suggest slug from the display name.
  const onNameChange = (v: string) => {
    setName(v);
    if (!slug) {
      const suggested = v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      if (suggested.length >= 3) setSlug(suggested);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) {
      toast({ title: 'Invalid slug', description: 'Use 3-60 lowercase letters, numbers, or hyphens.', variant: 'destructive' });
      return;
    }
    if (!name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (!/.+@.+\..+/.test(adminEmail)) {
      toast({ title: 'Invalid admin email', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Sign in required', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      const res = await fetch('/superadmin/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          slug,
          name: name.trim(),
          subdomain: slug,
          admin_email: adminEmail.trim().toLowerCase(),
          admin_name: adminName.trim() || adminEmail.trim().split('@')[0],
          plan,
          custom_domain: customDomain.trim() || null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = body.error === 'slug_or_subdomain_taken'
          ? `Slug "${slug}" is already taken.`
          : body.error === 'admin_email_invalid'
            ? 'Admin email is invalid.'
            : body.detail || body.error || `HTTP ${res.status}`;
        toast({ title: 'Create failed', description: errorMsg, variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      setCreated({
        id: body.id ?? body.tenant?.id ?? 'unknown',
        slug,
        name: name.trim(),
        subdomain: slug,
        admin_email: adminEmail,
        url: `https://${slug}.gleeworld.org`,
      });
      toast({ title: 'Tenant created', description: `${name} provisioned. Admin invite sent to ${adminEmail}.` });
    } catch (err: any) {
      toast({ title: 'Create failed', description: err.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" /> New tenant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Tenant created
              </DialogTitle>
              <DialogDescription>
                {created.name} is provisioned. The admin will get a magic-link invite at{' '}
                <strong>{created.admin_email}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{created.name}</div>
                  <div className="text-xs text-muted-foreground">slug: {created.slug}</div>
                </div>
                <a
                  href={created.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Open site <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                If DNS hasn&apos;t propagated yet, the subdomain may take a minute to resolve. A
                wildcard *.gleeworld.org A record is already in place — first-time TLS cert
                issuance can take ~30 seconds.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { reset(); }}>
                Create another
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create a new tenant</DialogTitle>
              <DialogDescription>
                Provisions the tenant row, branding settings, admin invite, Stripe customer,
                nginx vhost + tenant-bootstrap.js, and starter module subscriptions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="tenant-name">Organization name *</Label>
                <Input
                  id="tenant-name"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Acme Choral Society"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tenant-slug">Subdomain *</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="tenant-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="acme"
                    pattern="[a-z0-9-]{3,60}"
                    required
                    className="font-mono"
                  />
                  <span className="text-sm text-muted-foreground">.gleeworld.org</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  3–60 chars, lowercase letters / numbers / hyphens.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-email">Admin email *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="director@acme.org"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-name">Admin name</Label>
                  <Input
                    id="admin-name"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Defaults to email prefix"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="plan">Plan</Label>
                  <Select value={plan} onValueChange={setPlan}>
                    <SelectTrigger id="plan"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom-domain">Custom domain (optional)</Label>
                  <Input
                    id="custom-domain"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="acme.org"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !slug || !name || !adminEmail}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {submitting ? 'Provisioning…' : 'Create tenant'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
