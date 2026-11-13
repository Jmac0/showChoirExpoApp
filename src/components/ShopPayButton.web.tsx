import * as Linking from 'expo-linking';
import { Pressable, Text } from 'react-native';

import { BASE_URL } from '@/lib/api';
import { BasketLine } from '@/lib/shop';

type Props = {
  lines: BasketLine[];
  venue: string;
  note: string;
  disabled: boolean;
  onPaid: (order: { reference: string; venue: string }) => void;
};

// On web (the app in a browser) Stripe's payment sheet doesn't run, so
// paying is on the website's shop page instead (its basket is separate).
// The phone version is ShopPayButton.tsx.
export function ShopPayButton(_props: Props) {
  return (
    <Pressable
      onPress={() => Linking.openURL(`${BASE_URL}/members/shop`)}
      accessibilityRole="link"
      className="mt-4 w-full items-center rounded-full bg-lightGold py-4 active:opacity-80"
    >
      <Text className="w-full text-center text-base font-bold text-black">
        Pay on the website
      </Text>
    </Pressable>
  );
}
