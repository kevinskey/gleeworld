import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CartProvider } from '@/components/store/CartContext';
import { CartDrawer } from '@/components/store/CartDrawer';

export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="flex items-center gap-3 mb-4">
        <Link to="/store" className="text-sm font-semibold">Sheet Music Store</Link>
        <div className="flex-1" />
        <CartDrawer />
      </div>
      {children}
    </CartProvider>
  );
}
