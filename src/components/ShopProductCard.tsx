import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { BasketLine, formatPence, MAX_QUANTITY, ShopProduct } from '@/lib/shop';

// Matches `lightGold` in tailwind.config.js (icons aren't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';

// - 1 + : how many (shared with the cart)
export function QuantityStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  // e.g. "Hoodie" - for screen readers
  label: string;
}) {
  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={() => onChange(value - 1)}
        disabled={value <= 1}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`One fewer ${label}`}
        className={`h-9 w-9 items-center justify-center rounded-full border border-lightGold ${value <= 1 ? 'opacity-40' : ''}`}
      >
        <Ionicons name="remove" size={18} color={LIGHT_GOLD} />
      </Pressable>
      <Text className="w-9 text-center text-base font-bold text-white">
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        disabled={value >= MAX_QUANTITY}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`One more ${label}`}
        className={`h-9 w-9 items-center justify-center rounded-full border border-lightGold ${value >= MAX_QUANTITY ? 'opacity-40' : ''}`}
      >
        <Ionicons name="add" size={18} color={LIGHT_GOLD} />
      </Pressable>
    </View>
  );
}

// One product in the shop: photo(s), name, price, description, size (if it
// comes in sizes), how many, and "Add to basket" - like the website's
// components/shop/ProductCard.tsx
export function ShopProductCard({
  product,
  onAdd,
}: {
  product: ShopProduct;
  onAdd: (line: BasketLine) => void;
}) {
  const [photo, setPhoto] = useState(0);
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  const needsSize = product.has_sizes && !size;
  const image = product.images[photo];

  const add = () => {
    if (needsSize) return;
    onAdd({
      product_id: product.id,
      size: product.has_sizes ? size : '',
      quantity,
    });
    setQuantity(1);
  };

  return (
    <View className="mb-6 w-11/12 overflow-hidden rounded-xl border border-lightGold bg-black/40">
      {image ? (
        <Image
          source={{ uri: image.url }}
          accessibilityLabel={product.name}
          className="aspect-square w-full bg-black"
          resizeMode="cover"
        />
      ) : (
        <View className="aspect-square w-full items-center justify-center bg-black">
          <Ionicons name="shirt-outline" size={56} color={LIGHT_GOLD} />
          <Text className="mt-2 text-gray-400">Image coming soon</Text>
        </View>
      )}

      {/* More than one photo: dots to choose */}
      {product.images.length > 1 ? (
        <View className="flex-row justify-center gap-2 pt-3">
          {product.images.map((img, index) => (
            <Pressable
              key={img.key}
              onPress={() => setPhoto(index)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Photo ${index + 1}`}
              className={`h-2.5 w-2.5 rounded-full ${index === photo ? 'bg-lightGold' : 'bg-gray-600'}`}
            />
          ))}
        </View>
      ) : null}

      <View className="p-4">
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 pr-3 text-xl font-bold text-white">
            {product.name}
          </Text>
          <Text className="text-xl font-bold text-lightGold">
            {formatPence(product.price_pence)}
          </Text>
        </View>
        {product.description ? (
          <Text className="mt-2 text-gray-300">{product.description}</Text>
        ) : null}

        {product.has_sizes ? (
          <>
            <Text className="mt-4 text-xs font-bold uppercase tracking-widest text-lightGold">
              Size
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {product.sizes.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSize(s)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: size === s }}
                  className={`min-w-[44px] items-center rounded-full border px-3 py-2 ${size === s ? 'border-lightGold bg-lightGold' : 'border-gray-500'}`}
                >
                  <Text
                    className={`font-bold ${size === s ? 'text-black' : 'text-gray-200'}`}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <View className="mt-4 flex-row items-center justify-between">
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            label={product.name}
          />
          <Pressable
            onPress={add}
            disabled={needsSize}
            accessibilityRole="button"
            className={`ml-3 flex-1 items-center rounded-full bg-lightGold py-3 active:opacity-80 ${needsSize ? 'opacity-50' : ''}`}
          >
            <Text className="w-full text-center font-bold text-black">
              {needsSize ? 'Choose a size' : 'Add to basket'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
