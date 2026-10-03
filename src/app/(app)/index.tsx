// import React from 'react';
// import { View, Text, Button } from 'react-native';
// import { useAuth } from '@/contexts/authContext';
// const IndexComponent: React.FC = () => {
//   const { signOut } = useAuth();

//   return (
//     <View className="flex-1 items-center bg-lightBlack pt-10">
//       <Text>index</Text>
//       <Button title="Logout" onPress={() => signOut()} />
//     </View>
//   );
// };

// export default IndexComponent;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Linking,
  View,
  Text,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '@/contexts/authContext';
import { FlexiSessionsRing } from '@/components/FlexiSessionsRing';
import { confirm, showMessage } from '@/lib/confirm';

const SIGN_IN_HINT_DISMISSED_KEY = 'qrSignInHintDismissed';

// Matches `lightGold` in tailwind.config.js (RefreshControl isn't styled via className).
const LIGHT_GOLD = 'rgb(222,204,120)';

// "17 October"
const dayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const IndexComponent = () => {
  const { profile, refreshProfile, signOut, authRequest } = useAuth();
  const [isOpeningDirectDebit, setIsOpeningDirectDebit] = useState(false);

  // "Set up a new Direct Debit": the website asks GoCardless for its form
  // with their details filled in (api/gocardless/restart), and it opens in
  // the browser. When they finish, the notice goes - pull down to refresh.
  const openNewDirectDebit = async () => {
    setIsOpeningDirectDebit(true);
    try {
      const { authorisation_url: url } = await authRequest<{
        authorisation_url: string;
      }>({ url: '/api/gocardless/restart', method: 'POST' });
      await Linking.openURL(url);
    } catch {
      showMessage("Couldn't start your Direct Debit", 'Please try again.');
    } finally {
      setIsOpeningDirectDebit(false);
    }
  };
  const [showSignInHint, setShowSignInHint] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pull down to re-fetch the profile, e.g. to see the updated flexi count.
  const onRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
  };

  // Include name alongside email so the admin's scanner can show it
  // immediately, without waiting on a lookup. Email remains the field
  // used to identify the member for any server-side action.
  // The website's printable membership card uses exactly the same contents
  // (membershipQrValue in the website's components/members/MembershipCard.tsx)
  // - keep the two in step if this ever changes.
  const qrValue = profile
    ? JSON.stringify({
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
      })
    : '';

  useEffect(() => {
    AsyncStorage.getItem(SIGN_IN_HINT_DISMISSED_KEY).then((dismissed) => {
      if (!dismissed) setShowSignInHint(true);
    });
  }, []);

  const dismissSignInHint = () => {
    setShowSignInHint(false);
    AsyncStorage.setItem(SIGN_IN_HINT_DISMISSED_KEY, 'true');
  };

  // Ask first - it's at the bottom of a scrolling screen, easy to tap by accident.
  // (confirm() also works in a web browser, where Alert doesn't.)
  const confirmSignOut = () => {
    confirm({
      title: 'Log out?',
      message: 'You will need your email and password to log back in.',
      confirmText: 'Log out',
      onConfirm: signOut,
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-lightBlack"
      contentContainerClassName="items-center pb-10 pt-10"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={LIGHT_GOLD}
          colors={[LIGHT_GOLD]}
        />
      }
    >
      {profile?.email ? (
        <>
          <Text className="mt-4 text-2xl font-bold text-lightGold">
            {getGreeting()} {profile.first_name}
          </Text>
          {/* Their Direct Debit has stopped: when, why, and until when their
              membership is still active (the website's grace period) */}
          {profile.direct_debit ? (
            <View className="mt-6 w-11/12 rounded-xl border-2 border-amber-400 p-4">
              <View className="flex-row items-center">
                <Ionicons name="alert-circle" size={24} color="#fbbf24" />
                <Text className="ml-2 text-lg font-bold text-amber-400">
                  Your Direct Debit has stopped
                </Text>
              </View>
              <Text className="mt-2 text-gray-200">
                Your Direct Debit was {profile.direct_debit.what_happened} on{' '}
                {dayMonth(profile.direct_debit.ended_at)}
                {profile.direct_debit.reason
                  ? ` (${profile.direct_debit.reason})`
                  : ''}
                .{' '}
                {profile.direct_debit.in_grace_period
                  ? `Your membership stays active until ${dayMonth(
                      profile.direct_debit.grace_ends_at
                    )} - set up a new Direct Debit before then to keep singing without a break.`
                  : 'Your membership is no longer active. Set up a new Direct Debit, or buy a pack of Flexi sessions, to keep singing.'}
              </Text>
              <Pressable
                onPress={openNewDirectDebit}
                disabled={isOpeningDirectDebit}
                className="mt-4 items-center rounded-md bg-lightGold py-3"
              >
                <Text className="font-bold text-black">
                  {isOpeningDirectDebit
                    ? 'Just a moment...'
                    : 'Set up a new Direct Debit'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {/* Also shown to anyone who owes sessions after paying later */}
          {profile.membership_type === 'flexi' || profile.flexi_sessions < 0 ? (
            <View className="mt-6 items-center justify-center">
              <FlexiSessionsRing remaining={profile.flexi_sessions} />
            </View>
          ) : null}
          <Text className="mt-6 text-center text-xl font-bold text-lightGold">
            Membership Card
          </Text>
          <View className="mt-8 items-center justify-center rounded-lg bg-white p-8">
            <QRCode value={qrValue} size={220} />
          </View>

          {showSignInHint ? (
            <View className="mt-8 w-11/12 flex-row items-center justify-between rounded-md bg-slate-50 p-3">
              <Text className="flex-1 text-center">
                Show this code at rehearsal to sign in
              </Text>
              <Pressable
                onPress={dismissSignInHint}
                hitSlop={8}
                className="ml-3"
              >
                <Text className="text-lg font-bold text-gray-500">✕</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <Text className="mt-8 text-white">
          Unable to load your membership card. Please try logging in again.
        </Text>
      )}

      {/* Shown even if the profile didn't load, so they can log in again */}
      <Pressable
        onPress={confirmSignOut}
        className="mt-12 rounded-md border border-lightGold px-8 py-3"
      >
        <Text className="text-base font-bold text-lightGold">Log out</Text>
      </Pressable>
    </ScrollView>
  );
};

export default IndexComponent;
