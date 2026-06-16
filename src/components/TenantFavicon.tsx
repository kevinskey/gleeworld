import { useEffect } from 'react';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';

// Swaps the browser tab favicon (and Apple touch icon) to the current tenant's
// logo_url whenever branding loads. Falls back to the static GleeWorld marks
// hardcoded in index.html when no logo is configured.
//
// One mount point in App.tsx and every tenant subdomain gets its own favicon
// — no per-tenant build step or vendor-specific code.
export function TenantFavicon() {
  const { settings } = useBrandingSettings();
  const logoUrl = settings?.logo_url;
  const orgName = settings?.org_name;

  useEffect(() => {
    if (!logoUrl) return;
    // Update both rel="icon" (browsers) and rel="apple-touch-icon" (iOS
    // homescreen). Using setAttribute on existing links keeps the DOM stable;
    // if a tenant has no link tags at all we add one.
    const icons = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
    if (icons.length === 0) {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      document.head.appendChild(link);
      icons[0] = link;
    }
    icons.forEach((l) => l.setAttribute('href', logoUrl));

    const appleIcons = document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    appleIcons.forEach((l) => l.setAttribute('href', logoUrl));
  }, [logoUrl]);

  // Also keep the document title tenant-branded so a pinned tab shows the
  // tenant name when the favicon is too small to recognize.
  useEffect(() => {
    if (orgName) document.title = orgName;
  }, [orgName]);

  return null;
}
