import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { useTenantModules } from '@/hooks/useModuleAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ArrowRight, Upload, Image as ImageIcon, X, Globe, Settings as SettingsIcon, ExternalLink, Check, Layout, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

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
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Tenant URL + custom domain state
  const [tenant, setTenant] = useState<{ id: string; slug: string; subdomain: string | null; custom_domain: string | null } | null>(null);
  const [customDomain, setCustomDomain] = useState('');
  const [savingDomain, setSavingDomain] = useState(false);

  const { data: tenantModules = [] } = useTenantModules();

  // Public landing page state (hero + section toggles)
  interface HeroSlide { id?: string; title: string; description: string; image_url: string; display_order: number; }
  const [heroMode, setHeroMode] = useState<'single' | 'slider-fade' | 'slider-scroll'>('single');
  const [heroSliderSpeed, setHeroSliderSpeed] = useState<number>(5);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([{ title: '', description: '', image_url: '', display_order: 0 }]);
  const [aboutSection, setAboutSection] = useState<{ id?: string; enabled: boolean; title: string; body: string; layout: 'centered' | 'image-left' | 'image-right' | 'banner'; image_url: string }>({ enabled: false, title: 'About us', body: '', layout: 'centered', image_url: '' });
  const [uploadingAbout, setUploadingAbout] = useState(false);
  const [musicSection, setMusicSection] = useState<{ id?: string; enabled: boolean; embeds: { url: string }[] }>({ enabled: false, embeds: [] });
  const [socialSection, setSocialSection] = useState<{ id?: string; enabled: boolean; facebook: string; instagram: string; youtube: string; spotify: string; soundcloud: string; tiktok: string; twitter: string }>({
    enabled: false, facebook: '', instagram: '', youtube: '', spotify: '', soundcloud: '', tiktok: '', twitter: ''
  });
  const [savingLanding, setSavingLanding] = useState<string | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: heroDataAll }, { data: sectionData }] = await Promise.all([
        supabase.from('gw_hero_slides').select('id, title, description, image_url, display_order').order('display_order').limit(4),
        supabase.from('gw_landing_sections').select('id, section_type, enabled, config'),
      ]);
      if (heroDataAll && heroDataAll.length > 0) {
        setHeroSlides(heroDataAll.map((h: any) => ({ id: h.id, title: h.title ?? '', description: h.description ?? '', image_url: h.image_url ?? '', display_order: h.display_order ?? 0 })));
      }
      if ((settings as any).hero_mode) setHeroMode((settings as any).hero_mode);
      if ((settings as any).hero_slider_speed_seconds) setHeroSliderSpeed((settings as any).hero_slider_speed_seconds);
      const byType = new Map((sectionData ?? []).map((s: any) => [s.section_type, s]));
      const a = byType.get('about'); if (a) setAboutSection({ id: a.id, enabled: a.enabled, title: a.config?.title ?? 'About us', body: a.config?.body ?? '', layout: a.config?.layout ?? 'centered', image_url: a.config?.image_url ?? '' });
      const m = byType.get('music'); if (m) setMusicSection({ id: m.id, enabled: m.enabled, embeds: m.config?.embeds ?? [] });
      const so = byType.get('social'); if (so) setSocialSection({ id: so.id, enabled: so.enabled, facebook: so.config?.facebook ?? '', instagram: so.config?.instagram ?? '', youtube: so.config?.youtube ?? '', spotify: so.config?.spotify ?? '', soundcloud: so.config?.soundcloud ?? '', tiktok: so.config?.tiktok ?? '', twitter: so.config?.twitter ?? '' });
    })();
  }, []);

  async function handleHeroUpload(slideIdx: number, file: File) {
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be 10 MB or smaller.'); return; }
    setUploadingHero(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `hero-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-branding').upload(path, file, { upsert: false, contentType: file.type });
    if (error) { setUploadingHero(false); toast.error(`Upload failed: ${error.message}`); return; }
    const { data: pub } = supabase.storage.from('site-branding').getPublicUrl(path);
    setHeroSlides(prev => prev.map((s, i) => i === slideIdx ? { ...s, image_url: pub.publicUrl } : s));
    setUploadingHero(false);
    toast.success('Image uploaded — remember to save.');
  }

  async function saveHero() {
    setSavingLanding('hero');
    // Save hero mode + slider speed in branding settings
    if (settings.id) {
      await supabase.from('gw_branding_settings').update({ hero_mode: heroMode, hero_slider_speed_seconds: heroSliderSpeed }).eq('id', settings.id);
    }
    // For single mode, only persist the first slide. Slider modes save all slides.
    const slidesToSave = heroMode === 'single' ? heroSlides.slice(0, 1) : heroSlides;
    const errors: string[] = [];
    for (let i = 0; i < slidesToSave.length; i++) {
      const s = slidesToSave[i];
      const payload = { title: s.title.trim() || null, description: s.description.trim() || null, image_url: s.image_url.trim() || null, display_order: i, is_active: true };
      const r = s.id
        ? await supabase.from('gw_hero_slides').update(payload).eq('id', s.id).select()
        : await supabase.from('gw_hero_slides').insert(payload).select();
      if (r.error) errors.push(r.error.message);
      else if (r.data?.[0]) {
        setHeroSlides(prev => prev.map((ps, idx) => idx === i ? { ...ps, id: r.data![0].id } : ps));
      }
    }
    // If switching to single mode, delete any extra rows we no longer want.
    if (heroMode === 'single') {
      const extras = heroSlides.slice(1).filter(s => s.id);
      for (const ex of extras) {
        await supabase.from('gw_hero_slides').delete().eq('id', ex.id!);
      }
      if (extras.length) setHeroSlides(prev => prev.slice(0, 1));
    }
    setSavingLanding(null);
    if (errors.length) toast.error(`Some saves failed: ${errors[0]}`);
    else { toast.success('Hero saved'); await refetch(); }
  }

  async function handleAboutImageUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be 10 MB or smaller.'); return; }
    setUploadingAbout(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `about-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-branding').upload(path, file, { upsert: false, contentType: file.type });
    if (error) { setUploadingAbout(false); toast.error(`Upload failed: ${error.message}`); return; }
    const { data: pub } = supabase.storage.from('site-branding').getPublicUrl(path);
    setAboutSection(s => ({ ...s, image_url: pub.publicUrl }));
    setUploadingAbout(false);
    toast.success('Image uploaded — remember to save.');
  }

  async function saveSection(type: 'about' | 'music' | 'social') {
    setSavingLanding(type);
    let row: any;
    if (type === 'about') row = { section_type: 'about', enabled: aboutSection.enabled, display_order: 20, config: { title: aboutSection.title, body: aboutSection.body, layout: aboutSection.layout, image_url: aboutSection.image_url } };
    else if (type === 'music') row = { section_type: 'music', enabled: musicSection.enabled, display_order: 30, config: { embeds: musicSection.embeds } };
    else row = { section_type: 'social', enabled: socialSection.enabled, display_order: 40, config: { facebook: socialSection.facebook, instagram: socialSection.instagram, youtube: socialSection.youtube, spotify: socialSection.spotify, soundcloud: socialSection.soundcloud, tiktok: socialSection.tiktok, twitter: socialSection.twitter } };
    const existing = type === 'about' ? aboutSection.id : type === 'music' ? musicSection.id : socialSection.id;
    const r = existing
      ? await supabase.from('gw_landing_sections').update(row).eq('id', existing).select()
      : await supabase.from('gw_landing_sections').insert(row).select();
    setSavingLanding(null);
    if (r.error) { toast.error(`Couldn't save: ${r.error.message}`); return; }
    if (r.data?.[0]) {
      const id = r.data[0].id;
      if (type === 'about') setAboutSection(s => ({ ...s, id }));
      else if (type === 'music') setMusicSection(s => ({ ...s, id }));
      else setSocialSection(s => ({ ...s, id }));
    }
    toast.success(`${type} section saved`);
  }

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

  async function handleSave(markComplete: boolean) {
    if (!orgName.trim()) {
      toast.error('Organization name is required.');
      return;
    }
    setSaving(true);
    // RLS restrictive policy scopes to the current tenant — only that row is updateable.
    // Match the existing row by its id; if id is unknown (no row exists), the upsert path below handles it.
    const { data, error } = await supabase
      .from('gw_branding_settings')
      .update({
        org_name: orgName.trim(),
        short_name: shortName.trim() || null,
        tagline: tagline.trim() || null,
        show_enroll_cta: showEnrollCta,
        logo_url: logoUrl.trim() || null,
        primary_color: primaryColor || '#150d26',
        ...(markComplete ? { setup_completed: true } : {}),
      })
      .eq('id', settings.id)
      .select();
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
    <div className="min-h-screen bg-[hsl(40,10%,96%)] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground"
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
                window.open('/?preview=1', '_blank', 'noopener');
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
                  <div className="relative bg-slate-800 border border-slate-700 rounded-lg p-3">
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="w-24 h-24 object-contain rounded"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute -top-2 -right-2 bg-slate-900 border border-slate-700 rounded-full p-1 text-slate-300 hover:text-white"
                      title="Remove logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-slate-800 border border-slate-700 border-dashed rounded-lg flex items-center justify-center text-slate-500">
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

        {/* Public Landing Page Editor */}
        <Card className="p-6 bg-card text-card-foreground">
          <div className="flex items-center gap-2 mb-1">
            <Layout className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Public Landing Page</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            What visitors see at <code className="bg-muted px-1 rounded">{tenant?.custom_domain || tenant?.subdomain || 'your homepage'}</code> before they sign in.
          </p>

          {/* Hero */}
          <div className="border border-border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Hero</h3>
              <Button size="sm" onClick={saveHero} disabled={savingLanding==='hero'}>
                {savingLanding==='hero' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>Recommended image:</strong> 1920×1080 (16:9 widescreen), under 2 MB. We auto-crop+resize on display, so larger or differently-shaped uploads work too — but 16:9 shows your full image without cropping.
            </p>

            {/* Hero mode picker */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Style</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'single',         label: 'Single image',    hint: 'One static hero' },
                  { id: 'slider-fade',    label: 'Fade slider',     hint: 'Cross-fades between images' },
                  { id: 'slider-scroll',  label: 'Scroll slider',   hint: 'Horizontal scroll, swipe' },
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHeroMode(opt.id)}
                    className={`text-left p-3 rounded-lg border transition ${heroMode === opt.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                  >
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Slider speed — only visible for slider modes */}
            {heroMode !== 'single' && (
              <div className="mb-4 flex items-center gap-3">
                <label className="text-sm font-semibold whitespace-nowrap">Slide speed</label>
                <input
                  type="range"
                  min={2}
                  max={20}
                  step={1}
                  value={heroSliderSpeed}
                  onChange={(e) => setHeroSliderSpeed(Number(e.target.value))}
                  className="flex-1 max-w-xs"
                />
                <span className="text-sm text-muted-foreground w-24 text-right">{heroSliderSpeed} sec{heroSliderSpeed === 1 ? '' : 's'} per slide</span>
              </div>
            )}

            {/* Slides — show 1 for single mode, up to 4 for sliders */}
            <div className="space-y-4">
              {heroSlides.slice(0, heroMode === 'single' ? 1 : 4).map((slide, idx) => (
                <div key={idx} className="border border-border/50 rounded p-3 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {heroMode === 'single' ? 'Hero' : `Slide ${idx + 1}`}
                    </span>
                    {heroMode !== 'single' && heroSlides.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                        onClick={async () => {
                          if (slide.id) await supabase.from('gw_hero_slides').delete().eq('id', slide.id);
                          setHeroSlides(prev => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-start gap-3 mb-2">
                    {slide.image_url ? (
                      <div className="relative">
                        <img src={slide.image_url} alt="" className="w-32 h-20 object-cover rounded border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <button type="button" onClick={() => setHeroSlides(prev => prev.map((s, i) => i === idx ? { ...s, image_url: '' } : s))} className="absolute -top-2 -right-2 bg-card border rounded-full p-1 hover:bg-muted" title="Remove">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-20 bg-muted border border-dashed rounded flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium cursor-pointer">
                      {uploadingHero ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingHero ? 'Uploading…' : (slide.image_url ? 'Replace' : 'Upload')}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingHero}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeroUpload(idx, f); e.target.value = ''; }} />
                    </label>
                  </div>
                  <Input
                    value={slide.image_url}
                    onChange={(e) => setHeroSlides(prev => prev.map((s, i) => i === idx ? { ...s, image_url: e.target.value } : s))}
                    placeholder="Or paste an image URL"
                    className="mb-2"
                  />
                  <Input
                    value={slide.title}
                    onChange={(e) => setHeroSlides(prev => prev.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                    placeholder="Title (optional)"
                    maxLength={120}
                    className="mb-2"
                  />
                  <Textarea
                    value={slide.description}
                    onChange={(e) => setHeroSlides(prev => prev.map((s, i) => i === idx ? { ...s, description: e.target.value } : s))}
                    placeholder="Subtitle (optional)"
                    rows={2}
                    maxLength={300}
                  />
                </div>
              ))}
              {heroMode !== 'single' && heroSlides.length < 4 && (
                <Button variant="outline" size="sm" onClick={() => setHeroSlides(prev => [...prev, { title: '', description: '', image_url: '', display_order: prev.length }])}>
                  <Plus className="w-4 h-4 mr-2" /> Add slide ({heroSlides.length} / 4)
                </Button>
              )}
            </div>
          </div>

          {/* About */}
          <div className="border border-border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">About section</h3>
                <Switch checked={aboutSection.enabled} onCheckedChange={(v) => setAboutSection(s => ({ ...s, enabled: v }))} />
                <span className="text-xs text-muted-foreground">{aboutSection.enabled ? 'visible' : 'hidden'}</span>
              </div>
              <Button size="sm" onClick={() => saveSection('about')} disabled={savingLanding==='about'}>
                {savingLanding==='about' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save</>}
              </Button>
            </div>
            <Field label="Heading"><Input value={aboutSection.title} onChange={(e) => setAboutSection(s => ({ ...s, title: e.target.value }))} /></Field>
            <div className="mt-3"><Field label="Body"><Textarea rows={5} value={aboutSection.body} onChange={(e) => setAboutSection(s => ({ ...s, body: e.target.value }))} placeholder="A few sentences about your organization." /></Field></div>
            <div className="mt-4">
              <label className="block text-sm font-semibold mb-2">Layout</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { id: 'centered', label: 'Centered', hint: 'Just text, centered' },
                  { id: 'image-left', label: 'Image left', hint: 'Photo + text side by side' },
                  { id: 'image-right', label: 'Image right', hint: 'Text + photo side by side' },
                  { id: 'banner', label: 'Banner', hint: 'Full-width photo behind text' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAboutSection(s => ({ ...s, layout: opt.id }))}
                    className={`text-left p-3 rounded-lg border transition ${aboutSection.layout === opt.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                  >
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.hint}</div>
                  </button>
                ))}
              </div>
            </div>
            {aboutSection.layout !== 'centered' && (
              <div className="mt-3">
                <label className="block text-sm font-semibold mb-1">Section image</label>
                <div className="flex flex-wrap items-start gap-3 mb-2">
                  {aboutSection.image_url ? (
                    <div className="relative">
                      <img src={aboutSection.image_url} alt="" className="w-40 h-24 object-cover rounded border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <button type="button" onClick={() => setAboutSection(s => ({ ...s, image_url: '' }))} className="absolute -top-2 -right-2 bg-card border rounded-full p-1 hover:bg-muted" title="Remove">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-40 h-24 bg-muted border border-dashed rounded flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium cursor-pointer">
                    {uploadingAbout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingAbout ? 'Uploading…' : (aboutSection.image_url ? 'Replace' : 'Upload')}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingAbout}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAboutImageUpload(f); e.target.value = ''; }} />
                  </label>
                </div>
                <Input value={aboutSection.image_url} onChange={(e) => setAboutSection(s => ({ ...s, image_url: e.target.value }))} placeholder="Or paste an image URL" />
              </div>
            )}
          </div>

          {/* Music samples */}
          <div className="border border-border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">Music samples</h3>
                <Switch checked={musicSection.enabled} onCheckedChange={(v) => setMusicSection(s => ({ ...s, enabled: v }))} />
                <span className="text-xs text-muted-foreground">{musicSection.enabled ? 'visible' : 'hidden'}</span>
              </div>
              <Button size="sm" onClick={() => saveSection('music')} disabled={savingLanding==='music'}>
                {savingLanding==='music' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Paste YouTube, SoundCloud, or Spotify links.</p>
            <div className="space-y-2">
              {musicSection.embeds.map((emb, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={emb.url} placeholder="https://youtube.com/watch?v=..." onChange={(e) => {
                    const next = [...musicSection.embeds]; next[i] = { url: e.target.value }; setMusicSection(s => ({ ...s, embeds: next }));
                  }} />
                  <Button variant="ghost" size="sm" onClick={() => {
                    const next = [...musicSection.embeds]; next.splice(i, 1); setMusicSection(s => ({ ...s, embeds: next }));
                  }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setMusicSection(s => ({ ...s, embeds: [...s.embeds, { url: '' }] }))}>
                <Plus className="w-4 h-4 mr-1" /> Add embed
              </Button>
            </div>
          </div>

          {/* Social links */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">Social links</h3>
                <Switch checked={socialSection.enabled} onCheckedChange={(v) => setSocialSection(s => ({ ...s, enabled: v }))} />
                <span className="text-xs text-muted-foreground">{socialSection.enabled ? 'visible' : 'hidden'}</span>
              </div>
              <Button size="sm" onClick={() => saveSection('social')} disabled={savingLanding==='social'}>
                {savingLanding==='social' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save</>}
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {(['facebook','instagram','youtube','spotify','soundcloud','tiktok','twitter'] as const).map((k) => (
                <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
                  <Input value={socialSection[k]} onChange={(e) => setSocialSection(s => ({ ...s, [k]: e.target.value }))} placeholder={`https://${k}.com/yourname`} />
                </Field>
              ))}
            </div>
          </div>
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
                {m.tier === 'addon' && <Badge variant="default" className="text-[10px] py-0">add-on</Badge>}
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
