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
    try {
      // Update both rel="icon" (browsers) and rel="apple-touch-icon" (iOS
      // homescreen). NodeLists aren't writable so don't try to assign into
      // them — either patch existing links in place, or append a new one.
      const icons = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'));
      if (icons.length === 0) {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.href = logoUrl;
        document.head.appendChild(link);
      } else {
        icons.forEach((l) => l.setAttribute('href', logoUrl));
      }

      const appleIcons = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]'));
      appleIcons.forEach((l) => l.setAttribute('href', logoUrl));
    } catch (err) {
      // Favicon swap is cosmetic — never let a quirky DOM API tear the page
      // down (e.g. iOS WKWebView strictness on NodeList writes).
      console.warn('[TenantFavicon] favicon update failed:', err);
    }
  }, [logoUrl]);

  // Also keep the document title tenant-branded so a pinned tab shows the
  // tenant name when the favicon is too small to recognize.
  useEffect(() => {
    if (orgName) document.title = orgName;
  }, [orgName]);

  return null;
}
