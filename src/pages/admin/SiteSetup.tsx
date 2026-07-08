import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNativeApp } from '@/lib/nativeTenant';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { useTenantModules } from '@/hooks/useModuleAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ArrowRight, Upload, Image as ImageIcon, X, Globe, Settings as SettingsIcon, ExternalLink, Check, Layout } from 'lucide-react';
import { toast } from 'sonner';

export default function SiteSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserRole();
  const { settings, isLoading, refetch } = useBrandingSettings();

  const isAdmin = !!(
    profile?.is_super_admin ||
    profile?.is_admin ||
    profile?.role === 'super-admin' ||
    profile?.role === 'admin'
  );

  const [orgName, setOrgName] = useState('');
  const [shortName, setShortName] = useState('');
  const [tagline, setTagline] = useState('');
  const [showEnrollCta, setShowEnrollCta] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#150d26');
  const [authBackgroundUrl, setAuthBackgroundUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);

  // Tenant URL + custom domain state
  const [tenant, setTenant] = useState<{ id: string; slug: string; subdomain: string | null; custom_domain: string | null } | null>(null);
  const [customDomain, setCustomDomain] = useState('');
  const [savingDomain, setSavingDomain] = useState(false);

  const { data: tenantModules = [] } = useTenantModules();

  useEffect(() => {
    (async () => {
      // Pick the tenant matching the current subdomain bootstrap, not "any" row.
      const bootstrapTenant = (window as any).__TENANT_CONFIG__?.tenant;
      let query = supabase.from('gw_tenants').select('id, slug, subdomain, custom_domain');
      if (bootstrapTenant) query = query.eq('slug', bootstrapTenant);
      const { data } = await query.maybeSingle();
      if (data) {
        setTenant(data);
        setCustomDomain(data.custom_domain ?? '');
      }
    })();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setOrgName(settings.org_name ?? '');
      setShortName(settings.short_name ?? '');
      setTagline(settings.tagline ?? '');
      setShowEnrollCta(Boolean((settings as any).show_enroll_cta));
      setLogoUrl(settings.logo_url ?? '');
      setPrimaryColor(settings.primary_color ?? '#150d26');
      setAuthBackgroundUrl(settings.auth_background_url ?? '');
    }
  }, [isLoading, settings]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40,10%,96%)] p-6">
        <div className="text-center text-muted-foreground">Please sign in.</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40,10%,96%)] p-6">
        <div className="text-center text-muted-foreground">
          Site setup is admin-only.
        </div>
      </div>
    );
  }

  async function handleUpload(file: File) {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be 5 MB or smaller.');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `logo-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase
      .storage
      .from('site-branding')
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (uploadErr) {
      setUploading(false);
      toast.error(`Upload failed: ${uploadErr.message}`);
      return;
    }
    const { data: pub } = supabase.storage.from('site-branding').getPublicUrl(path);
    setLogoUrl(pub.publicUrl);
    setUploading(false);
    toast.success('Logo uploaded');
  }

  async function handleBackgroundUpload(file: File) {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Background must be 5 MB or smaller.');
      return;
    }
    setBgUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `authbg-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase
      .storage
      .from('site-branding')
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (uploadErr) {
      setBgUploading(false);
      toast.error(`Upload failed: ${uploadErr.message}`);
      return;
    }
    const { data: pub } = supabase.storage.from('site-branding').getPublicUrl(path);
    setAuthBackgroundUrl(pub.publicUrl);
    setBgUploading(false);
    toast.success('Sign-in background uploaded');
  }

  async function handleSave(markComplete: boolean) {
    if (!orgName.trim()) {
      toast.error('Organization name is required.');
      return;
    }
    // Resolve the active tenant id at save time. The page's `tenant` state
    // may not have hydrated yet (or errored quietly) on first paint; falling
    // back to a fresh lookup from the bootstrap slug avoids the false
    // "couldn't determine the site" failure.
    let tenantId = tenant?.id;
    if (!tenantId) {
      const slug = (window as any).__TENANT_CONFIG__?.tenant;
      if (slug) {
        const { data: lookup } = await supabase
          .from('gw_tenants')
          .select('id, slug, subdomain, custom_domain')
          .eq('slug', slug)
          .maybeSingle();
        if (lookup) {
          setTenant(lookup);
          tenantId = lookup.id;
        }
      }
    }
    if (!tenantId) {
      toast.error("Couldn't determine which site you're editing. Please reload.");
      return;
    }
    setSaving(true);
    const payload = {
      org_name: orgName.trim(),
      short_name: shortName.trim() || null,
      tagline: tagline.trim() || null,
      show_enroll_cta: showEnrollCta,
      logo_url: logoUrl.trim() || null,
      primary_color: primaryColor || '#150d26',
      auth_background_url: authBackgroundUrl.trim() || null,
      ...(markComplete ? { setup_completed: true } : {}),
    };

    // Scope by tenant_id, not by settings.id — settings.id can be the
    // fallback "1" when no row exists for this tenant yet, which would
    // silently target some other tenant's row (or be blocked by RLS).
    let { data, error } = await supabase
      .from('gw_branding_settings')
      .update(payload)
      .eq('tenant_id', tenantId)
      .select();

    // No row for this tenant yet — create one. id has a NOT NULL default of 1
    // but the table has UNIQUE(tenant_id), so we supply a unique id explicitly.
    if (!error && (!data || data.length === 0)) {
      const res = await supabase
        .from('gw_branding_settings')
        .insert({ id: Date.now(), tenant_id: tenantId, ...payload })
        .select();
      data = res.data;
      error = res.error;
    }

    setSaving(false);
    if (error) {
      toast.error(`Couldn't save: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      toast.error("Save was blocked by permissions. You may not have admin rights on this site.");
      return;
    }
    toast.success('Site settings saved');
    await refetch();
    if (markComplete) navigate('/control-center');
  }

  return (
    <div
      className="min-h-screen bg-[hsl(40,10%,96%)] pb-8 px-4"
      style={{ paddingTop: 'max(2rem, calc(env(safe-area-inset-top) + 1rem))' }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="!text-[1.4rem] sm:!text-[2rem] font-bold text-foreground"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", textTransform: 'none', letterSpacing: 0 }}>
              Welcome — set up your site
            </h1>
            <p className="text-muted-foreground mt-1">
              Tell us about your organization. You can change any of this later from this same page.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (isNativeApp()) {
                  navigate('/?preview=1');
                } else {
                  window.open('/?preview=1', '_blank', 'noopener');
                }
              }}
              title="Open your public landing in a new tab"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View public site
            </Button>
            <Button onClick={() => navigate('/control-center')}>
              Done — open Control Center
            </Button>
          </div>
        </div>

        <Card className="p-6 bg-card text-card-foreground">
          <div className="space-y-5">
            <Field
              label="Organization name"
              hint="The full legal or display name of your choir, band, or school."
              required
            >
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. The Golden Gate Singers Institute"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </Field>

            <Field
              label="Short name"
              hint="Shown in the header. Aim for ≤ 20 characters so it fits on phones."
            >
              <Input
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. Golden Gate Singers"
                maxLength={30}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </Field>

            <Field
              label="Tagline"
              hint="A short phrase that shows under your name on the landing page."
            >
              <Input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Voices that move audiences"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </Field>

            <Field
              label="Show 'Enroll' button on public landing"
              hint="When on, visitors see an Enroll button that takes them to a class-code signup page. Turn off if you're not accepting new students right now."
            >
              <label className="flex items-center gap-2 text-sm text-white">
                <input
                  type="checkbox"
                  checked={showEnrollCta}
                  onChange={(e) => setShowEnrollCta(e.target.checked)}
                  className="h-4 w-4"
                />
                Show the Enroll CTA
              </label>
            </Field>

            <Field
              label="Logo"
              hint="Upload a PNG, JPG, SVG, or WebP image — up to 5 MB. Stored privately on your site's own storage."
            >
              <div className="flex flex-wrap items-start gap-4">
                {logoUrl ? (
                  <div className="relative bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="w-24 h-24 object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute -top-2 -right-2 bg-slate-900 border border-slate-700 rounded-full p-1 text-white hover:bg-slate-700"
                      title="Remove logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-white border border-slate-300 border-dashed rounded-lg flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1 min-w-[12rem]">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium cursor-pointer transition-colors">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploading ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <p className="text-xs text-slate-400 mt-2">
                    PNG, JPG, SVG, WebP. Max 5 MB. Square images work best.
                  </p>
                </div>
              </div>
            </Field>

            <Field
              label="Sign-in screen background"
              hint="Shown behind your members' sign-in screen. Use a photo or texture — up to 5 MB. Leave empty to use your brand color gradient."
            >
              <div className="flex flex-wrap items-start gap-4">
                {authBackgroundUrl ? (
                  <div className="relative bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm">
                    <img
                      src={authBackgroundUrl}
                      alt="Sign-in background preview"
                      className="w-40 h-24 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setAuthBackgroundUrl('')}
                      className="absolute -top-2 -right-2 bg-slate-900 border border-slate-700 rounded-full p-1 text-white hover:bg-slate-700"
                      title="Remove background"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-40 h-24 bg-white border border-slate-300 border-dashed rounded-lg flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1 min-w-[12rem]">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium cursor-pointer transition-colors">
                    {bgUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {bgUploading ? 'Uploading…' : authBackgroundUrl ? 'Replace background' : 'Upload background'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={bgUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleBackgroundUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <p className="text-xs text-slate-400 mt-2">
                    PNG, JPG, WebP. Max 5 MB. Wide (landscape) images work best.
                  </p>
                </div>
              </div>
            </Field>

            <Field
              label="Primary color"
              hint="Your brand color. Used for headers and accents."
            >
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-16 rounded border border-slate-700 bg-slate-800 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="font-mono w-32 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-8 pt-6 border-t border-slate-700">
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="bg-sky-600 hover:bg-sky-500 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
              Save & continue
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="border-slate-600 text-slate-200 hover:bg-slate-800"
            >
              <Save className="w-4 h-4 mr-2" />
              Save (stay here)
            </Button>
            {settings.setup_completed && (
              <Button
                variant="ghost"
                onClick={() => navigate('/control-center')}
                className="text-slate-300 hover:text-white"
              >
                Skip to dashboard
              </Button>
            )}
          </div>
        </Card>

        {/* URL & Custom Domain */}
        <Card className="p-6 bg-card text-card-foreground">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">URL & Custom Domain</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Your site is reachable at its subdomain. You can also point a custom domain (e.g. <code>yourchoir.org</code>) at us.
          </p>

          <div className="space-y-5">
            <Field label="Your subdomain" hint="Set when your tenant was provisioned. Contact support to change.">
              <div className="flex items-center gap-2">
                <Input
                  value={tenant?.subdomain ?? `${tenant?.slug ?? '...'}.gleeworld.org`}
                  readOnly
                  className="bg-slate-900 border-slate-700 text-slate-300 font-mono"
                />
                <a
                  href={`https://${tenant?.subdomain ?? `${tenant?.slug}.gleeworld.org`}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:opacity-80"
                  title="Open"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </Field>

            <Field label="Custom domain" hint="Optional. Use your own domain instead of the subdomain.">
              <Input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.trim().toLowerCase())}
                placeholder="e.g. choir.example.org"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-mono"
              />
            </Field>

            {customDomain && customDomain !== tenant?.custom_domain && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm space-y-2">
                <p className="font-semibold">Next: point DNS at us.</p>
                <p className="text-muted-foreground">Add this <code className="bg-muted px-1 rounded">CNAME</code> at your DNS provider:</p>
                <pre className="bg-slate-900 text-slate-200 rounded p-3 text-xs overflow-x-auto"><code>{customDomain}    CNAME    gleeworld.org</code></pre>
                <p className="text-muted-foreground">When DNS resolves, we'll issue an SSL cert and start serving your site at <code className="bg-muted px-1 rounded">https://{customDomain}</code>. Allow a few minutes after DNS propagates.</p>
              </div>
            )}

            <Button
              onClick={async () => {
                if (!tenant) return;
                setSavingDomain(true);
                const { error } = await supabase
                  .from('gw_tenants')
                  .update({ custom_domain: customDomain.trim() || null })
                  .eq('id', tenant.id);
                setSavingDomain(false);
                if (error) {
                  toast.error(`Couldn't save: ${error.message}`);
                  return;
                }
                toast.success(customDomain ? 'Custom domain saved. Please configure DNS.' : 'Custom domain cleared.');
                setTenant({ ...tenant, custom_domain: customDomain || null });
              }}
              disabled={savingDomain || !tenant || customDomain === (tenant?.custom_domain ?? '')}
              className="bg-primary hover:opacity-90 text-primary-foreground"
            >
              {savingDomain ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save domain settings
            </Button>
          </div>
        </Card>

        {/* Public site is now built with blocks in the page builder */}
        <Card className="p-6 bg-card text-card-foreground">
          <div className="flex items-center gap-2 mb-1">
            <Layout className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Public Landing Page</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Your public website — hero, events, about, contact, and more — is built from blocks in the page builder.
          </p>
          <Button onClick={() => navigate('/admin/public-page')} className="bg-primary hover:opacity-90 text-primary-foreground">
            Open page builder <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>

        {/* Modules / Components */}
        <Card className="p-6 bg-card text-card-foreground">
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Components & Add-ons</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Choose which features your organization uses. Starter components are included; add-ons activate via Stripe.
          </p>

          <div className="grid sm:grid-cols-2 gap-2 mb-4">
            {tenantModules.slice(0, 10).map((m) => (
              <div key={m.module_id} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-card-foreground">{m.module_name}</span>
                {m.tier === 'addon' && <Badge variant="default" className="text-xs py-0">add-on</Badge>}
              </div>
            ))}
            {tenantModules.length > 10 && (
              <div className="text-xs text-muted-foreground sm:col-span-2 mt-1">…and {tenantModules.length - 10} more</div>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => navigate('/settings/modules')}
            className="border-primary text-primary hover:bg-primary/10"
          >
            Browse all add-ons →
          </Button>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          You can revisit this page at <code className="bg-muted px-1 rounded">/admin/site-setup</code> any time.
        </p>
      </div>
    </div>
  );
}

function Field({
  label, hint, required, children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-card-foreground mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {hint && <p className="text-xs text-card-foreground/60 mb-2">{hint}</p>}
      {children}
    </div>
  );
}
