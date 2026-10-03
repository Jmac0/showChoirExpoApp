import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text } from 'react-native';

import { ChangeEmail } from '@/components/ChangeEmail';
import { ChangePassword } from '@/components/ChangePassword';
import { DeleteAccount } from '@/components/DeleteAccount';
import { MembershipDetails } from '@/components/MembershipDetails';
import { useAuth } from '@/contexts/authContext';
import { confirm } from '@/lib/confirm';

// Matches `lightGold` in tailwind.config.js (RefreshControl isn't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';

// Account tab: their membership details (type, Direct Debit status, email -
// like the website's Account page), changing their password and email,
// logging out, and deleting their account. Notices that need
// acting on (Direct Debit stopped, Flexi sessions expiring) stay on the
// Home tab, next to the membership card, so they're seen.
const AccountScreen = () => {
  const { profile, refreshProfile, signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pull down to re-fetch the profile, e.g. after setting up a Direct Debit
  const onRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
  };

  // Ask first, so it isn't tapped by accident.
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
      contentContainerClassName="items-center pb-10 pt-4"
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
          <MembershipDetails profile={profile} />
          {/* Same order as the website's Account page */}
          <ChangePassword />
          <ChangeEmail />
        </>
      ) : (
        <Text className="mt-8 px-6 text-center text-white">
          Unable to load your account. Pull down to try again.
        </Text>
      )}

      {/* Shown even if the profile didn't load, so they can log in again */}
      <Pressable
        onPress={confirmSignOut}
        className="mt-12 rounded-md border border-lightGold px-8 py-3"
      >
        <Text className="text-base font-bold text-lightGold">Log out</Text>
      </Pressable>

      {/* Permanently delete their account (only once it's loaded) */}
      {profile?.email ? <DeleteAccount /> : null}
    </ScrollView>
  );
};

export default AccountScreen;
