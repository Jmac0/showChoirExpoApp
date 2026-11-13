import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ShopCart } from '@/components/ShopCart';
import { ShopProductCard } from '@/components/ShopProductCard';
import { useAuth } from '@/contexts/authContext';
import {
  BasketLine,
  formatPence,
  FULFILMENT_FOR_MEMBER,
  ShopData,
  useBasket,
} from '@/lib/shop';

// Matches `lightGold` in tailwind.config.js (RefreshControl isn't styled via
// className)
const LIGHT_GOLD = 'rgb(222,204,120)';

// "12 November 2026"
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

// How many orders to show at a time under "Your orders"
const ORDERS_PAGE = 5;

// The cart button in the header (top right), with how many items are in it
function CartButton({
  itemCount,
  onPress,
}: {
  itemCount: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`Open basket (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`}
      className="mr-4"
    >
      <Ionicons name="cart-outline" size={28} color="black" />
      {itemCount > 0 ? (
        <View className="absolute -right-2 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1">
          <Text className="text-xs font-bold text-lightGold">{itemCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// The members' kit shop (active members only - the tab is hidden otherwise,
// and the website checks too). Same products, basket rules and orders as the
// website's Shop page; paying is in the app (components/ShopPayButton.tsx).
const ShopScreen = () => {
  const { authRequest } = useAuth();
  const navigation = useNavigation();
  const basket = useBasket();
  const { itemCount, keepOnly, clear } = basket;

  const [shop, setShop] = useState<ShopData | null>(null);
  const [error, setError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  // Just paid - the thank-you at the top
  const [justPaid, setJustPaid] = useState<{
    reference: string;
    venue: string;
  } | null>(null);
  // "Your orders" - folded away until tapped (opened after paying, so the
  // new order shows)
  const [ordersOpen, setOrdersOpen] = useState(false);
  // Newest 5 first, then 5 more each tap of "Load more" (the website sends
  // up to the last 50)
  const [ordersShown, setOrdersShown] = useState(ORDERS_PAGE);

  // Fetched each time the tab is opened, as photo links only last an hour
  const load = useCallback(async () => {
    try {
      const data = await authRequest<ShopData>({
        url: '/api/member-resources/shop',
      });
      setShop(data);
      // Drop anything taken off the shop since it was added
      keepOnly(data.products);
      setError(false);
    } catch {
      setError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      // Leaving the tab: back to just the newest 5 orders, so a long list
      // opened with "Load more" doesn't stay long
      return () => setOrdersShown(ORDERS_PAGE);
    }, [load])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  // Cart button, top right (the staff menu is top left)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <CartButton itemCount={itemCount} onPress={() => setCartOpen(true)} />
      ),
    });
  }, [navigation, itemCount]);

  // Added - open the cart so they can see it went in
  const add = (line: BasketLine) => {
    basket.add(line);
    setCartOpen(true);
  };

  const paid = (order: { reference: string; venue: string }) => {
    clear();
    setCartOpen(false);
    setJustPaid(order);
    setOrdersOpen(true);
    load();
    // Stripe tells the website separately - look again shortly in case the
    // order wasn't marked paid yet
    setTimeout(load, 3000);
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-lightBlack"
        contentContainerClassName="items-center pb-12 pt-6"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={LIGHT_GOLD}
            colors={[LIGHT_GOLD]}
          />
        }
      >
        <Text className="text-3xl font-bold text-lightGold">
          Show Choir Shop
        </Text>
        <Text className="mb-6 mt-2 w-11/12 text-center text-gray-300">
          Kit for members. Everything is made to order and brought to your
          choir, so there&apos;s no postage.
        </Text>

        {justPaid ? (
          <View className="mb-6 w-11/12 items-center rounded-xl border-2 border-lightGold p-5 pt-6">
            <Pressable
              onPress={() => setJustPaid(null)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              className="absolute right-2 top-2 p-1"
            >
              <Ionicons name="close" size={22} color={LIGHT_GOLD} />
            </Pressable>
            <Text className="px-4 text-center text-xl font-bold text-lightGold">
              Thank you - your order {justPaid.reference} is in!
            </Text>
            <Text className="mt-2 text-center text-gray-300">
              We&apos;ve emailed you a confirmation. We&apos;ll bring it to{' '}
              {justPaid.venue} when it&apos;s ready.
            </Text>
          </View>
        ) : null}

        {!shop && !error ? (
          <ActivityIndicator className="mt-10" color={LIGHT_GOLD} />
        ) : null}
        {error && !shop ? (
          <Text className="mt-6 w-11/12 text-center text-white">
            Couldn&apos;t load the shop. Pull down to try again.
          </Text>
        ) : null}
        {shop && !shop.products.length ? (
          <Text className="mt-6 text-gray-300">
            Nothing in the shop yet - check back soon!
          </Text>
        ) : null}

        {shop?.products.map((product) => (
          <ShopProductCard key={product.id} product={product} onAdd={add} />
        ))}

        {/* --- Their orders --- */}
        {shop?.orders.length ? (
          <View className="mt-4 w-11/12">
            {/* Tap to open / fold away */}
            <Pressable
              onPress={() => setOrdersOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: ordersOpen }}
              className="mb-3 flex-row items-center justify-between rounded-xl border border-lightGold/60 px-4 py-3 active:opacity-70"
            >
              <Text className="text-xl font-bold text-lightGold">
                Your orders ({shop.orders.length})
              </Text>
              <Ionicons
                name={ordersOpen ? 'chevron-up' : 'chevron-down'}
                size={22}
                color={LIGHT_GOLD}
              />
            </Pressable>
            {(ordersOpen ? shop.orders.slice(0, ordersShown) : []).map(
              (order) => (
                <View
                  key={order.id}
                  className="mb-3 rounded-xl border border-lightGold/60 p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-white">
                      Order {order.reference}
                    </Text>
                    <View className="rounded-full bg-lightGold/20 px-3 py-1">
                      <Text className="text-xs font-bold text-lightGold">
                        {FULFILMENT_FOR_MEMBER[order.fulfilment] ?? ''}
                      </Text>
                    </View>
                  </View>
                  {order.paid_at ? (
                    <Text className="mt-1 text-sm text-gray-400">
                      {formatDate(order.paid_at)} · to {order.venue}
                    </Text>
                  ) : null}
                  {order.items.map((item) => (
                    <Text
                      key={`${item.product_id}-${item.size}`}
                      className="mt-1 text-gray-200"
                    >
                      {item.quantity} × {item.name}
                      {item.size ? ` (${item.size})` : ''}
                    </Text>
                  ))}
                  <Text className="mt-2 font-bold text-lightGold">
                    {formatPence(order.total_pence)}
                  </Text>
                </View>
              )
            )}
            {ordersOpen && shop.orders.length > ordersShown ? (
              <Pressable
                onPress={() => setOrdersShown((shown) => shown + ORDERS_PAGE)}
                accessibilityRole="button"
                className="mt-1 items-center rounded-full border border-lightGold py-3 active:opacity-70"
              >
                <Text className="w-full text-center font-bold text-lightGold">
                  Load more ({shop.orders.length - ordersShown} older)
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <ShopCart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={basket.lines}
        products={shop?.products ?? []}
        venues={shop?.venues ?? []}
        homeChoir={shop?.homeChoir ?? ''}
        onQuantity={basket.setQuantity}
        onRemove={basket.remove}
        onPaid={paid}
      />
    </>
  );
};

export default ShopScreen;
