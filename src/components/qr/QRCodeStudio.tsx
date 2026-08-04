// QR codes for any page in the tenant's own workspace.
//
// The point of doing this in-app rather than sending people to one of the many
// free QR sites is that this one already knows the tenant's destinations: it
// resolves their real host (custom domain or <slug>.gleeworld.org — never a
// hardcoded gleeworld.org) and lists their actual public pages and published
// events, so nobody has to hand-copy a URL and get it subtly wrong on a poster
// that's already been printed.
//
// Codes are drawn client-side from the `qrcode` package and are not registered
// anywhere, so there is no scan tracking. That is a deliberate limit, not an
// oversight — see deploy notes; tracked codes need a redirect endpoint.

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useQuery } from '@tanstack/react-query';
import { Download, Copy, Share2, Link2, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { resolveTenantHost } from '@/lib/auth/tenantRedirect';
import { hideableNavItems } from '@/lib/navigation/navCatalog';

interface Destination {
  /** Path relative to the tenant host, e.g. "/concert-tickets/spring-gala". */
  path: string;
  label: string;
  group: string;
  hint?: string;
}

/** Print sizes. QR modules must stay crisp when blown up on a poster, so the
 *  raster options are generous; SVG is the right answer for real print work. */
const SIZES = [
  { value: 512, label: 'Web — 512px' },
  { value: 1024, label: 'Print — 1024px' },
  { value: 2048, label: 'Poster — 2048px' },
];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'qr-code';
}

export function QRCodeStudio() {
  const { toast } = useToast();
  const slug = getTenantSlug();

  const [selected, setSelected] = useState<string>('/');
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [size, setSize] = useState(1024);
  const [pngUrl, setPngUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // The tenant's real host — a branded custom domain when they have one.
  const { data: host } = useQuery({
    queryKey: ['tenant-host', slug],
    queryFn: () => resolveTenantHost(slug),
    staleTime: 5 * 60_000,
  });

  // Their published box-office events, so "the QR for the spring concert" is
  // one click rather than a hand-typed slug.
  const { data: events } = useQuery({
    queryKey: ['qr-events', slug],
    queryFn: async () => {
      const { data: tenant } = await supabase
        .from('gw_tenants').select('id').eq('slug', slug).maybeSingle();
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from('gw_events')
        .select('title, box_office_slug, start_date')
        .eq('tenant_id', tenant.id)
        .eq('box_office_status', 'published')
        .order('start_date', { ascending: false });
      return (data ?? []).filter((e) => e.box_office_slug);
    },
    staleTime: 60_000,
  });

  const destinations: Destination[] = useMemo(() => {
    const out: Destination[] = [
      { path: '/', label: 'Public home page', group: 'Public pages', hint: 'Your site' },
      { path: '/concert-tickets', label: 'All tickets', group: 'Public pages' },
      { path: '/store', label: 'Store', group: 'Public pages' },
    ];

    for (const e of events ?? []) {
      out.push({
        path: `/concert-tickets/${e.box_office_slug}`,
        label: e.title,
        group: 'Your events',
        hint: e.start_date ? new Date(e.start_date).toLocaleDateString() : undefined,
      });
    }

    // Everything in the sidebar. These need a sign-in, so they're for staff
    // signage ("scan to take attendance"), not for audience-facing posters.
    for (const item of hideableNavItems()) {
      out.push({ path: item.path, label: item.label, group: `App — ${item.section}` });
    }
    return out;
  }, [events]);

  const activeDest = destinations.find((d) => d.path === selected);
  const url = useCustom
    ? custom.trim()
    : host
      ? `https://${host}${selected === '/' ? '' : selected}`
      : '';

  useEffect(() => {
    let cancelled = false;
    if (!url) { setPngUrl(''); return; }
    // Black on white, always: QR scanners need the contrast, and a tenant's
    // brand color would quietly break codes already printed on a program.
    QRCode.toDataURL(url, { width: size, margin: 2, errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' } })
      .then((d) => { if (!cancelled) setPngUrl(d); })
      .catch(() => { if (!cancelled) setPngUrl(''); });
    return () => { cancelled = true; };
  }, [url, size]);

  const fileBase = useMemo(
    () => `qr-${slugify(useCustom ? 'custom-link' : activeDest?.label ?? 'page')}`,
    [useCustom, activeDest],
  );

  const downloadPng = () => {
    if (!pngUrl) return;
    const a = document.createElement('a');
    a.download = `${fileBase}.png`;
    a.href = pngUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const downloadSvg = async () => {
    if (!url) return;
    // Vector: the only format that stays sharp at banner size.
    const svg = await QRCode.toString(url, { type: 'svg', margin: 2 });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${fileBase}.svg`;
    a.href = href;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  };

  const copyLink = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const copyImage = async () => {
    if (!pngUrl) return;
    try {
      const blob = await (await fetch(pngUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast({ title: 'Copied', description: 'QR image copied to the clipboard.' });
    } catch {
      toast({
        title: "Couldn't copy the image",
        description: 'Your browser blocked it — use Download instead.',
        variant: 'destructive',
      });
    }
  };

  const share = async () => {
    if (!pngUrl || !navigator.share) return;
    try {
      const blob = await (await fetch(pngUrl)).blob();
      await navigator.share({
        files: [new File([blob], `${fileBase}.png`, { type: 'image/png' })],
        title: activeDest?.label ?? 'QR code',
      });
    } catch { /* the user dismissing the share sheet is not an error */ }
  };

  const groups = useMemo(() => {
    const m = new Map<string, Destination[]>();
    for (const d of destinations) {
      if (!m.has(d.group)) m.set(d.group, []);
      m.get(d.group)!.push(d);
    }
    return Array.from(m.entries());
  }, [destinations]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
      {/* Picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Choose a destination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="qr-destination">Page</Label>
            <select
              id="qr-destination"
              value={useCustom ? '__custom' : selected}
              onChange={(e) => {
                if (e.target.value === '__custom') { setUseCustom(true); return; }
                setUseCustom(false);
                setSelected(e.target.value);
              }}
              className="mt-1 w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              {groups.map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map((d) => (
                    <option key={`${group}${d.path}`} value={d.path}>
                      {d.label}{d.hint ? ` — ${d.hint}` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
              <optgroup label="Other">
                <option value="__custom">Any other link…</option>
              </optgroup>
            </select>
          </div>

          {useCustom && (
            <div>
              <Label htmlFor="qr-custom">Link</Label>
              <Input
                id="qr-custom"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="https://example.com/page"
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="qr-size">Size</Label>
            <select
              id="qr-size"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="mt-1 w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              For anything going to a printer, download the SVG instead — it stays sharp at any size.
            </p>
          </div>

          {url && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Links to</p>
                  <p className="mt-0.5 text-sm break-all">{url}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={copyLink} aria-label="Copy link">
                    {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" asChild aria-label="Open link">
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
              {!useCustom && selected.startsWith('/dashboard') && (
                <p className="mt-2 text-xs text-muted-foreground">
                  This page needs a sign-in, so it's best for staff signage rather than a public poster.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="lg:w-[22rem]">
        <CardHeader>
          <CardTitle className="text-lg">Your code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-white border border-border">
              {pngUrl
                ? <img src={pngUrl} alt={`QR code for ${activeDest?.label ?? url}`} className="w-56 h-56" />
                : <div className="w-56 h-56 grid place-items-center text-sm text-muted-foreground text-center px-4">
                    {useCustom && !custom.trim() ? 'Enter a link to generate a code.' : 'Generating…'}
                  </div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={downloadPng} disabled={!pngUrl}>
              <Download className="w-4 h-4 mr-2" /> PNG
            </Button>
            <Button variant="outline" onClick={downloadSvg} disabled={!url}>
              <Download className="w-4 h-4 mr-2" /> SVG
            </Button>
            <Button variant="outline" onClick={copyImage} disabled={!pngUrl}>
              <Copy className="w-4 h-4 mr-2" /> Copy
            </Button>
            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <Button variant="outline" onClick={share} disabled={!pngUrl}>
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>
            ) : <span />}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Print it at least 1 inch across, and test a scan before it goes out.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
