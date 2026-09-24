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
import { View, Text, Pressable } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '@/contexts/authContext';
import { FlexiSessionsRing } from '@/components/FlexiSessionsRing';

const SIGN_IN_HINT_DISMISSED_KEY = 'qrSignInHintDismissed';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const IndexComponent = () => {
  const { profile } = useAuth();
  const [showSignInHint, setShowSignInHint] = useState(false);

  // Include name alongside email so the admin's scanner can show it
  // immediately, without waiting on a lookup. Email remains the field
  // used to identify the member for any server-side action.
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

  return (
    <View className="flex-1 items-center bg-lightBlack pt-10">
      {profile?.email ? (
        <>
          <Text className="mt-4 text-2xl font-bold text-lightGold">
            {getGreeting()} {profile.first_name}
          </Text>
          {profile.membership_type === 'flexi' ? (
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
    </View>
  );
};

export default IndexComponent;
