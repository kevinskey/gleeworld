// TenantThemeRoot — mounted once at the App level. Fetches the current
// tenant's public-site theme + branding once, then writes:
//
//   • --site-primary / --site-accent / --site-font   (tenant-direct vars)
//   • --primary / --accent / --ring + matching foregrounds  (shadcn tokens)
//
// onto <html>, so every page — admin, public, modal, dialog — sees them
// without needing to be wrapped in any specific layout. Also tags <body>
// with .gw-tenant-themed so the CSS override layer (tenant-theme.css)
// can retarget hardcoded Tailwind colors in legacy modules.
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';

interface PublicSiteTheme {
  theme?: { primaryColor?: string; accentColor?: string; fontFamily?: string };
  org_name?: string;
  logo_url?: string;
}

// hex → "h s% l%" triplet that shadcn's design tokens consume via `hsl(var(--x))`.
function hexToHslTriplet(hex: string): string | null {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hh = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh /= 6;
  }
  return `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function yiqForegroundTriplet(hex: string): string | null {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '0 0% 6%' : '0 0% 100%';
}

export function TenantThemeRoot() {
  const { settings: branding } = useBrandingSettings();

  // Pull the public-site theme (primaryColor + accentColor). Falls back to
  // gw_branding_settings.primary_color when no public site is published yet.
  const { data } = useQuery<PublicSiteTheme | null>({
    queryKey: ['tenant-public-site'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tenant_public_site');
      if (error) return null;
      return data as PublicSiteTheme;
    },
  });

  // Branding is the single source of truth for the palette (matches the merge
  // order in PublicPageEditor's theme useMemo). The public site's stored theme
  // may still carry a legacy primaryColor/accentColor from an older code path
  // — those are the fallback, not the winner. Previously we had this backwards
  // and Workspace Settings → Branding color changes silently did nothing until
  // the tenant republished their public site.
  const primary = branding.primary_color || data?.theme?.primaryColor || null;
  const accent = branding.accent_color || data?.theme?.accentColor || null;

  useEffect(() => {
    const root = document.documentElement;
    const primaryTriplet = primary ? hexToHslTriplet(primary) : null;
    const accentTriplet = accent ? hexToHslTriplet(accent) : null;
    const primaryFg = primary ? yiqForegroundTriplet(primary) : null;
    const accentFg = accent ? yiqForegroundTriplet(accent) : null;

    // Tenant-direct vars (consumed by inline styles in public-site blocks,
    // header, footer, etc.)
    if (primary) root.style.setProperty('--site-primary', primary);
    else root.style.removeProperty('--site-primary');
    if (accent) root.style.setProperty('--site-accent', accent);
    else root.style.removeProperty('--site-accent');

    // shadcn design tokens — route the tenant's PRIMARY color into --primary
    // and --ring (buttons, focus rings, Command Center card accents that read
    // `bg-primary` / `text-primary`), and the ACCENT color into --accent. This
    // matches the natural mental model of the Branding form: primary_color =
    // the color that tints app chrome. Previously accent was routed into both
    // slots, so tenants who changed only the primary field saw no update in
    // the admin shell.
    if (primaryTriplet) {
      root.style.setProperty('--primary', primaryTriplet);
      root.style.setProperty('--ring', primaryTriplet);
      if (primaryFg) root.style.setProperty('--primary-foreground', primaryFg);
    }
    if (accentTriplet) {
      root.style.setProperty('--accent', accentTriplet);
      if (accentFg) root.style.setProperty('--accent-foreground', accentFg);
    }

    // Class flag so the CSS override layer (tenant-theme.css) can target
    // legacy modules' hardcoded Tailwind colors.
    document.body.classList.add('gw-tenant-themed');
    if (primary) document.body.dataset.tenantPrimaryFg = primaryFg === '0 0% 100%' ? 'light' : 'dark';

    return () => {
      // Don't strip on unmount — the App keeps this mounted for the whole
      // session, so there's nothing to clean up except in HMR scenarios.
    };
  }, [primary, accent]);

  return null;
}
