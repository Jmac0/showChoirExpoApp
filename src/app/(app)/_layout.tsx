import React from 'react';
import { View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { TabBarIcon } from '@/components/TabBarIcon';
import { useAuth } from '@/contexts/authContext';

// Matches `lightGold` in tailwind.config.js - kept as a raw value here since
// React Navigation's screenOptions/tabBarIcon aren't styled via className.
const LIGHT_GOLD = 'rgb(222,204,120)';

const TabsLayout = () => {
  const { session, isLoading } = useAuth();

  // Wait for a persisted session to be restored before deciding to redirect,
  // otherwise a logged-in user briefly flashes the login screen on cold start.
  if (isLoading) {
    return <View className="flex-1 bg-lightBlack" />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: LIGHT_GOLD,
        headerStyle: { backgroundColor: LIGHT_GOLD },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'home' : 'home-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="qrcode"
        options={{
          title: 'Membership Card',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'qr-code' : 'qr-code-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'bulb' : 'bulb-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          title: 'Resources',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'musical-note' : 'musical-note-outline'}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
