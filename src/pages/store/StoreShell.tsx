import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartProvider } from '@/components/store/CartContext';
import { CartDrawer } from '@/components/store/CartDrawer';
import { useMyPartner } from '@/lib/partner/api';

export function StoreShell({ children }: { children: ReactNode }) {
  // Partners get a direct path from the storefront into their catalog
  // tools ("partners sign in to add their music" — Kevin 2026-08-03).
  // Non-partners see nothing extra here; the recruitment banner at the
  // bottom of the store carries the become-a-partner pitch.
  const { data: partner } = useMyPartner();
  return (
    <CartProvider>
      <div className="flex items-center gap-3 mb-4">
        <Link to="/store" className="text-sm font-semibold">Music Store</Link>
        <div className="flex-1" />
        {partner && (
          <Button asChild variant="outline" className="h-8 text-xs">
            <Link to="/partner">
              <Store className="w-3.5 h-3.5 mr-1.5" /> Sell your music
            </Link>
          </Button>
        )}
        <CartDrawer />
      </div>
      {children}
    </CartProvider>
  );
}
