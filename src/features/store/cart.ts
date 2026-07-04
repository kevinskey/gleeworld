// Client-side shopping cart for the GleeWorld Store storefront.
//
// SECURITY: this module MUST NEVER persist a price. Checkout (Task 6) looks
// up the authoritative price from gw_products server-side at order-creation
// time; a client-editable localStorage value is untrusted input. Keeping
// price out of this module entirely means there's no field to tamper with.
//
// SSR-safe: `localStorage` doesn't exist during server rendering or in the
// default (non-jsdom) vitest environment. We probe for it defensively and
// fall back to an in-memory store so the module is always usable and always
// testable, at the cost of not persisting across reloads in those contexts.

export const CART_STORAGE_KEY = 'gw_store_cart';

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

export interface CartItem {
  product_id: string;
  variant_id: string | null;
  quantity: number;
}

export interface AddItemInput {
  product_id: string;
  variant_id?: string | null;
  quantity?: number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// In-memory fallback used whenever `localStorage` is unavailable (SSR, this
// test suite, privacy modes that throw on access).
function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

const memoryStorage = createMemoryStorage();

function resolveStorage(): StorageLike {
  try {
    // `typeof localStorage` never throws even when the identifier doesn't
    // exist as a global, unlike referencing `localStorage` directly.
    if (typeof localStorage !== 'undefined' && localStorage) {
      return localStorage;
    }
  } catch {
    // Accessing localStorage can throw (e.g. Safari private mode / some
    // sandboxed iframes). Fall through to the in-memory store.
  }
  return memoryStorage;
}

function normalizeVariantId(variant_id: string | null | undefined): string | null {
  return variant_id ?? null;
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return MIN_QUANTITY;
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(quantity)));
}

function load(): CartItem[] {
  const raw = resolveStorage().getItem(CART_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((line): line is Record<string, unknown> => line && typeof line === 'object')
      .map((line) => ({
        product_id: String(line.product_id),
        variant_id: normalizeVariantId(line.variant_id as string | null | undefined),
        quantity: clampQuantity(Number(line.quantity)),
      }))
      .filter((line) => line.product_id);
  } catch {
    // Corrupt/foreign data in the key — treat as an empty cart rather than
    // throwing on every page load.
    return [];
  }
}

function save(items: CartItem[]): void {
  // Explicit object literal (not a spread) so it's structurally impossible
  // for an extra field like `price` to ride along even if a caller passes
  // one in — only these three keys are ever serialized.
  const serializable = items.map((line) => ({
    product_id: line.product_id,
    variant_id: line.variant_id,
    quantity: line.quantity,
  }));
  resolveStorage().setItem(CART_STORAGE_KEY, JSON.stringify(serializable));
}

function findIndex(items: CartItem[], product_id: string, variant_id: string | null): number {
  return items.findIndex((line) => line.product_id === product_id && line.variant_id === variant_id);
}

function getItems(): CartItem[] {
  return load();
}

function addItem(input: AddItemInput): void {
  const product_id = input.product_id;
  const variant_id = normalizeVariantId(input.variant_id);
  const quantity = input.quantity ?? MIN_QUANTITY;

  const items = load();
  const idx = findIndex(items, product_id, variant_id);
  if (idx >= 0) {
    items[idx] = {
      ...items[idx],
      quantity: clampQuantity(items[idx].quantity + quantity),
    };
  } else {
    items.push({ product_id, variant_id, quantity: clampQuantity(quantity) });
  }
  save(items);
}

function setQuantity(product_id: string, quantity: number, variant_id?: string | null): void {
  const normalizedVariant = normalizeVariantId(variant_id);
  const items = load();
  const idx = findIndex(items, product_id, normalizedVariant);
  const clamped = clampQuantity(quantity);
  if (idx >= 0) {
    items[idx] = { ...items[idx], quantity: clamped };
  } else {
    items.push({ product_id, variant_id: normalizedVariant, quantity: clamped });
  }
  save(items);
}

function removeItem(product_id: string, variant_id?: string | null): void {
  const normalizedVariant = normalizeVariantId(variant_id);
  const items = load().filter((line) => !(line.product_id === product_id && line.variant_id === normalizedVariant));
  save(items);
}

function clear(): void {
  save([]);
}

export const cart = {
  addItem,
  removeItem,
  setQuantity,
  getItems,
  clear,
};
