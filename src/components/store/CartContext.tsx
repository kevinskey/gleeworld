import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { StoreScoreRow } from '@/lib/store/api';

interface CartItem { id: string; partner_id: string; title: string; price_cents: number; }

interface CartAPI {
  items: CartItem[];
  addItem: (row: StoreScoreRow) => { ok: boolean; reason?: 'multiple_partners' };
  removeItem: (id: string) => void;
  clear: () => void;
  subtotalCents: number;
  partnerId: string | null;
}

const CartContext = createContext<CartAPI | null>(null);
const STORAGE_KEY = 'gw_partner_cart_v1';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as CartItem[] : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* private mode */ }
  }, [items]);

  const value = useMemo<CartAPI>(() => ({
    items,
    partnerId: items[0]?.partner_id ?? null,
    subtotalCents: items.reduce((s, i) => s + i.price_cents, 0),
    addItem: (row) => {
      if (items.some((i) => i.id === row.id)) return { ok: true };
      if (items.length > 0 && items[0].partner_id !== row.partner_id) {
        return { ok: false, reason: 'multiple_partners' };
      }
      setItems((prev) => [...prev, {
        id: row.id, partner_id: row.partner_id, title: row.title, price_cents: row.price_cents,
      }]);
      return { ok: true };
    },
    removeItem: (id) => setItems((prev) => prev.filter((x) => x.id !== id)),
    clear: () => setItems([]),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartAPI {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
