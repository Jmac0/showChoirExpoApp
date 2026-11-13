import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

// The kit shop, in the app. Everything comes from the website:
//   api/member-resources/shop       - products, choirs, the member's orders
//   api/stripe/shop-payment-sheet   - saves the order and starts the payment
//   api/member-resources/shop-order - the order straight after paying
// Types and helpers here mirror the website's src/lib/shopShared.ts - change
// both together.

// --- Types (website: ShopProductRow, ShopOrderRow, BasketLine) ---

export type ShopProduct = {
  id: string;
  name: string;
  description: string;
  price_pence: number;
  // Signed photo links, good for an hour (fetched fresh on each visit)
  images: { key: string; url: string }[];
  has_sizes: boolean;
  sizes: string[];
};

export type Fulfilment = 'new' | 'ordered' | 'delivered' | 'cancelled';

export type ShopOrder = {
  id: string;
  // Short code to quote, e.g. "A1B2C3"
  reference: string;
  items: {
    product_id: string;
    name: string;
    size: string;
    quantity: number;
    unit_pence: number;
  }[];
  venue: string;
  note: string;
  total_pence: number;
  fulfilment: Fulfilment;
  paid_at: string | null;
};

export type ShopData = {
  products: ShopProduct[];
  // The choirs we deliver to
  venues: string[];
  // The member's own choir, chosen to start with
  homeChoir: string;
  // Their paid orders, newest first
  orders: ShopOrder[];
};

// One product in one size ("" when it doesn't come in sizes)
export type BasketLine = { product_id: string; size: string; quantity: number };

// --- Limits and wording (website: shopShared.ts) ---

export const MAX_QUANTITY = 10;
export const MAX_ORDER_NOTE = 500;

// "£30" or "£8.50"
export const formatPence = (pence: number) =>
  `£${pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2)}`;

// What members see for each stage of their order
export const FULFILMENT_FOR_MEMBER: Record<Fulfilment, string> = {
  new: 'Order received',
  ordered: 'Being made',
  delivered: 'Delivered to your choir',
  cancelled: 'Cancelled',
};

// --- The basket ---

// Kept on the phone, so the basket survives closing the app or a cancelled
// payment. Only product ids, sizes and quantities - prices always come from
// the website.
const BASKET_KEY = 'shopBasket';

const same = (a: BasketLine, b: Pick<BasketLine, 'product_id' | 'size'>) =>
  a.product_id === b.product_id && a.size === b.size;

// Adds a line, onto the one for the same product and size if there is one
const addLine = (lines: BasketLine[], line: BasketLine) =>
  lines.some((l) => same(l, line))
    ? lines.map((l) =>
        same(l, line)
          ? {
              ...l,
              quantity: Math.min(MAX_QUANTITY, l.quantity + line.quantity),
            }
          : l
      )
    : [...lines, line];

// Only lines still in the shop (in a size still offered)
const onlyValid = (lines: BasketLine[], products: ShopProduct[]) => {
  const isValid = (line: BasketLine) => {
    const product = products.find((p) => p.id === line.product_id);
    return (
      !!product && (!product.has_sizes || product.sizes.includes(line.size))
    );
  };
  return lines.every(isValid) ? lines : lines.filter(isValid);
};

const keep = (lines: BasketLine[]) =>
  AsyncStorage.setItem(BASKET_KEY, JSON.stringify(lines)).catch(() => {
    // Not kept - it still works until the app is closed
  });

// The member's basket: add, change how many, remove, empty (the website's
// components/shop/useBasket.ts, with AsyncStorage instead of localStorage)
export function useBasket() {
  const [lines, setLines] = useState<BasketLine[]>([]);
  // The saved basket has been read. Until then nothing's written (it would
  // replace the saved one) - anything added is merged in once it's read.
  const loaded = useRef(false);
  // The shop's products, if they arrived before the saved basket was read
  const latestProducts = useRef<ShopProduct[] | null>(null);
  // Emptied (paid) before the saved basket was read - don't bring it back
  const clearedEarly = useRef(false);

  useEffect(() => {
    // Read once - an effect can run again (e.g. while developing) and the
    // saved basket mustn't be added on top of itself
    if (loaded.current) return;
    AsyncStorage.getItem(BASKET_KEY)
      .catch(() => null)
      .then((saved) => {
        if (loaded.current) return;
        let parsed: BasketLine[] = [];
        try {
          const value = JSON.parse(saved || '[]');
          if (Array.isArray(value)) parsed = value;
        } catch {
          // Unreadable - start empty
        }
        if (clearedEarly.current) parsed = [];
        setLines((current) => {
          let next = current.reduce(addLine, parsed);
          if (latestProducts.current) {
            next = onlyValid(next, latestProducts.current);
          }
          keep(next);
          return next;
        });
        loaded.current = true;
      });
  }, []);

  const update = useCallback((change: (old: BasketLine[]) => BasketLine[]) => {
    setLines((old) => {
      const next = change(old);
      if (loaded.current) keep(next);
      return next;
    });
  }, []);

  return {
    lines,
    // How many items in all (shown on the cart button)
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    // Adds to the line for the same product and size if there is one
    add: (line: BasketLine) => update((old) => addLine(old, line)),
    setQuantity: (line: BasketLine, quantity: number) =>
      update((old) =>
        old.map((l) =>
          same(l, line)
            ? { ...l, quantity: Math.max(1, Math.min(MAX_QUANTITY, quantity)) }
            : l
        )
      ),
    remove: (line: BasketLine) =>
      update((old) => old.filter((l) => !same(l, line))),
    clear: () => {
      if (!loaded.current) clearedEarly.current = true;
      update(() => []);
    },
    // Drops anything no longer in the shop (or a size no longer offered) -
    // also once the saved basket's been read, if that's still to come
    keepOnly: (products: ShopProduct[]) => {
      latestProducts.current = products;
      update((old) => onlyValid(old, products));
    },
  };
}

// The basket's total, from the products as the website sent them (the
// website works it out again itself when they pay)
export const basketTotal = (lines: BasketLine[], products: ShopProduct[]) =>
  lines.reduce((sum, line) => {
    const product = products.find((p) => p.id === line.product_id);
    return sum + (product ? product.price_pence * line.quantity : 0);
  }, 0);
