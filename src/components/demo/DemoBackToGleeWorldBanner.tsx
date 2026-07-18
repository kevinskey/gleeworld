// Persistent "you're viewing a live example — back to gleeworld.org" strip
// for the showcase demo tenants (demo, demo-choir, demo-district,
// demo-school, demo-songwriter). Mounted in PublicLayout so it appears on
// every public-facing page a visitor can reach without logging in — the
// landing page, calendar, academy catalog, etc. Renders nothing on real
// tenant sites or the main marketing site itself.
//
// Deliberately a plain cross-origin <a>, not a router <Link>: gleeworld.org
// is a different subdomain/origin from any demo tenant, so this must be a
// full navigation, not client-side routing.
import { ArrowLeft } from 'lucide-react';
import { isShowcaseDemoTenant } from '@/lib/demoTenant';

export function DemoBackToGleeWorldBanner() {
  if (!isShowcaseDemoTenant()) return null;

  return (
    <a
      href="https://gleeworld.org"
      className="sticky top-0 z-[70] flex items-center justify-center gap-2 bg-slate-900 text-white text-xs sm:text-sm px-3 py-2 text-center hover:bg-slate-800 transition-colors"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
    >
      <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
      <span>
        You&apos;re viewing a <strong>live GleeWorld example</strong> — no login required.{' '}
        <span className="underline underline-offset-2">Back to gleeworld.org</span>
      </span>
    </a>
  );
}
