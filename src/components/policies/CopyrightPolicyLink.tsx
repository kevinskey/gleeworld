// Small footer link to the Copyright & Content Policy. Drop this at the
// bottom of any surface where users upload, store, or share sheet music
// / audio (Viewer, Music Library, Librarian addon).
//
// We deliberately link to a dedicated page rather than a modal so the
// policy has a stable, citable URL — important for both the DMCA notice
// process and any future TOS / Privacy Policy that cross-references it.

import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

interface CopyrightPolicyLinkProps {
  className?: string;
  /** Compact = just the link text, no icon. Default shows a small shield. */
  compact?: boolean;
}

export function CopyrightPolicyLink({ className = '', compact = false }: CopyrightPolicyLinkProps) {
  return (
    <div className={`text-[11px] text-muted-foreground/80 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-3 ${className}`}>
      {!compact && <ShieldCheck className="w-3 h-3 opacity-70" />}
      <Link to="/copyright-policy" className="hover:text-foreground hover:underline transition-colors">
        Copyright &amp; Content Policy
      </Link>
      <span className="opacity-40">·</span>
      <Link to="/terms-of-service" className="hover:text-foreground hover:underline transition-colors">
        Terms of Service
      </Link>
      <span className="opacity-40">·</span>
      <Link to="/privacy" className="hover:text-foreground hover:underline transition-colors">
        Privacy Policy
      </Link>
      <span className="opacity-40">·</span>
      <span>You're responsible for the rights to what you upload.</span>
    </div>
  );
}
