import { Download, Music, ShieldCheck } from 'lucide-react';

const ITEMS = [
  { icon: Download, text: 'Instant PDF download after checkout' },
  { icon: Music, text: 'Half of every sale goes to the composer' },
  { icon: ShieldCheck, text: 'Secure checkout by Stripe' },
] as const;

// Buyer-trust strip: 3-up on desktop, single column when compact (cart drawer).
export function StoreTrustStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 sm:grid-cols-3 gap-3'}>
      {ITEMS.map(({ icon: Icon, text }) => (
        <div key={text} className="flex gap-2 items-start">
          <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">{text}</p>
        </div>
      ))}
    </div>
  );
}
