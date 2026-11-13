import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShopPayButton } from '@/components/ShopPayButton';
import { QuantityStepper } from '@/components/ShopProductCard';
import {
  BasketLine,
  basketTotal,
  formatPence,
  MAX_ORDER_NOTE,
  ShopProduct,
} from '@/lib/shop';

// Matches `lightGold` in tailwind.config.js (icons aren't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';

type Props = {
  open: boolean;
  onClose: () => void;
  lines: BasketLine[];
  products: ShopProduct[];
  venues: string[];
  // The member's own choir, chosen to start with
  homeChoir: string;
  onQuantity: (line: BasketLine, quantity: number) => void;
  onRemove: (line: BasketLine) => void;
  onPaid: (order: { reference: string; venue: string }) => void;
};

// The shop's cart: slides up over the shop from the cart button (top
// right), like the website's slide-in cart. What's in it, which choir to
// bring it to, an optional note, and Pay now.
export function ShopCart({
  open,
  onClose,
  lines,
  products,
  venues,
  homeChoir,
  onQuantity,
  onRemove,
  onPaid,
}: Props) {
  const insets = useSafeAreaInsets();
  // null = not changed by the member yet, so their own choir (which only
  // arrives with the shop) is used
  const [chosenVenue, setChosenVenue] = useState<string | null>(null);
  const venue = chosenVenue ?? (venues.includes(homeChoir) ? homeChoir : '');
  const [note, setNote] = useState('');

  const total = basketTotal(lines, products);

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      // Android back button closes it
      onRequestClose={onClose}
    >
      {/* Keyboard: "padding" on both platforms, or it covers the note box
          on Android (see CLAUDE.md) */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/60">
          {/* Tap the dimmed shop above to close */}
          <Pressable
            className="flex-1"
            onPress={onClose}
            accessibilityLabel="Close basket"
          />
          <View
            className="max-h-[88%] rounded-t-2xl border-t-2 border-lightGold bg-lightBlack"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="flex-row items-center justify-between px-6 pb-2 pt-5">
              <Text className="text-2xl font-bold text-lightGold">
                Your basket
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close basket"
              >
                <Ionicons name="close" size={28} color={LIGHT_GOLD} />
              </Pressable>
            </View>

            <ScrollView className="px-6" keyboardShouldPersistTaps="handled">
              {!lines.length ? (
                <Text className="py-6 text-base text-gray-300">
                  Nothing in it yet - choose your kit and tap &ldquo;Add to
                  basket&rdquo;.
                </Text>
              ) : null}

              {/* --- What's in it --- */}
              {lines.map((line) => {
                const product = products.find((p) => p.id === line.product_id);
                if (!product) return null;
                return (
                  <View
                    key={`${line.product_id}-${line.size}`}
                    className="flex-row items-center border-b border-lightGold/30 py-3"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-base font-bold text-white">
                        {product.name}
                      </Text>
                      {line.size ? (
                        <Text className="text-sm text-gray-300">
                          Size {line.size}
                        </Text>
                      ) : null}
                      <Text className="mt-1 text-sm text-lightGold">
                        {formatPence(product.price_pence * line.quantity)}
                      </Text>
                    </View>
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(quantity) => onQuantity(line, quantity)}
                      label={product.name}
                    />
                    <Pressable
                      onPress={() => onRemove(line)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${product.name}`}
                      className="ml-3 p-1"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color="#f87171"
                      />
                    </Pressable>
                  </View>
                );
              })}

              {lines.length ? (
                <>
                  <View className="mt-4 flex-row justify-between">
                    <Text className="text-lg font-bold text-white">Total</Text>
                    <Text className="text-lg font-bold text-lightGold">
                      {formatPence(total)}
                    </Text>
                  </View>

                  {/* --- Where to bring it --- */}
                  <Text className="mt-6 text-xs font-bold uppercase tracking-widest text-lightGold">
                    Bring it to my choir at
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {venues.map((name) => (
                      <Pressable
                        key={name}
                        onPress={() => setChosenVenue(name)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: venue === name }}
                        className={`rounded-full border px-4 py-2 ${venue === name ? 'border-lightGold bg-lightGold' : 'border-gray-500'}`}
                      >
                        <Text
                          className={`font-bold ${venue === name ? 'text-black' : 'text-gray-200'}`}
                        >
                          {name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* --- Note --- */}
                  <Text className="mt-6 text-xs font-bold uppercase tracking-widest text-lightGold">
                    Note (optional)
                  </Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    maxLength={MAX_ORDER_NOTE}
                    multiline
                    placeholder="Anything we should know?"
                    placeholderTextColor="#9ca3af"
                    className="mt-2 min-h-[64px] rounded-xl border-2 border-lightGold/60 bg-black/40 p-3 text-base text-white"
                  />
                  <Text className="mt-3 text-xs text-gray-400">
                    Everything is made to order, so it can take a few weeks. No
                    postage - we bring it to your choir.
                  </Text>

                  <ShopPayButton
                    lines={lines}
                    venue={venue}
                    note={note}
                    disabled={!venue}
                    onPaid={(order) => {
                      setNote('');
                      onPaid(order);
                    }}
                  />
                  {!venue ? (
                    <Text className="mt-2 text-center text-sm text-gray-400">
                      Choose a choir to pay
                    </Text>
                  ) : null}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
