import {
  initPaymentSheet,
  initStripe,
  PaymentSheetError,
  presentPaymentSheet,
} from '@stripe/stripe-react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { useAuth } from '@/contexts/authContext';
import { showMessage } from '@/lib/confirm';
import { BasketLine, ShopOrder } from '@/lib/shop';

// Apple Pay merchant id - the same as BuyFlexiSessions.tsx and app.json's
// Stripe plugin
const MERCHANT_ID = 'merchant.co.uk.show-choir';

// What the website's api/stripe/shop-payment-sheet returns
type PaymentSheetResponse = {
  clientSecret: string;
  publishableKey: string;
  orderId: string;
  reference: string;
  amountPence: number;
};

type Props = {
  lines: BasketLine[];
  venue: string;
  note: string;
  disabled: boolean;
  // Paid - with the order, so the thank-you can say where it's going
  onPaid: (order: { reference: string; venue: string }) => void;
};

// "Pay now" in the shop's cart: pays inside the app with Stripe's payment
// sheet (card, Apple Pay, Google Pay), step for step like the Flexi top-up
// (BuyFlexiSessions.tsx). The website saves the order and starts the
// payment; its Stripe webhook marks it paid and sends the emails. No Apple
// or Google cut: it's physical kit, handed out at rehearsals.
// ShopPayButton.web.tsx is used on web, where Stripe's SDK doesn't run.
export function ShopPayButton({ lines, venue, note, disabled, onPaid }: Props) {
  const { profile, authRequest } = useAuth();
  const [isPaying, setIsPaying] = useState(false);

  const pay = async () => {
    setIsPaying(true);
    try {
      let sheet: PaymentSheetResponse;
      try {
        sheet = await authRequest<PaymentSheetResponse>({
          url: '/api/stripe/shop-payment-sheet',
          method: 'POST',
          data: { lines, venue, note },
        });
      } catch (err) {
        // e.g. "Please choose which choir to deliver to", or a product
        // that's just been taken off the shop
        showMessage(
          "Couldn't start the payment",
          (axios.isAxiosError(err) && err.response?.data?.message) ||
            'Please try again.'
        );
        return;
      }

      // Keys come from the website, so a test site gets test payments and
      // the real site real ones. Where a bank's security check (3-D Secure)
      // sends them back to: the app (Expo Go has its own address).
      await initStripe({
        publishableKey: sheet.publishableKey,
        merchantIdentifier: MERCHANT_ID,
        urlScheme:
          Constants.appOwnership === 'expo'
            ? Linking.createURL('/--/')
            : Linking.createURL(''),
      });
      const setup = await initPaymentSheet({
        paymentIntentClientSecret: sheet.clientSecret,
        merchantDisplayName: 'Show Choir',
        applePay: { merchantCountryCode: 'GB' },
        googlePay: {
          merchantCountryCode: 'GB',
          testEnv: sheet.publishableKey.startsWith('pk_test'),
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
        // Closing the sheet isn't a problem - nothing was charged, and the
        // basket is still there (the unpaid order is tidied away later)
        if (error.code !== PaymentSheetError.Canceled) {
          showMessage("Couldn't take the payment", error.message);
        }
        return;
      }

      // Paid. Ask the website to make sure the order's marked paid (Stripe's
      // message to it can arrive a moment later) - the thank-you shows
      // either way, as the payment has gone through.
      try {
        await authRequest<{ order: ShopOrder; paid: boolean }>({
          url: '/api/member-resources/shop-order',
          params: { id: sheet.orderId },
        });
      } catch {
        // The webhook will still mark it paid
      }
      onPaid({ reference: sheet.reference, venue });
    } catch {
      showMessage("Couldn't start the payment", 'Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Pressable
      onPress={pay}
      disabled={disabled || isPaying}
      accessibilityRole="button"
      className={`mt-4 w-full items-center rounded-full bg-lightGold py-4 active:opacity-80 ${disabled || isPaying ? 'opacity-50' : ''}`}
    >
      {/* Full width + centred (see BuyFlexiSessions.tsx: some Android phones
          cut changing bold labels short) */}
      <Text className="w-full text-center text-base font-bold text-black">
        {isPaying ? 'Just a moment...' : 'Pay now'}
      </Text>
    </Pressable>
  );
}
