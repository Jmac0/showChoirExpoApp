import React from 'react';
import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '@/contexts/authContext';

const QrCodeScreen = () => {
  const { profile } = useAuth();

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
          <Text className="mt-4 text-lg text-white">{profile.first_name}</Text>
          <Text className="mt-8 w-11/12 rounded-md bg-slate-50 p-3 text-center">
            Show this code at rehearsal to sign in
          </Text>
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
