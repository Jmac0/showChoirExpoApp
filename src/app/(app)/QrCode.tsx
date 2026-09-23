import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '@/contexts/authContext';

const SIGN_IN_HINT_DISMISSED_KEY = 'qrSignInHintDismissed';

const QrCodeScreen = () => {
  const { profile } = useAuth();
  const [showSignInHint, setShowSignInHint] = useState(false);

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
      <Text className="text-center text-3xl font-bold text-white">
        Membership Card
      </Text>
      {profile?.email ? (
        <>
          <View className="mt-8 items-center justify-center rounded-lg bg-white p-8">
            <QRCode value={profile.email} size={220} />
          </View>
          <Text className="mt-4 text-lg text-white">
            {profile.first_name} {profile.last_name}
          </Text>
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

export default QrCodeScreen;
