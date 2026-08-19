
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBrandingSettings } from "@/hooks/useBrandingSettings";

// YIQ contrast → black or white. Used so the footer's text is always
// readable against the tenant's chosen primary color.
function readableForeground(hex?: string): string {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#0f172a' : '#ffffff';
}

export const UniversalFooter = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const { settings: branding } = useBrandingSettings();
  const { data: publicSite } = useQuery<{ theme?: { primaryColor?: string }; org_name?: string } | null>({
    queryKey: ['tenant-public-site'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tenant_public_site');
      if (error) return null;
      return data as any;
    },
  });
  const primary = publicSite?.theme?.primaryColor;
  const fg = readableForeground(primary);
  // Tag the inner sub-text colors via alpha applied to the foreground hex.
  const subFg = fg === '#ffffff' ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.7)';
  const dividerFg = fg === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.15)';
  const orgName = branding.short_name || branding.org_name || 'Glee World';

  return (
    <footer
      className="relative z-20 mt-auto pb-14 sm:pb-0"
      style={{
        background: primary || 'hsl(208, 100%, 20%)',
        borderTop: `1px solid ${dividerFg}`,
        color: fg,
      }}
    >
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
          {/* Company Info */}
          <div className="text-center sm:text-left">
            <h3 className="text-sm sm:text-lg font-semibold mb-0.5 sm:mb-1" style={{ color: fg }}>
              {orgName}
            </h3>
            <p className="text-xs sm:text-sm" style={{ color: subFg }}>
              {branding.tagline || 'Powered by GleeWorld.'}
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center cursor-pointer" onClick={() => navigate('/')}>
            <h4 className="text-sm sm:text-base font-medium mb-0.5 sm:mb-1" style={{ color: fg }}>
              Quick Links
            </h4>
            <div className="flex sm:flex-col gap-3 sm:gap-1 justify-center">
              <Link
                to="/dashboard"
                className="text-xs sm:text-sm transition-opacity hover:opacity-100"
                style={{ color: subFg }}
              >
                Dashboard
              </Link>
              <Link
                to="/"
                className="text-xs sm:text-sm transition-opacity hover:opacity-100"
                style={{ color: subFg }}
              >
                Home
              </Link>
              <Link
                to="/register/parent"
                onClick={(e) => e.stopPropagation()}
                className="text-xs sm:text-sm transition-opacity hover:opacity-100"
                style={{ color: subFg }}
              >
                Parent sign-up
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="text-center sm:text-right">
            <h4 className="text-sm sm:text-base font-medium mb-0.5 sm:mb-1" style={{ color: fg }}>
              Support
            </h4>
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm" style={{ color: subFg }}>Need help?</p>
              <a
                href="mailto:admin@gleeworld.org"
                className="text-xs sm:text-sm transition-opacity underline hover:opacity-100"
                style={{ color: subFg }}
              >
                Contact Your Administrator
              </a>
            </div>
          </div>
        </div>

        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 text-center" style={{ borderTop: `1px solid ${dividerFg}` }}>
          <p className="text-xs sm:text-sm" style={{ color: subFg }}>
            © {currentYear} {orgName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
