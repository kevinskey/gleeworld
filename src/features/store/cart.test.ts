import { describe, it, expect, beforeEach } from 'vitest';
import { cart, CART_STORAGE_KEY } from './cart';

// Cart is localStorage-backed but MUST NEVER persist price — checkout looks
// the price up server-side from gw_products at order time. Storing a client
// -supplied price here would let a tampered localStorage value under-charge
// a shopper. See task-5-brief.md.

describe('cart', () => {
  beforeEach(() => {
    cart.clear();
  });

  it('adds two distinct items', () => {
    cart.addItem({ product_id: 'prod-1', quantity: 1 });
    cart.addItem({ product_id: 'prod-2', quantity: 2 });
    expect(cart.getItems()).toHaveLength(2);
  });

  it('merges quantity when the same product_id + variant_id is added again', () => {
    cart.addItem({ product_id: 'prod-1', variant_id: 'var-a', quantity: 1 });
    cart.addItem({ product_id: 'prod-1', variant_id: 'var-a', quantity: 2 });
    const items = cart.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ product_id: 'prod-1', variant_id: 'var-a', quantity: 3 });
  });

  it('treats different variants of the same product as separate lines', () => {
    cart.addItem({ product_id: 'prod-1', variant_id: 'var-a', quantity: 1 });
    cart.addItem({ product_id: 'prod-1', variant_id: 'var-b', quantity: 1 });
    expect(cart.getItems()).toHaveLength(2);
  });

  it('clamps quantity to the 1..99 range on add', () => {
    cart.addItem({ product_id: 'prod-1', quantity: 500 });
    expect(cart.getItems()[0].quantity).toBe(99);

    cart.clear();
    cart.addItem({ product_id: 'prod-1', quantity: -5 });
    expect(cart.getItems()[0].quantity).toBe(1);

    cart.clear();
    cart.addItem({ product_id: 'prod-1', quantity: 0 });
    expect(cart.getItems()[0].quantity).toBe(1);
  });

  it('clamps merged quantity to 99 as well', () => {
    cart.addItem({ product_id: 'prod-1', quantity: 90 });
    cart.addItem({ product_id: 'prod-1', quantity: 90 });
    expect(cart.getItems()[0].quantity).toBe(99);
  });

  it('setQuantity sets an absolute quantity, clamped', () => {
    cart.addItem({ product_id: 'prod-1', quantity: 1 });
    cart.setQuantity('prod-1', 5);
    expect(cart.getItems()[0].quantity).toBe(5);

    cart.setQuantity('prod-1', 500);
    expect(cart.getItems()[0].quantity).toBe(99);
  });

  it('removeItem removes only the matching product_id + variant_id line', () => {
    cart.addItem({ product_id: 'prod-1', variant_id: 'var-a', quantity: 1 });
    cart.addItem({ product_id: 'prod-1', variant_id: 'var-b', quantity: 1 });
    cart.removeItem('prod-1', 'var-a');
    const items = cart.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].variant_id).toBe('var-b');
  });

  it('clear empties the cart', () => {
    cart.addItem({ product_id: 'prod-1', quantity: 1 });
    cart.clear();
    expect(cart.getItems()).toHaveLength(0);
  });

  it('never stores a price or unit_price key in the serialized cart', () => {
    cart.addItem({ product_id: 'prod-1', variant_id: 'var-a', quantity: 2 });

    // Read the raw persisted value the way checkout / any other consumer
    // would — straight out of localStorage, not through the cart API —
    // so this test fails if a future change smuggles a price field in.
    const raw = (globalThis as any).localStorage
      ? (globalThis as any).localStorage.getItem(CART_STORAGE_KEY)
      : JSON.stringify(cart.getItems());
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(Array.isArray(parsed)).toBe(true);
    for (const line of parsed) {
      expect(Object.keys(line).sort()).toEqual(['product_id', 'quantity', 'variant_id']);
      expect(line).not.toHaveProperty('price');
      expect(line).not.toHaveProperty('unit_price');
    }
  });
});
