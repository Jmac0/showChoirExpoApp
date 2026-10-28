import Ionicons from '@expo/vector-icons/Ionicons';
import {
  initPaymentSheet,
  initStripe,
  PaymentSheetError,
  presentPaymentSheet,
} from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/contexts/authContext';
import { showMessage } from '@/lib/confirm';

// Matches `lightGold` in tailwind.config.js (icons aren't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';

// Apple Pay merchant id - the same one is in app.json's Stripe plugin and in
// Apple Developer / Stripe (see the website's docs/GO_LIVE.md)
const MERCHANT_ID = 'merchant.co.uk.show-choir';

// What the website's api/stripe/flexi-payment-sheet returns
type PaymentSheetResponse = {
  clientSecret: string;
  publishableKey: string;
  amountPence: number;
};

// "Running low?" card under the Flexi sessions ring on the home screen (shown
// at 2 or fewer). Tapping it pays for another pack of 10 inside the app with
// Stripe's payment sheet - card, Apple Pay or Google Pay. The website starts
// the payment and, once it goes through, Stripe's webhook adds the sessions
// (the same as buying on the website), so we just refresh the profile.
// (No Apple cut: Flexi sessions are for real rehearsals, outside the app.)
// BuyFlexiSessions.web.tsx is used on web, where Stripe's SDK doesn't run.
export function BuyFlexiSessions() {
  const { profile, authRequest, refreshProfile } = useAuth();
  const [isPaying, setIsPaying] = useState(false);

  const price = profile?.flexi_pack_price;

  const buy = async () => {
    setIsPaying(true);
    try {
      const { clientSecret, publishableKey } =
        await authRequest<PaymentSheetResponse>({
          url: '/api/stripe/flexi-payment-sheet',
          method: 'POST',
        });

      // Keys come from the website, so a test site gets test payments and
      // the real site real ones. Where a bank's security check (3-D Secure)
      // sends them back to: the app (Expo Go has its own address).
      await initStripe({
        publishableKey,
        merchantIdentifier: MERCHANT_ID,
        urlScheme:
          Constants.appOwnership === 'expo'
            ? Linking.createURL('/--/')
            : Linking.createURL(''),
      });
      const setup = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Show Choir',
        applePay: { merchantCountryCode: 'GB' },
        googlePay: {
          merchantCountryCode: 'GB',
          testEnv: publishableKey.startsWith('pk_test'),
        },
        defaultBillingDetails: {
          email: profile?.email,
          name: `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim(),
        },
        returnURL: Linking.createURL('stripe-redirect'),
      });
      if (setup.error) throw new Error(setup.error.message);

      const { error } = await presentPaymentSheet();
      if (error) {
        // Closing the sheet isn't a problem - nothing was charged
        if (error.code !== PaymentSheetError.Canceled) {
          showMessage("Couldn't take the payment", error.message);
        }
        return;
      }

      showMessage(
        'Payment received',
        'Thank you! Your 10 sessions will appear in a moment.'
      );
      // Stripe tells the website separately (its webhook adds the sessions),
      // usually within a second or two - look now and again shortly after
      await refreshProfile();
      setTimeout(refreshProfile, 3000);
    } catch {
      showMessage("Couldn't start the payment", 'Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <View className="mt-6 w-11/12 items-center rounded-xl border-2 border-lightGold p-5">
      <View className="flex-row items-center">
        <Ionicons name="musical-notes-outline" size={22} color={LIGHT_GOLD} />
        <Text className="ml-2 text-lg font-bold text-lightGold">
          Running low?
        </Text>
      </View>
      <Text className="mt-2 text-center text-base text-gray-200">
        Top up your Flexi sessions - by card or{' '}
        {Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}.
      </Text>
      <Pressable
        onPress={buy}
        disabled={isPaying}
        className={`mt-4 w-full items-center rounded-md bg-lightGold py-3 active:opacity-80 ${isPaying ? 'opacity-70' : ''}`}
      >
        <Text className="text-base font-bold text-black">
          {isPaying
            ? 'Just a moment...'
            : `Buy 10 more sessions${price ? ` - £${price}` : ''}`}
        </Text>
      </Pressable>
    </View>
  );
}
