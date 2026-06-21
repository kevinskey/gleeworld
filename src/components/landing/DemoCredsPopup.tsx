// Scroll-triggered popup that surfaces demo login credentials so visitors
// can peek inside the Command Center without first having to ask for a
// demo. Fires once per browser session (sessionStorage flag), and only
// after the visitor has shown engagement by scrolling past the hero.
//
// Styled to match the marketing-page promo gradient.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X, Copy, Check } from "lucide-react";

const DEMO_EMAIL = "demo-admin@gleeworld.org";
const DEMO_PASSWORD = "GleeDemo2026";
const DEMO_SIGNIN_URL = `https://demo.gleeworld.org/auth?email=${encodeURIComponent(DEMO_EMAIL)}&returnTo=${encodeURIComponent("/dashboard")}`;

const PROMO_GRADIENT =
  "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)";
const SANS = "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif";

const DISMISS_KEY = "gw-demo-creds-dismissed";
const SCROLL_THRESHOLD_PX = 600;
const FALLBACK_DELAY_MS = 12000;

export function DemoCredsPopup() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setOpen(true);
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };

    const onScroll = () => {
      if (window.scrollY > SCROLL_THRESHOLD_PX) trigger();
    };
    const timer = window.setTimeout(trigger, FALLBACK_DELAY_MS);

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode: ignore */
    }
  };

  const copy = async (value: string, which: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked: ignore */
    }
  };

  if (!open) return null;

  const card = (
    <div
      role="dialog"
      aria-label="Demo login credentials"
      className="fixed z-[90] bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 max-w-sm sm:w-[22rem] rounded-2xl shadow-2xl overflow-hidden"
      style={{ background: PROMO_GRADIENT, fontFamily: SANS, animation: "gw-pop-in 0.35s ease-out" }}
    >
      <style>{`
        @keyframes gw-pop-in {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="px-5 pt-5 pb-3 text-white">
        <div className="text-sm uppercase tracking-[0.18em] font-semibold opacity-80 mb-1.5">
          Live demo
        </div>
        <div
          className="text-lg font-bold leading-tight"
          style={{ letterSpacing: "-0.01em" }}
        >
          Sign in and look around.
        </div>
        <p className="mt-1 text-sm text-white/85">
          Temporary credentials, no signup required.
        </p>
      </div>

      <div className="bg-white px-5 py-4 space-y-2.5">
        <CredRow
          label="Email"
          value={DEMO_EMAIL}
          copied={copied === "email"}
          onCopy={() => copy(DEMO_EMAIL, "email")}
        />
        <CredRow
          label="Password"
          value={DEMO_PASSWORD}
          copied={copied === "password"}
          onCopy={() => copy(DEMO_PASSWORD, "password")}
          mono
        />
        <a
          href={DEMO_SIGNIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          style={{ background: PROMO_GRADIENT }}
        >
          Open Command Center <ArrowRight className="w-4 h-4" />
        </a>
        <p className="text-sm text-slate-500 text-center pt-1">
          Read-only sandbox. Resets nightly.
        </p>
      </div>
    </div>
  );

  return createPortal(card, document.body);
}

function CredRow({
  label,
  value,
  copied,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-0.5">
          {label}
        </div>
        <div
          className={`text-sm text-slate-900 truncate ${mono ? "font-mono" : "font-medium"}`}
        >
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${label.toLowerCase()}`}
        className="shrink-0 h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-600" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
