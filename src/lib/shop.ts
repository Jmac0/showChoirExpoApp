import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

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

// The member's basket: add, change how many, remove, empty (the website's
// components/shop/useBasket.ts, with AsyncStorage instead of localStorage)
export function useBasket() {
  const [lines, setLines] = useState<BasketLine[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(BASKET_KEY)
      .then((saved) => {
        const parsed = JSON.parse(saved || '[]');
        if (Array.isArray(parsed)) setLines(parsed);
      })
      .catch(() => {
        // Nothing saved, or it couldn't be read - start empty
      });
  }, []);

  const update = useCallback((change: (old: BasketLine[]) => BasketLine[]) => {
    setLines((old) => {
      const next = change(old);
      AsyncStorage.setItem(BASKET_KEY, JSON.stringify(next)).catch(() => {
        // Not kept - it still works until the app is closed
      });
      return next;
    });
  }, []);

  return {
    lines,
    // How many items in all (shown on the cart button)
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    // Adds to the line for the same product and size if there is one
    add: (line: BasketLine) =>
      update((old) =>
        old.some((l) => same(l, line))
          ? old.map((l) =>
              same(l, line)
                ? {
                    ...l,
                    quantity: Math.min(
                      MAX_QUANTITY,
                      l.quantity + line.quantity
                    ),
                  }
                : l
            )
          : [...old, line]
      ),
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
    clear: () => update(() => []),
    // Drops anything no longer in the shop (or a size no longer offered)
    keepOnly: (products: ShopProduct[]) =>
      update((old) => {
        const isValid = (line: BasketLine) => {
          const product = products.find((p) => p.id === line.product_id);
          return (
            !!product &&
            (!product.has_sizes || product.sizes.includes(line.size))
          );
        };
        return old.every(isValid) ? old : old.filter(isValid);
      }),
  };
}

// The basket's total, from the products as the website sent them (the
// website works it out again itself when they pay)
export const basketTotal = (lines: BasketLine[], products: ShopProduct[]) =>
  lines.reduce((sum, line) => {
    const product = products.find((p) => p.id === line.product_id);
    return sum + (product ? product.price_pence * line.quantity : 0);
  }, 0);
