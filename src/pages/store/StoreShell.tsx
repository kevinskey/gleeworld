import type { ReactNode } from 'react';
import { CartProvider } from '@/components/store/CartContext';
import { CartDrawer } from '@/components/store/CartDrawer';

export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="flex justify-end mb-2">
        <CartDrawer />
      </div>
      {children}
    </CartProvider>
  );
}
