import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { StoreScoreRow } from '@/lib/store/api';

interface CartItem {
  id: string;
  partner_id: string;
  title: string;
  price_cents: number;
  /** Captured at add time; optional for carts persisted before this field existed. */
  partner_name?: string;
  thumbnail_storage_path?: string | null;
}

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

  // Mirror of `items` updated synchronously so sequential calls within one
  // tick (e.g. the "Clear cart & add this" toast action doing clear() then
  // addItem()) see each other's effects instead of a stale closure.
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* private mode */ }
  }, [items]);

  const value = useMemo<CartAPI>(() => ({
    items,
    partnerId: items[0]?.partner_id ?? null,
    subtotalCents: items.reduce((s, i) => s + i.price_cents, 0),
    addItem: (row) => {
      const current = itemsRef.current;
      if (current.some((i) => i.id === row.id)) return { ok: true };
      if (current.length > 0 && current[0].partner_id !== row.partner_id) {
        return { ok: false, reason: 'multiple_partners' };
      }
      const next = [...current, {
        id: row.id,
        partner_id: row.partner_id,
        title: row.title,
        price_cents: row.price_cents,
        partner_name: row.partner?.display_name ?? undefined,
        thumbnail_storage_path: row.thumbnail_storage_path ?? null,
      }];
      itemsRef.current = next;
      setItems(next);
      return { ok: true };
    },
    removeItem: (id) => {
      const next = itemsRef.current.filter((x) => x.id !== id);
      itemsRef.current = next;
      setItems(next);
    },
    clear: () => {
      itemsRef.current = [];
      setItems([]);
    },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartAPI {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

/** Null outside a CartProvider — for surfaces that render the store grid
 *  without cart chrome (e.g. the Music Library's Store tab). */
export function useCartOptional(): CartAPI | null {
  return useContext(CartContext);
}
