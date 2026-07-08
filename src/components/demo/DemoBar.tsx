// Persistent chrome for prospect demo sessions (demo_viewer JWT claim).
// Renders nothing for everyone else — safe to mount unconditionally in App.
// Owns: role switcher, "Request your workspace" CTA, first-visit welcome
// overlay, and the friendly toast for blocked writes.

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEMO_HOME,
  DEMO_ROLES,
  DEMO_WELCOME_PENDING_KEY,
  DEMO_WRITE_BLOCKED_EVENT,
  getDemoSessionRole,
  startDemoSession,
  type DemoRole,
} from '@/lib/demoSession';
import { RequestWorkspaceDialog } from '@/components/leads/RequestWorkspaceDialog';
import { DemoWelcomeOverlay } from '@/components/demo/DemoWelcomeOverlay';

const ROLE_LABEL: Record<DemoRole, string> = {
  director: 'Director',
  student: 'Student',
  fan: 'Fan',
};

const WELCOME_SEEN_KEY = 'gw-demo-welcome-seen';
const WELCOME_PENDING_KEY = DEMO_WELCOME_PENDING_KEY;

export function DemoBar() {
  const [role, setRole] = useState<DemoRole | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState<DemoRole | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDemoSessionRole()
      .then((r) => {
        if (cancelled || !r) return;
        setRole(r);
        const pending = sessionStorage.getItem(WELCOME_PENDING_KEY) === '1';
        const seen = sessionStorage.getItem(WELCOME_SEEN_KEY) === '1';
        if (pending || !seen) setShowWelcome(true);
      })
      .catch(() => { /* no session readable — bar stays hidden */ });
    return () => { cancelled = true; };
  }, []);

  // Friendly fallback when an unguarded write hits the read-only RLS wall.
  useEffect(() => {
    if (!role) return;
    const onBlocked = () => {
      toast.info("This is a preview — in your own GleeWorld, that change would save.", {
        id: 'demo-write-blocked', // dedupe bursts
        action: { label: 'Request your workspace', onClick: () => setLeadOpen(true) },
      });
    };
    window.addEventListener(DEMO_WRITE_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(DEMO_WRITE_BLOCKED_EVENT, onBlocked);
  }, [role]);

  // Publish the bar's height so fixed/sticky page headers can sit below it.
  // Measured (not hardcoded) because the top padding now includes the device
  // safe-area inset, which varies by device.
  useEffect(() => {
    if (!role) return;
    const setH = () => {
      const el = barRef.current;
      if (el) document.documentElement.style.setProperty('--gw-demo-bar-h', `${el.offsetHeight}px`);
    };
    setH();
    window.addEventListener('resize', setH);
    return () => {
      window.removeEventListener('resize', setH);
      document.documentElement.style.removeProperty('--gw-demo-bar-h');
    };
  }, [role]);

  // Close the role menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  if (!role) return null;

  const dismissWelcome = () => {
    sessionStorage.setItem(WELCOME_SEEN_KEY, '1');
    sessionStorage.removeItem(WELCOME_PENDING_KEY);
    setShowWelcome(false);
  };

  const switchRole = async (next: DemoRole) => {
    setMenuOpen(false);
    if (next === role || switching) return;
    setSwitching(next);
    try {
      await startDemoSession(next);
      // Full reload: AuthContext, role hooks, and RLS-scoped queries all
      // re-derive from the new JWT.
      window.location.assign(DEMO_HOME[next]);
    } catch (e) {
      console.error('[demo-bar] role switch failed', e);
      setSwitching(null);
      toast.error("Couldn't switch views — try again in a moment.");
    }
  };

  return (
    <>
      {/* Sticky: the bar publishes its height as --gw-demo-bar-h; fixed/sticky page headers offset themselves by that var so nothing overlaps. Top padding clears the device status bar / notch (safe-area inset). */}
      <div
        ref={barRef}
        className="sticky top-0 z-[60] bg-card border-b border-border px-3 sm:px-6 flex items-center gap-2 sm:gap-3"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
          paddingBottom: '0.5rem',
        }}
      >
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs sm:text-sm text-muted-foreground truncate">
          You're exploring GleeWorld as
        </span>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-foreground rounded-md border border-border px-2 py-1 hover:bg-muted transition-colors"
          >
            {switching ? `Switching…` : ROLE_LABEL[role]}
            <ChevronDown className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-full mt-1 w-36 rounded-lg border border-border bg-card shadow-lg py-1 z-50">
              {DEMO_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => switchRole(r)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${
                    r === role ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* "Request your workspace" CTA intentionally omitted here — the
         * dashboard header already shows it next to search, so a second copy
         * on this bar was redundant. The write-blocked toast + welcome overlay
         * still surface it. */}
      </div>

      <RequestWorkspaceDialog open={leadOpen} onClose={() => setLeadOpen(false)} />
      {showWelcome && <DemoWelcomeOverlay onDismiss={dismissWelcome} />}
    </>
  );
}
