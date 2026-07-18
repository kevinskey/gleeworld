// First-landing welcome for prospects entering via /try. Shown once per
// browser session; explains what the demo is and that nothing can break.

import { X } from 'lucide-react';

const PROMO_GRADIENT = 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)';

export function DemoWelcomeOverlay({ onDismiss }: { onDismiss: () => void }) {
  const tenantOrg = typeof window !== 'undefined'
    ? (window as any).__TENANT_CONFIG__?.org
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10, 5, 24, 0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onDismiss}
    >
      <div
        className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: PROMO_GRADIENT }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onDismiss}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="px-7 pt-8 pb-5 text-white">
          <div className="text-xs uppercase tracking-[0.18em] font-semibold opacity-80 mb-2">
            Welcome to the demo
          </div>
          <h2 className="text-2xl font-bold leading-tight" style={{ letterSpacing: '-0.02em' }}>
            {tenantOrg ? `Meet ${tenantOrg}.` : 'Welcome to the demo.'}
          </h2>
        </div>
        <div className="bg-card px-7 py-6">
          <p className="text-sm text-foreground leading-relaxed">
            {tenantOrg ? `${tenantOrg} is a` : 'This is a'} fictional program running on GleeWorld — real screens, real
            sample data. Look around freely: <strong>nothing you click can break anything</strong>.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Use the bar at the top to see the same program through a director's, a student's,
            or a fan's eyes — or request a workspace of your own.
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-6 w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ background: PROMO_GRADIENT }}
          >
            Start exploring
          </button>
        </div>
      </div>
    </div>
  );
}
